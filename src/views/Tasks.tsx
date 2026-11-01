import { useState } from 'react'
import { Icon, Empty } from '../components/ui'
import { askNotificationPermission, useApp, uid } from '../store'
import {
  WEEKDAYS_LONG,
  clockLabel,
  formatDate,
  isDutyDue,
  relativeDay,
  repeatLabel,
  todayISO,
} from '../lib/date'
import type { DutyRepeat, Priority, Task } from '../types'

type Filter = 'open' | 'today' | 'overdue' | 'done'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'All open' },
  { key: 'today', label: 'Due today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'done', label: 'Done' },
]

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

export default function Tasks() {
  const { state, update, toast } = useApp()
  const [filter, setFilter] = useState<Filter>('open')
  const [form, setForm] = useState({
    title: '',
    subject: 'General',
    due: todayISO(),
    priority: 'medium' as Priority,
    reminder: '',
  })
  const [permission, setPermission] = useState<string>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [dutyForm, setDutyForm] = useState({
    title: '',
    repeat: 'weekdays' as DutyRepeat,
    weekday: 0,
    time: '18:00',
  })

  const today = todayISO()
  const subjects = Array.from(new Set(state.tasks.map((t) => t.subject))).sort()

  const filtered = state.tasks
    .filter((t) => {
      if (filter === 'open') return !t.done
      if (filter === 'today') return !t.done && t.due === today
      if (filter === 'overdue') return !t.done && t.due < today
      return t.done
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const byDate = a.due.localeCompare(b.due)
      if (byDate !== 0) return byDate
      return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority)
    })

  function add() {
    const title = form.title.trim()
    if (!title) {
      toast('What do you need to do?', 'warn')
      return
    }
    const task: Task = {
      id: uid(),
      title,
      subject: form.subject.trim() || 'General',
      due: form.due || today,
      priority: form.priority,
      done: false,
      reminder: form.reminder || undefined,
    }
    update((s) => ({ ...s, tasks: [...s.tasks, task] }))
    setForm({ ...form, title: '', reminder: '' })
    toast('Task added', 'good')
  }

  function toggle(id: string) {
    update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }))
  }

  function remove(id: string) {
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
  }

  function addDuty() {
    const title = dutyForm.title.trim()
    if (!title) {
      toast('What is the duty?', 'warn')
      return
    }
    update((s) => ({
      ...s,
      duties: [
        ...s.duties,
        {
          id: uid(),
          title,
          repeat: dutyForm.repeat,
          weekday: dutyForm.repeat === 'weekly' ? dutyForm.weekday : undefined,
          time: dutyForm.time || '18:00',
          doneOn: [],
        },
      ],
    }))
    setDutyForm({ ...dutyForm, title: '' })
    toast('Duty added — it will remind you on its schedule', 'good')
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

  function removeDuty(id: string) {
    update((s) => ({ ...s, duties: s.duties.filter((d) => d.id !== id) }))
  }

  async function enableNotifications() {
    const result = await askNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      toast('Notifications on — reminders will pop up while StudyDeck is open', 'good')
    } else if (result === 'denied') {
      toast('Notifications blocked in the browser settings', 'warn')
    }
  }

  const counts = {
    open: state.tasks.filter((t) => !t.done).length,
    today: state.tasks.filter((t) => !t.done && t.due === today).length,
    overdue: state.tasks.filter((t) => !t.done && t.due < today).length,
    done: state.tasks.filter((t) => t.done).length,
  }

  return (
    <>
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div className="card-title">New task</div>
            <span className="card-sub">Due date is enough — reminders are optional</span>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <div className="field">
              <label>What needs doing?</label>
              <input
                className="input"
                placeholder="e.g. Write up chemistry practical"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add()
                }}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Subject</label>
                <input
                  className="input"
                  list="task-subjects"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <datalist id="task-subjects">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label>Priority</label>
                <select
                  className="select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Due date</label>
                <input
                  className="input"
                  type="date"
                  value={form.due}
                  onChange={(e) => setForm({ ...form, due: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Remind me at</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.reminder}
                  onChange={(e) => setForm({ ...form, reminder: e.target.value })}
                />
              </div>
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={add}>
                <Icon name="plus" size={14} /> Add task
              </button>
              {permission !== 'granted' && permission !== 'unsupported' && (
                <button className="btn btn-ghost btn-sm" onClick={enableNotifications}>
                  <Icon name="bell" size={13} /> Enable reminders
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-title">How reminders work</div>
          <p className="card-sub" style={{ marginTop: 9, lineHeight: 1.6 }}>
            StudyDeck checks your reminders every 30 seconds and shows a desktop notification. The
            browser only allows that while the app is open in a tab or installed window, so keep it
            open during study time.
          </p>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="row" style={{ gap: 8 }}>
            <span className="badge">{counts.open} open</span>
            <span className="badge high">{counts.overdue} overdue</span>
            <span className="badge low">{counts.done} done</span>
          </div>
          {permission === 'unsupported' && (
            <p className="tiny dim" style={{ marginTop: 10 }}>
              This browser does not support notifications — in-app toasts will still appear.
            </p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head" style={{ flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 6 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`pill ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({counts[f.key]})
              </button>
            ))}
          </div>
          <span className="card-sub">
            {filtered.length} task{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="stack" style={{ gap: 9 }}>
          {filtered.length === 0 && (
            <Empty>
              {filter === 'done'
                ? 'Nothing finished yet. Tick a task off to see it here.'
                : 'Nothing here. Add a task above or clear an existing one.'}
            </Empty>
          )}
          {filtered.map((t) => (
            <div className={`task ${t.done ? 'done' : ''}`} key={t.id}>
              <button
                className={`check ${t.done ? 'on' : ''}`}
                onClick={() => toggle(t.id)}
                aria-label={`Mark ${t.title} ${t.done ? 'not done' : 'done'}`}
              >
                <Icon name="check" size={12} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <span className={`badge ${t.priority}`}>{t.priority}</span>
                  <span>{t.subject}</span>
                  <span style={{ color: !t.done && t.due < today ? 'var(--rose)' : undefined }}>
                    {relativeDay(t.due)}
                  </span>
                  {t.reminder && (
                    <span>
                      <Icon name="bell" size={11} />{' '}
                      {formatDate(t.reminder.slice(0, 10))} · {t.reminder.slice(11, 16)}
                    </span>
                  )}
                </div>
                {t.notes && <div className="tiny dim" style={{ marginTop: 5 }}>{t.notes}</div>}
              </div>
              <button className="icon-btn" onClick={() => remove(t.id)} aria-label="Delete task">
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Recurring duties</div>
            <p className="card-sub" style={{ marginTop: 3 }}>
              Chores, packing and assignment checks that come back on their own.
            </p>
          </div>
          <span className="card-sub">Reminders at the time you set</span>
        </div>

        <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 240px' }}>
            <label>Duty</label>
            <input
              className="input"
              placeholder="e.g. Check portal for new assignments"
              value={dutyForm.title}
              onChange={(e) => setDutyForm({ ...dutyForm, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addDuty()
              }}
            />
          </div>
          <div className="field" style={{ flex: '0 0 130px' }}>
            <label>Repeats</label>
            <select
              className="select"
              value={dutyForm.repeat}
              onChange={(e) =>
                setDutyForm({ ...dutyForm, repeat: e.target.value as DutyRepeat })
              }
            >
              <option value="daily">Every day</option>
              <option value="weekdays">School days</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          {dutyForm.repeat === 'weekly' && (
            <div className="field" style={{ flex: '0 0 120px' }}>
              <label>Day</label>
              <select
                className="select"
                value={dutyForm.weekday}
                onChange={(e) => setDutyForm({ ...dutyForm, weekday: Number(e.target.value) })}
              >
                {WEEKDAYS_LONG.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field" style={{ flex: '0 0 110px' }}>
            <label>Remind at</label>
            <input
              className="input"
              type="time"
              value={dutyForm.time}
              onChange={(e) => setDutyForm({ ...dutyForm, time: e.target.value })}
            />
          </div>
          <button className="btn btn-primary" onClick={addDuty}>
            <Icon name="plus" size={14} /> Add duty
          </button>
        </div>

        <div className="stack" style={{ gap: 9, marginTop: 16 }}>
          {state.duties.length === 0 && (
            <Empty>No duties yet. Add the things you forget every week.</Empty>
          )}
          {state.duties.map((d) => {
            const dueToday = isDutyDue(d.repeat, d.weekday, today)
            const done = d.doneOn.includes(today)
            return (
              <div className={`task ${done ? 'done' : ''}`} key={d.id}>
                <button
                  className={`check ${done ? 'on' : ''}`}
                  onClick={() => toggleDuty(d.id)}
                  disabled={!dueToday && !done}
                  style={!dueToday ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  aria-label={`Mark ${d.title} done today`}
                >
                  <Icon name="check" size={12} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="task-title">{d.title}</div>
                  <div className="task-meta">
                    <span>
                      <Icon name="bell" size={11} /> {clockLabel(d.time)}
                    </span>
                    <span>{repeatLabel(d.repeat, d.weekday)}</span>
                    {dueToday ? (
                      <span className={`badge ${done ? 'low' : 'medium'}`}>
                        {done ? 'done today' : 'today'}
                      </span>
                    ) : (
                      <span className="dim">not today</span>
                    )}
                  </div>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => removeDuty(d.id)}
                  aria-label="Delete duty"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
