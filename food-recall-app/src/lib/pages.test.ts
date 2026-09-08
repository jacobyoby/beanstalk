import { afterEach, expect, it, vi } from 'vitest'
import { clearCache, fetchRecalls } from './api'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearCache()
})

it('queries openFDA directly on Pages without a nonexistent local backend or owner key', async () => {
  vi.stubEnv('MODE', 'pages')
  vi.stubEnv('VITE_DEMO', 'false')
  localStorage.removeItem('ponder:demo')
  clearCache()
  const network = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ meta: { results: { total: 1 } }, results: [{
      recall_number: 'TEST-RECORD', product_description: 'Test record',
      reason_for_recall: 'Test reason', classification: 'Class I',
      status: 'Ongoing', recalling_firm: 'Test firm', distribution_pattern: 'HI',
    }] }),
  })
  vi.stubGlobal('fetch', network)
  const result = await fetchRecalls({ search: 'Test record', limit: 1 })
  expect(result.isDemo).toBe(false)
  expect(result.error).toBeNull()
  expect(network).toHaveBeenCalledTimes(1)
  const url = new URL(network.mock.calls[0][0])
  expect(url.origin).toBe('https://api.fda.gov')
  expect(url.pathname).toBe('/food/enforcement.json')
  expect(url.searchParams.has('api_key')).toBe(false)
})
