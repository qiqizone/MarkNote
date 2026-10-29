import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Markdown } from 'tiptap-markdown'
import CodeMirror from '@uiw/react-codemirror'
import { markdown as markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import type { EditorMode, NoteBlock, NotePage, PageWidth } from '../types'

/** 支持字体、字号、颜色的 TextStyle（格式模式使用） */
const NoteTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontFamily || null,
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.fontFamily ? { style: `font-family:${attributes.fontFamily}` } : {},
      },
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.fontSize ? { style: `font-size:${attributes.fontSize}` } : {},
      },
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.color || null,
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.color ? { style: `color:${attributes.color}` } : {},
      },
    }
  },
})

interface BlockPatch {
  markdown?: string
  doc?: Record<string, unknown> | null
}

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: { HTMLAttributes: { class: 'md-code-block' } },
  }),
  NoteTextStyle,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: 'noopener noreferrer' },
  }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({
    emptyNodeClass: 'is-editor-empty',
    placeholder: '开始记录… 支持 Markdown 快捷语法：## 标题、- 列表、``` 代码块',
  }),
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: '-',
    linkify: true,
    transformPastedText: true,
    transformCopiedText: true,
  }),
]

// 文档类型的编辑区不带 Markdown 解析，粘贴 Markdown 语法时保持纯文本
const docExtensions = [
  ...extensions.filter(
    (extension) => extension.name !== 'markdown' && extension.name !== 'placeholder',
  ),
  Placeholder.configure({ emptyNodeClass: 'is-editor-empty', placeholder: '开始记录…' }),
]

function readMarkdown(editor: { storage: unknown }) {
  const storage = editor.storage as { markdown?: { getMarkdown: () => string } }
  return storage.markdown?.getMarkdown() ?? ''
}

function RichEditor({
  content,
  kind,
  onChange,
  onReady,
  onActivate,
}: {
  content: string | Record<string, unknown>
  kind: 'markdown' | 'doc'
  onChange: (patch: BlockPatch) => void
  onReady: (editor: Editor) => void
  onActivate: (editor: Editor) => void
}) {
  const editor = useEditor({
    extensions: kind === 'doc' ? docExtensions : extensions,
    content: content as string,
    autofocus: false,
    editorProps: {
      attributes: { class: 'prose', spellcheck: 'false' },
    },
    onUpdate: ({ editor: current }) => {
      if (kind === 'doc') {
        onChange({ doc: current.getJSON() as Record<string, unknown> })
      } else {
        onChange({ markdown: readMarkdown(current) })
      }
    },
    onSelectionUpdate: ({ editor: current }) => {
      onActivate(current)
    },
    onFocus: ({ editor: current }) => {
      onActivate(current)
    },
  })

  useEffect(() => {
    if (editor) onReady(editor)
  }, [editor, onReady])

  return <EditorContent editor={editor} />
}

function SourceEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="source-editor">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[markdownLanguage(), EditorView.lineWrapping]}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          autocompletion: false,
        }}
      />
    </div>
  )
}

const FONT_FAMILIES: Array<{ label: string; value: string }> = [
  { label: '默认字体', value: '' },
  { label: '宋体', value: '"SimSun", serif' },
  { label: '黑体', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: '楷体', value: '"KaiTi", "STKaiti", serif' },
  { label: '等宽', value: '"Cascadia Code", Consolas, monospace' },
]

