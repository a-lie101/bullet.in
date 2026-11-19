import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { errorMessage } from '../api'
import { COLUMNS, type Card, type CardChanges, type ColumnId } from '../types'

interface Props {
  card: Card
  onClose: () => void
  onSave: (changes: CardChanges, column: ColumnId) => Promise<void>
  onDelete: () => Promise<void>
}

function parseLabels(text: string): string[] {
  return [...new Set(text.split(',').map((label) => label.trim()).filter(Boolean))]
}

export function CardDialog({ card, onClose, onSave, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [dueDate, setDueDate] = useState(card.dueDate ?? '')
  const [labels, setLabels] = useState(card.labels.join(', '))
  const [column, setColumn] = useState<ColumnId>(card.column)
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // GitHub and AI cards (later phases) keep their source's title and description.
  const editable = card.source === 'manual'

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    const changes: CardChanges = {}
    if (editable && title.trim() !== card.title) changes.title = title.trim()
    if (editable && description !== card.description) changes.description = description
    if ((dueDate || null) !== card.dueDate) changes.dueDate = dueDate || null
    const parsedLabels = parseLabels(labels)
    if (parsedLabels.join('\n') !== card.labels.join('\n')) changes.labels = parsedLabels

    setBusy(true)
    setError(null)
    try {
      await onSave(changes, column)
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setBusy(true)
    try {
      await onDelete()
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  // Clicking the dimmed backdrop closes the dialog.
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="card-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={handleBackdropClick}
    >
      <form className="dialog-body" onSubmit={handleSubmit}>
        <h2 id="card-dialog-title" className="visually-hidden">
          Edit card
        </h2>

        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
            disabled={!editable}
          />
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={20000}
            disabled={!editable}
            placeholder="Add details, links, next steps…"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Column</span>
            <select value={column} onChange={(e) => setColumn(e.target.value as ColumnId)}>
              {COLUMNS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Due date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Labels</span>
          <input
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            placeholder="work, errands"
            aria-describedby="labels-hint"
          />
          <small id="labels-hint" className="muted">
            Separate labels with commas.
          </small>
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button
            type="button"
            className={`button ${confirmingDelete ? 'button--danger' : 'button--ghost-danger'}`}
            onClick={handleDelete}
            disabled={busy}
          >
            {confirmingDelete ? 'Click again to delete' : 'Delete'}
          </button>
          <span className="spacer" />
          <button type="button" className="button button--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
