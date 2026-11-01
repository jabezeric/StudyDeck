import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Icon, Modal } from '../components/ui'
import { askNotificationPermission, useApp } from '../store'
import {
  applyCloudPayload,
  cloudClient,
  getSnapshotInfo,
  pullSnapshot,
  pushSnapshot,
  signIn,
  signOut,
  signUp,
} from '../lib/cloud'
import type { AppState } from '../types'

export default function SettingsView({ onStartTour }: { onStartTour: () => void }) {
  const { state, update, saveSettings, patch, toast, resetAll } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null)

  const supabase = useMemo(
    () => cloudClient(state.settings.supabaseUrl, state.settings.supabaseKey),
    [state.settings.supabaseUrl, state.settings.supabaseKey],
  )
  const [permission, setPermission] = useState<string>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const [models, setModels] = useState<string[] | null>(null)
  const [checking, setChecking] = useState(false)

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studydeck-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded', 'good')
  }

  async function importData(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<AppState>
      if (!parsed || typeof parsed !== 'object') throw new Error('Not a StudyDeck backup')
      patch({
        blocks: parsed.blocks ?? state.blocks,
        tasks: parsed.tasks ?? state.tasks,
        duties: parsed.duties ?? state.duties,
        events: parsed.events ?? state.events,
        sessions: parsed.sessions ?? state.sessions,
        tracks: parsed.tracks ?? state.tracks,
        messages: parsed.messages ?? state.messages,
        resources: parsed.resources ?? state.resources,
        settings: { ...state.settings, ...(parsed.settings ?? {}) },
      })
      toast('Backup restored', 'good')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not read that file', 'warn')
    }
  }

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      setSnapshotAt(null)
      return
    }
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase || !session) {
      setSnapshotAt(null)
      return
    }
    let active = true
    void getSnapshotInfo(supabase, session.user.id)
      .then((info) => {
        if (active) setSnapshotAt(info?.updated_at ?? null)
      })
      .catch(() => {
        if (active) setSnapshotAt(null)
      })
    return () => {
      active = false
    }
  }, [supabase, session, state.settings.cloudLastSync])

  function authError(err: unknown): string {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return 'Could not reach that Supabase project. Check the URL and that the project is running.'
    }
    if (/invalid api key|invalid jwt/i.test(message)) {
      return 'The anon key does not match this project.'
    }
    return message
  }

  async function handleSignIn() {
    if (!supabase) return
    if (!email.trim() || password.length < 6) {
      toast('Enter your email and a password of at least 6 characters', 'warn')
      return
    }
    setAuthBusy(true)
    try {
      await signIn(supabase, email.trim(), password)
      setPassword('')
      toast('Signed in', 'good')
    } catch (err) {
      toast(authError(err), 'warn')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignUp() {
    if (!supabase) return
    if (!email.trim() || password.length < 6) {
      toast('Enter your email and a password of at least 6 characters', 'warn')
      return
    }
    setAuthBusy(true)
    try {
      const result = await signUp(supabase, email.trim(), password)
      setPassword('')
      toast(
        result.needsConfirmation
          ? 'Account created — check your email, confirm it, then sign in'
          : 'Account created',
        'good',
      )
    } catch (err) {
      toast(authError(err), 'warn')
    } finally {
      setAuthBusy(false)
    }
  }

  async function backupNow() {
    if (!supabase || !session) return
    setAuthBusy(true)
    try {
      const at = await pushSnapshot(supabase, session.user.id, state)
      saveSettings({ cloudLastSync: at })
      toast('Backed up to the cloud', 'good')
    } catch (err) {
      toast(authError(err), 'warn')
    } finally {
      setAuthBusy(false)
    }
  }

  async function restoreNow() {
    if (!supabase || !session) return
    setAuthBusy(true)
    try {
      const snapshot = await pullSnapshot(supabase, session.user.id)
      if (!snapshot) {
        toast('There is no backup on the server yet', 'warn')
        return
      }
      update((s) => applyCloudPayload(s, snapshot.data))
      saveSettings({ cloudLastSync: snapshot.updated_at })
      toast('Restored from the cloud', 'good')
    } catch (err) {
      toast(authError(err), 'warn')
    } finally {
      setAuthBusy(false)
      setConfirmRestore(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    try {
      await signOut(supabase)
      setSession(null)
      toast('Signed out — your data is still on this device')
    } catch (err) {
      toast(authError(err), 'warn')
    }
  }

  async function checkLocalServer() {
    setChecking(true)
    try {
      const base = state.settings.localBase.trim().replace(/\/+$/, '')
      if (!base) throw new Error('Add a server URL first')
      const res = await fetch(`${base}/models`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        data?: { id?: string }[]
        models?: { name?: string }[]
      }
      const ids = (data.data ?? []).map((m) => m.id).filter(Boolean) as string[]
      const names = (data.models ?? []).map((m) => m.name).filter(Boolean) as string[]
      const list = ids.length ? ids : names
      setModels(list)
      if (list.length === 0) {
        toast('Server answered but lists no models. Pull one: ollama pull llama3.2', 'warn')
      } else {
        toast(`${list.length} model${list.length === 1 ? '' : 's'} available`, 'good')
      }
    } catch (err) {
      setModels(null)
      toast(
        `Could not reach ${state.settings.localBase}: ${err instanceof Error ? err.message : 'unknown error'}`,
        'warn',
      )
    } finally {
      setChecking(false)
    }
  }

  async function enableNotifications() {
    const result = await askNotificationPermission()
    setPermission(result)
    toast(result === 'granted' ? 'Notifications enabled' : 'Notifications not enabled', result === 'granted' ? 'good' : 'warn')
  }

  return (
    <div className="grid-2">
      <div className="stack">
        <section className="card">
          <div className="card-title">You</div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                placeholder="What should the app call you?"
                value={state.settings.name}
                onChange={(e) => saveSettings({ name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Daily focus goal (minutes)</label>
              <input
                className="input"
                type="number"
                min={15}
                max={600}
                step={15}
                value={state.settings.dailyGoal}
                onChange={(e) =>
                  saveSettings({ dailyGoal: Math.min(600, Math.max(15, Number(e.target.value) || 15)) })
                }
              />
            </div>
          </div>
          <p className="tiny dim" style={{ marginTop: 10 }}>
            A realistic goal is 60–120 minutes of real focus outside school. Raise it only after a
            week of hitting it.
          </p>
        </section>

        <section className="card">
          <div className="card-title">AI assistant</div>
          <p className="card-sub" style={{ marginTop: 8, lineHeight: 1.55 }}>
            Choose what powers the floating coach. Nothing here is required — the offline coach always
            works.
          </p>
          <div className="row" style={{ gap: 6, marginTop: 12 }}>
            {(
              [
                ['offline', 'Offline coach'],
                ['local', 'Local model (no key)'],
                ['openai', 'OpenAI-compatible'],
                ['rasa', 'Rasa'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`pill ${state.settings.provider === value ? 'active' : ''}`}
                onClick={() => saveSettings({ provider: value })}
              >
                {label}
              </button>
            ))}
          </div>

          {state.settings.provider === 'offline' && (
            <p className="tiny dim" style={{ marginTop: 12, lineHeight: 1.6 }}>
              Rule-based method and planning help, running entirely on this device. Pick another
              provider to chat with a real model.
            </p>
          )}

          {state.settings.provider === 'local' && (
            <>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field full">
                  <label>Local server URL (OpenAI-compatible)</label>
                  <input
                    className="input"
                    placeholder="http://localhost:11434/v1"
                    value={state.settings.localBase}
                    onChange={(e) => saveSettings({ localBase: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Model</label>
                  <input
                    className="input"
                    placeholder="llama3.2"
                    value={state.settings.localModel}
                    onChange={(e) => saveSettings({ localModel: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>&nbsp;</label>
                  <button className="btn" onClick={checkLocalServer} disabled={checking}>
                    {checking ? 'Checking…' : 'Check server'}
                  </button>
                </div>
              </div>
              {models && models.length > 0 && (
                <div className="row" style={{ gap: 6, marginTop: 10 }}>
                  {models.slice(0, 8).map((m) => (
                    <button
                      key={m}
                      className={`pill ${state.settings.localModel === m ? 'active' : ''}`}
                      onClick={() => saveSettings({ localModel: m })}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <div className="notice info" style={{ marginTop: 12 }}>
                <Icon name="assistant" size={15} />
                <div>
                  <strong>No API key needed</strong> — the model runs on this computer. Install Ollama,
                  then run <code>ollama pull llama3.2</code> and <code>ollama serve</code>. LM Studio
                  works too: start its local server on port 1234 and use{' '}
                  <code>http://localhost:1234/v1</code>. If the browser blocks the request, restart
                  Ollama with <code>OLLAMA_ORIGINS="*"</code>.
                </div>
              </div>
            </>
          )}

          {state.settings.provider === 'openai' && (
            <>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field full">
                  <label>API base URL</label>
                  <input
                    className="input"
                    placeholder="https://api.openai.com/v1"
                    value={state.settings.apiBase}
                    onChange={(e) => saveSettings({ apiBase: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Model</label>
                  <input
                    className="input"
                    placeholder="gpt-4o-mini"
                    value={state.settings.model}
                    onChange={(e) => saveSettings({ model: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>API key</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="sk-…"
                    value={state.settings.apiKey}
                    onChange={(e) => saveSettings({ apiKey: e.target.value })}
                  />
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() =>
                    saveSettings({
                      apiBase: 'https://api.groq.com/openai/v1',
                      model: 'llama-3.3-70b-versatile',
                    })
                  }
                >
                  Groq preset
                </button>
                <span className="tiny dim">
                  Groq is hosted, so it always needs a free key. Model IDs may change — the current
                  list is on console.groq.com/docs/models.
                </span>
              </div>
              <div className="notice" style={{ marginTop: 12 }}>
                <Icon name="bell" size={15} />
                <div>
                  The key is stored only in this browser's local storage and sent directly to the
                  endpoint you choose. Only use a key you are willing to keep on this device. Local
                  servers: Ollama <code>http://localhost:11434/v1</code>, LM Studio{' '}
                  <code>http://localhost:1234/v1</code> — or use the Local model provider to skip the
                  key entirely.
                </div>
              </div>
            </>
          )}

          {state.settings.provider === 'rasa' && (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Rasa server URL</label>
                <input
                  className="input"
                  placeholder="http://localhost:5005"
                  value={state.settings.rasaUrl}
                  onChange={(e) => saveSettings({ rasaUrl: e.target.value })}
                />
              </div>
              <div className="notice info" style={{ marginTop: 12 }}>
                <Icon name="assistant" size={15} />
                <div>
                  Rasa is a bot server you run yourself. Enable the REST channel in{' '}
                  <code>credentials.yml</code> (<code>rest:</code>) and start it with{' '}
                  <code>rasa run --enable-api --cors "*"</code>, then point this field at it. Replies
                  come from your trained stories and rules — training data is not created here.
                </div>
              </div>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-title">Notifications</div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="badge">
              {permission === 'granted'
                ? 'enabled'
                : permission === 'unsupported'
                  ? 'unsupported'
                  : permission}
            </span>
            {permission !== 'granted' && permission !== 'unsupported' && (
              <button className="btn btn-sm" onClick={enableNotifications}>
                <Icon name="bell" size={13} /> Enable
              </button>
            )}
          </div>
          <p className="tiny dim" style={{ marginTop: 10 }}>
            Reminders are checked every 30 seconds while the app is open. Closing the tab stops them —
            a packaged desktop version can run in the background.
          </p>
        </section>
      </div>

      <div className="stack">
        <section className="card">
          <div className="card-title">Account & cloud backup</div>
          <p className="card-sub" style={{ marginTop: 8, lineHeight: 1.55 }}>
            Optional. With a free Supabase project you can sign in and restore your timetable, tasks
            and notes on another device. Without it, everything stays local as before.
          </p>

          {!supabase ? (
            <>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field full">
                  <label>Project URL</label>
                  <input
                    className="input"
                    placeholder="https://your-project.supabase.co"
                    value={state.settings.supabaseUrl}
                    onChange={(e) => saveSettings({ supabaseUrl: e.target.value })}
                  />
                </div>
                <div className="field full">
                  <label>Anon public key</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="eyJhbGciOi…"
                    value={state.settings.supabaseKey}
                    onChange={(e) => saveSettings({ supabaseKey: e.target.value })}
                  />
                </div>
              </div>
              <p className="tiny dim" style={{ marginTop: 10, lineHeight: 1.6 }}>
                In your Supabase project, run the SQL in{' '}
                <code>supabase/schema.sql</code> once (SQL editor → New query → Run). That creates the
                snapshot table and row-level security so each account can only read its own data.
              </p>
              <a
                className="btn btn-sm btn-ghost"
                style={{ marginTop: 10 }}
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                Open Supabase <Icon name="external" size={12} />
              </a>
            </>
          ) : !session ? (
            <>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field full">
                  <label>Email</label>
                  <input
                    className="input"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field full">
                  <label>Password</label>
                  <input
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSignIn()
                    }}
                  />
                </div>
              </div>
              <div className="row" style={{ marginTop: 12, gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSignIn} disabled={authBusy}>
                  {authBusy ? 'Working…' : 'Sign in'}
                </button>
                <button className="btn btn-sm" onClick={handleSignUp} disabled={authBusy}>
                  Create account
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    void handleSignOut()
                    saveSettings({ supabaseUrl: '', supabaseKey: '', cloudAutoSync: false })
                  }}
                >
                  Disconnect
                </button>
              </div>
              <p className="tiny dim" style={{ marginTop: 10 }}>
                The anon key is public by design; security comes from the row-level policy. If your
                project requires email confirmation, confirm the message before signing in.
              </p>
            </>
          ) : (
            <>
              <div className="row" style={{ marginTop: 12, gap: 8 }}>
                <span className="badge low">signed in</span>
                <span className="tiny dim">{session.user.email}</span>
                <span className="spacer" />
                <button className="btn btn-sm btn-ghost" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>

              <div className="row" style={{ marginTop: 12, gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={backupNow} disabled={authBusy}>
                  {authBusy ? 'Working…' : 'Back up now'}
                </button>
                <button className="btn btn-sm" onClick={() => setConfirmRestore(true)} disabled={authBusy}>
                  Restore from cloud
                </button>
                <button
                  className={`pill ${state.settings.cloudAutoSync ? 'active' : ''}`}
                  onClick={() => saveSettings({ cloudAutoSync: !state.settings.cloudAutoSync })}
                >
                  Auto-sync {state.settings.cloudAutoSync ? 'on' : 'off'}
                </button>
              </div>

              <div className="stack" style={{ gap: 4, marginTop: 12 }}>
                <span className="tiny dim">
                  {snapshotAt
                    ? `Server copy: ${new Date(snapshotAt).toLocaleString()}`
                    : 'No backup on the server yet.'}
                </span>
                <span className="tiny dim">
                  {state.settings.cloudLastSync
                    ? `Last action from this device: ${new Date(
                        state.settings.cloudLastSync,
                      ).toLocaleString()}`
                    : 'This device has not synced yet.'}
                </span>
              </div>

              <p className="tiny dim" style={{ marginTop: 10, lineHeight: 1.6 }}>
                Backups include the timetable, tasks, duties, calendar, focus history, resources,
                notes and coach chat. API keys and audio files are never uploaded. Restoring replaces
                this device's data — export a backup first if unsure.
              </p>
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginTop: 10 }}
                onClick={() => {
                  void handleSignOut()
                  saveSettings({ supabaseUrl: '', supabaseKey: '', cloudAutoSync: false })
                }}
              >
                Disconnect this project
              </button>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-title">Getting started</div>
          <p className="card-sub" style={{ marginTop: 8, lineHeight: 1.55 }}>
            A short guided tour of the timetable, tasks, focus timer, calendar, resources and the two
            floating buttons. Replay it whenever you want.
          </p>
          <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={onStartTour}>
            <Icon name="arrow" size={13} /> Replay the tutorial
          </button>
        </section>

        <section className="card">
          <div className="card-title">Your data</div>
          <p className="card-sub" style={{ marginTop: 8, lineHeight: 1.55 }}>
            Everything lives in this browser's local storage. Export a backup before clearing your
            browser data or switching machines.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={exportData}>
              <Icon name="external" size={14} /> Export backup
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="plus" size={14} /> Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importData(file)
                e.target.value = ''
              }}
            />
          </div>
          <div className="divider" style={{ margin: '16px 0' }} />
          <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            <Icon name="trash" size={14} /> Reset everything
          </button>
        </section>

        <section className="card">
          <div className="card-title">Running as a desktop app</div>
          <p className="card-sub" style={{ marginTop: 8, lineHeight: 1.6 }}>
            This is a local web app, so nothing leaves your machine. To install it like a desktop app,
            open it in Chrome or Edge and choose <em>Install StudyDeck</em> from the address bar. For
            a true double-click app with background reminders, it can be wrapped with Tauri or
            Electron later without changing the pages.
          </p>
        </section>

        <section className="card">
          <div className="card-title">What is stored</div>
          <div className="stack" style={{ gap: 7, marginTop: 10 }}>
            {[
              ['Timetable blocks', state.blocks.length],
              ['Tasks', state.tasks.length],
              ['Calendar events', state.events.length],
              ['Focus sessions', state.sessions.length],
              ['Saved sites', state.resources.length],
              ['Chat messages', state.messages.length],
            ].map(([label, count]) => (
              <div className="row" key={label as string}>
                <span className="card-sub">{label}</span>
                <span className="spacer" />
                <span className="badge">{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {confirmRestore && (
        <Modal
          title="Restore from the cloud?"
          sub="This replaces the data on this device."
          onClose={() => setConfirmRestore(false)}
        >
          <div className="notice">
            <Icon name="bell" size={15} />
            <div>
              Your current timetable, tasks, calendar and notes here will be overwritten by the
              backup. Export a local backup first if you might need it.
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmRestore(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={restoreNow} disabled={authBusy}>
              {authBusy ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </Modal>
      )}

      {confirmReset && (
        <Modal
          title="Reset everything?"
          sub="Timetable, tasks, events, focus history and chat will be deleted from this browser."
          onClose={() => setConfirmReset(false)}
        >
          <div className="notice">
            <Icon name="trash" size={15} />
            <div>This cannot be undone. Export a backup first if you might want it back.</div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
                toast('Everything reset')
              }}
            >
              Delete and reset
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
