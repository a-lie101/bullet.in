// Due dates are plain calendar days (YYYY-MM-DD) with no time zone.

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function formatDay(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const sameYear = year === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export type DueState = 'overdue' | 'today' | 'upcoming'

export function dueState(iso: string): DueState {
  const today = todayIso()
  if (iso < today) return 'overdue'
  if (iso === today) return 'today'
  return 'upcoming'
}
