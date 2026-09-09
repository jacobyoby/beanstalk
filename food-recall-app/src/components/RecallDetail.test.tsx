import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import RecallDetail from './RecallDetail'
import type { Recall } from '../types/recall'

const mockRecall: Recall = {
  id: 'F-1234-2025',
  recallNumber: 'F-1234-2025',
  eventId: '99999',
  productDescription: 'Organic Peanut Butter',
  reasonForRecall: 'Potential Salmonella contamination',
  classification: 'Class I',
  status: 'Ongoing',
  distributionPattern: 'CA, NY, TX',
  recallingFirm: 'Acme Foods Inc.',
  city: 'Los Angeles',
  state: 'CA',
  country: 'USA',
  recallInitiationDate: '20250101',
  productType: 'Food',
  codeInfo: 'Lot 123, Lot 456',
  moreCodeInfo: 'Additional lots: 789',
  voluntaryMandated: 'Voluntary',
  address1: '123 Main St',
  address2: 'Suite 100',
  postalCode: '90001',
  centerClassificationDate: '20250201',
  initialFirmNotification: 'Phone',
  productQuantity: '500 units',
  terminationDate: '20250601',
}

const minimalRecall: Recall = {
  id: 'F-5678-2025',
  recallNumber: 'F-5678-2025',
  eventId: '88888',
  productDescription: 'Generic Widget',
  reasonForRecall: 'Mislabeling',
  classification: 'Class II',
  status: 'Completed',
  distributionPattern: '',
  recallingFirm: 'Widget Corp',
  city: '',
  state: '',
  country: '',
  recallInitiationDate: '',
  productType: '',
  codeInfo: '',
  moreCodeInfo: '',
  voluntaryMandated: '',
  address1: '',
  address2: '',
  postalCode: '',
  centerClassificationDate: '',
  initialFirmNotification: '',
  productQuantity: '',
  terminationDate: '',
}

