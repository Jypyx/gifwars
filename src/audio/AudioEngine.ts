import { MusicLoop } from './music'
import { SOUNDS, type SoundName } from './sfx'

const MASTER_VOLUME = 0.8
const SFX_VOLUME = 1
const MUSIC_VOLUME = 0.32
const FADE_S = 0.25

type AudioContextConstructor = typeof AudioContext

function getAudioContextClass(): AudioContextConstructor | null {
  // Missing in old Safari (prefixed), jsdom and SSR.
  const scope = globalThis as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

/**
 * Owns the AudioContext (created lazily, unlocked on the first user gesture) and the
 * effects / music buses. Every method is a no-op when Web Audio is unavailable.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private sfxBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private loop: MusicLoop | null = null
  private sfxEnabled = true
  private musicEnabled = true
  /** The current screen wants music (battle), independently of the user setting. */
  private musicRequested = false

  get supported(): boolean {
    return getAudioContextClass() !== null
  }

  /** Must be called from a user gesture: browsers keep audio suspended until then. */
  unlock(): void {
    const created = this.ctx === null
    const ctx = this.ensureContext()
    if (ctx?.state === 'suspended') void ctx.resume().then(() => this.syncMusic())
    else if (created) this.syncMusic()
  }

  play(name: SoundName): void {
    if (!this.sfxEnabled) return
    const ctx = this.ensureContext()
    // A suspended context would queue the sound and play it late: skip it instead.
    if (!ctx || ctx.state !== 'running' || !this.sfxBus) return
    SOUNDS[name](ctx, this.sfxBus, ctx.currentTime + 0.01)
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled
    this.syncMusic()
  }

  startMusic(): void {
    this.musicRequested = true
    this.syncMusic()
  }

  stopMusic(): void {
    this.musicRequested = false
    this.syncMusic()
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) return null

    const ctx = new AudioContextClass()
    // Compressor on the master keeps overlapping effects from clipping.
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -12
    compressor.ratio.value = 4
    const master = ctx.createGain()
    master.gain.value = MASTER_VOLUME
    compressor.connect(master)
    master.connect(ctx.destination)

    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = SFX_VOLUME
    this.sfxBus.connect(compressor)
    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(compressor)

    this.loop = new MusicLoop(ctx, this.musicBus)
    this.ctx = ctx
    return ctx
  }

  private syncMusic(): void {
    const { ctx, loop, musicBus } = this
    if (!ctx || !loop || !musicBus) return
    const shouldPlay = this.musicEnabled && this.musicRequested && ctx.state === 'running'
    const now = ctx.currentTime
    musicBus.gain.cancelScheduledValues(now)
    musicBus.gain.setValueAtTime(musicBus.gain.value, now)
    if (shouldPlay) {
      if (!loop.playing) loop.start()
      musicBus.gain.linearRampToValueAtTime(MUSIC_VOLUME, now + FADE_S)
    } else if (loop.playing) {
      musicBus.gain.linearRampToValueAtTime(0, now + FADE_S)
      // Notes already scheduled fade out with the bus.
      loop.stop()
    }
  }
}

export const audioEngine = new AudioEngine()
