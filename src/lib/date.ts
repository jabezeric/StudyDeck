export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAYS_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Monday-first index for a JS date (JS getDay is Sunday-first). */
export function dayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return isoDate(new Date())
}

/** Local date+time stamp, e.g. "2026-11-01T21:40:05" (no UTC shift). */
export function localStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Parse "YYYY-MM-DD" as a local date (noon avoids DST edge cases). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0)
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[dayIndex(parseISODate(iso))]
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = parseISODate(iso)
  return `${WEEKDAYS_LONG[dayIndex(d)]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—'
  const d = parseISODate(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export function longToday(): string {
  const d = new Date()
  return `${WEEKDAYS_LONG[dayIndex(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO).getTime()
  const b = parseISODate(toISO).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function relativeDay(iso: string): string {
  const diff = daysBetween(todayISO(), iso)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  if (diff < 7) return `In ${diff} days`
  return formatDateShort(iso)
}

export function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minToTime(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m || 0).padStart(2, '0')}${suffix}`
}

export function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function humanMinutes(total: number): string {
  const round = Math.round(total)
  if (round < 60) return `${round}m`
  const h = Math.floor(round / 60)
  const m = round % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Grid of weeks (Mon-first) covering the given month. */
export function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1, 12)
  const startOffset = dayIndex(first)
  const start = addDays(first, -startOffset)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i))
  return cells
}

export function startOfWeekISO(d = new Date()): string {
  return isoDate(addDays(d, -dayIndex(d)))
}

/** Does a recurring duty fall on the given date? */
export function isDutyDue(
  repeat: 'daily' | 'weekdays' | 'weekly',
  weekday: number | undefined,
  iso: string,
): boolean {
  const idx = dayIndex(parseISODate(iso))
  if (repeat === 'daily') return true
  if (repeat === 'weekdays') return idx < 5
  return idx === (weekday ?? 0)
}

export function repeatLabel(
  repeat: 'daily' | 'weekdays' | 'weekly',
  weekday: number | undefined,
): string {
  if (repeat === 'daily') return 'Every day'
  if (repeat === 'weekdays') return 'School days'
  return `Every ${WEEKDAYS_LONG[weekday ?? 0]}`
}
