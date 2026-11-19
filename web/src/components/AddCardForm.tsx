import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

export function AddCardForm({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  // Saves run one after another so quickly-typed cards keep their order.
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    // Clear right away (the form stays open for the next card) so typing
    // never waits on the server.
    setTitle('')
    saveQueue.current = saveQueue.current
      .then(() => onAdd(trimmed))
      .catch(() => {
        // The board shows the error; put the text back so it can be retried.
        setTitle((current) => current || trimmed)
      })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    } else if (event.key === 'Escape') {
      setOpen(false)
      setTitle('')
    }
  }

  if (!open) {
    return (
      <button className="add-card-button" onClick={() => setOpen(true)}>
        + Add a card
      </button>
    )
  }

  return (
    <form className="add-card-form" onSubmit={submit}>
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs doing?"
        aria-label="New card title"
        maxLength={300}
        rows={2}
        autoFocus
      />
      <div className="add-card-actions">
        <button className="button button--primary button--small" type="submit" disabled={!title.trim()}>
          Add card
        </button>
        <button
          className="button button--ghost button--small"
          type="button"
          onClick={() => {
            setOpen(false)
            setTitle('')
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
