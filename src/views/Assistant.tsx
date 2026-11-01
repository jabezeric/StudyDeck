import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/ui'
import { useApp, uid } from '../store'
import { coachReply } from '../lib/coach'
import type { Message } from '../types'

const SYSTEM_PROMPT = `You are a patient study coach for a teenager in secondary school.
Rules:
- Explain concepts in short steps, plain language, with one concrete example.
- Never just give homework answers: guide them to the next step and ask them to try it.
- If they paste a problem, identify the concept being tested and the first step.
- Keep replies under 220 words unless asked for more.
- Be warm but direct. No lectures about motivation.`

const SUGGESTIONS = [
  'Plan revision for a maths exam in 6 days',
  'Explain derivatives like I am 15',
  'How do I start learning Python?',
  'I get distracted after 10 minutes',
]

function hostOf(base: string): string {
  try {
    return new URL(base).host
  } catch {
    return base.trim() || 'no endpoint set'
  }
}

export default function Assistant({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { state, update, toast } = useApp()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const key = state.settings.apiKey.trim()
  const localBase = state.settings.localBase.trim()
  const mode: 'offline' | 'local' | 'openai' | 'rasa' =
    state.settings.provider === 'openai' && key
      ? 'openai'
      : state.settings.provider === 'local' && localBase
        ? 'local'
        : state.settings.provider === 'rasa' && state.settings.rasaUrl.trim()
          ? 'rasa'
          : 'offline'
  const live = mode !== 'offline'
  const modeLabel =
    mode === 'openai'
      ? `${state.settings.model} · ${hostOf(state.settings.apiBase)}`
      : mode === 'local'
        ? `Local · ${state.settings.localModel} · ${hostOf(localBase)}`
        : mode === 'rasa'
          ? `Rasa · ${hostOf(state.settings.rasaUrl)}`
          : 'Offline coach · method, not answers'

  // Rasa tracks conversations per sender id, so keep one stable id per browser.
  const [senderId] = useState(() => {
    const storageKey = 'studydeck.rasaSender'
    let existing = localStorage.getItem(storageKey)
    if (!existing) {
      existing = `web-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(storageKey, existing)
    }
    return existing
  })

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    const focus = window.setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focus)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.messages.length, busy])

  function push(message: Message) {
    update((s) => ({ ...s, messages: [...s.messages, message] }))
  }

  async function send(raw?: string) {
    const content = (raw ?? input).trim()
    if (!content || busy) return
    setInput('')
    const history = state.messages
    push({ id: uid(), role: 'user', content, at: new Date().toISOString() })
    setBusy(true)

    try {
      let reply: string
      if (mode === 'openai') {
        reply = await askApi(content, history)
      } else if (mode === 'local') {
        reply = await askLocal(content, history)
      } else if (mode === 'rasa') {
        reply = await askRasa(content)
      } else {
        await new Promise((r) => setTimeout(r, 320))
        reply = coachReply(content, {
          name: state.settings.name,
          tasks: state.tasks,
          events: state.events,
          blocks: state.blocks,
        })
      }
      push({ id: uid(), role: 'assistant', content: reply, at: new Date().toISOString() })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const hint =
        mode === 'rasa'
          ? 'Check the Rasa URL in Settings. The server must expose the REST channel and allow this origin, e.g. rasa run --enable-api --cors "*".'
          : mode === 'local'
            ? 'Is your local server running? Start Ollama with ollama serve and pull a model (ollama pull llama3.2). If the browser blocks it, allow this origin with OLLAMA_ORIGINS="*".'
            : 'Check the API base URL, model name and key in Settings. Local servers such as Ollama (http://localhost:11434/v1) or LM Studio work too.'
      push({
        id: uid(),
        role: 'assistant',
        content: `I could not reach the assistant.\n\n${message}\n\n${hint}`,
        at: new Date().toISOString(),
      })
      toast('Assistant request failed', 'warn')
    } finally {
      setBusy(false)
    }
  }

  async function requestCompletion(
    endpoint: { base: string; model: string; key?: string },
    content: string,
    history: Message[],
  ): Promise<string> {
    const base = endpoint.base.trim().replace(/\/+$/, '')
    if (!base) throw new Error('No API base URL set.')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    // Local servers (Ollama, LM Studio) accept requests without any key.
    if (endpoint.key) headers.Authorization = `Bearer ${endpoint.key}`
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: endpoint.model,
        temperature: 0.5,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content },
        ],
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 220)}`)
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const answer = data.choices?.[0]?.message?.content
    if (!answer) throw new Error('The API returned an empty response.')
    return answer
  }

  function askApi(content: string, history: Message[]): Promise<string> {
    return requestCompletion(
      {
        base: state.settings.apiBase,
        model: state.settings.model.trim() || 'gpt-4o-mini',
        key,
      },
      content,
      history,
    )
  }

  function askLocal(content: string, history: Message[]): Promise<string> {
    return requestCompletion(
      {
        base: localBase,
        model: state.settings.localModel.trim() || 'llama3.2',
      },
      content,
      history,
    )
  }

  async function askRasa(content: string): Promise<string> {
    const base = state.settings.rasaUrl.trim().replace(/\/+$/, '')
    if (!base) throw new Error('No Rasa server URL set.')
    const res = await fetch(`${base}/webhooks/rest/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: senderId, message: content }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 220)}`)
    }
    const data = (await res.json()) as { text?: string; image?: string }[]
    const texts = Array.isArray(data)
      ? data.map((m) => (typeof m.text === 'string' ? m.text : '')).filter(Boolean)
      : []
    if (texts.length === 0) {
      throw new Error('Rasa replied without text (it may only have sent buttons or a custom payload).')
    }
    return texts.join('\n\n')
  }

  return (
    <>
      <button
        className={`assistant-fab ${open ? 'open' : ''}`}
        onClick={() => onOpenChange(!open)}
        aria-label={open ? 'Close the study coach' : 'Ask the study coach'}
        aria-expanded={open}
        title={open ? 'Close coach' : 'Ask the study coach'}
      >
        <Icon name={open ? 'x' : 'assistant'} size={22} />
      </button>

      {open && (
        <section className="assistant-panel" role="dialog" aria-label="Study coach">
          <header className="assistant-head">
            <div className="avatar" style={{ background: 'rgba(124,156,255,.2)', color: '#cdd9ff' }}>
              <Icon name="assistant" size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Study coach</div>
              <div className="tiny dim">{modeLabel}</div>
            </div>
            {state.messages.length > 0 && (
              <button
                className="icon-btn"
                title="Clear chat"
                aria-label="Clear conversation"
                onClick={() => {
                  update((s) => ({ ...s, messages: [] }))
                  toast('Conversation cleared')
                }}
              >
                <Icon name="reset" size={15} />
              </button>
            )}
            <button
              className="icon-btn"
              onClick={() => onOpenChange(false)}
              aria-label="Close the study coach"
            >
              <Icon name="x" size={16} />
            </button>
          </header>

          <div className="chat-scroll" ref={scrollRef}>
            {!live && (
              <div className="notice info">
                <Icon name="assistant" size={15} />
                <div>
                  <strong>Offline coach.</strong> Method and structure, not AI answers. Choose an
                  assistant provider in Settings — an OpenAI-compatible endpoint or your own Rasa
                  server.
                </div>
              </div>
            )}

            {state.messages.length === 0 && (
              <div>
                <h2 style={{ fontSize: 17 }}>
                  {state.settings.name
                    ? `What are we working on, ${state.settings.name}?`
                    : 'What are we working on?'}
                </h2>
                <p className="card-sub" style={{ marginTop: 6, lineHeight: 1.55 }}>
                  Name the subject, the question and what you already tried — vague questions get
                  vague help.
                </p>
                <div className="row" style={{ gap: 7, marginTop: 12 }}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="pill" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {state.messages.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                <div className="avatar">
                  {m.role === 'user' ? 'You' : <Icon name="assistant" size={12} />}
                </div>
                <div className="bubble">{m.content}</div>
              </div>
            ))}

            {busy && (
              <div className="msg assistant">
                <div className="avatar">
                  <Icon name="assistant" size={12} />
                </div>
                <div className="bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="composer">
            <textarea
              ref={inputRef}
              className="textarea"
              placeholder="Ask about a topic, a problem, or how to plan…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              {busy ? '…' : <Icon name="arrow" size={15} />}
            </button>
          </div>
        </section>
      )}
    </>
  )
}
