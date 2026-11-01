import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, Duty, Resource, Settings, Task } from './types'
import { isDutyDue, repeatLabel, todayISO } from './lib/date'

const STORAGE_KEY = 'studydeck.v1'
const NOTIFY_TITLE = 'StudyDeck'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const defaultSettings: Settings = {
  name: '',
  dailyGoal: 90,
  provider: 'offline',
  apiBase: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  localBase: 'http://localhost:11434/v1',
  localModel: 'llama3.2',
  rasaUrl: 'http://localhost:5005',
  supabaseUrl: '',
  supabaseKey: '',
  cloudAutoSync: false,
}

function seed(): AppState {
  const subjects: Record<string, [string, string, string][]> = {
    Mon: [
      ['Mathematics', '08:00', '09:30'],
      ['Physics', '09:45', '11:15'],
      ['English', '11:30', '12:30'],
      ['Computer Science', '13:30', '15:00'],
    ],
    Tue: [
      ['Chemistry', '08:00', '09:30'],
      ['Mathematics', '09:45', '11:15'],
      ['History', '11:30', '12:30'],
      ['Study block', '17:00', '18:00'],
    ],
    Wed: [
      ['Physics', '08:00', '09:30'],
      ['Computer Science', '09:45', '11:15'],
      ['English', '11:30', '12:30'],
      ['Cyber Security', '15:30', '16:30'],
    ],
    Thu: [
      ['Mathematics', '08:00', '09:30'],
      ['Chemistry', '09:45', '11:15'],
      ['Biology', '11:30', '12:30'],
      ['Study block', '17:00', '18:30'],
    ],
    Fri: [
      ['Computer Science', '08:00', '09:30'],
      ['Physics', '09:45', '11:15'],
      ['History', '11:30', '12:30'],
    ],
  }

  const blocks = Object.entries(subjects).flatMap(([dayName, rows]) => {
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(dayName)
    return rows.map(([subject, start, end], i) => ({
      id: `${dayName}-${i}-${start.replace(':', '')}`,
      subject,
      day,
      start,
      end,
    }))
  })

  const tasks: Task[] = [
    {
      id: uid(),
      title: 'Finish maths problem set (trigonometry)',
      subject: 'Mathematics',
      due: todayISO(),
      priority: 'high',
      done: false,
    },
    {
      id: uid(),
      title: 'Read chemistry chapter 4 and take notes',
      subject: 'Chemistry',
      due: todayISO(),
      priority: 'medium',
      done: false,
    },
    {
      id: uid(),
      title: 'Try 3 beginner rooms on TryHackMe',
      subject: 'Cyber Security',
      due: todayISO(),
      priority: 'low',
      done: false,
    },
  ]

  const duties: Duty[] = [
    {
      id: 'duty-bag',
      title: 'Pack school bag and check tomorrow\u2019s timetable',
      repeat: 'weekdays',
      time: '20:30',
      doneOn: [],
    },
    {
      id: 'duty-portal',
      title: 'Check the school portal for new assignments',
      repeat: 'weekly',
      weekday: 4,
      time: '16:30',
      doneOn: [],
    },
    {
      id: 'duty-desk',
      title: 'Clear desk, charge laptop, pens back in the case',
      repeat: 'daily',
      time: '21:30',
      doneOn: [],
    },
  ]

  return {
    blocks,
    tasks,
    duties,
    events: [],
    sessions: [],
    tracks: [],
    messages: [],
    resources: [],
    onboardingDone: false,
    settings: defaultSettings,
  }
}

export type Toast = { id: string; text: string; tone: 'info' | 'good' | 'warn' }

type Ctx = {
  state: AppState
  update: (fn: (s: AppState) => AppState) => void
  patch: (p: Partial<AppState>) => void
  saveSettings: (p: Partial<Settings>) => void
  addResource: (r: Omit<Resource, 'id'>) => void
  removeResource: (id: string) => void
  toasts: Toast[]
  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  resetAll: () => void
}

