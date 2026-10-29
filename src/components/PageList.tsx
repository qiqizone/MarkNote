import type { NoteSection } from '../types'

interface Props {
  sections: NoteSection[]
  activeSectionId: string
  activePageId: string
  query: string
  onSelect: (sectionId: string, pageId: string) => void
  onAdd: () => void
  onDelete: (pageId: string) => void
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

export default function PageList({
  sections,
  activeSectionId,
  activePageId,
  query,
  onSelect,
  onAdd,
  onDelete,
}: Props) {
  const keyword = query.trim().toLowerCase()
  const searching = keyword.length > 0
  const activeSection = sections.find((section) => section.id === activeSectionId)

  const items = searching
    ? sections.flatMap((section) =>
        section.pages
          .filter(
            (page) =>
              page.title.toLowerCase().includes(keyword) ||
              page.blocks.some(
                (block) =>
                  block.markdown.toLowerCase().includes(keyword) ||
                  (block.doc ? JSON.stringify(block.doc).toLowerCase().includes(keyword) : false),
              ),
          )
          .map((page) => ({ section, page })),
      )
    : (activeSection?.pages ?? []).map((page) => ({
        section: activeSection as NoteSection,
        page,
      }))

  return (
    <aside className="pages">
      <div className="pages-head">
        <div className="pages-title">
          {searching ? '搜索结果' : activeSection?.name ?? '页面'}
          <span className="pages-count">{items.length}</span>
        </div>
        <button type="button" className="pages-add" onClick={onAdd} title="新建页面">
          ＋
        </button>
      </div>

      <div className="page-list">
        {items.length === 0 && (
          <div className="page-empty">
            {searching ? '没有匹配的页面' : '这个分区还没有页面'}
          </div>
        )}

        {items.map(({ section, page }) => {
          const active = !searching && page.id === activePageId
          return (
            <button
              key={page.id}
              type="button"
              className={`page-item${active ? ' active' : ''}`}
              onClick={() => onSelect(section.id, page.id)}
            >
              <span className="page-title">{page.title}</span>
              <span className="page-sub">
                {searching ? `${section.name} · ` : ''}
                {formatDate(page.updatedAt)}
              </span>
              <span
                className="page-del"
                role="button"
                aria-label="删除页面"
                title="删除页面"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(page.id)
                }}
              >
                ×
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
