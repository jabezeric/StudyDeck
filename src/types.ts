export type Priority = 'low' | 'medium' | 'high'
export type EventKind = 'exam' | 'deadline' | 'holiday' | 'personal'

export type Block = {
  id: string
  subject: string
  day: number // 0 = Monday ... 6 = Sunday
  start: string // "HH:MM"
  end: string // "HH:MM"
  location?: string
}

export type Task = {
  id: string
  title: string
  subject: string
  due: string // "YYYY-MM-DD"
  priority: Priority
  done: boolean
  notes?: string
  reminder?: string // "YYYY-MM-DDTHH:MM"
}

export type DutyRepeat = 'daily' | 'weekdays' | 'weekly'

export type Duty = {
  id: string
  title: string
  repeat: DutyRepeat
  weekday?: number // 0 = Monday ... 6 = Sunday, used when repeat = 'weekly'
  time: string // "HH:MM" — when the reminder fires
  doneOn: string[] // ISO dates this duty was ticked off
  lastReminded?: string // ISO date, prevents repeat alerts the same day
  notes?: string
}

export type CalendarEvent = {
  id: string
  title: string
  date: string // "YYYY-MM-DD"
  kind: EventKind
  notes?: string
}

export type Session = {
  id: string
  minutes: number
  label: string
  at: string // ISO timestamp
}

export type Resource = {
  id: string
  name: string
  url: string
  category: string
  note: string
  custom?: boolean
}

export type Track = {
  id: string
  title: string
  source: 'url' | 'file'
  url?: string
  mime?: string
  added: string
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
}

export type AiProvider = 'offline' | 'local' | 'openai' | 'rasa'

export type Settings = {
  name: string
  dailyGoal: number
  provider: AiProvider
  apiBase: string
  apiKey: string
  model: string
  localBase: string
  localModel: string
  rasaUrl: string
  supabaseUrl: string
  supabaseKey: string
  cloudAutoSync: boolean
  cloudLastSync?: string
}

export type AppState = {
  blocks: Block[]
  tasks: Task[]
  duties: Duty[]
  events: CalendarEvent[]
  sessions: Session[]
  tracks: Track[]
  messages: Message[]
  resources: Resource[]
  onboardingDone: boolean
  settings: Settings
}
