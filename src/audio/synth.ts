/**
 * Tiny Web Audio building blocks. Every helper schedules nodes at time `t` on any
 * `BaseAudioContext`, so sounds can also be rendered offline (tests, measurements).
 */

export type Ctx = BaseAudioContext

const SILENCE = 0.0001

export const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12)

const noiseBuffers = new WeakMap<Ctx, AudioBuffer>()

/** One second of white noise, cached per context. */
export function noiseBuffer(ctx: Ctx): AudioBuffer {
  let buffer = noiseBuffers.get(ctx)
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffers.set(ctx, buffer)
  }
  return buffer
}

/** Gain node with a fast attack and an exponential decay, connected to `out`. */
export function envelope(
  ctx: Ctx,
  out: AudioNode,
  t: number,
  { peak = 1, attack = 0.005, duration }: { peak?: number; attack?: number; duration: number },
): GainNode {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(SILENCE, t)
  gain.gain.linearRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(SILENCE, t + duration)
  gain.connect(out)
  return gain
}

export interface ToneOptions {
  type?: OscillatorType
  /** Start frequency (Hz). */
  from: number
  /** End frequency (Hz), defaults to `from`. */
  to?: number
  duration: number
  peak?: number
  attack?: number
  detune?: number
}

export function tone(ctx: Ctx, out: AudioNode, t: number, options: ToneOptions): OscillatorNode {
  const { type = 'sine', from, to = from, duration, peak = 0.5, attack, detune = 0 } = options
  const osc = ctx.createOscillator()
  osc.type = type
  osc.detune.value = detune
  osc.frequency.setValueAtTime(from, t)
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration)
  osc.connect(envelope(ctx, out, t, { peak, attack, duration }))
  osc.start(t)
  osc.stop(t + duration + 0.02)
  return osc
}

export interface NoiseOptions {
  duration: number
  peak?: number
  attack?: number
  filter?: BiquadFilterType
  /** Filter frequency at start / end (Hz). */
  from?: number
  to?: number
  q?: number
}

export function noiseBurst(ctx: Ctx, out: AudioNode, t: number, options: NoiseOptions): void {
  const {
    duration,
    peak = 0.5,
    attack,
    filter = 'lowpass',
    from = 2000,
    to = from,
    q = 1,
  } = options
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx)
  source.loop = true
  const biquad = ctx.createBiquadFilter()
  biquad.type = filter
  biquad.Q.value = q
  biquad.frequency.setValueAtTime(from, t)
  if (to !== from) biquad.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration)
  source.connect(biquad)
  biquad.connect(envelope(ctx, out, t, { peak, attack, duration }))
  source.start(t)
  source.stop(t + duration + 0.02)
}
