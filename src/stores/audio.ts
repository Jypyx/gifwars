import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { audioEngine } from '@/audio/AudioEngine'
import type { SoundName } from '@/audio/sfx'

const STORAGE_KEY = 'gifwars:audio'

interface AudioSettings {
  sfx: boolean
  music: boolean
}

function loadSettings(): AudioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AudioSettings>
    return { sfx: saved.sfx !== false, music: saved.music !== false }
  } catch {
    return { sfx: true, music: true }
  }
}

/** Sound settings (remembered in this browser) and a thin facade over the audio engine. */
export const useAudioStore = defineStore('audio', () => {
  const initial = loadSettings()
  const sfxEnabled = ref(initial.sfx)
  const musicEnabled = ref(initial.music)

  audioEngine.setSfxEnabled(sfxEnabled.value)
  audioEngine.setMusicEnabled(musicEnabled.value)

  watch([sfxEnabled, musicEnabled], ([sfx, music]) => {
    audioEngine.setSfxEnabled(sfx)
    audioEngine.setMusicEnabled(music)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sfx, music } satisfies AudioSettings))
    } catch {
      // Storage unavailable (private mode…): settings simply won't persist.
    }
  })

  return {
    supported: audioEngine.supported,
    sfxEnabled,
    musicEnabled,
    toggleSfx: () => (sfxEnabled.value = !sfxEnabled.value),
    toggleMusic: () => (musicEnabled.value = !musicEnabled.value),
    play: (name: SoundName) => audioEngine.play(name),
    unlock: () => audioEngine.unlock(),
    startMusic: () => audioEngine.startMusic(),
    stopMusic: () => audioEngine.stopMusic(),
  }
})
