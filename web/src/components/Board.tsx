import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type KeyboardCoordinateGetter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, api, errorMessage } from '../api'
import { COLUMNS, isColumnId, type Card, type CardChanges, type ColumnId, type User } from '../types'
import { BoardColumn } from './BoardColumn'
import { CardDialog } from './CardDialog'
import { CardContent } from './CardTile'

// Card IDs in display order, per column.
type Layout = Record<ColumnId, string[]>

function layoutFromCards(cards: Card[]): Layout {
  const layout: Layout = { todo: [], in_progress: [], blocked: [], done: [] }
  for (const card of [...cards].sort((a, b) => a.position - b.position)) layout[card.column].push(card.id)
  return layout
}

function columnOf(layout: Layout, id: UniqueIdentifier): ColumnId | undefined {
  if (isColumnId(id)) return id
  return COLUMNS.find((column) => layout[column.id].includes(String(id)))?.id
}

const screenReaderInstructions = {
  draggable:
    'To move a card, press Space to pick it up, use the arrow keys to move it, and press Space again to drop it. Press Escape to cancel. Press Enter to open the card.',
}

function columnTitle(column: ColumnId | undefined): string {
  return COLUMNS.find((option) => option.id === column)?.title ?? 'the board'
}

function applyLayout(cards: Card[], layout: Layout): Card[] {
  const placement = new Map<string, { column: ColumnId; position: number }>()
  for (const { id: column } of COLUMNS) {
    layout[column].forEach((cardId, position) => placement.set(cardId, { column, position }))
  }
  return cards.map((card) => {
    const place = placement.get(card.id)
    return place ? { ...card, ...place } : card
  })
}

