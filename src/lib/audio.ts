export type Soundscape = 'lofi' | 'brown' | 'rain' | 'pad'

type Voice = { stop: () => void }

function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    } else {
      data[i] = white
    }
  }
  return buffer
}

function crackleBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    // Sparse pops rather than constant noise, so it reads as vinyl, not static.
    data[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : 0
  }
  return buffer
}

function loopSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  return src
}

const CHORDS = [
  [220.0, 261.63, 329.63], // A minor
  [174.61, 220.0, 261.63], // F major
  [196.0, 246.94, 293.66], // G major
  [164.81, 196.0, 246.94], // E minor
]

/**
 * Small generative audio engine: every soundscape is synthesised with the Web
 * Audio API, so there is nothing to download and nothing copyrighted to ship.
 */
class SoundscapeEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voices: Voice[] = []
  private timers: number[] = []
  private volume = 0.5
  current: Soundscape | null = null

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) throw new Error('Web Audio is not supported in this browser')
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, value))
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05)
    }
  }

  play(id: Soundscape) {
    this.stopVoices()
    const ctx = this.ensure()
    const out = this.master!
    this.current = id

    if (id === 'brown') {
      const src = loopSource(ctx, noiseBuffer(ctx, 4, true))
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 750
      const gain = ctx.createGain()
      gain.gain.value = 0.7
      src.connect(filter).connect(gain).connect(out)
      src.start()
      this.voices.push({ stop: () => src.stop() })
      return
    }

    if (id === 'rain') {
      const src = loopSource(ctx, noiseBuffer(ctx, 5, false))
      const high = ctx.createBiquadFilter()
      high.type = 'highpass'
      high.frequency.value = 700
      const low = ctx.createBiquadFilter()
      low.type = 'lowpass'
      low.frequency.value = 7000
      const gain = ctx.createGain()
      gain.gain.value = 0.22
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.07
      lfoGain.gain.value = 0.05
      lfo.connect(lfoGain).connect(gain.gain)
      src.connect(high).connect(low).connect(gain).connect(out)
      src.start()
      lfo.start()
      this.voices.push({ stop: () => (src.stop(), lfo.stop()) })
      return
    }

    if (id === 'pad') {
      const gain = ctx.createGain()
      gain.gain.value = 0.12
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 900
      filter.connect(gain).connect(out)

      const oscs = CHORDS[0].map((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = i === 0 ? 'triangle' : 'sine'
        osc.frequency.value = freq
        osc.detune.value = i === 1 ? 6 : i === 2 ? -6 : 0
        const oscGain = ctx.createGain()
        oscGain.gain.value = i === 0 ? 0.5 : 0.3
        osc.connect(oscGain).connect(filter)
        osc.start()
        return osc
      })

      const tremolo = ctx.createOscillator()
      const tremoloGain = ctx.createGain()
      tremolo.frequency.value = 0.06
      tremoloGain.gain.value = 0.03
      tremolo.connect(tremoloGain).connect(gain.gain)
      tremolo.start()

      let step = 0
      const timer = window.setInterval(() => {
        step = (step + 1) % CHORDS.length
        CHORDS[step].forEach((freq, i) => {
          oscs[i].frequency.setTargetAtTime(freq, ctx.currentTime, 1.4)
        })
      }, 14_000)

      this.timers.push(timer)
      this.voices.push({
        stop: () => {
          oscs.forEach((o) => o.stop())
          tremolo.stop()
        },
      })
      return
    }

    // Lo-fi keys: slow arpeggio with a short echo and vinyl crackle.
    const bus = ctx.createGain()
    bus.gain.value = 0.5
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.32
    const feedback = ctx.createGain()
    feedback.gain.value = 0.28
    const wet = ctx.createGain()
    wet.gain.value = 0.3
    bus.connect(out)
    bus.connect(delay)
    delay.connect(feedback).connect(delay)
    delay.connect(wet).connect(out)

    const crackle = loopSource(ctx, crackleBuffer(ctx, 4))
    const crackleGain = ctx.createGain()
    crackleGain.gain.value = 0.06
    crackle.connect(crackleGain).connect(out)
    crackle.start()

    let chord = 0
    let note = 0
    const playNote = () => {
      const freq = CHORDS[chord][note % 3] * (note > 2 ? 2 : 1)
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const env = ctx.createGain()
      const now = ctx.currentTime
      env.gain.setValueAtTime(0.0001, now)
      env.gain.exponentialRampToValueAtTime(0.16, now + 0.03)
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1800
      osc.connect(filter).connect(env).connect(bus)
      osc.start(now)
      osc.stop(now + 2)
      note += 1
      if (note % 6 === 0) chord = (chord + 1) % CHORDS.length
    }

    playNote()
    const timer = window.setInterval(playNote, 720)
    this.timers.push(timer)
    this.voices.push({
      stop: () => {
        crackle.stop()
      },
    })
  }

  stop() {
    this.stopVoices()
    this.current = null
  }

  private stopVoices() {
    this.timers.forEach((t) => window.clearInterval(t))
    this.timers = []
    this.voices.forEach((voice) => {
      try {
        voice.stop()
      } catch {
        // already stopped
      }
    })
    this.voices = []
  }
}

export const soundscape = new SoundscapeEngine()
