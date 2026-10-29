import { BLOCK_WIDTH_PRESET } from './types'
import type { NoteBlock, NotePage, Notebook, PageWidth } from './types'

const WORKSPACE_KEY = 'mnote.workspace.v10'
const UI_KEY = 'mnote.ui.v1'

export interface UiState {
  sectionId: string
  pageId: string
  mode: 'rich' | 'source'
}

const WIDTHS: PageWidth[] = ['narrow', 'standard', 'wide']

function normalizeBlocks(page: Record<string, unknown>, pageWidth: PageWidth): NoteBlock[] {
  const baseWidth = BLOCK_WIDTH_PRESET[pageWidth]
  const gap = 24
  const raw = page.blocks
  if (Array.isArray(raw) && raw.length > 0) {
    const blocks: NoteBlock[] = raw
      .filter((item) => item && typeof item === 'object')
      .map((item, index): NoteBlock => {
        const block = item as Record<string, unknown>
        return {
          id: typeof block.id === 'string' ? block.id : uid('block'),
          type: block.type === 'doc' ? 'doc' : 'markdown',
          markdown: typeof block.markdown === 'string' ? block.markdown : '',
          ...(block.doc && typeof block.doc === 'object'
            ? { doc: block.doc as Record<string, unknown> }
            : {}),
          x: typeof block.x === 'number' ? block.x : index * (baseWidth + gap),
          y: typeof block.y === 'number' ? block.y : 0,
          width: typeof block.width === 'number' && block.width > 0 ? block.width : baseWidth,
        }
      })
    if (blocks.length > 0) return blocks
  }
  // 兼容旧数据：单个 markdown 字段迁移为第一个编辑区
  if (typeof page.markdown === 'string') {
    return [
      { id: uid('block'), type: 'markdown', markdown: page.markdown, x: 0, y: 0, width: baseWidth },
    ]
  }
  return [{ id: uid('block'), type: 'markdown', markdown: '', x: 0, y: 0, width: baseWidth }]
}

function normalizePage(raw: unknown): NotePage | null {
  if (!raw || typeof raw !== 'object') return null
  const page = raw as Record<string, unknown>
  const time = typeof page.updatedAt === 'number' ? page.updatedAt : Date.now()
  const width = WIDTHS.includes(page.width as PageWidth) ? (page.width as PageWidth) : 'wide'
  return {
    id: typeof page.id === 'string' ? page.id : uid('page'),
    title: typeof page.title === 'string' ? page.title : '未命名页面',
    blocks: normalizeBlocks(page, width),
    createdAt: typeof page.createdAt === 'number' ? page.createdAt : time,
    updatedAt: time,
    zoom: typeof page.zoom === 'number' ? page.zoom : 100,
    width,
  }
}

export function loadWorkspace(): Notebook | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || !Array.isArray(parsed.sections)) return null
    const sections = parsed.sections
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((section) => ({
        id: typeof section.id === 'string' ? section.id : uid('sec'),
        name: typeof section.name === 'string' ? section.name : '分区',
        color: typeof section.color === 'string' ? section.color : '#6F6FFF',
        pages: Array.isArray(section.pages)
          ? section.pages
              .map(normalizePage)
              .filter((page): page is NotePage => page !== null)
          : [],
      }))
    return {
      id: typeof parsed.id === 'string' ? parsed.id : 'notebook',
      name: typeof parsed.name === 'string' ? parsed.name : 'Notebook',
      sections,
    }
  } catch {
    return null
  }
}

export function saveWorkspace(notebook: Notebook) {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(notebook))
  } catch {
    // 存储空间不足时静默失败，避免打断编辑
  }
}

export function loadUiState(): UiState | null {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UiState
  } catch {
    return null
  }
}

export function saveUiState(state: UiState) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(state))
  } catch {
    // 忽略
  }
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}