export function Board({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [cards, setCards] = useState<Card[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  // While dragging, the board shows this layout instead of the saved one.
  const [dragLayout, setDragLayout] = useState<Layout | null>(null)
  const dragLayoutRef = useRef<Layout | null>(null)
  const latestMove = useRef(0)

  const cardsById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards])
  const savedLayout = useMemo(() => layoutFromCards(cards), [cards])
  const layout = dragLayout ?? savedLayout
  const activeCard = activeId ? cardsById.get(activeId) : undefined
  const openCard = openCardId ? cardsById.get(openCardId) : undefined

  // Left/Right arrows jump to the neighbouring column; Up/Down reorder within it.
  // (dnd-kit's default treats the card's own column edge as "to the left".)
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') {
      return sortableKeyboardCoordinates(event, args)
    }
    event.preventDefault()
    const current = dragLayoutRef.current
    const { active, droppableRects } = args.context
    if (!current || !active) return undefined
    const index = COLUMNS.findIndex((column) => column.id === columnOf(current, active.id))
    const next = COLUMNS[index + (event.code === 'ArrowRight' ? 1 : -1)]
    const rect = next ? droppableRects.get(next.id) : undefined
    return rect ? { x: rect.left + 4, y: rect.top + 4 } : undefined
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch screens, press and hold to drag so normal swipes still scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  // What screen readers hear while dragging, using card titles instead of IDs.
  const titleOf = (id: UniqueIdentifier) => cardsById.get(String(id))?.title ?? 'Card'
  const columnUnder = (id: UniqueIdentifier) => columnTitle(columnOf(dragLayoutRef.current ?? savedLayout, id))
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over ${columnUnder(over.id)}.` : `${titleOf(active.id)} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} dropped in ${columnUnder(over.id)}.` : `${titleOf(active.id)} put back.`,
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  }

  function handleError(caught: unknown) {
    if (caught instanceof ApiError && caught.status === 401) {
      onSignedOut()
      return
    }
    setError(errorMessage(caught))
  }

  async function loadCards() {
    try {
      const response = await api.listCards()
      setCards(response.cards)
      setError(null)
    } catch (caught) {
      handleError(caught)
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    void loadCards()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, [])

  function setDrag(next: Layout | null) {
    dragLayoutRef.current = next
    setDragLayout(next)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDrag(savedLayout)
    setActiveId(String(active.id))
  }

  // Moving over another column: move the card there in the preview layout.
  function handleDragOver({ active, over }: DragOverEvent) {
    const current = dragLayoutRef.current
    if (!current || !over) return
    const from = columnOf(current, active.id)
    const to = columnOf(current, over.id)
    if (!from || !to || from === to) return

    const cardId = String(active.id)
    const target = current[to].filter((id) => id !== cardId)
    let index = target.indexOf(String(over.id))
    if (index === -1) {
      index = target.length // over the column itself, not a card
    } else {
      const dragged = active.rect.current.translated
      if (dragged && dragged.top > over.rect.top + over.rect.height / 2) index += 1
    }
    target.splice(index, 0, cardId)
    setDrag({ ...current, [from]: current[from].filter((id) => id !== cardId), [to]: target })
  }

  function endDrag() {
    setDrag(null)
    setActiveId(null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const current = dragLayoutRef.current
    endDrag()
    if (!current || !over) return

    const cardId = String(active.id)
    const column = columnOf(current, cardId)
    const card = cardsById.get(cardId)
    if (!column || !card) return

    // Reordering within the column happens on drop.
    let ids = current[column]
    if (!isColumnId(over.id) && columnOf(current, over.id) === column) {
      const from = ids.indexOf(cardId)
      const to = ids.indexOf(String(over.id))
      if (to !== -1 && from !== to) ids = arrayMove(ids, from, to)
    }
    const index = ids.indexOf(cardId)
    if (card.column === column && savedLayout[column].indexOf(cardId) === index) return

    setCards((previous) => applyLayout(previous, { ...current, [column]: ids }))
    void saveMove(cardId, column, index)
  }

  async function saveMove(cardId: string, column: ColumnId, index: number) {
    const moveNumber = ++latestMove.current
    try {
      const response = await api.moveCard(cardId, column, index)
      // Ignore stale responses if another move happened in the meantime.
      if (moveNumber === latestMove.current) setCards(response.cards)
    } catch (caught) {
      handleError(caught)
      void loadCards()
    }
  }

  async function addCard(column: ColumnId, title: string) {
    try {
      const { card } = await api.createCard(title, column)
      setCards((previous) => [...previous, card])
    } catch (caught) {
      handleError(caught)
      throw caught
    }
  }

  // For the card dialog, which shows other errors itself: a 401 means the
  // session has ended, so sign out as the rest of the board does.
  function signOutOn401(caught: unknown) {
    if (caught instanceof ApiError && caught.status === 401) {
      onSignedOut()
      return
    }
    throw caught
  }

  async function saveCard(card: Card, changes: CardChanges, column: ColumnId) {
    try {
      if (Object.keys(changes).length > 0) {
        const { card: updated } = await api.updateCard(card.id, changes)
        setCards((previous) => previous.map((existing) => (existing.id === updated.id ? updated : existing)))
      }
      if (column !== card.column) {
        // Changing the column from the dialog puts the card at the bottom.
        const response = await api.moveCard(card.id, column, savedLayout[column].length)
        setCards(response.cards)
      }
    } catch (caught) {
      signOutOn401(caught)
    }
  }

  async function deleteCard(card: Card) {
    try {
      await api.deleteCard(card.id)
      setCards((previous) => previous.filter((existing) => existing.id !== card.id))
    } catch (caught) {
      signOutOn401(caught)
    }
  }

  async function signOut() {
    await api.logout().catch(() => {})
    onSignedOut()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          bullet.in
        </div>
        <div className="header-right">
          <span className="muted header-user">{user.name ?? user.email}</span>
          <button className="button button--ghost button--small" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button className="link-button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <main className="board" aria-busy={!loaded}>
        <DndContext
          sensors={sensors}
          accessibility={{ announcements, screenReaderInstructions }}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={endDrag}
        >
          {COLUMNS.map((column) => (
            <BoardColumn
              key={column.id}
              id={column.id}
              title={column.title}
              cardIds={layout[column.id]}
              cardsById={cardsById}
              onOpen={setOpenCardId}
              onAdd={addCard}
            />
          ))}
          <DragOverlay>
            {activeCard ? (
              <div className="card card--overlay">
                <CardContent card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {openCard && (
        <CardDialog
          key={openCard.id}
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onSave={(changes, column) => saveCard(openCard, changes, column)}
          onDelete={() => deleteCard(openCard)}
        />
      )}
    </div>
  )
}
