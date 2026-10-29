import { useCallback, useEffect, useState } from 'react'
import SectionTabs from './components/SectionTabs'
import PageList from './components/PageList'
import EditorPane from './components/EditorPane'
import { createSeedNotebook } from './seed'
import { mergeDocWithText } from './docMerge'
import { loadUiState, loadWorkspace, saveUiState, saveWorkspace, uid } from './storage'
import { BLOCK_WIDTH_PRESET } from './types'
import type { BlockType, EditorMode, NoteBlock, NotePage, Notebook, PageWidth } from './types'

const SECTION_COLORS = [
  '#6F6FFF',
  '#0D9488',
  '#2563EB',
  '#C2410C',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#059669',
]

function resolveInitial(notebook: Notebook) {
  const ui = loadUiState()
  if (ui) {
    const section = notebook.sections.find((item) => item.id === ui.sectionId)
    if (section) {
      const page = section.pages.find((item) => item.id === ui.pageId) ?? section.pages[0]
      const mode: EditorMode = ui.mode === 'source' ? 'source' : 'rich'
      return { sectionId: section.id, pageId: page?.id ?? '', mode }
    }
  }
  const section = notebook.sections.find((item) => item.id === 'sec-cpp') ?? notebook.sections[0]
  return {
    sectionId: section?.id ?? '',
    pageId: section?.pages[0]?.id ?? '',
    mode: 'rich' as EditorMode,
  }
}

