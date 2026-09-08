import { afterEach, expect, it, vi } from 'vitest'
import { fetchRecalls } from './api'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

it('keeps a demo build fictional without network access when browser storage is blocked', async () => {
  vi.stubEnv('VITE_DEMO', 'true')
  window.history.replaceState({}, '', '/?demo=0')
  vi.stubGlobal('localStorage', {
    getItem() { throw new DOMException('Storage disabled', 'SecurityError') },
  })
  const network = vi.fn().mockRejectedValue(new Error('Unexpected FDA request'))
  vi.stubGlobal('fetch', network)

  const result = await fetchRecalls({ limit: 20 })
  expect(result.isDemo).toBe(true)
  expect(result.error).toBeNull()
  expect(result.recalls.length).toBeGreaterThan(0)
  expect(result.recalls.every(r => r.recallingFirm.includes('(fictional)'))).toBe(true)
  expect(network).not.toHaveBeenCalled()
})
