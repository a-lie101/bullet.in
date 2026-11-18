import type { Card, CardChanges, ColumnId, User } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the bullet.in server. Is it running?")
  }

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? `Request failed (${response.status})`)
  }
  return data as T
}

export const api = {
  authStatus: () => request<{ registrationOpen: boolean; needsSetup: boolean }>('GET', '/auth/status'),
  me: () => request<{ user: User }>('GET', '/auth/me'),
  login: (email: string, password: string) => request<{ user: User }>('POST', '/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    request<{ user: User }>('POST', '/auth/register', { email, password, ...(name.trim() ? { name } : {}) }),
  logout: () => request<void>('POST', '/auth/logout'),

  listCards: () => request<{ cards: Card[] }>('GET', '/cards'),
  createCard: (title: string, column: ColumnId) => request<{ card: Card }>('POST', '/cards', { title, column }),
  updateCard: (id: string, changes: CardChanges) => request<{ card: Card }>('PATCH', `/cards/${id}`, changes),
  moveCard: (id: string, column: ColumnId, index: number) =>
    request<{ cards: Card[] }>('POST', `/cards/${id}/move`, { column, index }),
  deleteCard: (id: string) => request<void>('DELETE', `/cards/${id}`),
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}
