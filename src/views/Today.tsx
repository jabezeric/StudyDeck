import { useState } from 'react'
import type { ViewKey } from '../App'
import { Icon, subjectColor } from '../components/ui'
import { useApp, uid } from '../store'
import {
  clockLabel,
  dayIndex,
  formatDate,
  humanMinutes,
  isDutyDue,
  nowMinutes,
  relativeDay,
  repeatLabel,
  timeToMin,
  todayISO,
} from '../lib/date'

export default function Today({ go, onAsk }: { go: (v: ViewKey) => void; onAsk: () => void }) {
  const { state, update, toast } = useApp()
  const [quick, setQuick] = useState('')

  const today = todayISO()
  const dayIdx = dayIndex(new Date())
  const now = nowMinutes()

  const todayBlocks = state.blocks
    .filter((b) => b.day === dayIdx)
    .sort((a, b) => timeToMin(a.start) - timeToMin(b.start))

  const todayDuties = state.duties.filter((d) => isDutyDue(d.repeat, d.weekday, today))
  const openDutyCount = todayDuties.filter((d) => !d.doneOn.includes(today)).length

  const openTasks = state.tasks.filter((t) => !t.done && t.due <= today)
  const overdue = openTasks.filter((t) => t.due < today)
  const dueToday = openTasks.filter((t) => t.due === today)
  const doneToday = state.tasks.filter((t) => t.done && t.due === today)

  const minutesToday = state.sessions
    .filter((s) => s.at.slice(0, 10) === today)
    .reduce((sum, s) => sum + s.minutes, 0)
  const goal = Math.max(1, state.settings.dailyGoal)
  const pct = Math.min(100, Math.round((minutesToday / goal) * 100))

  const current = todayBlocks.find(
    (b) => timeToMin(b.start) <= now && timeToMin(b.end) > now,
  )
  const nextBlock = todayBlocks.find((b) => timeToMin(b.start) > now)

  const upcoming = state.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = state.settings.name

  function addQuick() {
    const title = quick.trim()
    if (!title) return
    update((s) => ({
      ...s,
      tasks: [
        ...s.tasks,
        {
          id: uid(),
          title,
          subject: 'General',
          due: today,
          priority: 'medium',
          done: false,
        },
      ],
    }))
    setQuick('')
    toast('Task added for today', 'good')
  }

  function toggle(id: string) {
    update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }))
  }

  function toggleDuty(id: string) {
    update((s) => ({
      ...s,
      duties: s.duties.map((d) =>
        d.id === id
          ? {
              ...d,
              doneOn: d.doneOn.includes(today)
                ? d.doneOn.filter((x) => x !== today)
                : [...d.doneOn, today],
            }
          : d,
      ),
    }))
  }

  const nothingDue = openTasks.length === 0

  return (
    <>
      <section className="hero">
        <div style={{ flex: '1 1 320px' }}>
          <h2>
            {greeting}
            {name ? `, ${name}` : ''}.
          </h2>
          <p>
            {nothingDue
              ? 'Nothing is due today. Good day to get ahead — pick one weak topic and do 25 minutes on it.'
              : `${openTasks.length} task${openTasks.length === 1 ? '' : 's'} still open${
                  overdue.length ? ` (${overdue.length} overdue)` : ''
                }. ${current ? `${current.subject} is running now.` : nextBlock ? `Next up: ${nextBlock.subject} at ${clockLabel(nextBlock.start)}.` : 'No classes left today.'}`}
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={() => go('focus')}>
              <Icon name="play" size={14} /> Focus now
            </button>
            <button className="btn" onClick={() => go('timetable')}>
              <Icon name="timetable" size={14} /> See timetable
            </button>
            <button className="btn btn-ghost" onClick={() => go('resources')}>
              <Icon name="resources" size={14} /> Find material
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 130 }}>
          <div className="kpi">{pct}%</div>
          <div className="kpi-sub">
            {humanMinutes(minutesToday)} of {humanMinutes(goal)} focus
          </div>
          <div className="progress" style={{ marginTop: 8, width: 130 }}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <div className="grid-3">
        <div className={`card ${current ? 'now-card' : ''}`}>
          <div className="card-title">{current ? 'Happening now' : 'Next up'}</div>
          {current ? (
            <>
              <div style={{ fontSize: 19, fontWeight: 600, marginTop: 8 }}>{current.subject}</div>
              <div className="card-sub" style={{ marginTop: 3 }}>
                {clockLabel(current.start)} – {clockLabel(current.end)}
                {current.location ? ` · ${current.location}` : ''}
              </div>
            </>
          ) : nextBlock ? (
            <>
              <div style={{ fontSize: 19, fontWeight: 600, marginTop: 8 }}>{nextBlock.subject}</div>
              <div className="card-sub" style={{ marginTop: 3 }}>
                {clockLabel(nextBlock.start)} – {clockLabel(nextBlock.end)} · today
              </div>
            </>
          ) : (
            <div className="card-sub" style={{ marginTop: 8 }}>
              Your day is clear. Use the focus timer for a free study sprint.
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Open tasks</div>
          <div className="kpi" style={{ marginTop: 8 }}>
            {openTasks.length}
          </div>
          <div className="kpi-sub">
            {dueToday.length} due today · {overdue.length} overdue
            {doneToday.length ? ` · ${doneToday.length} done` : ''}
          </div>
          <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => go('tasks')}>
            Open task list <Icon name="arrow" size={13} />
          </button>
        </div>

        <div className="card">
          <div className="card-title">Next date</div>
          {upcoming[0] ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>
                {upcoming[0].title}
              </div>
              <div className="card-sub" style={{ marginTop: 3 }}>
                {relativeDay(upcoming[0].date)} · {upcoming[0].kind}
              </div>
            </>
          ) : (
            <div className="card-sub" style={{ marginTop: 8 }}>
              No exams or holidays saved yet.
            </div>
          )}
          <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => go('calendar')}>
            Open calendar <Icon name="arrow" size={13} />
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <div className="card-title">Today's schedule</div>
              <span className="card-sub">{formatDate(today)}</span>
            </div>
            {todayBlocks.length === 0 ? (
              <div className="empty">
                No blocks for today. Add classes and study sessions in the timetable.
              </div>
            ) : (
              <div className="day-list">
                {todayBlocks.map((b) => {
                  const color = subjectColor(b.subject)
                  const isNow = current?.id === b.id
                  const past = timeToMin(b.end) <= now
                  return (
                    <div
                      className="day-row"
                      key={b.id}
                      style={{
                        opacity: past ? 0.45 : 1,
                        borderColor: isNow ? 'rgba(124,156,255,.45)' : undefined,
                        background: isNow ? 'rgba(124,156,255,.08)' : undefined,
                      }}
                    >
                      <span className="dot" style={{ background: color.dot }} />
                      <span className="time">
                        {clockLabel(b.start)} – {clockLabel(b.end)}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{b.subject}</span>
                      <span className="spacer" />
                      {isNow && <span className="badge">now</span>}
                      {b.location && <span className="tiny dim">{b.location}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div className="card-title">Duties today</div>
              <span className="card-sub">
                {todayDuties.length - openDutyCount} of {todayDuties.length} done
              </span>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {todayDuties.length === 0 && (
                <div className="empty">No recurring duties scheduled for today.</div>
              )}
              {todayDuties.map((d) => {
                const done = d.doneOn.includes(today)
                return (
                  <div className={`task ${done ? 'done' : ''}`} key={d.id}>
                    <button
                      className={`check ${done ? 'on' : ''}`}
                      onClick={() => toggleDuty(d.id)}
                      aria-label={`Mark ${d.title} ${done ? 'not done' : 'done'}`}
                    >
                      <Icon name="check" size={12} />
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div className="task-title">{d.title}</div>
                      <div className="task-meta">
                        <span>
                          <Icon name="bell" size={11} /> {clockLabel(d.time)}
                        </span>
                        <span>{repeatLabel(d.repeat, d.weekday)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {todayDuties.length > 0 && openDutyCount === 0 && (
                <p className="tiny dim">All duties handled. That is the whole day sorted.</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div className="card-title">Due today & overdue</div>
              <button className="btn btn-sm btn-ghost" onClick={() => go('tasks')}>
                Manage
              </button>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {openTasks.length === 0 && <div className="empty">All clear. Nothing is due.</div>}
              {openTasks
                .slice()
                .sort((a, b) => a.due.localeCompare(b.due))
                .slice(0, 6)
                .map((t) => (
                  <div className="task" key={t.id}>
                    <button
                      className="check"
                      onClick={() => toggle(t.id)}
                      aria-label={`Mark ${t.title} done`}
                    >
                      <Icon name="check" size={12} />
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div className="task-title">{t.title}</div>
                      <div className="task-meta">
                        <span className={`badge ${t.priority}`}>{t.priority}</span>
                        <span>{t.subject}</span>
                        <span style={{ color: t.due < today ? 'var(--rose)' : undefined }}>
                          {relativeDay(t.due)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-title">Quick add a task</div>
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <input
                className="input"
                placeholder="e.g. Revise physics chapter 4"
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addQuick()
                }}
                style={{ flex: '1 1 180px' }}
              />
              <button className="btn btn-primary" onClick={addQuick}>
                <Icon name="plus" size={14} /> Add
              </button>
            </div>
            <p className="tiny dim" style={{ marginTop: 9 }}>
              It lands in tasks due today. Add a reminder from the Tasks page.
            </p>
          </section>

          <section className="card">
            <div className="card-title">Coming up</div>
            <div className="stack" style={{ gap: 9, marginTop: 12 }}>
              {upcoming.length === 0 && (
                <div className="card-sub">Add exams, deadlines and holidays in the calendar.</div>
              )}
              {upcoming.map((e) => (
                <div key={e.id} className="day-row" style={{ padding: '8px 10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{e.title}</div>
                    <div className="tiny dim">{formatDate(e.date)}</div>
                  </div>
                  <span className={`badge ${e.kind}`}>{e.kind}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-title">If you are stuck</div>
            <p className="card-sub" style={{ marginTop: 8, lineHeight: 1.55 }}>
              Open the study coach and describe the exact step where you got lost. A good question
              beats an hour of staring.
            </p>
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={onAsk}>
              <Icon name="assistant" size={14} /> Ask the coach
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