const FONT_SIZES: Array<{ label: string; value: string }> = [
  { label: '默认字号', value: '' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
]

const TEXT_COLORS = ['#1f2329', '#dc2626', '#ea580c', '#0d9488', '#2563eb', '#7c3aed', '#6b7280']

/** 格式模式工具栏：字体、字号、颜色、加粗/斜体/下划线、对齐 */
function FormatBar({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return (
      <div className="format-bar">
        <span className="format-hint">先在下方编辑区点一下，即可设置字体和格式</span>
      </div>
    )
  }

  const styleAttrs = editor.getAttributes('textStyle') as {
    fontFamily?: string | null
    fontSize?: string | null
    color?: string | null
  }

  const applyStyle = (patch: Record<string, string | null>) => {
    editor.chain().focus().setMark('textStyle', { ...styleAttrs, ...patch }).run()
  }

  const alignment =
    (editor.getAttributes('heading').textAlign as string | undefined) ??
    (editor.getAttributes('paragraph').textAlign as string | undefined) ??
    'left'

  return (
    <div
      className="format-bar"
      role="toolbar"
      aria-label="文本格式"
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) event.preventDefault()
      }}
    >
      <select
        className="fmt-select"
        value={styleAttrs.fontFamily ?? ''}
        title="字体"
        onChange={(event) => applyStyle({ fontFamily: event.target.value || null })}
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font.label} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>

      <select
        className="fmt-select"
        value={styleAttrs.fontSize ?? ''}
        title="字号"
        onChange={(event) => applyStyle({ fontSize: event.target.value || null })}
      >
        {FONT_SIZES.map((size) => (
          <option key={size.label} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>

      <span className="fmt-sep" />

      <div className="fmt-colors">
        <button
          type="button"
          className="fmt-btn"
          title="默认颜色"
          onClick={() => applyStyle({ color: null })}
        >
          A
        </button>
        {TEXT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`fmt-color ${styleAttrs.color === color ? 'active' : ''}`}
            style={{ background: color }}
            title={`文字颜色 ${color}`}
            aria-label={`文字颜色 ${color}`}
            onClick={() => applyStyle({ color })}
          />
        ))}
      </div>

      <span className="fmt-sep" />

      <button
        type="button"
        className={`fmt-btn ${editor.isActive('bold') ? 'active' : ''}`}
        title="加粗"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className={`fmt-btn ${editor.isActive('italic') ? 'active' : ''}`}
        title="斜体"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        className={`fmt-btn ${editor.isActive('underline') ? 'active' : ''}`}
        title="下划线"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </button>
      <button
        type="button"
        className={`fmt-btn ${editor.isActive('strike') ? 'active' : ''}`}
        title="删除线"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </button>

      <span className="fmt-sep" />

      {(['left', 'center', 'right'] as const).map((value) => (
        <button
          key={value}
          type="button"
          className={`fmt-btn ${alignment === value ? 'active' : ''}`}
          title={value === 'left' ? '左对齐' : value === 'center' ? '居中对齐' : '右对齐'}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
        >
          {value === 'left' ? '左' : value === 'center' ? '中' : '右'}
        </button>
      ))}

      <span className="fmt-sep" />

      <button
        type="button"
        className="fmt-btn fmt-clear"
        title="清除字体、颜色与格式"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        清除格式
      </button>
    </div>
  )
}

interface Props {
  page: NotePage
  mode: EditorMode
  lastSaved: number
  onModeChange: (mode: EditorMode) => void
  onBlockChange: (blockId: string, patch: BlockPatch) => void
  onAddBlock: () => void
  onAddDocBlock: () => void
  onRemoveBlock: (blockId: string) => void
  onResizeBlock: (blockId: string, width: number) => void
  onMoveBlock: (blockId: string, x: number, y: number) => void
  onTitleChange: (title: string) => void
  onZoomChange: (zoom: number) => void
  onWidthChange: (width: PageWidth) => void
}

