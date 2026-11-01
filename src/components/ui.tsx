import { useEffect, type ReactNode } from 'react'

export type IconName =
  | 'today'
  | 'timetable'
  | 'tasks'
  | 'focus'
  | 'calendar'
  | 'resources'
  | 'assistant'
  | 'settings'
  | 'plus'
  | 'trash'
  | 'play'
  | 'pause'
  | 'reset'
  | 'check'
  | 'left'
  | 'right'
  | 'external'
  | 'search'
  | 'x'
  | 'bell'
  | 'arrow'
  | 'music'
  | 'volume'
  | 'folder'

const PATHS: Record<IconName, ReactNode> = {
  today: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.2 1.9" />
    </>
  ),
  timetable: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4M8 13.5h3M8 17h5M14 13.5h2.5" />
    </>
  ),
  tasks: (
    <>
      <path d="M9.5 11.5l2.2 2.2L20 5.5" />
      <path d="M20 12.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  focus: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.8l2.6 1.6M9.5 2h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  resources: (
    <>
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v18.5H7.5A3.5 3.5 0 0 0 4 24z" />
      <path d="M4 18.5A3.5 3.5 0 0 1 7.5 15H20" />
    </>
  ),
  assistant: (
    <>
      <path d="M11 3l1.7 4.5L17.5 9l-4.8 1.6L11 15l-1.7-4.4L4.5 9l4.8-1.5z" />
      <path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6.5h8M17.5 6.5H20M4 12h3M12.5 12H20M4 17.5h9M18.5 17.5H20" />
      <circle cx="14.5" cy="6.5" r="2.2" />
      <circle cx="9.5" cy="12" r="2.2" />
      <circle cx="15.5" cy="17.5" r="2.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M3.5 6.5h17M9 6.5V4.5h6v2M6 6.5l1 14h10l1-14" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  play: <path d="M8 5.2l11 6.8-11 6.8z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  reset: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 4.5V10h5.5" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.2 16.2L21 21" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5L6.5 9H3v6h3.5L11 19z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  folder: (
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h7.5A1.5 1.5 0 0 1 20 10v8a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 18z" />
  ),
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

export function Modal({
  title,
  sub,
  onClose,
  children,
}: {
  title: string
  sub?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="card-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>{title}</h3>
            {sub && <p className="card-sub" style={{ marginTop: 2 }}>{sub}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const SUBJECT_COLORS = [
  { bg: 'rgba(124,156,255,.2)', fg: '#cfdaff', dot: '#7c9cff' },
  { bg: 'rgba(94,234,212,.17)', fg: '#9bf6e9', dot: '#5eead4' },
  { bg: 'rgba(192,132,252,.2)', fg: '#ddbcff', dot: '#c084fc' },
  { bg: 'rgba(251,191,36,.18)', fg: '#fcd34d', dot: '#fbbf24' },
  { bg: 'rgba(251,113,133,.18)', fg: '#fda4af', dot: '#fb7185' },
  { bg: 'rgba(74,222,128,.16)', fg: '#a7f2bf', dot: '#4ade80' },
  { bg: 'rgba(56,189,248,.18)', fg: '#9adcfd', dot: '#38bdf8' },
]

export function subjectColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 9973
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length]
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
