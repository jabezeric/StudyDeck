import { useEffect, useState } from 'react'
import { Icon, type IconName } from './components/ui'
import Tour from './components/Tour'
import { useApp, useReminderLoop } from './store'
import { useCloudSync } from './lib/useCloudSync'
import { longToday, todayISO } from './lib/date'
import Today from './views/Today'
import Timetable from './views/Timetable'
import Tasks from './views/Tasks'
import Focus from './views/Focus'
import CalendarView from './views/CalendarView'
import Resources from './views/Resources'
import Assistant from './views/Assistant'
import Music from './views/Music'
import SettingsView from './views/Settings'

export type ViewKey =
  | 'today'
  | 'timetable'
  | 'tasks'
  | 'focus'
  | 'calendar'
  | 'resources'
  | 'settings'

const NAV: { key: ViewKey; label: string; icon: IconName; title: string }[] = [
  { key: 'today', label: 'Today', icon: 'today', title: 'Today' },
  { key: 'timetable', label: 'Timetable', icon: 'timetable', title: 'Timetable' },
  { key: 'tasks', label: 'Tasks', icon: 'tasks', title: 'Tasks & reminders' },
  { key: 'focus', label: 'Focus', icon: 'focus', title: 'Focus timer' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar', title: 'Calendar' },
  { key: 'resources', label: 'Resources', icon: 'resources', title: 'Resources & labs' },
  { key: 'settings', label: 'Settings', icon: 'settings', title: 'Settings' },
]

export default function App() {
  const [view, setView] = useState<ViewKey>('today')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourView, setTourView] = useState<ViewKey>('today')

  const openAssistant = (next: boolean) => {
    setAssistantOpen(next)
    if (next) setMusicOpen(false)
  }
  const openMusic = (next: boolean) => {
    setMusicOpen(next)
    if (next) setAssistantOpen(false)
  }
  const { state, toasts, dismissToast, update } = useApp()
  useReminderLoop()
  useCloudSync()

  useEffect(() => {
    if (!state.onboardingDone) setTourOpen(true)
  }, [state.onboardingDone])

  function finishTour() {
    update((s) => ({ ...s, onboardingDone: true }))
    setTourOpen(false)
  }

  const active = NAV.find((n) => n.key === view)!
  const todayMinutes = state.sessions
    .filter((s) => s.at.slice(0, 10) === todayISO())
    .reduce((sum, s) => sum + s.minutes, 0)
  const pct = Math.min(100, Math.round((todayMinutes / Math.max(1, state.settings.dailyGoal)) * 100))

  const go = (next: ViewKey) => {
    setView(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SD</div>
          <div>
            <div className="brand-name">StudyDeck</div>
            <div className="brand-sub">plan · focus · learn</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''} ${
                tourOpen && tourView === item.key ? 'tour-focus' : ''
              }`}
              onClick={() => go(item.key)}
              title={item.label}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="mini-goal">
            <div className="mini-goal-label">
              <span>Focus today</span>
              <span className="mono">{pct}%</span>
            </div>
            <div className="progress">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="tiny dim" style={{ marginTop: 7 }}>
              {Math.round(todayMinutes)} of {state.settings.dailyGoal} min
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{active.title}</h1>
            <div className="date">{view === 'today' ? longToday() : subtitle(view, state.settings.name)}</div>
          </div>
          {view === 'today' && (
            <button className="btn btn-primary" onClick={() => go('focus')}>
              <Icon name="play" size={15} /> Start a focus block
            </button>
          )}
          {view === 'tasks' && (
            <button className="btn btn-primary" onClick={() => go('today')}>
              <Icon name="today" size={15} /> Back to today
            </button>
          )}
        </header>

        <div className="content">
          {view === 'today' && <Today go={go} onAsk={() => openAssistant(true)} />}
          {view === 'timetable' && <Timetable />}
          {view === 'tasks' && <Tasks />}
          {view === 'focus' && <Focus />}
          {view === 'calendar' && <CalendarView />}
          {view === 'resources' && <Resources />}
          {view === 'settings' && <SettingsView onStartTour={() => setTourOpen(true)} />}
        </div>
      </main>

      <Tour
        open={tourOpen}
        onClose={finishTour}
        onView={(next) => {
          setTourView(next)
          go(next)
        }}
      />

      <Music open={musicOpen} onOpenChange={openMusic} />
      <Assistant open={assistantOpen} onOpenChange={openAssistant} />

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`} onClick={() => dismissToast(t.id)}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function subtitle(view: ViewKey, name: string): string {
  const who = name ? `${name}, ` : ''
  switch (view) {
    case 'timetable':
      return 'Drag-free weekly plan — click any block to edit it'
    case 'tasks':
      return 'Everything you owe, with reminders that actually fire'
    case 'focus':
      return 'Stopwatch for deep work, countdown for sprints'
    case 'calendar':
      return `${who}exams, deadlines and holidays in one place`
    case 'resources':
      return 'Hand-picked free study sites, AI tutors and virtual labs'
    case 'settings':
      return 'Your data stays on this computer'
    default:
      return ''
  }
}
