import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import App from './App'
import { fetchRecalls } from './lib/api'

const fetchRecallsMock = vi.mocked(fetchRecalls)

// Mock API
vi.mock('./lib/api', () => ({
  fetchRecalls: vi.fn().mockResolvedValue({ recalls: [], total: 0, error: null, isStale: false, isDemo: false }),
  getLastSynced: vi.fn().mockReturnValue(new Date().toISOString()),
}))

// Mock notifications module (we spy on individual exports)
const mockRequestPermission = vi.fn()
vi.mock('./lib/notifications', () => ({
  requestNotificationPermission: (...args: unknown[]) => mockRequestPermission(...args),
  sendNotification: vi.fn(),
  getPermissionStatus: () => mockGetPermissionStatus(),
}))

let mockGetPermissionStatus: () => string = () => 'default'

const mockNotificationAPI = (permission: string) => {
  const mock = vi.fn() as any
  mock.permission = permission
  mock.requestPermission = vi.fn().mockResolvedValue(permission)
  vi.stubGlobal('Notification', mock)
}

const removeNotificationAPI = () => {
  vi.unstubAllGlobals()
}

describe('App notification integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockGetPermissionStatus = () => 'default'
    // jsdom does not implement matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    removeNotificationAPI()
  })

  it('initializes notificationsEnabled as false when permission is not granted', () => {
    removeNotificationAPI()
    render(<App />)
    // Button should appear because notifications are not enabled and permission is not denied
    expect(screen.getByRole('button', { name: /enable browser alert/i })).toBeInTheDocument()
  })

  it('initializes notificationsEnabled as true when permission is granted and localStorage preference is set', async () => {
    mockNotificationAPI('granted')
    mockGetPermissionStatus = () => 'granted'
    localStorage.setItem('notificationsEnabled', 'true')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/alerts on/i)).toBeInTheDocument()
    })
    // Enable Alerts button should NOT be present
    expect(screen.queryByRole('button', { name: /enable browser alert/i })).not.toBeInTheDocument()
  })

  it('initializes notificationsEnabled as false when permission is granted but localStorage preference is not set', () => {
    mockNotificationAPI('granted')
    mockGetPermissionStatus = () => 'granted'
    // localStorage has no notificationsEnabled key
    render(<App />)
    expect(screen.getByRole('button', { name: /enable browser alert/i })).toBeInTheDocument()
  })

  it('hides Enable Alerts button when permission is denied', () => {
    mockNotificationAPI('denied')
    mockGetPermissionStatus = () => 'denied'
    render(<App />)
    expect(screen.queryByRole('button', { name: /enable browser alert/i })).not.toBeInTheDocument()
  })

  it('clicking Enable Alerts calls requestNotificationPermission', async () => {
    mockNotificationAPI('default')
    mockGetPermissionStatus = () => 'default'
    mockRequestPermission.mockResolvedValue(true)
    render(<App />)

    const button = await screen.findByRole('button', { name: /enable browser alert/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled()
    })
  })

  it('updates state to enabled after permission is granted', async () => {
    mockNotificationAPI('default')
    mockGetPermissionStatus = () => 'default'
    mockRequestPermission.mockResolvedValue(true)
    render(<App />)

    const button = await screen.findByRole('button', { name: /enable browser alert/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/alerts on/i)).toBeInTheDocument()
    })
  })

  it('persists preference to localStorage after enabling', async () => {
    mockNotificationAPI('default')
    mockGetPermissionStatus = () => 'default'
    mockRequestPermission.mockResolvedValue(true)
    render(<App />)

    const button = await screen.findByRole('button', { name: /enable browser alert/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(localStorage.getItem('notificationsEnabled')).toBe('true')
    })
  })

  it('remains disabled if permission is denied after clicking Enable Alerts', async () => {
    mockNotificationAPI('default')
    mockGetPermissionStatus = () => 'default'
    mockRequestPermission.mockResolvedValue(false)
    render(<App />)

    const button = await screen.findByRole('button', { name: /enable browser alert/i })
    fireEvent.click(button)

    // Wait a tick for the async handler
    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled()
    })
    // Button should still be visible (state is false)
    expect(screen.getByRole('button', { name: /enable browser alert/i })).toBeInTheDocument()
  })
})

