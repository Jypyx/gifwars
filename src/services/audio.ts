type Cue = 'select' | 'place' | 'reveal' | 'move' | 'attack' | 'hit' | 'death' | 'master' | 'freeze' | 'score' | 'win' | 'lose'

let context: AudioContext | null = null
let muted = false

export function setMuted(value: boolean): void { muted = value }
export function isMuted(): boolean { return muted }

function tone(frequency: number, duration: number, delay = 0, wave: OscillatorType = 'square', volume = 0.035): void {
  if (muted || typeof window === 'undefined') return
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + delay
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.55), start + duration)
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration)
  } catch { /* Audio is optional (autoplay or device restrictions). */ }
}

export function playCue(cue: Cue): void {
  switch (cue) {
    case 'select': tone(480, .06); break
    case 'place': tone(280, .13); tone(380, .08, .06); break
    case 'reveal': tone(420, .12); tone(720, .16, .09); break
    case 'move': tone(160, .05, 0, 'triangle', .018); break
    case 'attack': tone(240, .11, 0, 'sawtooth', .055); break
    case 'hit': tone(110, .16, 0, 'sawtooth', .055); break
    case 'death': tone(180, .23, 0, 'sawtooth'); break
    case 'master': tone(330, .2); tone(495, .2, .12); tone(660, .25, .24); break
    case 'freeze': tone(920, .22, 0, 'sine'); tone(650, .3, .08, 'sine'); break
    case 'score': tone(190, .3, 0, 'sawtooth', .06); break
    case 'win': [523, 659, 784, 1047].forEach((note, i) => tone(note, .28, i * .13)); break
    case 'lose': [392, 330, 262].forEach((note, i) => tone(note, .3, i * .16)); break
  }
}
