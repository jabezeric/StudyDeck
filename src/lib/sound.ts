/** Short triple chime used when a timer finishes. No audio files needed. */
export function chime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    ;[0, 0.22, 0.44].forEach((offset, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 660 + i * 140
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.2)
    })
    window.setTimeout(() => void ctx.close(), 1200)
  } catch {
    // audio unavailable — the notification still fires
  }
}