export default function App() {
  const [notebook, setNotebook] = useState<Notebook>(() => loadWorkspace() ?? createSeedNotebook())
  const [activeSectionId, setActiveSectionId] = useState(() => resolveInitial(notebook).sectionId)
  const [activePageId, setActivePageId] = useState(() => resolveInitial(notebook).pageId)
  const [mode, setMode] = useState<EditorMode>(() => resolveInitial(notebook).mode)
  const [query, setQuery] = useState('')
  const [reading, setReading] = useState(false)
  const [lastSaved, setLastSaved] = useState(() => Date.now())

  const activeSection = notebook.sections.find((section) => section.id === activeSectionId)
  const activePage = activeSection?.pages.find((page) => page.id === activePageId)

  useEffect(() => {
    saveWorkspace(notebook)
    setLastSaved(Date.now())
  }, [notebook])

  useEffect(() => {
    const flush = () => saveWorkspace(notebook)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [notebook])

  useEffect(() => {
    saveUiState({ sectionId: activeSectionId, pageId: activePageId, mode })
  }, [activeSectionId, activePageId, mode])

  const updatePage = useCallback(
    (pageId: string, patch: Partial<NotePage>, touch = true) => {
      setNotebook((previous) => ({
        ...previous,
        sections: previous.sections.map((section) => ({
          ...section,
          pages: section.pages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  ...patch,
                  updatedAt: touch ? Date.now() : page.updatedAt,
                }
              : page,
          ),
        })),
      }))
    },
    [],
  )

  const updateBlock = useCallback(
    (
      pageId: string,
      blockId: string,
      patch: { markdown?: string; doc?: Record<string, unknown> | null },
    ) => {
      setNotebook((previous) => ({
        ...previous,
        sections: previous.sections.map((section) => ({
          ...section,
          pages: section.pages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  blocks: page.blocks.map((block) => {
                    if (block.id !== blockId) return block
                    const next: NoteBlock = { ...block }
                    if (typeof patch.markdown === 'string') next.markdown = patch.markdown
                    if (patch.doc) next.doc = patch.doc
                    else if (patch.doc === null) delete next.doc
                    return next
                  }),
                  updatedAt: Date.now(),
                }
              : page,
          ),
        })),
      }))
    },
    [],
  )

  const addBlock = useCallback((pageId: string) => {
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => ({
        ...section,
        pages: section.pages.map((page) => {
          if (page.id !== pageId) return page
          const right = page.blocks.reduce((max, block) => Math.max(max, block.x + block.width), 0)
          const block: NoteBlock = {
            id: uid('block'),
            type: 'markdown',
            markdown: '',
            x: page.blocks.length > 0 ? right + 24 : 0,
            y: 0,
            width: BLOCK_WIDTH_PRESET[page.width],
          }
          return { ...page, blocks: [...page.blocks, block], updatedAt: Date.now() }
        }),
      })),
    }))
  }, [])

  const setBlockType = useCallback((pageId: string, blockId: string, type: BlockType) => {
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => ({
        ...section,
        pages: section.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                blocks: page.blocks.map((block) => {
                  if (block.id !== blockId) return block
                  // 保留文档结构：切到 Markdown 只是换一种显示方式；
                  // 再切回文档时把 M 里改过的文本合并回去，颜色、字体等格式不丢失
                  const next: NoteBlock = { ...block, type }
                  if (type === 'doc' && next.doc) {
                    const merged = mergeDocWithText(next.doc, next.markdown)
                    if (merged) next.doc = merged
                    else delete next.doc
                  }
                  return next
                }),
              }
            : page,
        ),
      })),
    }))
  }, [])

  const moveBlock = useCallback((pageId: string, blockId: string, x: number, y: number) => {
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => ({
        ...section,
        pages: section.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                blocks: page.blocks.map((block) =>
                  block.id === blockId
                    ? { ...block, x: Math.max(0, x), y: Math.max(0, y) }
                    : block,
                ),
                updatedAt: Date.now(),
              }
            : page,
        ),
      })),
    }))
  }, [])

  const deleteBlock = useCallback((pageId: string, blockId: string) => {
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => ({
        ...section,
        pages: section.pages.map((page) => {
          if (page.id !== pageId || page.blocks.length <= 1) return page
          return {
            ...page,
            blocks: page.blocks.filter((block) => block.id !== blockId),
            updatedAt: Date.now(),
          }
        }),
      })),
    }))
  }, [])

  const resizeBlock = useCallback((pageId: string, blockId: string, width: number) => {
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => ({
        ...section,
        pages: section.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                blocks: page.blocks.map((block) => {
                  if (block.id !== blockId) return block
                  // width 为 0 表示恢复预设宽度
                  return { ...block, width: width > 0 ? width : BLOCK_WIDTH_PRESET[page.width] }
                }),
                updatedAt: Date.now(),
              }
            : page,
        ),
      })),
    }))
  }, [])

  const addPage = (sectionId: string) => {
    const target = notebook.sections.find((section) => section.id === sectionId)
    if (!target) return
    const index = target.pages.length + 1
    const newPage: NotePage = {
      id: uid('page'),
      title: `未命名页面 ${index}`,
      blocks: [
        {
          id: uid('block'),
          type: 'markdown',
          markdown: '',
          x: 0,
          y: 0,
          width: BLOCK_WIDTH_PRESET.wide,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      zoom: 100,
      width: 'wide' as PageWidth,
    }
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.id === sectionId ? { ...section, pages: [...section.pages, newPage] } : section,
      ),
    }))
    setActiveSectionId(sectionId)
    setActivePageId(newPage.id)
    setQuery('')
  }

  const deletePage = (pageId: string) => {
    if (!activeSection) return
    const page = activeSection.pages.find((item) => item.id === pageId)
    if (!page) return
    if (!window.confirm(`删除页面「${page.title}」？此操作不可恢复。`)) return

    const remaining = activeSection.pages.filter((item) => item.id !== pageId)
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.id === activeSectionId ? { ...section, pages: remaining } : section,
      ),
    }))
    if (pageId === activePageId) {
      setActivePageId(remaining[0]?.id ?? '')
    }
  }

  const addSection = () => {
    const index = notebook.sections.length
    const newSection = {
      id: uid('sec'),
      name: `新分区 ${index + 1}`,
      color: SECTION_COLORS[index % SECTION_COLORS.length],
      pages: [] as NotePage[],
    }
    setNotebook((previous) => ({
      ...previous,
      sections: [...previous.sections, newSection],
    }))
    setActiveSectionId(newSection.id)
    setActivePageId('')
  }

  const renameSection = (sectionId: string, name: string) => {
    setNotebook((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.id === sectionId ? { ...section, name } : section,
      ),
    }))
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        saveWorkspace(notebook)
        setLastSaved(Date.now())
        setMode((current) => (current === 'rich' ? 'source' : 'rich'))
      }
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveWorkspace(notebook)
        setLastSaved(Date.now())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [notebook])

  return (
    <div className="app">
      <header className="topbar">
        <div className="notebook">
          <span className="notebook-mark" />
          <span className="notebook-name">{notebook.name}</span>
          <svg className="notebook-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>

        <SectionTabs
          sections={notebook.sections}
          activeSectionId={activeSectionId}
          onSelect={(sectionId) => {
            const section = notebook.sections.find((item) => item.id === sectionId)
            setActiveSectionId(sectionId)
            setActivePageId(section?.pages[0]?.id ?? '')
            setQuery('')
          }}
          onAdd={addSection}
          onRename={renameSection}
        />

        <div className="search">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.2 9.2L12.5 12.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索全部笔记"
            aria-label="搜索笔记"
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} title="清空">
              ×
            </button>
          )}
        </div>

        <div className="shortcut-hint">Ctrl+E 切换模式</div>
      </header>

      <div className="main">
        {activePage ? (
          <EditorPane
            key={activePage.id}
            page={activePage}
            mode={mode}
            reading={reading}
            lastSaved={lastSaved}
            onModeChange={setMode}
            onReadingChange={setReading}
            onBlockChange={(blockId, patch) => updateBlock(activePage.id, blockId, patch)}
            onAddBlock={() => addBlock(activePage.id)}
            onTypeChange={(blockId, type) => setBlockType(activePage.id, blockId, type)}
            onRemoveBlock={(blockId) => deleteBlock(activePage.id, blockId)}
            onTitleChange={(title) => updatePage(activePage.id, { title })}
            onZoomChange={(zoom) => updatePage(activePage.id, { zoom }, false)}
            onResizeBlock={(blockId, width) => resizeBlock(activePage.id, blockId, width)}
            onMoveBlock={(blockId, x, y) => moveBlock(activePage.id, blockId, x, y)}
            onWidthChange={(width) => {
              const preset = BLOCK_WIDTH_PRESET[width]
              updatePage(
                activePage.id,
                {
                  width,
                  blocks: activePage.blocks.map((block, index) => ({
                    ...block,
                    width: preset,
                    x: index * (preset + 24),
                    y: 0,
                  })),
                },
                false,
              )
            }}
          />
        ) : (
          <div className="doc empty-doc">
            <div className="empty-state">
              <div className="empty-title">这个分区还没有页面</div>
              <div className="empty-sub">新建一页，开始记录你的第一条笔记。</div>
              <button
                type="button"
                className="primary-btn"
                onClick={() => addPage(activeSectionId)}
              >
                新建页面
              </button>
            </div>
          </div>
        )}

        <PageList
          sections={notebook.sections}
          activeSectionId={activeSectionId}
          activePageId={activePageId}
          query={query}
          onSelect={(sectionId, pageId) => {
            setActiveSectionId(sectionId)
            setActivePageId(pageId)
            setQuery('')
          }}
          onAdd={() => addPage(activeSectionId)}
          onDelete={deletePage}
        />
      </div>
    </div>
  )
}
