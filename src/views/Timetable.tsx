import { useEffect, useState } from 'react'
import { Empty, Icon, Modal, subjectColor } from '../components/ui'
import { useApp, uid } from '../store'
import {
  WEEKDAYS,
  addDays,
  clockLabel,
  dayIndex,
  nowMinutes,
  startOfWeekISO,
  timeToMin,
} from '../lib/date'
import type { Block } from '../types'

const START_HOUR = 6
const END_HOUR = 23
const PX_PER_HOUR = 56
const GRID_PX = (END_HOUR - START_HOUR) * PX_PER_HOUR

type Draft = {
  id?: string
  subject: string
  day: number
  start: string
  end: string
  location: string
}

const emptyDraft = (day: number): Draft => ({
  subject: '',
  day,
  start: '16:00',
  end: '17:00',
  location: '',
})

export default function Timetable() {
  const { state, update, toast } = useApp()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const todayIdx = dayIndex(new Date())
  const now = nowMinutes()
  const weekStart = startOfWeekISO()
  const weekDates = WEEKDAYS.map((_, i) =>
    (() => {
      const d = addDays(new Date(weekStart + 'T12:00:00'), i)
      return d.getDate()
    })(),
  )

  const subjects = Array.from(new Set(state.blocks.map((b) => b.subject))).sort()

  function save() {
    if (!draft) return
    const subject = draft.subject.trim()
    if (!subject) {
      toast('Give the block a subject name', 'warn')
      return
    }
    if (timeToMin(draft.end) <= timeToMin(draft.start)) {
      toast('End time must be after start time', 'warn')
      return
    }
    const block: Block = {
      id: draft.id ?? uid(),
      subject,
      day: draft.day,
      start: draft.start,
      end: draft.end,
      location: draft.location.trim() || undefined,
    }
    update((s) => ({
      ...s,
      blocks: draft.id ? s.blocks.map((b) => (b.id === block.id ? block : b)) : [...s.blocks, block],
    }))
    setDraft(null)
    toast(draft.id ? 'Block updated' : 'Block added to your week', 'good')
  }

  function remove(id: string) {
    update((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }))
    setDraft(null)
    toast('Block removed')
  }

  return (
    <>
      <section className="card tight">
        <div className="row">
          <button
            className="btn btn-primary"
            onClick={() => setDraft(emptyDraft(todayIdx))}
          >
            <Icon name="plus" size={14} /> Add block
          </button>
          <span className="card-sub">
            Click a block to edit it. Blocks are just coloured time slots — no drag needed.
          </span>
          <span className="spacer" />
          <span className="badge">
            <Icon name="bell" size={11} /> {state.blocks.length} blocks
          </span>
        </div>
      </section>

      <div className="timeline-wrap">
        <div className="timeline">
          <div className="tl-head" />
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={`tl-head ${i === todayIdx ? 'today' : ''}`}>
              {day}
              <span className="tl-date">{weekDates[i]}</span>
            </div>
          ))}

          <div className="tl-gutter" style={{ height: GRID_PX }}>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i)
              .slice(1)
              .map((i) => (
                <span
                  key={i}
                  className="tl-hour-label"
                  style={{ top: i * PX_PER_HOUR }}
                >
                  {String(START_HOUR + i).padStart(2, '0')}:00
                </span>
              ))}
          </div>

          {WEEKDAYS.map((day, dayIdx) => {
            const blocks = state.blocks
              .filter((b) => b.day === dayIdx)
              .sort((a, b) => timeToMin(a.start) - timeToMin(b.start))

            return (
              <div
                key={day}
                className={`tl-day ${dayIdx === todayIdx ? 'today' : ''}`}
                style={{ height: GRID_PX }}
                onClick={() => setDraft(emptyDraft(dayIdx))}
              >
                {blocks.map((b) => {
                  const color = subjectColor(b.subject)
                  const top = ((timeToMin(b.start) - START_HOUR * 60) / 60) * PX_PER_HOUR
                  const height = Math.max(
                    22,
                    ((timeToMin(b.end) - timeToMin(b.start)) / 60) * PX_PER_HOUR - 2,
                  )
                  return (
                    <button
                      key={b.id}
                      className="tl-block"
                      style={{
                        top,
                        height,
                        background: color.bg,
                        color: color.fg,
                        borderColor: 'rgba(255,255,255,.07)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setDraft({
                          id: b.id,
                          subject: b.subject,
                          day: b.day,
                          start: b.start,
                          end: b.end,
                          location: b.location ?? '',
                        })
                      }}
                      title={`${b.subject} · ${clockLabel(b.start)}–${clockLabel(b.end)}`}
                    >
                      <span className="tl-subject">{b.subject}</span>
                      <span className="tl-time">
                        {b.start}–{b.end}
                      </span>
                    </button>
                  )
                })}
                {dayIdx === todayIdx && now >= START_HOUR * 60 && now <= END_HOUR * 60 && (
                  <div
                    className="tl-now"
                    style={{ top: ((now - START_HOUR * 60) / 60) * PX_PER_HOUR }}
                    data-tick={tick}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {state.blocks.length === 0 && (
        <Empty>No blocks yet. Add your school lessons and study sessions to build the week.</Empty>
      )}

      {draft && (
        <Modal
          title={draft.id ? 'Edit block' : 'New block'}
          sub="Classes, study sessions, tutoring — anything with a start and end."
          onClose={() => setDraft(null)}
        >
          <div className="stack" style={{ gap: 13 }}>
            <div className="field">
              <label>Subject or activity</label>
              <input
                className="input"
                list="subjects"
                autoFocus
                placeholder="Mathematics, Physics, Study block…"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                }}
              />
              <datalist id="subjects">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Day</label>
                <select
                  className="select"
                  value={draft.day}
                  onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Room / place (optional)</label>
                <input
                  className="input"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="Lab 2, home desk…"
                />
              </div>
              <div className="field">
                <label>Start</label>
                <input
                  className="input"
                  type="time"
                  value={draft.start}
                  onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                />
              </div>
              <div className="field">
                <label>End</label>
                <input
                  className="input"
                  type="time"
                  value={draft.end}
                  onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            {draft.id && (
              <button className="btn btn-danger" onClick={() => remove(draft.id!)}>
                <Icon name="trash" size={14} /> Delete
              </button>
            )}
            <span className="spacer" />
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save}>
              {draft.id ? 'Save changes' : 'Add block'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
