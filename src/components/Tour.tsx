import { useEffect, useState } from 'react'
import { Icon } from './ui'
import { useApp } from '../store'
import type { ViewKey } from '../App'

type Step = {
  view: ViewKey
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    view: 'today',
    title: 'Welcome to StudyDeck',
    body: 'This is your day at a glance: what is happening now, what is due, and how much focus time you have banked. Everything is stored on this device — no sign-up, nothing uploaded.',
  },
  {
    view: 'timetable',
    title: 'Build your week',
    body: 'Click any empty spot in a day column to add a lesson or study block, then click a coloured block to edit or delete it. The red line is the current time, so you always know where you are in the day.',
  },
  {
    view: 'tasks',
    title: 'Capture homework and duties',
    body: 'Tasks are one-off pieces of work with a due date and an optional reminder. Recurring duties — packing your bag, checking the school portal — repeat on their own and reset each day.',
  },
  {
    view: 'focus',
    title: 'Start a focus block',
    body: 'Use the countdown for 25-minute sprints, or the stopwatch for open-ended work. Finished sessions are logged against your daily goal, so progress is visible instead of guessed.',
  },
  {
    view: 'calendar',
    title: 'Never miss a date',
    body: 'Add exams, deadlines, holidays and personal dates. Click any day in the month to add an event, and the Today view will surface whatever is coming next.',
  },
  {
    view: 'resources',
    title: 'Find the right material',
    body: 'Thirty-plus free study sites, AI tutors and virtual labs, filtered by subject. Add your own links too — anything you use often belongs here.',
  },
  {
    view: 'today',
    title: 'Two floating buttons',
    body: 'Bottom-right: the sparkle opens the study coach (offline by default, or connect a model in Settings), and the note opens Lock-in music with generated soundscapes and your own tracks.',
  },
  {
    view: 'settings',
    title: 'Protect your work',
    body: 'Export a backup file regularly — it is the only copy of your data. You can also rename yourself, set a daily goal, connect an AI provider, and replay this tour any time.',
  },
]

export default function Tour({
  open,
  onClose,
  onView,
}: {
  open: boolean
  onClose: () => void
  onView: (view: ViewKey) => void
}) {
  const { state, saveSettings } = useApp()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (open) {
      setIndex(0)
      onView(STEPS[0].view)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index])

  if (!open) return null

  const step = STEPS[index]
  const last = index === STEPS.length - 1

  function next() {
    if (last) {
      onClose()
      return
    }
    const nextIndex = index + 1
    setIndex(nextIndex)
    onView(STEPS[nextIndex].view)
  }

  function back() {
    if (index === 0) return
    const prev = index - 1
    setIndex(prev)
    onView(STEPS[prev].view)
  }

  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="Getting started">
      <div className="tour-card">
        <div className="tour-progress">
          {STEPS.map((s, i) => (
            <span key={s.title} className={i <= index ? 'on' : ''} />
          ))}
        </div>

        <div className="tour-head">
          <span className="badge">
            Step {index + 1} of {STEPS.length}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Skip the tutorial">
            <Icon name="x" size={16} />
          </button>
        </div>

        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>

        {index === 0 && (
          <div className="field" style={{ marginTop: 14 }}>
            <label>What should the app call you? (optional)</label>
            <input
              className="input"
              placeholder="Your first name"
              value={state.settings.name}
              onChange={(e) => saveSettings({ name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') next()
              }}
            />
          </div>
        )}

        <div className="tour-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Skip tour
          </button>
          <span className="spacer" />
          {index > 0 && (
            <button className="btn btn-sm" onClick={back}>
              <Icon name="left" size={13} /> Back
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={next} autoFocus>
            {last ? 'Start using StudyDeck' : 'Next'}
            {!last && <Icon name="right" size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}
