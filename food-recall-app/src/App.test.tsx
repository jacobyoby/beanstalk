import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchRecalls, getLastSynced, isDemoMode, type FetchResult } from './lib/api'
import type { Recall } from './types/recall'

vi.mock('./lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('./lib/api')>(),
  fetchRecalls: vi.fn(),
  getLastSynced: vi.fn(),
  isDemoMode: vi.fn(),
}))

const record: Recall = {
  id: 'TEST-001', recallNumber: 'TEST-001', eventId: 'test-event',
  productDescription: 'Example sesame crackers', reasonForRecall: 'Undeclared milk.',
  classification: 'Class I', status: 'Ongoing', distributionPattern: 'NJ, NY',
  recallingFirm: 'Example Foods', city: 'Newark', state: 'NJ', country: 'US',
  recallInitiationDate: '20260801', productType: 'Food', codeInfo: 'Lot 001',
  moreCodeInfo: '', voluntaryMandated: 'Voluntary', address1: '', address2: '',
  postalCode: '', centerClassificationDate: '', initialFirmNotification: '',
  productQuantity: '', terminationDate: '',
}

const result: FetchResult = {
  recalls: [record], total: 1, error: null, isStale: false, isDemo: false,
  lastSynced: '2026-09-08T10:15:00.000Z',
}

function installMediaQueries(initialWidth: number) {
  let width = initialWidth
  const queries = new Map<string, MediaQueryList>()
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    const existing = queries.get(query)
    if (existing) return existing
    const media = Object.assign(new EventTarget(), {
      media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    }) as unknown as MediaQueryList
    Object.defineProperty(media, 'matches', {
      get: () => {
        const minimum = query.match(/min-width:\s*(\d+)px/)
        return minimum ? width >= Number(minimum[1]) : false
      },
    })
    queries.set(query, media)
    return media
  }))
  return (nextWidth: number) => {
    width = nextWidth
    for (const media of queries.values()) {
      const change = new Event('change')
      Object.defineProperty(change, 'matches', { value: media.matches })
      media.dispatchEvent(change)
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  installMediaQueries(480)
  vi.mocked(isDemoMode).mockReturnValue(false)
  vi.mocked(getLastSynced).mockReturnValue('2026-09-08T21:45:00.000Z')
  vi.mocked(fetchRecalls).mockResolvedValue(result)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
})

describe('App responsive layout and data provenance', () => {
  it('shows results with filters collapsed on a 480px screen', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: `View recall TEST-001: ${record.productDescription}` })).toBeVisible()
    const disclosure = screen.getByText('Filters and watchlist').closest('details')
    expect(disclosure).not.toBeNull()
    expect(disclosure).not.toHaveAttribute('open')
    expect(screen.getByLabelText('Classification')).not.toBeVisible()
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible()
  })

  it('reveals usable sidebar controls when the same screen reaches 1024px', async () => {
    const resize = installMediaQueries(480)
    render(<App />)
    await screen.findByText(record.productDescription)

    act(() => resize(1024))

    expect(screen.queryByText('Filters and watchlist')).not.toBeInTheDocument()
    const classification = screen.getByRole('combobox', { name: 'Classification' })
    expect(classification).toBeVisible()
    fireEvent.change(classification, { target: { value: 'Class II' } })
    expect(fetchRecalls).toHaveBeenLastCalledWith(expect.objectContaining({ classification: 'Class II' }))

    act(() => resize(480))
    expect(screen.getByText('Filters and watchlist').closest('details')).not.toHaveAttribute('open')
  })

  it('labels stale records with their own retrieval time instead of the global sync time', async () => {
    vi.mocked(fetchRecalls).mockResolvedValue({
      ...result, isStale: true,
      error: { code: 'NETWORK', message: 'Offline', retryable: true },
    })
    render(<App />)

    await screen.findByText(record.productDescription)
    const staleBanner = screen.getByText(/Stale cached data/)
    expect(staleBanner).toHaveTextContent(new Date(result.lastSynced!).toLocaleString())
    expect(staleBanner).not.toHaveTextContent(new Date(getLastSynced()!).toLocaleString())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })

  it('labels explicit demo mode before loading and never links fictional records to FDA sources', async () => {
    let resolveFetch!: (value: FetchResult) => void
    const pending = new Promise<FetchResult>(resolve => { resolveFetch = resolve })
    vi.mocked(isDemoMode).mockReturnValue(true)
    vi.mocked(fetchRecalls).mockReturnValue(pending)
    render(<App />)

    expect(screen.getByText('Demo data')).toBeVisible()
    expect(screen.queryByText('Live FDA data')).not.toBeInTheDocument()
    expect(screen.getAllByText(/fictional/i).length).toBeGreaterThan(0)

    await act(async () => resolveFetch({ ...result, isDemo: true }))
    fireEvent.click(screen.getByRole('button', { name: `View recall TEST-001: ${record.productDescription}` }))

    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.queryByRole('link', { name: /source record|view on fda/i })).not.toBeInTheDocument()
    const sourceLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .filter(link => /https:\/\/(api|www\.accessdata)\.fda\.gov\//.test(link.href))
    expect(sourceLinks).toHaveLength(0)
    expect(screen.queryByText(/FDA enforcement archive/)).not.toBeInTheDocument()
  })
})