const StoreContext = createContext<Ctx | null>(null)

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Partial<AppState>
    const base = seed()
    return {
      ...base,
      ...parsed,
      blocks: parsed.blocks ?? base.blocks,
      tasks: parsed.tasks ?? base.tasks,
      duties: parsed.duties ?? base.duties,
      events: parsed.events ?? [],
      sessions: parsed.sessions ?? [],
      tracks: parsed.tracks ?? [],
      messages: parsed.messages ?? [],
      resources: parsed.resources ?? [],
      onboardingDone: parsed.onboardingDone ?? false,
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return seed()
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full or blocked — keep the session usable
    }
  }, [state])

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), [])
  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), [])

  const saveSettings = useCallback(
    (p: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })),
    [],
  )

  const dismissToast = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (text: string, tone: Toast['tone'] = 'info') => {
      const id = uid()
      setToasts((list) => [...list.slice(-3), { id, text, tone }])
      window.setTimeout(() => {
        setToasts((list) => list.filter((t) => t.id !== id))
      }, 5000)
    },
    [],
  )

  const addResource = useCallback((r: Omit<Resource, 'id'>) => {
    setState((s) => ({ ...s, resources: [{ ...r, id: uid(), custom: true }, ...s.resources] }))
  }, [])

  const removeResource = useCallback((id: string) => {
    setState((s) => ({ ...s, resources: s.resources.filter((r) => r.id !== id) }))
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(seed())
  }, [])

  const value = useMemo(
    () => ({
      state,
      update,
      patch,
      saveSettings,
      addResource,
      removeResource,
      toasts,
      toast,
      dismissToast,
      resetAll,
    }),
    [state, update, patch, saveSettings, addResource, removeResource, toasts, toast, dismissToast, resetAll],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useApp must be used inside StoreProvider')
  return ctx
}

export function notify(title: string, body: string): boolean {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission !== 'granted') return false
  try {
    new Notification(title, { body, tag: title + body })
    return true
  } catch {
    return false
  }
}

export async function askNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Fires browser notifications for task reminders while the app is open. */
export function useReminderLoop() {
  const { state, toast, update } = useApp()
  const fired = useRef<Set<string>>(new Set())

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const today = todayISO()

      for (const duty of state.duties) {
        if (duty.lastReminded === today) continue
        if (duty.doneOn.includes(today)) continue
        if (!isDutyDue(duty.repeat, duty.weekday, today)) continue
        const at = new Date(`${today}T${duty.time}:00`).getTime()
        if (Number.isNaN(at)) continue
        // Fire once per day, within a 12 hour window after the scheduled time.
        if (at > now || now - at >= 12 * 3600_000) continue
        const key = `duty:${duty.id}:${today}`
        if (fired.current.has(key)) continue
        fired.current.add(key)
        const shown = notify(`Duty: ${duty.title}`, `${duty.time} \u00b7 ${repeatLabel(duty.repeat, duty.weekday)}`)
        update((s) => ({
          ...s,
          duties: s.duties.map((d) => (d.id === duty.id ? { ...d, lastReminded: today } : d)),
        }))
        toast(shown ? `Reminder sent: ${duty.title}` : `Duty today: ${duty.title}`, 'warn')
      }

      for (const task of state.tasks) {
        if (!task.reminder || task.done) continue
        const at = new Date(task.reminder).getTime()
        if (Number.isNaN(at)) continue
        const key = `${task.id}:${task.reminder}`
        // Fire once, within a 12 hour window so old reminders stay quiet.
        if (at <= now && now - at < 12 * 3600_000 && !fired.current.has(key)) {
          fired.current.add(key)
          const body = `${task.subject} · due ${task.due}`
          const shown = notify(`${NOTIFY_TITLE}: ${task.title}`, body)
          toast(shown ? `Reminder sent: ${task.title}` : `Reminder: ${task.title}`, 'warn')
        }
      }
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [state.tasks, state.duties, toast, update])
}
