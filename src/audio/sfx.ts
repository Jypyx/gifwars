/** Cartoon sound effects, synthesized on the fly (no audio files). */
import { midiToHz, noiseBurst, tone, type Ctx } from './synth'

export type SoundRecipe = (ctx: Ctx, out: AudioNode, t: number) => void

/** Plays `notes` (MIDI) one after another, each `step` seconds long. */
function melody(
  ctx: Ctx,
  out: AudioNode,
  t: number,
  notes: readonly number[],
  step: number,
  type: OscillatorType,
  peak: number,
  lastHold = step,
) {
  notes.forEach((note, i) => {
    const last = i === notes.length - 1
    tone(ctx, out, t + i * step, {
      type,
      from: midiToHz(note),
      duration: last ? lastHold : step * 0.95,
      peak,
    })
  })
}

export const SOUNDS = {
  /** Fist-in-the-face: low thump + filtered crack. */
  punch(ctx, out, t) {
    tone(ctx, out, t, { from: 160, to: 45, duration: 0.18, peak: 0.9 })
    noiseBurst(ctx, out, t, { duration: 0.12, peak: 0.7, from: 2500, to: 300 })
  },
  /** Magic blast: two detuned saw sweeps and a sparkle. */
  zap(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', from: 1400, to: 180, duration: 0.3, peak: 0.32 })
    tone(ctx, out, t, {
      type: 'square',
      from: 1420,
      to: 190,
      duration: 0.3,
      peak: 0.16,
      detune: 15,
    })
    tone(ctx, out, t, { from: 300, to: 60, duration: 0.2, peak: 0.4 })
    noiseBurst(ctx, out, t, { duration: 0.2, peak: 0.35, filter: 'highpass', from: 5000 })
  },
  /** Special attack: big explosion. */
  boom(ctx, out, t) {
    tone(ctx, out, t, { from: 90, to: 28, duration: 0.9, peak: 0.6 })
    noiseBurst(ctx, out, t, { duration: 1.1, peak: 0.55, from: 1800, to: 80, attack: 0.01 })
    noiseBurst(ctx, out, t + 0.05, {
      duration: 0.5,
      peak: 0.2,
      filter: 'bandpass',
      from: 600,
      to: 150,
      q: 2,
    })
  },
  /** Lunge before a hit. */
  whoosh(ctx, out, t) {
    noiseBurst(ctx, out, t, {
      duration: 0.22,
      peak: 0.35,
      attack: 0.08,
      filter: 'bandpass',
      from: 400,
      to: 2400,
      q: 1.5,
    })
  },
  /** Boucle: the attack loops into a cartoon spring. */
  boing(ctx, out, t) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const wobble = ctx.createOscillator()
    const depth = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.5)
    wobble.frequency.value = 14
    depth.gain.setValueAtTime(90, t)
    depth.gain.exponentialRampToValueAtTime(1, t + 0.55)
    wobble.connect(depth)
    depth.connect(osc.frequency)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(0.5, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    osc.connect(gain)
    gain.connect(out)
    for (const node of [osc, wobble]) {
      node.start(t)
      node.stop(t + 0.62)
    }
  },
  /** Lag: stuttering digital bleeps. */
  glitch(ctx, out, t) {
    const notes = [88, 76, 91, 70, 84, 79]
    notes.forEach((note, i) =>
      tone(ctx, out, t + i * 0.07, {
        type: 'square',
        from: midiToHz(note),
        duration: 0.04,
        peak: 0.12,
      }),
    )
    noiseBurst(ctx, out, t + 0.42, { duration: 0.08, peak: 0.2, filter: 'highpass', from: 3000 })
  },
  /** A status sticks to the target: ominous wobble. */
  status(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', from: 330, to: 110, duration: 0.45, peak: 0.18 })
    tone(ctx, out, t, { type: 'sine', from: 220, to: 73, duration: 0.45, peak: 0.3 })
  },
  /** Bad Buzz tick: deflating. */
  drain(ctx, out, t) {
    tone(ctx, out, t, { type: 'triangle', from: 700, to: 180, duration: 0.35, peak: 0.3 })
  },
  /** GIF leaves the fight. */
  switch(ctx, out, t) {
    noiseBurst(ctx, out, t, {
      duration: 0.25,
      peak: 0.35,
      attack: 0.03,
      filter: 'bandpass',
      from: 2400,
      to: 400,
      q: 1.5,
    })
  },
  /** GIF enters the fight: quick rising arpeggio. */
  enter(ctx, out, t) {
    melody(ctx, out, t, [72, 76, 79, 84], 0.06, 'triangle', 0.3, 0.18)
  },
  /** K.O.: falling whistle, then a thud. */
  ko(ctx, out, t) {
    tone(ctx, out, t, { from: 1500, to: 180, duration: 0.55, peak: 0.25 })
    tone(ctx, out, t + 0.55, { from: 120, to: 40, duration: 0.3, peak: 0.9 })
    noiseBurst(ctx, out, t + 0.55, { duration: 0.2, peak: 0.5, from: 900, to: 100 })
  },
  /** Synergy heal: little bells. */
  heal(ctx, out, t) {
    tone(ctx, out, t, { from: midiToHz(88), duration: 0.5, peak: 0.18 })
    tone(ctx, out, t + 0.09, { from: midiToHz(93), duration: 0.6, peak: 0.15 })
  },
  /** Last seconds of the timer. */
  tick(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', from: 1300, duration: 0.03, peak: 0.12 })
  },
  /** Timer ran out. */
  buzzer(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', from: 110, duration: 0.4, peak: 0.25 })
    tone(ctx, out, t, { type: 'square', from: 113, duration: 0.4, peak: 0.12 })
  },
  /** UI click. */
  click(ctx, out, t) {
    tone(ctx, out, t, { type: 'triangle', from: 1800, to: 900, duration: 0.04, peak: 0.15 })
  },
  victory(ctx, out, t) {
    melody(ctx, out, t, [67, 72, 76, 79, 76, 79, 84], 0.13, 'square', 0.16, 0.8)
    melody(ctx, out, t, [55, 60, 64, 67, 64, 67, 72], 0.13, 'triangle', 0.25, 0.8)
  },
  /** Sad trombone: wah, wah, wah, waaah. */
  defeat(ctx, out, t) {
    const notes = [67, 66, 65, 64]
    notes.forEach((note, i) => {
      const last = i === notes.length - 1
      const start = t + i * 0.42
      const duration = last ? 1.1 : 0.38
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(400, start)
      filter.frequency.linearRampToValueAtTime(1400, start + 0.12)
      filter.frequency.linearRampToValueAtTime(500, start + duration)
      filter.connect(out)
      const osc = tone(ctx, filter, start, {
        type: 'sawtooth',
        from: midiToHz(note - 12),
        duration,
        peak: 0.4,
        attack: 0.04,
      })
      if (last) {
        const vibrato = ctx.createOscillator()
        const depth = ctx.createGain()
        vibrato.frequency.value = 6
        depth.gain.value = 40
        vibrato.connect(depth)
        depth.connect(osc.detune)
        vibrato.start(start + 0.2)
        vibrato.stop(start + duration)
      }
    })
  },
} satisfies Record<string, SoundRecipe>

export type SoundName = keyof typeof SOUNDS
