import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useAudioStore } from '@/stores/audio'

describe('useAudioStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('enables sound by default and never throws without Web Audio', () => {
    const audio = useAudioStore()
    expect(audio.supported).toBe(false) // jsdom has no AudioContext
    expect(audio.sfxEnabled).toBe(true)
    expect(audio.musicEnabled).toBe(true)
    expect(() => {
      audio.unlock()
      audio.play('punch')
      audio.startMusic()
      audio.stopMusic()
    }).not.toThrow()
  })

  it('remembers the settings', async () => {
    const audio = useAudioStore()
    audio.toggleMusic()
    await nextTick()
    expect(JSON.parse(localStorage.getItem('gifwars:audio')!)).toEqual({ sfx: true, music: false })

    setActivePinia(createPinia())
    expect(useAudioStore().musicEnabled).toBe(false)
  })

  it('ignores corrupted saved settings', () => {
    localStorage.setItem('gifwars:audio', '{oops')
    expect(useAudioStore().sfxEnabled).toBe(true)
  })
})