function formatSavedTime(timestamp: number) {
  const date = new Date(timestamp)
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${hour}:${minute}`
}

const WIDTH_OPTIONS: Array<{ value: PageWidth; label: string }> = [
  { value: 'narrow', label: '窄' },
  { value: 'standard', label: '标准' },
  { value: 'wide', label: '宽' },
]

const MIN_BLOCK_WIDTH = 240
const MAX_BLOCK_WIDTH = 1400
const BLOCK_GAP = 24
const SNAP_THRESHOLD = 8
const MIN_SEPARATION = 8

interface BlockRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface SnapGuides {
  x: number | null
  y: number | null
}

function hasConflict(
  x: number,
  y: number,
  width: number,
  height: number,
  others: BlockRect[],
) {
  return others.some(
    (other) =>
      x < other.x + other.width + MIN_SEPARATION &&
      x + width + MIN_SEPARATION > other.x &&
      y < other.y + other.height + MIN_SEPARATION &&
      y + height + MIN_SEPARATION > other.y,
  )
}

function findSnap(
  value: number,
  candidates: number[],
  threshold: number,
  isValid: (candidate: number) => boolean,
) {
  let best: number | null = null
  let bestDelta = threshold + 1
  for (const candidate of candidates) {
    const delta = Math.abs(candidate - value)
    if (delta <= threshold && delta < bestDelta && isValid(candidate)) {
      best = candidate
      bestDelta = delta
    }
  }
  return best
}

export default function EditorPane({
  page,
  mode,
  lastSaved,
  onModeChange,
  onBlockChange,
  onAddBlock,
  onAddDocBlock,
  onRemoveBlock,
  onResizeBlock,
  onMoveBlock,
  onTitleChange,
  onZoomChange,
  onWidthChange,
}: Props) {
  const previousMode = useRef(mode)
  const editorRefs = useRef(new Map<string, Editor>())
  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const blockCount = useRef(page.blocks.length)
  const [richKey, setRichKey] = useState(0)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [guides, setGuides] = useState<SnapGuides>({ x: null, y: null })
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [, bumpToolbar] = useState(0)

  // 工具栏只作用于当前选中的「文档」编辑区
  const activeBlock = page.blocks.find((block) => block.id === activeBlockId)
  const activeEditor = activeBlockId ? editorRefs.current.get(activeBlockId) ?? null : null
  const formatEditor = activeBlock?.type === 'doc' ? activeEditor : null

  const handleActivate = useCallback(
    (blockId: string) => {
      setActiveBlockId(blockId)
      bumpToolbar((value) => value + 1)
    },
    [],
  )

  const blockIds = page.blocks.map((block) => block.id).join('|')

  // 新增编辑区后，画布向右延伸，自动滚到最右侧
  useEffect(() => {
    if (page.blocks.length > blockCount.current) {
      const element = scrollRef.current
      if (element) element.scrollTo({ left: element.scrollWidth, behavior: 'smooth' })
    }
    blockCount.current = page.blocks.length
  }, [page.blocks.length])

  // 记录每个编辑区的实际高度，用来撑开画布，避免内容超出后无法滚动
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scale = page.zoom / 100
    const observer = new ResizeObserver((entries) => {
      setHeights((previous) => {
        let changed = false
        const next = { ...previous }
        for (const entry of entries) {
          const element = entry.target as HTMLElement
          const id = element.dataset.blockId
          if (!id) continue
          const height = Math.round(element.getBoundingClientRect().height / scale)
          if (next[id] !== height) {
            next[id] = height
            changed = true
          }
        }
        return changed ? next : previous
      })
    })
    canvas.querySelectorAll<HTMLElement>('.block').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [blockIds, page.zoom, mode, richKey])

  const contentRight = page.blocks.reduce(
    (max, block) => Math.max(max, block.x + block.width),
    0,
  )
  const contentBottom = page.blocks.reduce(
    (max, block) => Math.max(max, block.y + (heights[block.id] ?? 280)),
    0,
  )
  const rects: BlockRect[] = page.blocks.map((block) => ({
    id: block.id,
    x: block.x,
    y: block.y,
    width: block.width,
    height: heights[block.id] ?? 280,
  }))

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'rich') return
    const target = event.target as HTMLElement
    if (target.closest('.block')) return
    // 点击画布空白处：定位到最后一个编辑区继续写
    const lastBlock = page.blocks[page.blocks.length - 1]
    if (lastBlock) editorRefs.current.get(lastBlock.id)?.commands.focus('end')
  }

  useEffect(() => {
    if (mode === 'rich' && previousMode.current === 'source') {
      setRichKey((key) => key + 1)
    }
    previousMode.current = mode
  }, [mode])

  const charCount = useMemo(
    () =>
      page.blocks.reduce(
        (total, block) => total + block.markdown.replace(/\s+/g, '').length,
        0,
      ),
    [page.blocks],
  )
  const zoomStep = (delta: number) => {
    const next = Math.min(200, Math.max(50, page.zoom + delta))
    onZoomChange(next)
  }

  return (
    <div className="doc">
      <div className="doc-head">
        <input
          className="doc-title"
          value={page.title}
          placeholder="无标题页面"
          aria-label="页面标题"
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <div className="mode-switch">
          <div className="mode-seg" role="group" aria-label="Markdown 编辑方式">
            <button
              type="button"
              className={mode === 'rich' ? 'active' : ''}
              onClick={() => onModeChange('rich')}
            >
              Markdown
            </button>
            <button
              type="button"
              className={mode === 'source' ? 'active' : ''}
              onClick={() => onModeChange('source')}
            >
              源码
            </button>
          </div>
          <button
            type="button"
            className="mode-doc"
            onClick={() => onAddDocBlock()}
            title="在右侧新增一个文档编辑区（支持字体、颜色、对齐）"
          >
            ＋ 文档区
          </button>
        </div>
      </div>

      {formatEditor && <FormatBar editor={formatEditor} />}

      <div className="doc-meta-row">
        <div className="meta">
          <span className="save-dot" />
          已保存 {formatSavedTime(lastSaved)}
          <span className="meta-divider">·</span>
          约 {charCount} 字
          <span className="meta-divider">·</span>
          {page.blocks.length} 个编辑区
          <span className="meta-divider">·</span>
          {mode === 'rich' ? 'Markdown 预览' : 'Markdown 源码'}
        </div>
        <div className="doc-controls">
          <div className="width-seg" role="group" aria-label="编辑区预设宽度">
            {WIDTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={page.width === option.value ? 'active' : ''}
                onClick={() => onWidthChange(option.value)}
                title="把所有编辑区设为该宽度并横向排开"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="zoom">
            <button type="button" onClick={() => zoomStep(-10)} title="缩小">
              −
            </button>
            <span
              className="zoom-label"
              title="双击恢复 100%"
              onDoubleClick={() => onZoomChange(100)}
            >
              {page.zoom}%
            </span>
            <button type="button" onClick={() => zoomStep(10)} title="放大">
              ＋
            </button>
          </div>
        </div>
      </div>

      <div className="doc-scroll" ref={scrollRef} onClick={handleCanvasClick}>
        <div
          className="canvas"
          ref={canvasRef}
          style={{ zoom: page.zoom / 100, width: contentRight + 160, height: contentBottom + 160 } as React.CSSProperties}
        >
          {page.blocks.map((block) => (
            <BlockEditor
              key={`${page.id}-${block.id}-${
                block.type === 'doc' ? 'doc' : mode === 'source' ? 'src' : richKey
              }`}
              block={block}
              mode={mode}
              zoom={page.zoom}
              removable={page.blocks.length > 1}
              onChange={(patch) => onBlockChange(block.id, patch)}
              onReady={(editor) => editorRefs.current.set(block.id, editor)}
              onActivate={() => handleActivate(block.id)}
              onRemove={() => onRemoveBlock(block.id)}
              onResize={(width) => onResizeBlock(block.id, width)}
              onMove={(x, y) => onMoveBlock(block.id, x, y)}
              rects={rects}
              onGuides={setGuides}
            />
          ))}

          <button
            type="button"
            className="block-add"
            style={{ left: contentRight + BLOCK_GAP }}
            onClick={(event) => {
              event.stopPropagation()
              onAddBlock()
            }}
            title="在右侧新增一个编辑区"
          >
            <span className="block-add-plus">＋</span>
            <span className="block-add-label">新编辑区</span>
          </button>

          {guides.x !== null && <div className="snap-guide vertical" style={{ left: guides.x }} />}
          {guides.y !== null && <div className="snap-guide horizontal" style={{ top: guides.y }} />}
        </div>
      </div>
    </div>
  )
}

function BlockEditor({
  block,
  mode,
  zoom,
  removable,
  onChange,
  onReady,
  onActivate,
  onRemove,
  onResize,
  onMove,
  rects,
  onGuides,
}: {
  block: NoteBlock
  mode: EditorMode
  zoom: number
  removable: boolean
  onChange: (patch: BlockPatch) => void
  onReady: (editor: Editor) => void
  onActivate: () => void
  onRemove: () => void
  onResize: (width: number) => void
  onMove: (x: number, y: number) => void
  rects: BlockRect[]
  onGuides: (guides: SnapGuides) => void
}) {
  const blockRef = useRef<HTMLDivElement>(null)
  const dragWidth = useRef<number | null>(null)
  const [previewWidth, setPreviewWidth] = useState<number | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)

  const scale = zoom / 100

  // 拖拽右侧把手调整宽度
  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const target = blockRef.current
    if (!target) return

    const startX = event.clientX
    const startWidth = target.getBoundingClientRect().width / scale

    const handleMove = (moveEvent: MouseEvent) => {
      const next = Math.round(
        Math.min(
          MAX_BLOCK_WIDTH,
          Math.max(MIN_BLOCK_WIDTH, startWidth + (moveEvent.clientX - startX) / scale),
        ),
      )
      dragWidth.current = next
      setPreviewWidth(next)
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.body.classList.remove('resizing-block')
      if (dragWidth.current !== null) onResize(dragWidth.current)
      dragWidth.current = null
      setPreviewWidth(null)
    }

    document.body.classList.add('resizing-block')
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  // 拖动把手整块移动，靠近其他编辑区时对齐吸附并显示参考线
  const handleDragStart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const target = blockRef.current
    if (!target) return

    const startX = event.clientX
    const startY = event.clientY
    const originX = block.x
    const originY = block.y
    const width = target.getBoundingClientRect().width / scale
    const height = target.getBoundingClientRect().height / scale
    const others = rects.filter((rect) => rect.id !== block.id)
    let latest = { x: originX, y: originY }

    const handleMove = (moveEvent: MouseEvent) => {
      const rawX = Math.max(0, Math.round(originX + (moveEvent.clientX - startX) / scale))
      const rawY = Math.max(0, Math.round(originY + (moveEvent.clientY - startY) / scale))

      const xCandidates: number[] = []
      const yCandidates: number[] = []
      for (const other of others) {
        // 左 / 右 / 中线对齐
        xCandidates.push(other.x, other.x + other.width - width, other.x + (other.width - width) / 2)
        // 与相邻编辑区保持间距，而不是贴在一起
        xCandidates.push(other.x + other.width + BLOCK_GAP, other.x - width - BLOCK_GAP)
        yCandidates.push(other.y, other.y + other.height - height, other.y + (other.height - height) / 2)
        yCandidates.push(other.y + other.height + BLOCK_GAP, other.y - height - BLOCK_GAP)
      }

      const snappedX = findSnap(
        rawX,
        xCandidates,
        SNAP_THRESHOLD,
        (candidate) => candidate >= 0 && !hasConflict(candidate, rawY, width, height, others),
      )
      const snappedY = findSnap(
        rawY,
        yCandidates,
        SNAP_THRESHOLD,
        (candidate) =>
          candidate >= 0 &&
          !hasConflict(snappedX ?? rawX, candidate, width, height, others),
      )

      latest = { x: snappedX ?? rawX, y: snappedY ?? rawY }
      onGuides({ x: snappedX, y: snappedY })
      setPreviewPosition(latest)
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.body.classList.remove('moving-block')
      onGuides({ x: null, y: null })
      setPreviewPosition(null)
      onMove(latest.x, latest.y)
    }

    document.body.classList.add('moving-block')
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  const position = previewPosition ?? { x: block.x, y: block.y }
  const width = previewWidth ?? block.width

  return (
    <div
      ref={blockRef}
      className="block"
      data-block-id={block.id}
      style={{ left: position.x, top: position.y, width }}
      onMouseDown={() => onActivate()}
    >
      <button
        type="button"
        className="block-grip"
        onMouseDown={handleDragStart}
        title="拖动编辑区位置"
        aria-label="拖动编辑区位置"
      >
        ⠿
      </button>
      {removable && (
        <button
          type="button"
          className="block-del"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          title="删除这个编辑区"
          aria-label="删除这个编辑区"
        >
          ×
        </button>
      )}
      {block.type === 'doc' ? (
        <RichEditor
          kind="doc"
          content={block.doc ?? ''}
          onChange={(patch) => onChange(patch)}
          onReady={onReady}
          onActivate={() => onActivate()}
        />
      ) : mode === 'source' ? (
        <SourceEditor
          value={block.markdown}
          onChange={(markdown) => onChange({ markdown })}
        />
      ) : (
        <RichEditor
          kind="markdown"
          content={block.markdown}
          onChange={(patch) => onChange(patch)}
          onReady={onReady}
          onActivate={() => onActivate()}
        />
      )}
      <div
        className="block-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖拽调整编辑区宽度"
        title="拖拽调整宽度，双击恢复预设"
        onMouseDown={handleResizeStart}
        onDoubleClick={() => onResize(0)}
      />
    </div>
  )
}
