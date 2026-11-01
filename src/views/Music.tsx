import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/ui'
import { useApp, uid } from '../store'
import { soundscape, type Soundscape } from '../lib/audio'
import { deleteTrackFile, getTrackFile, saveTrackFile } from '../lib/musicStore'
import type { Track } from '../types'

const SCAPES: { id: Soundscape; name: string; desc: string }[] = [
  { id: 'lofi', name: 'Lo-fi keys', desc: 'Slow chords and vinyl crackle' },
  { id: 'brown', name: 'Brown noise', desc: 'Flat hum that drowns out noise' },
  { id: 'rain', name: 'Rain', desc: 'Steady rain on a window' },
  { id: 'pad', name: 'Warm pad', desc: 'Drifting ambient chords' },
]

const VOLUME_KEY = 'studydeck.musicVolume'

export default function Music({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { state, update, toast } = useApp()
  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrl = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [scapeId, setScapeId] = useState<Soundscape | null>(null)
  const [trackId, setTrackId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ title: '', url: '' })
  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem(VOLUME_KEY)
    const value = stored ? Number(stored) : 0.45
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.45
  })

  const currentTrack = state.tracks.find((t) => t.id === trackId) ?? null
  const scape = SCAPES.find((s) => s.id === scapeId)
  const isPlaying = Boolean(scapeId) || playing

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume))
    soundscape.setVolume(volume)
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
    audio.pause()
    audio.removeAttribute('src')
    setProgress(0)
    if (!currentTrack) return

    let cancelled = false
    const load = async () => {
      if (currentTrack.source === 'file') {
        try {
          const blob = await getTrackFile(currentTrack.id)
          if (cancelled) return
          if (!blob) {
            toast('That file is no longer stored here — add it again', 'warn')
            setPlaying(false)
            return
          }
          const url = URL.createObjectURL(blob)
          objectUrl.current = url
          audio.src = url
        } catch {
          if (!cancelled) {
            toast('Could not open the stored audio file', 'warn')
            setPlaying(false)
          }
          return
        }
      } else if (currentTrack.url) {
        audio.src = currentTrack.url
      }
      audio.volume = volume
      try {
        await audio.play()
      } catch {
        if (!cancelled) {
          setPlaying(false)
          toast('Could not play that link — it needs to point straight at an audio file', 'warn')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId])

  useEffect(() => {
    return () => {
      soundscape.stop()
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    }
  }, [])

  function toggleScape(id: Soundscape) {
    if (scapeId === id) {
      soundscape.stop()
      setScapeId(null)
      return
    }
    audioRef.current?.pause()
    setPlaying(false)
    setTrackId(null)
    try {
      soundscape.setVolume(volume)
      soundscape.play(id)
      setScapeId(id)
    } catch {
      toast('This browser cannot play generated audio', 'warn')
    }
  }

  function playTrack(id: string) {
    soundscape.stop()
    setScapeId(null)
    if (trackId === id && playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    setPlaying(true)
    setTrackId(id)
  }

  function togglePlay() {
    if (scapeId) {
      soundscape.stop()
      setScapeId(null)
      return
    }
    const audio = audioRef.current
    if (!trackId) {
      if (state.tracks[0]) playTrack(state.tracks[0].id)
      return
    }
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play().catch(() => toast('Could not resume that track', 'warn'))
    }
  }

  function step(dir: 1 | -1) {
    if (state.tracks.length === 0) return
    const index = state.tracks.findIndex((t) => t.id === trackId)
    const base = index < 0 ? 0 : index
    const next = state.tracks[(base + dir + state.tracks.length) % state.tracks.length]
    if (next) {
      setPlaying(true)
      setTrackId(next.id)
    }
  }

  function addUrl() {
    const raw = draft.url.trim()
    if (!raw) {
      toast('Paste an audio link first', 'warn')
      return
    }
    let parsed: URL
    try {
      parsed = new URL(raw)
    } catch {
      toast('That is not a valid link', 'warn')
      return
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      toast('Only http(s) links are supported', 'warn')
      return
    }
    const fallback = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() ?? '')
    const title = draft.title.trim() || fallback || parsed.hostname
    const track: Track = {
      id: uid(),
      title,
      source: 'url',
      url: parsed.toString(),
      added: new Date().toISOString(),
    }
    update((s) => ({ ...s, tracks: [...s.tracks, track] }))
    setDraft({ title: '', url: '' })
    setShowAdd(false)
    toast('Track added', 'good')
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const added: Track[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) {
        toast(`${file.name} is not an audio file`, 'warn')
        continue
      }
      const id = uid()
      try {
        await saveTrackFile(id, file)
        added.push({
          id,
          title: file.name.replace(/\.[^.]+$/, ''),
          source: 'file',
          mime: file.type,
          added: new Date().toISOString(),
        })
      } catch {
        toast(`Could not store ${file.name}`, 'warn')
      }
    }
    if (added.length > 0) {
      update((s) => ({ ...s, tracks: [...s.tracks, ...added] }))
      toast(`${added.length} track${added.length === 1 ? '' : 's'} saved on this device`, 'good')
    }
  }

  function removeTrack(track: Track) {
    if (trackId === track.id) {
      audioRef.current?.pause()
      setPlaying(false)
      setTrackId(null)
    }
    update((s) => ({ ...s, tracks: s.tracks.filter((t) => t.id !== track.id) }))
    if (track.source === 'file') {
      void deleteTrackFile(track.id).catch(() => undefined)
    }
    toast('Track removed')
  }

  const nowTitle = scape ? scape.name : currentTrack ? currentTrack.title : 'Nothing playing'
  const nowSub = scape
    ? 'Generated on this device'
    : currentTrack
      ? currentTrack.source === 'file'
        ? 'Stored in this browser'
        : 'Audio link'
      : 'Pick a soundscape or add a track'

  return (
    <>
      <button
        className={`assistant-fab music-fab ${open ? 'open' : ''}`}
        onClick={() => onOpenChange(!open)}
        aria-label={open ? 'Close the music menu' : 'Open the lock-in music menu'}
        aria-expanded={open}
        title="Lock-in music"
      >
        <Icon name={open ? 'x' : 'music'} size={21} />
      </button>

      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => step(1)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget
          if (el.duration > 0) setProgress((el.currentTime / el.duration) * 100)
        }}
      />

      {open && (
        <section className="music-panel" role="dialog" aria-label="Lock-in music">
          <header className="assistant-head">
            <div
              className="avatar"
              style={{ background: 'rgba(94,234,212,.16)', color: '#7ff3e1' }}
            >
              <Icon name="music" size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Lock-in</div>
              <div className="tiny dim">Sound on, phone away</div>
            </div>
            <button
              className="icon-btn"
              onClick={() => onOpenChange(false)}
              aria-label="Close the music menu"
            >
              <Icon name="x" size={16} />
            </button>
          </header>

          <div className="music-scroll">
            <div className="card-title" style={{ marginBottom: 10 }}>
              Soundscapes
            </div>
            <div className="scape-grid">
              {SCAPES.map((s) => {
                const active = scapeId === s.id
                return (
                  <button
                    key={s.id}
                    className={`scape ${active ? 'on' : ''}`}
                    onClick={() => toggleScape(s.id)}
                    aria-pressed={active}
                  >
                    <span className="scape-icon">
                      <Icon name={active ? 'volume' : 'play'} size={13} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong>{s.name}</strong>
                      <em>{s.desc}</em>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="row" style={{ marginTop: 18, gap: 8 }}>
              <div className="card-title">Your music</div>
              <span className="spacer" />
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => fileInput.current?.click()}
              >
                <Icon name="folder" size={13} /> Files
              </button>
              <button className="btn btn-sm" onClick={() => setShowAdd((v) => !v)}>
                <Icon name="plus" size={13} /> Link
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="audio/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  void addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>

            {showAdd && (
              <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                <input
                  className="input"
                  placeholder="https://…/track.mp3"
                  value={draft.url}
                  autoFocus
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addUrl()
                  }}
                />
                <div className="row" style={{ gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Title (optional)"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={addUrl}>
                    Add
                  </button>
                </div>
                <p className="tiny dim">
                  Direct audio file links only — Spotify or YouTube pages will not play here.
                </p>
              </div>
            )}

            {state.tracks.length === 0 ? (
              <div className="empty" style={{ marginTop: 12 }}>
                No tracks yet. Add audio files from this computer, or paste a direct audio link.
              </div>
            ) : (
              <div className="stack" style={{ gap: 6, marginTop: 10 }}>
                {state.tracks.map((t) => (
                  <div key={t.id} className={`track-row ${trackId === t.id ? 'on' : ''}`}>
                    <button
                      className="track-play"
                      onClick={() => playTrack(t.id)}
                      aria-label={`${trackId === t.id && playing ? 'Pause' : 'Play'} ${t.title}`}
                    >
                      <Icon
                        name={trackId === t.id && playing ? 'pause' : 'play'}
                        size={11}
                      />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="track-title">{t.title}</div>
                      <div className="tiny dim">
                        {t.source === 'file' ? 'On this device' : 'Link'}
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() => removeTrack(t)}
                      aria-label={`Remove ${t.title}`}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="tiny dim" style={{ marginTop: 12 }}>
              Files never leave this browser. Closing this panel keeps the music playing.
            </p>
          </div>

          <div className="music-player">
            <div className="row" style={{ gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="track-title">{nowTitle}</div>
                <div className="tiny dim">{nowSub}</div>
              </div>
              {trackId && (
                <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous track">
                  <Icon name="left" size={15} />
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                style={{ width: 34, height: 34, padding: 0, borderRadius: '50%' }}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <Icon name={isPlaying ? 'pause' : 'play'} size={13} />
              </button>
              {trackId && (
                <button className="icon-btn" onClick={() => step(1)} aria-label="Next track">
                  <Icon name="right" size={15} />
                </button>
              )}
            </div>

            {trackId && (
              <div className="progress" style={{ marginTop: 8, height: 4 }}>
                <span style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <Icon name="volume" size={14} />
              <input
                className="range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
              />
            </div>
          </div>
        </section>
      )}
    </>
  )
}
