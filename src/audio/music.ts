/**
 * Upbeat battle loop (drums, bass, chord stabs) generated live with a look-ahead scheduler:
 * notes are scheduled slightly in advance on the audio clock, so timing stays tight
 * even if the main thread is busy.
 */
import { midiToHz, noiseBurst, tone, type Ctx } from './synth'

const BPM = 132
const STEP = 60 / BPM / 4 // one 16th note
const STEPS_PER_BAR = 16
const LOOKAHEAD_S = 0.12
const SCHEDULER_MS = 25

/** I – vi – IV – V in C, one chord per bar. */
const BARS = [
  { bass: 48, chord: [60, 64, 67] },
  { bass: 45, chord: [57, 60, 64] },
  { bass: 41, chord: [57, 60, 65] },
  { bass: 43, chord: [55, 59, 62] },
] as const

const BASS_STEPS = new Set([0, 3, 6, 8, 11, 14])
const OCTAVE_STEPS = new Set([6, 14])
const STAB_STEPS = new Set([2, 6, 10, 14])

function scheduleStep(ctx: Ctx, out: AudioNode, step: number, t: number) {
  const bar = BARS[Math.floor(step / STEPS_PER_BAR) % BARS.length]!
  const inBar = step % STEPS_PER_BAR
  const lastBar = Math.floor(step / STEPS_PER_BAR) % BARS.length === BARS.length - 1

  // Drums
  if (inBar === 0 || inBar === 8 || (lastBar && inBar === 10)) {
    tone(ctx, out, t, { from: 150, to: 45, duration: 0.22, peak: 0.8 })
  }
  if (inBar === 4 || inBar === 12) {
    noiseBurst(ctx, out, t, { duration: 0.14, peak: 0.35, filter: 'highpass', from: 1500 })
    tone(ctx, out, t, { type: 'triangle', from: 220, to: 160, duration: 0.08, peak: 0.25 })
  }
  if (inBar % 2 === 0) {
    noiseBurst(ctx, out, t, {
      duration: inBar === 14 ? 0.12 : 0.035,
      peak: 0.12,
      filter: 'highpass',
      from: 7000,
    })
  }
  // Fill on the last bar
  if (lastBar && inBar >= 13) {
    noiseBurst(ctx, out, t, { duration: 0.08, peak: 0.25, filter: 'bandpass', from: 900, q: 1.2 })
  }

  // Bass
  if (BASS_STEPS.has(inBar)) {
    const note = bar.bass + (OCTAVE_STEPS.has(inBar) ? 12 : 0)
    tone(ctx, out, t, { type: 'square', from: midiToHz(note), duration: STEP * 1.6, peak: 0.14 })
    tone(ctx, out, t, { type: 'triangle', from: midiToHz(note), duration: STEP * 1.6, peak: 0.3 })
  }

  // Chord stabs on the off-beats
  if (STAB_STEPS.has(inBar)) {
    for (const note of bar.chord) {
      tone(ctx, out, t, {
        type: 'triangle',
        from: midiToHz(note),
        duration: STEP * 0.9,
        peak: 0.07,
      })
    }
  }
}

export class MusicLoop {
  private timerId: ReturnType<typeof setInterval> | null = null
  private nextStep = 0
  private nextTime = 0

  constructor(
    private readonly ctx: Ctx,
    private readonly out: AudioNode,
  ) {}

  get playing(): boolean {
    return this.timerId !== null
  }

  start(): void {
    if (this.timerId !== null) return
    this.nextStep = 0
    this.nextTime = this.ctx.currentTime + 0.05
    this.schedule()
    this.timerId = setInterval(() => this.schedule(), SCHEDULER_MS)
  }

  stop(): void {
    if (this.timerId !== null) clearInterval(this.timerId)
    this.timerId = null
  }

  private schedule() {
    // After a long pause (tab in background), resync instead of flooding notes.
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_S) {
      scheduleStep(this.ctx, this.out, this.nextStep, this.nextTime)
      this.nextStep += 1
      this.nextTime += STEP
    }
  }
}

/** Renders `bars` of the loop on `ctx` starting at `t` (used for offline checks). */
export function renderBars(ctx: Ctx, out: AudioNode, t: number, bars: number): void {
  for (let step = 0; step < bars * STEPS_PER_BAR; step++)
    scheduleStep(ctx, out, step, t + step * STEP)
}
