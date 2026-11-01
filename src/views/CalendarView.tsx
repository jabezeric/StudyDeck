import { useState } from 'react'
import { Empty, Icon, Modal } from '../components/ui'
import { useApp, uid } from '../store'
import {
  MONTHS,
  WEEKDAYS_LONG,
  formatDate,
  isoDate,
  monthMatrix,
  parseISODate,
  relativeDay,
  todayISO,
} from '../lib/date'
import type { CalendarEvent, EventKind } from '../types'

const KINDS: EventKind[] = ['exam', 'deadline', 'holiday', 'personal']

export default function CalendarView() {
  const { state, update, toast } = useApp()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [draft, setDraft] = useState<{ date: string; title: string; kind: EventKind; notes: string } | null>(
    null,
  )

  const today = todayISO()
  const cells = monthMatrix(cursor.year, cursor.month)

  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const e of state.events) {
    const list = eventsByDate.get(e.date) ?? []
    list.push(e)
    eventsByDate.set(e.date, list)
  }

  const upcoming = state.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  function move(delta: number) {
    setCursor((c) => {
      const m = c.month + delta
      const year = c.year + Math.floor(m / 12)
      const month = ((m % 12) + 12) % 12
      return { year, month }
    })
  }

  function save() {
    if (!draft) return
    const title = draft.title.trim()
    if (!title) {
      toast('Give the event a name', 'warn')
      return
    }
    update((s) => ({
      ...s,
      events: [
        ...s.events,
        {
          id: uid(),
          title,
          date: draft.date,
          kind: draft.kind,
          notes: draft.notes.trim() || undefined,
        },
      ],
    }))
    setDraft(null)
    toast('Saved to your calendar', 'good')
  }

  function remove(id: string) {
    update((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }))
  }

  return (
    <>
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div className="row" style={{ gap: 4 }}>
              <button className="icon-btn" onClick={() => move(-1)} aria-label="Previous month">
                <Icon name="left" size={16} />
              </button>
              <button className="icon-btn" onClick={() => move(1)} aria-label="Next month">
                <Icon name="right" size={16} />
              </button>
              <h3 style={{ fontSize: 17, marginLeft: 6 }}>
                {MONTHS[cursor.month]} {cursor.year}
              </h3>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  const d = new Date()
                  setCursor({ year: d.getFullYear(), month: d.getMonth() })
                }}
              >
                Today
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setDraft({ date: today, title: '', kind: 'exam', notes: '' })}
              >
                <Icon name="plus" size={13} /> Add event
              </button>
            </div>
          </div>

          <div className="month-head">
            {WEEKDAYS_LONG.map((d) => (
              <div key={d}>{d.slice(0, 3)}</div>
            ))}
          </div>

          <div className="month-grid">
            {cells.map((cell) => {
              const iso = isoDate(cell)
              const inMonth = cell.getMonth() === cursor.month
              const dayEvents = eventsByDate.get(iso) ?? []
              return (
                <button
                  key={iso}
                  className={`month-cell ${inMonth ? '' : 'other'} ${iso === today ? 'today' : ''}`}
                  onClick={() => setDraft({ date: iso, title: '', kind: 'exam', notes: '' })}
                  title="Click to add an event"
                >
                  <span className="cell-num">{cell.getDate()}</span>
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className={`evt ${e.kind}`}>
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="tiny dim">+{dayEvents.length - 3} more</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <div className="card-title">Coming up</div>
              <span className="card-sub">{state.events.length} saved</span>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {upcoming.length === 0 && <Empty>No events yet. Exams, deadlines and holidays go here.</Empty>}
              {upcoming.map((e) => (
                <div className="task" key={e.id} style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="task-title">{e.title}</div>
                    <div className="task-meta">
                      <span className={`badge ${e.kind}`}>{e.kind}</span>
                      <span>{formatDate(e.date)}</span>
                      <span>{relativeDay(e.date)}</span>
                    </div>
                    {e.notes && <div className="tiny dim" style={{ marginTop: 4 }}>{e.notes}</div>}
                  </div>
                  <button className="icon-btn" onClick={() => remove(e.id)} aria-label="Delete event">
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-title">Colour code</div>
            <div className="stack" style={{ gap: 8, marginTop: 12 }}>
              {KINDS.map((k) => (
                <div className="row" key={k} style={{ gap: 8 }}>
                  <span className={`badge ${k}`}>{k}</span>
                  <span className="tiny dim">
                    {k === 'exam'
                      ? 'Tests, mocks, oral exams'
                      : k === 'deadline'
                        ? 'Homework, projects, applications'
                        : k === 'holiday'
                          ? 'School holidays and days off'
                          : 'Birthdays, trips, anything else'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {draft && (
        <Modal
          title="New calendar event"
          sub={formatDate(draft.date)}
          onClose={() => setDraft(null)}
        >
          <div className="stack" style={{ gap: 13 }}>
            <div className="field">
              <label>Title</label>
              <input
                className="input"
                autoFocus
                placeholder="e.g. Maths mid-term"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                }}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Date</label>
                <input
                  className="input"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Type</label>
                <select
                  className="select"
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as EventKind })}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field full">
                <label>Notes (optional)</label>
                <textarea
                  className="textarea"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Chapters 1–4, bring calculator…"
                />
              </div>
            </div>
            <p className="tiny dim">
              Studying for {parseISODate(draft.date).toLocaleDateString(undefined, { weekday: 'long' })}{' '}
              — add review blocks to your timetable a few days before.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save}>
              Add event
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
