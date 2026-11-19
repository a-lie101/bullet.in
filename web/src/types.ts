export type ColumnId = 'todo' | 'in_progress' | 'blocked' | 'done'

export const COLUMNS: ReadonlyArray<{ id: ColumnId; title: string }> = [
  { id: 'todo', title: 'To do' },
  { id: 'in_progress', title: 'In progress' },
  { id: 'blocked', title: 'Blocked' },
  { id: 'done', title: 'Done' },
]

export function isColumnId(value: unknown): value is ColumnId {
  return COLUMNS.some((column) => column.id === value)
}

export interface Card {
  id: string
  title: string
  description: string
  column: ColumnId
  position: number
  source: 'manual' | 'github' | 'ai'
  externalUrl: string | null
  labels: string[]
  dueDate: string | null // YYYY-MM-DD
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CardChanges {
  title?: string
  description?: string
  dueDate?: string | null
  labels?: string[]
}

export interface User {
  id: string
  email: string
  name: string | null
  settings: { aiModel: string }
}
