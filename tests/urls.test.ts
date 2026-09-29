import { afterEach, describe, expect, it, vi } from 'vitest'
import { assetUrl } from '../src/services/urls'

afterEach(() => vi.unstubAllEnvs())

describe('deployment asset URLs', () => {
  it.each(['/', '/gifwars/', '/another-repo/'])('keeps GIFs and notification links under %s', base => {
    vi.stubEnv('BASE_URL', base)
    expect(assetUrl('gifs/tank.gif')).toBe(`${base}gifs/tank.gif`)
    expect(assetUrl('/icons/icon-192.png')).toBe(`${base}icons/icon-192.png`)
    expect(assetUrl('')).toBe(base)
  })
})
