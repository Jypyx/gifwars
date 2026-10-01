import { describe, expect, it } from 'vitest'
import { renderBars } from '@/audio/music'
import { SOUNDS } from '@/audio/sfx'

/** AudioParam stand-in enforcing the real API's constraints. */
class FakeParam {
  value = 0
  setValueAtTime(value: number) {
    this.value = value
    return this
  }
  linearRampToValueAtTime(value: number) {
    this.value = value
    return this
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    if (!(value > 0)) throw new RangeError(`exponential ramp to ${value}`)
    if (!Number.isFinite(time)) throw new RangeError('non-finite time')
    this.value = value
    return this
  }
  cancelScheduledValues() {
    return this
  }
}

class FakeNode {
  readonly outputs: unknown[] = []
  connect(destination: unknown) {
    this.outputs.push(destination)
    return destination
  }
}

/** Oscillators / buffer sources: must be connected, started, then stopped later. */
class FakeSource extends FakeNode {
  readonly frequency = new FakeParam()
  readonly detune = new FakeParam()
  type = ''
  buffer: unknown = null
  loop = false
  startedAt: number | null = null
  stoppedAt: number | null = null
  start(t = 0) {
    this.startedAt = t
  }
  stop(t = 0) {
    this.stoppedAt = t
  }
}

class FakeContext {
  readonly sampleRate = 8000
  readonly currentTime = 0
  readonly destination = new FakeNode()
  readonly sources: FakeSource[] = []
  createOscillator() {
    const osc = new FakeSource()
    this.sources.push(osc)
    return osc
  }
  createBufferSource() {
    return this.createOscillator()
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam() })
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), {
      type: '',
      frequency: new FakeParam(),
      Q: new FakeParam(),
    })
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
}

function render(recipe: (ctx: BaseAudioContext, out: AudioNode, t: number) => void) {
  const ctx = new FakeContext()
  recipe(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode, 1)
  return ctx
}

describe('sound recipes', () => {
  it.each(Object.keys(SOUNDS) as (keyof typeof SOUNDS)[])('%s schedules a finite sound', (name) => {
    const ctx = render(SOUNDS[name])
    expect(ctx.sources.length).toBeGreaterThan(0)
    for (const source of ctx.sources) {
      expect(source.outputs.length).toBeGreaterThan(0)
      expect(source.startedAt).toBeGreaterThanOrEqual(1)
      expect(source.stoppedAt).toBeGreaterThan(source.startedAt!)
      // Nothing rings longer than the victory fanfare / sad trombone.
      expect(source.stoppedAt! - 1).toBeLessThan(3)
    }
  })

  it('renders the music loop', () => {
    const ctx = render((c, out, t) => renderBars(c, out, t, 4))
    expect(ctx.sources.length).toBeGreaterThan(100)
  })
})
