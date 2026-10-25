const MUTE_KEY = 'tidewater-muted'

class GameAudio {
  muted = false

  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private white: AudioBuffer | null = null
  private brown: AudioBuffer | null = null
  private unlocked = false
  private ambient = false
  private lastReel = 0

  constructor() {
    if (typeof window === 'undefined') return
    this.muted = window.localStorage.getItem(MUTE_KEY) === '1'
    const unlock = () => this.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
  }

  private unlock() {
    if (this.unlocked) return
    this.unlocked = true
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : 0.9
      master.connect(ctx.destination)
      this.ctx = ctx
      this.master = master
      this.white = this.noiseBuffer(ctx, 'white')
      this.brown = this.noiseBuffer(ctx, 'brown')
      this.startAmbient()
    } catch {
      // no audio device or blocked context; game runs silently
    }
  }

  private noiseBuffer(ctx: AudioContext, kind: 'white' | 'brown') {
    const length = Math.floor(ctx.sampleRate * 2.5)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let smooth = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      if (kind === 'white') {
        data[i] = white * 0.55
      } else {
        smooth = (smooth + 0.02 * white) / 1.02
        data[i] = smooth * 3.2
      }
    }
    return buffer
  }

  private startAmbient() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.brown || this.ambient) return
    this.ambient = true

    const lap = ctx.createBufferSource()
    lap.buffer = this.brown
    lap.loop = true
    const lapFilter = ctx.createBiquadFilter()
    lapFilter.type = 'bandpass'
    lapFilter.frequency.value = 460
    lapFilter.Q.value = 0.7
    const lapGain = ctx.createGain()
    lapGain.gain.value = 0.055
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.11
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.026
    lfo.connect(lfoGain).connect(lapGain.gain)
    lap.connect(lapFilter).connect(lapGain).connect(master)

    const wind = ctx.createBufferSource()
    wind.buffer = this.brown
    wind.loop = true
    wind.playbackRate.value = 0.7
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 240
    const windGain = ctx.createGain()
    windGain.gain.value = 0.03
    wind.connect(windFilter).connect(windGain).connect(master)

    lap.start()
    wind.start()
    lfo.start()
  }

  private ready() {
    return Boolean(this.ctx && this.master)
  }

  toggle() {
    this.muted = !this.muted
    window.localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05)
    }
    return this.muted
  }

  splash(power = 1) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.white || this.muted) return
    const now = ctx.currentTime
    const volume = Math.min(power, 1.8)

    const src = ctx.createBufferSource()
    src.buffer = this.white
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2200 + volume * 900, now)
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.4)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.15 * volume, now + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48)
    src.connect(filter).connect(gain).connect(master)
    src.start(now)
    src.stop(now + 0.55)

    const plop = ctx.createOscillator()
    plop.type = 'sine'
    plop.frequency.setValueAtTime(280 + volume * 60, now)
    plop.frequency.exponentialRampToValueAtTime(90, now + 0.18)
    const plopGain = ctx.createGain()
    plopGain.gain.setValueAtTime(0.0001, now)
    plopGain.gain.exponentialRampToValueAtTime(0.075 * volume, now + 0.02)
    plopGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    plop.connect(plopGain).connect(master)
    plop.start(now)
    plop.stop(now + 0.25)
  }

  bite() {
    this.splash(0.55)
    this.pluck(880, 0.07, 0.07, 0.12)
    this.pluck(660, 0.06, 0.05, 0.22)
  }

  reel(tension = 0) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.white || this.muted) return
    const now = ctx.currentTime
    if (now - this.lastReel < 0.085) return
    this.lastReel = now

    const src = ctx.createBufferSource()
    src.buffer = this.white
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1700 + tension * 1500
    filter.Q.value = 7
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.035, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    src.connect(filter).connect(gain).connect(master)
    src.start(now)
    src.stop(now + 0.06)
  }

  snap() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.white || this.muted) return
    const now = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.white
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 900
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.16, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
    src.connect(filter).connect(gain).connect(master)
    src.start(now)
    src.stop(now + 0.18)
  }

  thunder() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.brown || !this.white || this.muted) return
    const now = ctx.currentTime

    const rumble = ctx.createBufferSource()
    rumble.buffer = this.brown
    rumble.loop = true
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.setValueAtTime(420, now)
    low.frequency.exponentialRampToValueAtTime(90, now + 2.4)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.26, now + 0.12)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6)
    rumble.connect(low).connect(gain).connect(master)
    rumble.start(now)
    rumble.stop(now + 2.7)

    const crack = ctx.createBufferSource()
    crack.buffer = this.white
    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.value = 1100
    const crackGain = ctx.createGain()
    crackGain.gain.setValueAtTime(0.0001, now)
    crackGain.gain.exponentialRampToValueAtTime(0.14, now + 0.02)
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    crack.connect(high).connect(crackGain).connect(master)
    crack.start(now)
    crack.stop(now + 0.36)
  }

  caught() {    const ctx = this.ctx
    if (!ctx || this.muted) return
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((frequency, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = frequency
      const gain = ctx.createGain()
      const start = now + i * 0.11
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6)
      osc.connect(gain).connect(this.master!)
      osc.start(start)
      osc.stop(start + 0.65)
    })
  }

  private pluck(frequency: number, gainValue: number, duration: number, delay: number) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.muted) return
    const now = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = frequency
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.2)
    osc.connect(gain).connect(master)
    osc.start(now)
    osc.stop(now + duration + 0.25)
  }
}

export const audio = new GameAudio()