describe('RecallDetail', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
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

  it('renders product description as heading', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Organic Peanut Butter')).toBeInTheDocument()
  })

  it('renders recall number and event ID', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText(/F-1234-2025/)).toBeInTheDocument()
    expect(screen.getByText(/Event 99999/)).toBeInTheDocument()
  })

  it('renders classification', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Class I')).toBeInTheDocument()
  })

  it('renders status', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Ongoing')).toBeInTheDocument()
  })

  it('renders reason for recall', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Potential Salmonella contamination')).toBeInTheDocument()
  })

  it('renders firm with city and state', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Acme Foods Inc. — Los Angeles, CA')).toBeInTheDocument()
  })

  it('renders distribution pattern', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('CA, NY, TX')).toBeInTheDocument()
  })

  it('renders code info', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Lot 123, Lot 456')).toBeInTheDocument()
  })

  it('renders more code info when present', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Additional lots: 789')).toBeInTheDocument()
  })

  it('does not render more code info section when empty', () => {
    const noMore = { ...mockRecall, moreCodeInfo: '' }
    render(<RecallDetail recall={noMore} onClose={onClose} />)
    expect(screen.queryByText(/More Code Info/)).not.toBeInTheDocument()
  })

  it('renders voluntary/mandated', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Voluntary')).toBeInTheDocument()
  })

  it('renders termination date when present', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText(/Termination Date/)).toBeInTheDocument()
  })

  it('does not render termination date section when empty', () => {
    const noTerm = { ...mockRecall, terminationDate: '' }
    render(<RecallDetail recall={noTerm} onClose={onClose} />)
    expect(screen.queryByText('Termination Date')).not.toBeInTheDocument()
  })

  it('renders product quantity when present', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('500 units')).toBeInTheDocument()
  })

  it('does not render quantity section when empty', () => {
    const noQty = { ...mockRecall, productQuantity: '' }
    render(<RecallDetail recall={noQty} onClose={onClose} />)
    expect(screen.queryByText('Quantity')).not.toBeInTheDocument()
  })

  it('renders firm notification when present', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText('Phone')).toBeInTheDocument()
  })

  it('does not render firm notification section when empty', () => {
    const noNotif = { ...mockRecall, initialFirmNotification: '' }
    render(<RecallDetail recall={noNotif} onClose={onClose} />)
    expect(screen.queryByText('Firm Notification')).not.toBeInTheDocument()
  })

  it('renders firm address when available', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument()
    expect(screen.getByText(/Suite 100/)).toBeInTheDocument()
    expect(screen.getByText(/Los Angeles, CA 90001/)).toBeInTheDocument()
  })

  it('does not render address section when all address fields empty', () => {
    render(<RecallDetail recall={minimalRecall} onClose={onClose} />)
    expect(screen.queryByText('Firm Address')).not.toBeInTheDocument()
  })

  it('renders FDA classification date when present', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByText(/FDA Classification Date/)).toBeInTheDocument()
  })

  it('does not render FDA classification date when empty', () => {
    render(<RecallDetail recall={minimalRecall} onClose={onClose} />)
    expect(screen.queryByText('FDA Classification Date')).not.toBeInTheDocument()
  })

  it('generates correct FDA deep link', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    const fdaLink = screen.getByText(/View on FDA Enforcement Reports/)
    expect(fdaLink).toHaveAttribute(
      'href',
      expect.stringContaining('accessdata.fda.gov/scripts/ires/index.cfm')
    )
    expect(fdaLink).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('Organic Peanut Butter'))
    )
    expect(fdaLink).toHaveAttribute('target', '_blank')
  })

  it('generates correct openFDA raw JSON link', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    const rawLink = screen.getByText('raw openFDA JSON')
    expect(rawLink).toHaveAttribute(
      'href',
      expect.stringContaining('api.fda.gov/food/enforcement.json')
    )
    expect(rawLink).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('F-1234-2025'))
    )
  })

  it('FDA deep link truncates long product descriptions', () => {
    const longDesc = { ...mockRecall, productDescription: 'A'.repeat(200) }
    render(<RecallDetail recall={longDesc} onClose={onClose} />)
    const fdaLink = screen.getByText(/View on FDA Enforcement Reports/)
    const href = fdaLink.getAttribute('href')!
    // Should contain only first 80 chars of product description
    const decoded = decodeURIComponent(href)
    // The URL includes "Product=" then the truncated description
    const productParam = decoded.match(/Product=([^#]+)/)?.[1]
    expect(productParam).toBeDefined()
    expect(productParam!.length).toBeLessThanOrEqual(80)
  })

  it('calls onClose when Close button clicked', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop clicked', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    // The backdrop is the first div with aria-hidden="true"
    const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders code info dash when empty', () => {
    render(<RecallDetail recall={minimalRecall} onClose={onClose} />)
    // codeInfo is empty, should show "—" (em dash)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('has dialog role with aria-modal', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('focuses the close button on mount', () => {
    render(<RecallDetail recall={mockRecall} onClose={onClose} />)
    const closeBtn = screen.getByRole('button', { name: /close/i })
    expect(closeBtn).toHaveFocus()
  })

  it('handles minimal recall with all empty optional fields', () => {
    render(<RecallDetail recall={minimalRecall} onClose={onClose} />)
    // Core fields still render
    expect(screen.getByText('Generic Widget')).toBeInTheDocument()
    expect(screen.getByText(/F-5678-2025/)).toBeInTheDocument()
    expect(screen.getByText('Class II')).toBeInTheDocument()
    // Optional sections are absent
    expect(screen.queryByText('Termination Date')).not.toBeInTheDocument()
    expect(screen.queryByText('Quantity')).not.toBeInTheDocument()
    expect(screen.queryByText('Firm Notification')).not.toBeInTheDocument()
    expect(screen.queryByText('Firm Address')).not.toBeInTheDocument()
    expect(screen.queryByText(/More Code Info/)).not.toBeInTheDocument()
  })
})