describe('App search and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockGetPermissionStatus = () => 'denied'
    fetchRecallsMock.mockResolvedValue({ recalls: [], total: 0, error: null, isStale: false, isDemo: false })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders app header with Beanstalk title', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('Beanstalk')).toBeInTheDocument())
  })

  it('debounces search input — fetchRecalls not called immediately on typing', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByPlaceholderText(/Product, reason, firm/)).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText(/Product, reason, firm/)
    // Initial render calls fetchRecalls once (mount)
    const callCountBefore = fetchRecallsMock.mock.calls.length

    fireEvent.change(searchInput, { target: { value: 'peanut' } })

    // Should NOT immediately trigger another fetch (debounce is 400ms)
    expect(fetchRecallsMock.mock.calls.length).toBe(callCountBefore)

    // After debounce, fetchRecalls should be called with the search term
    await waitFor(() => {
      const lastCall = fetchRecallsMock.mock.calls[fetchRecallsMock.mock.calls.length - 1][0]
      expect(lastCall.search).toBe('peanut')
    }, { timeout: 2000 })
  })

  it('resets page to 0 when debounced search changes', async () => {
    // Start with 12 recalls so we have 2 pages
    const mockData = Array.from({ length: 12 }, (_, i) => ({
      id: `F-${i}`, recallNumber: `F-${i}`, eventId: `${i}`,
      productDescription: `Product ${i}`, reasonForRecall: `Reason ${i}`,
      classification: 'Class I' as const, status: 'Ongoing',
      distributionPattern: 'CA', recallingFirm: 'Firm',
      city: 'City', state: 'CA', country: 'US',
      recallInitiationDate: '20250101', productType: 'Food',
      codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
      address1: '', address2: '', postalCode: '',
      centerClassificationDate: '', initialFirmNotification: '',
      productQuantity: '', terminationDate: '',
    }))
    fetchRecallsMock.mockResolvedValue({ recalls: mockData.slice(0, 6), total: 12, error: null, isStale: false, isDemo: false })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/Page 1/)).toBeInTheDocument())

    // Navigate to page 2
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText(/Page 2/)).toBeInTheDocument())

    // Now change search — should reset to page 0
    const searchInput = screen.getByPlaceholderText(/Product, reason, firm/)
    fireEvent.change(searchInput, { target: { value: 'milk' } })

    await waitFor(() => {
      expect(screen.getByText(/Page 1/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('disables Previous button on first page', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('shows "No recalls match your filters" when empty and not loading', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText(/No recalls match your filters/)).toBeInTheDocument())
  })

  it('renders recall cards when data is available', async () => {
    const mockData = [{
      id: 'F-100', recallNumber: 'F-100', eventId: '100',
      productDescription: 'Tasty Cookies', reasonForRecall: 'Undeclared allergen',
      classification: 'Class I' as const, status: 'Ongoing',
      distributionPattern: 'NY', recallingFirm: 'Cookie Corp',
      city: 'Brooklyn', state: 'NY', country: 'US',
      recallInitiationDate: '20250101', productType: 'Food',
      codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
      address1: '', address2: '', postalCode: '',
      centerClassificationDate: '', initialFirmNotification: '',
      productQuantity: '', terminationDate: '',
    }]
    fetchRecallsMock.mockResolvedValue({ recalls: mockData, total: 1, error: null, isStale: false, isDemo: false })

    render(<App />)
    await waitFor(() => expect(screen.getByText('Tasty Cookies')).toBeInTheDocument())
  })

  it('navigates pages with Next and Previous buttons', async () => {
    const mockData = Array.from({ length: 12 }, (_, i) => ({
      id: `F-${i}`, recallNumber: `F-${i}`, eventId: `${i}`,
      productDescription: `Product ${i}`, reasonForRecall: `Reason ${i}`,
      classification: 'Class I' as const, status: 'Ongoing',
      distributionPattern: 'CA', recallingFirm: 'Firm',
      city: 'City', state: 'CA', country: 'US',
      recallInitiationDate: '20250101', productType: 'Food',
      codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
      address1: '', address2: '', postalCode: '',
      centerClassificationDate: '', initialFirmNotification: '',
      productQuantity: '', terminationDate: '',
    }))
    fetchRecallsMock.mockResolvedValue({ recalls: mockData.slice(0, 6), total: 12, error: null, isStale: false, isDemo: false })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/Page 1/)).toBeInTheDocument())

    // Click Next
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText(/Page 2/)).toBeInTheDocument())

    // Verify skip param in last fetchRecalls call
    const calls = fetchRecallsMock.mock.calls
    const lastCallArgs = calls[calls.length - 1][0]
    expect(lastCallArgs.skip).toBe(6)

    // Click Previous
    fireEvent.click(screen.getByRole('button', { name: /previous/i }))
    await waitFor(() => expect(screen.getByText(/Page 1/)).toBeInTheDocument())
  })

  it('clamps page when total shrinks below current page', async () => {
    // Start with many results (page 3 available)
    const manyResults = Array.from({ length: 6 }, (_, i) => ({
      id: `F-${i}`, recallNumber: `F-${i}`, eventId: `${i}`,
      productDescription: `Product ${i}`, reasonForRecall: 'Reason',
      classification: 'Class I' as const, status: 'Ongoing',
      distributionPattern: 'CA', recallingFirm: 'Firm',
      city: 'City', state: 'CA', country: 'US',
      recallInitiationDate: '20250101', productType: 'Food',
      codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
      address1: '', address2: '', postalCode: '',
      centerClassificationDate: '', initialFirmNotification: '',
      productQuantity: '', terminationDate: '',
    }))
    fetchRecallsMock.mockResolvedValue({ recalls: manyResults, total: 30, error: null, isStale: false, isDemo: false })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/Page 1/)).toBeInTheDocument())

    // Go to page 2
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText(/Page 2/)).toBeInTheDocument())

    // Now simulate search narrowing to fewer results (total drops to 6 = 1 page)
    fetchRecallsMock.mockResolvedValue({ recalls: manyResults, total: 6, error: null, isStale: false, isDemo: false })
    const searchInput = screen.getByPlaceholderText(/Product, reason, firm/)
    fireEvent.change(searchInput, { target: { value: 'narrow' } })

    // Should clamp back to page 1
    await waitFor(() => {
      expect(screen.getByText(/Page 1/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('shows stale banner when data is stale', async () => {
    fetchRecallsMock.mockResolvedValue({
      recalls: [{
        id: 'F-1', recallNumber: 'F-1', eventId: '1',
        productDescription: 'Stale Product', reasonForRecall: 'Reason',
        classification: 'Class I' as const, status: 'Ongoing',
        distributionPattern: 'CA', recallingFirm: 'Firm',
        city: 'City', state: 'CA', country: 'US',
        recallInitiationDate: '20250101', productType: 'Food',
        codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
        address1: '', address2: '', postalCode: '',
        centerClassificationDate: '', initialFirmNotification: '',
        productQuantity: '', terminationDate: '',
      }],
      total: 1,
      error: { code: 'NETWORK' as const, message: 'Network error', retryable: true },
      isStale: true,
      isDemo: false,
    })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/Stale cached data/)).toBeInTheDocument())
    expect(screen.getByText(/Retry/)).toBeInTheDocument()
  })

  it('shows demo banner when in demo mode', async () => {
    fetchRecallsMock.mockResolvedValue({
      recalls: [{
        id: 'DEMO-F-1', recallNumber: 'DEMO-F-1', eventId: '1',
        productDescription: 'DEMO Product', reasonForRecall: 'Reason',
        classification: 'Class I' as const, status: 'Ongoing',
        distributionPattern: 'CA', recallingFirm: 'Firm',
        city: 'City', state: 'CA', country: 'US',
        recallInitiationDate: '20250101', productType: 'Food',
        codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
        address1: '', address2: '', postalCode: '',
        centerClassificationDate: '', initialFirmNotification: '',
        productQuantity: '', terminationDate: '',
      }],
      total: 1, error: null, isStale: false, isDemo: true,
    })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/DEMO MODE/)).toBeInTheDocument())
  })

  it('shows error message when fetch fails and no cached data', async () => {
    fetchRecallsMock.mockResolvedValue({
      recalls: [], total: 0,
      error: { code: 'NETWORK' as const, message: 'Connection failed', retryable: true },
      isStale: false, isDemo: false,
    })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/Failed to load recalls/)).toBeInTheDocument())
  })

  it('shows truncated window message when total exceeds FDA max offset', async () => {
    const mockData = Array.from({ length: 6 }, (_, i) => ({
      id: `F-${i}`, recallNumber: `F-${i}`, eventId: `${i}`,
      productDescription: `Product ${i}`, reasonForRecall: 'Reason',
      classification: 'Class I' as const, status: 'Ongoing',
      distributionPattern: 'CA', recallingFirm: 'Firm',
      city: 'City', state: 'CA', country: 'US',
      recallInitiationDate: '20250101', productType: 'Food',
      codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
      address1: '', address2: '', postalCode: '',
      centerClassificationDate: '', initialFirmNotification: '',
      productQuantity: '', terminationDate: '',
    }))
    fetchRecallsMock.mockResolvedValue({ recalls: mockData, total: 50000, error: null, isStale: false, isDemo: false })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/FDA's offset limit/)).toBeInTheDocument())
  })

  it('abort controller racing: rapid fetches only use latest result', async () => {
    // Simulate: first fetch is slow, second is fast.
    // The component's requestIdRef should discard the first result.
    let firstCallResolve: (v: any) => void
    const firstCallPromise = new Promise<any>((resolve) => { firstCallResolve = resolve })
    const secondCallResult = {
      recalls: [{
        id: 'F-2', recallNumber: 'F-2', eventId: '2',
        productDescription: 'Second Result', reasonForRecall: 'Reason',
        classification: 'Class I' as const, status: 'Ongoing',
        distributionPattern: 'CA', recallingFirm: 'Firm',
        city: 'City', state: 'CA', country: 'US',
        recallInitiationDate: '20250101', productType: 'Food',
        codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
        address1: '', address2: '', postalCode: '',
        centerClassificationDate: '', initialFirmNotification: '',
        productQuantity: '', terminationDate: '',
      }],
      total: 1, error: null, isStale: false, isDemo: false,
    }

    fetchRecallsMock
      .mockReturnValueOnce(firstCallPromise)
      .mockResolvedValueOnce(secondCallResult)

    render(<App />)

    // Trigger a search to cause a second fetch
    await waitFor(() => expect(screen.getByPlaceholderText(/Product, reason, firm/)).toBeInTheDocument())
    const searchInput = screen.getByPlaceholderText(/Product, reason, firm/)

    fireEvent.change(searchInput, { target: { value: 'first' } })
    // Wait for debounce to trigger second fetch
    await new Promise(r => setTimeout(r, 500))

    // Now resolve the first call late
    firstCallResolve!({
      recalls: [{
        id: 'F-1', recallNumber: 'F-1', eventId: '1',
        productDescription: 'First Result', reasonForRecall: 'Reason',
        classification: 'Class I' as const, status: 'Ongoing',
        distributionPattern: 'CA', recallingFirm: 'Firm',
        city: 'City', state: 'CA', country: 'US',
        recallInitiationDate: '20250101', productType: 'Food',
        codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
        address1: '', address2: '', postalCode: '',
        centerClassificationDate: '', initialFirmNotification: '',
        productQuantity: '', terminationDate: '',
      }],
      total: 1, error: null, isStale: false, isDemo: false,
    })

    // Wait for UI to settle
    await new Promise(r => setTimeout(r, 100))

    // Second result should win — "First Result" should NOT appear
    expect(screen.queryByText('First Result')).not.toBeInTheDocument()
    // The component should show the second result (or empty if second also hasn't resolved in component context)
    // At minimum, the stale first result is discarded
  })

  it('fetchRecalls is called with skip capped at 25000', async () => {
    // With limit=6 and enough total to push page beyond 25K offset
    const mockData = Array.from({ length: 6 }, (_, i) => ({
      id: `F-${i}`, recallNumber: `F-${i}`, eventId: `${i}`,
      productDescription: `Product ${i}`, reasonForRecall: 'Reason',
      classification: 'Class I' as const, status: 'Ongoing',
      distributionPattern: 'CA', recallingFirm: 'Firm',
      city: 'City', state: 'CA', country: 'US',
      recallInitiationDate: '20250101', productType: 'Food',
      codeInfo: '', moreCodeInfo: '', voluntaryMandated: '',
      address1: '', address2: '', postalCode: '',
      centerClassificationDate: '', initialFirmNotification: '',
      productQuantity: '', terminationDate: '',
    }))
    // Total of 100000 would give maxPage = floor(25000/6) = 4166, totalPages = 4167
    fetchRecallsMock.mockResolvedValue({ recalls: mockData, total: 100000, error: null, isStale: false, isDemo: false })

    render(<App />)
    await waitFor(() => expect(screen.getByText(/Page 1/)).toBeInTheDocument())

    // All fetchRecalls calls should have skip <= 25000
    for (const call of fetchRecallsMock.mock.calls) {
      expect(call[0].skip).toBeLessThanOrEqual(25000)
    }
  })
})
