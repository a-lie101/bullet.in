import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, ColumnId } from '../types'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './CardTile'

interface Props {
  id: ColumnId
  title: string
  cardIds: string[]
  cardsById: Map<string, Card>
  onOpen: (id: string) => void
  onAdd: (column: ColumnId, title: string) => Promise<void>
}

export function BoardColumn({ id, title, cardIds, cardsById, onOpen, onAdd }: Props) {
  // The column itself is a drop target, so cards can land in an empty column.
  const { setNodeRef, isOver } = useDroppable({ id })
  const headingId = `column-${id}`

  return (
    <section className={`column${isOver ? ' column--over' : ''}`} aria-labelledby={headingId}>
      <header className="column-header">
        <span className={`column-dot column-dot--${id}`} aria-hidden="true" />
        <h2 id={headingId}>{title}</h2>
        <span className="column-count" aria-label={`${cardIds.length} cards`}>
          {cardIds.length}
        </span>
      </header>

      <SortableContext id={id} items={cardIds} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="column-cards">
          {cardIds.map((cardId) => {
            const card = cardsById.get(cardId)
            return card ? <SortableCard key={cardId} card={card} onOpen={onOpen} /> : null
          })}
        </ul>
      </SortableContext>

      <AddCardForm onAdd={(cardTitle) => onAdd(id, cardTitle)} />
    </section>
  )
}
