import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Empty, Icon } from '../components/ui'
import { notify, useApp, uid } from '../store'
import { chime } from '../lib/sound'
import { formatDate, humanMinutes, localStamp, todayISO } from '../lib/date'

const PRESETS = [15, 25, 45, 60]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export default function Focus() {
  const { state, update, toast } = useApp()
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer')

  // countdown
  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60_000)
  const [running, setRunning] = useState(false)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  // stopwatch
  const [swBase, setSwBase] = useState(0)
  const [swStart, setSwStart] = useState<number | null>(null)
  const [laps, setLaps] = useState<string[]>([])
  const [, tick] = useState(0)

  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!running || !endAt) return
    const id = window.setInterval(() => {
      const left = endAt - Date.now()
      if (left <= 0) {
        finish()
      } else {
        setRemaining(left)
      }
    }, 250)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, endAt])

  useEffect(() => {
    if (!swStart) return
    const id = window.setInterval(() => tick((t) => t + 1), 100)
    return () => window.clearInterval(id)
  }, [swStart])

  function logSession(mins: number) {
    const rounded = Math.max(1, Math.round(mins))
    update((s) => ({
      ...s,
      sessions: [
        { id: uid(), minutes: rounded, label: label.trim() || 'Focus session', at: localStamp() },
        ...s.sessions,
      ].slice(0, 200),
    }))
  }

  function finish() {
    setRunning(false)
    setEndAt(null)
    setRemaining(minutes * 60_000)
    const mins = minutes
    logSession(mins)
    chime()
    const shown = notify('Focus block finished', `${mins} minutes done. Take a 5 minute break.`)
    toast(
      shown
        ? `Focus block finished — ${mins} min logged`
        : `Focus block finished — ${mins} min logged (enable notifications for alerts)`,
      'good',
    )
    setCelebrate(true)
    window.setTimeout(() => setCelebrate(false), 6000)
  }

  function start() {
    if (remaining <= 250) setRemaining(minutes * 60_000)
    setEndAt(Date.now() + (remaining <= 250 ? minutes * 60_000 : remaining))
    setRunning(true)
  }

  function pause() {
    if (endAt) setRemaining(Math.max(0, endAt - Date.now()))
    setRunning(false)
    setEndAt(null)
  }

  function resetTimer() {
    setRunning(false)
    setEndAt(null)
    setRemaining(minutes * 60_000)
  }

  function pickPreset(m: number) {
    setMinutes(m)
    setRemaining(m * 60_000)
    setRunning(false)
    setEndAt(null)
  }

  const durationMs = minutes * 60_000
  const progress = Math.min(100, Math.max(0, (1 - remaining / durationMs) * 100))

  const swElapsed = swBase + (swStart ? Date.now() - swStart : 0)

  const today = todayISO()
  const todaySessions = state.sessions.filter((s) => s.at.slice(0, 10) === today)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const goal = Math.max(1, state.settings.dailyGoal)

  return (
    <>
      {celebrate && (
        <div className="confetti">
          <div className="confetti-card">
            <div style={{ fontSize: 30 }}>🎉</div>
            <h3 style={{ marginTop: 6 }}>Block complete</h3>
            <p className="card-sub" style={{ marginTop: 4 }}>
              {minutes} minutes logged. Stand up, drink water, then go again.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setCelebrate(false)}>
              Back to work
            </button>
          </div>
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div className="mode-switch">
              <button className={mode === 'timer' ? 'on' : ''} onClick={() => setMode('timer')}>
                Countdown
              </button>
              <button
                className={mode === 'stopwatch' ? 'on' : ''}
                onClick={() => setMode('stopwatch')}
              >
                Stopwatch
              </button>
            </div>
            <span className="card-sub">
              {mode === 'timer' ? 'Finish a set amount of time' : 'Track open-ended deep work'}
            </span>
          </div>

          <div className="timer-face">
            <div
              className="timer-ring"
              style={
                {
                  '--p': mode === 'timer' ? progress : Math.min(100, (swElapsed % 3_600_000) / 36_000),
                } as CSSProperties
              }
            >
              <div style={{ textAlign: 'center' }}>
                <div className="timer-digits">
                  {mode === 'timer' ? fmt(remaining) : fmt(swElapsed)}
                </div>
                <div className="timer-hint">
                  {mode === 'timer'
                    ? running
                      ? 'running'
                      : 'ready'
                    : swStart
                      ? 'running'
                      : swBase
                        ? 'paused'
                        : 'ready'}
                </div>
              </div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
            {mode === 'timer' && (
              <>
                <button className="btn btn-primary" onClick={running ? pause : start}>
                  <Icon name={running ? 'pause' : 'play'} size={14} />
                  {running ? 'Pause' : remaining <= 250 ? 'Start again' : 'Start'}
                </button>
                <button className="btn" onClick={resetTimer}>
                  <Icon name="reset" size={14} /> Reset
                </button>
              </>
            )}
            {mode === 'stopwatch' && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => (swStart ? (setSwBase(swElapsed), setSwStart(null)) : setSwStart(Date.now()))}
                >
                  <Icon name={swStart ? 'pause' : 'play'} size={14} />
                  {swStart ? 'Pause' : 'Start'}
                </button>
                <button className="btn" onClick={() => setLaps([fmt(swElapsed), ...laps])} disabled={!swStart && !swBase}>
                  Lap
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setSwBase(0)
                    setSwStart(null)
                    setLaps([])
                  }}
                >
                  <Icon name="reset" size={14} /> Reset
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    logSession(swElapsed / 60_000)
                    toast(`Saved ${humanMinutes(swElapsed / 60_000)} of focus`, 'good')
                    setSwBase(0)
                    setSwStart(null)
                    setLaps([])
                  }}
                  disabled={swElapsed < 60_000}
                >
                  <Icon name="check" size={14} /> Save session
                </button>
              </>
            )}
          </div>

          {mode === 'timer' && (
            <>
              <div className="row" style={{ justifyContent: 'center', marginTop: 14, gap: 6 }}>
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    className={`preset ${minutes === p ? 'on' : ''}`}
                    onClick={() => pickPreset(p)}
                  >
                    {p} min
                  </button>
                ))}
              </div>
              <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
                <label className="tiny dim">Custom</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={240}
                  value={minutes}
                  onChange={(e) => pickPreset(Math.min(240, Math.max(1, Number(e.target.value) || 1)))}
                  style={{ width: 78 }}
                />
                <span className="tiny dim">minutes</span>
              </div>
            </>
          )}

          {mode === 'stopwatch' && laps.length > 0 && (
            <div style={{ marginTop: 16, maxHeight: 170, overflowY: 'auto' }}>
              {laps.map((l, i) => (
                <div className="lap-row" key={`${l}-${i}`}>
                  <span>Lap {laps.length - i}</span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <div className="card-title">What are you working on?</div>
            <input
              className="input"
              style={{ marginTop: 10 }}
              placeholder="e.g. Trigonometry practice paper"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <p className="tiny dim" style={{ marginTop: 8 }}>
              The label is saved with each finished session so you can see where the time went.
            </p>
          </section>

          <section className="card">
            <div className="card-head">
              <div className="card-title">Focus today</div>
              <span className="card-sub">
                {humanMinutes(todayMinutes)} / {humanMinutes(goal)}
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${Math.min(100, (todayMinutes / goal) * 100)}%` }} />
            </div>
            <div className="stack" style={{ gap: 8, marginTop: 14 }}>
              {todaySessions.length === 0 && (
                <Empty>No sessions logged today. Press start — even 15 minutes counts.</Empty>
              )}
              {todaySessions.slice(0, 6).map((s) => (
                <div className="day-row" key={s.id} style={{ padding: '8px 10px' }}>
                  <Icon name="focus" size={15} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5 }}>{s.label}</div>
                    <div className="tiny dim">
                      {formatDate(s.at.slice(0, 10))} ·{' '}
                      {new Date(s.at).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span className="badge low">{humanMinutes(s.minutes)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-title">Study rhythm that works</div>
            <ul className="card-sub" style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.75 }}>
              <li>25 minutes work, 5 minutes off. After four blocks, take 20.</li>
              <li>Put the phone in another room — not face down, another room.</li>
              <li>Write the exact next step before you stop, so restarting is easy.</li>
              <li>Same desk, same time each day beats long heroic sessions.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
