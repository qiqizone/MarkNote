import { useState } from 'react'
import type { NoteSection } from '../types'

interface Props {
  sections: NoteSection[]
  activeSectionId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
}

export default function SectionTabs({
  sections,
  activeSectionId,
  onSelect,
  onAdd,
  onRename,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startRename = (section: NoteSection) => {
    setEditingId(section.id)
    setDraft(section.name)
  }

  const commit = () => {
    if (editingId) {
      const name = draft.trim()
      if (name) onRename(editingId, name)
    }
    setEditingId(null)
  }

  return (
    <div className="section-tabs" role="tablist" aria-label="分区">
      {sections.map((section) => {
        const active = section.id === activeSectionId

        if (editingId === section.id) {
          return (
            <input
              key={section.id}
              className="section-rename"
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commit()
                if (event.key === 'Escape') setEditingId(null)
              }}
            />
          )
        }

        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`section-tab${active ? ' active' : ''}`}
            style={{ '--tab-color': section.color } as React.CSSProperties}
            title="双击可重命名"
            onClick={() => onSelect(section.id)}
            onDoubleClick={() => startRename(section)}
          >
            <span className="section-dot" />
            {section.name}
          </button>
        )
      })}
      <button type="button" className="section-add" onClick={onAdd} title="新建分区">
        ＋
      </button>
    </div>
  )
}
