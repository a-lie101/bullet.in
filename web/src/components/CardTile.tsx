import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KeyboardEvent } from 'react'
import { dueState, formatDay } from '../dates'
import type { Card } from '../types'

// What a card shows. Shared by the board and the drag preview.
export function CardContent({ card }: { card: Card }) {
  const due = card.dueDate && card.column !== 'done' ? dueState(card.dueDate) : null

  return (
    <>
      <p className="card-title">{card.title}</p>
      {(card.dueDate || card.labels.length > 0 || card.description) && (
        <div className="card-meta">
          {card.dueDate && (
            <span className={`chip chip--due${due ? ` chip--${due}` : ''}`}>
              {due === 'overdue' ? 'Overdue · ' : due === 'today' ? 'Today · ' : ''}
              {formatDay(card.dueDate)}
            </span>
          )}
          {card.labels.map((label) => (
            <span key={label} className="chip">
              {label}
            </span>
          ))}
          {card.description && (
            <span className="card-has-notes" title="Has notes" aria-label="Has notes">
              ≡
            </span>
          )}
        </div>
      )}
    </>
  )
}

export function SortableCard({ card, onOpen }: { card: Card; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    // Space picks the card up to move it; Enter opens it.
    listeners?.onKeyDown?.(event)
    if (event.key === 'Enter' && !isDragging && !event.defaultPrevented) {
      // Without this, the same Enter press reaches the dialog's title field
      // once it opens and submits (closes) it straight away.
      event.preventDefault()
      onOpen(card.id)
    }
  }

  return (
    <li
      ref={setNodeRef}
      className={`card${isDragging ? ' card--placeholder' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="card"
      aria-label={card.title}
      onKeyDown={handleKeyDown}
      onClick={() => onOpen(card.id)}
    >
      <CardContent card={card} />
    </li>
  )
}
