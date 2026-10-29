export type PageWidth = 'narrow' | 'standard' | 'wide'

export type EditorMode = 'rich' | 'source'

/** 编辑区类型：markdown（可切换预览/源码）或 doc（带格式的文档） */
export type BlockType = 'markdown' | 'doc'

/** 预设宽度（px），同时用作新建编辑区的默认尺寸 */
export const BLOCK_WIDTH_PRESET: Record<PageWidth, number> = {
  narrow: 560,
  standard: 720,
  wide: 900,
}

export interface NoteBlock {
  id: string
  /** 该编辑区自己的类型 */
  type: BlockType
  markdown: string
  /** 带字体/颜色/对齐等格式时的内容（ProseMirror JSON，格式模式使用） */
  doc?: Record<string, unknown>
  /** 画布内的绝对坐标（px） */
  x: number
  y: number
  width: number
}

export interface NotePage {
  id: string
  title: string
  blocks: NoteBlock[]
  createdAt: number
  updatedAt: number
  zoom: number
  width: PageWidth
}

export interface NoteSection {
  id: string
  name: string
  color: string
  pages: NotePage[]
}

export interface Notebook {
  id: string
  name: string
  sections: NoteSection[]
}
