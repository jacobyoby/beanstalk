import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import RecallCard from './RecallCard'
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
  codeInfo: 'Lot 123',
  moreCodeInfo: '',
  voluntaryMandated: 'Voluntary',
  address1: '123 Main St',
  address2: '',
  postalCode: '90001',
  centerClassificationDate: '20250201',
  initialFirmNotification: 'Phone',
  productQuantity: '500 units',
  terminationDate: '',
}

describe('RecallCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders product description, reason, firm, and date', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Organic Peanut Butter')).toBeInTheDocument()
    expect(screen.getByText('Potential Salmonella contamination')).toBeInTheDocument()
    expect(screen.getByText(/Acme Foods Inc/)).toBeInTheDocument()
  })

  it('renders classification badge', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Class I')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Ongoing')).toBeInTheDocument()
  })

  it('renders state badge when state is present', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    // State badge "CA" appears in the badge area (not the firm line)
    const badges = screen.getAllByText('CA')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('omits state badge when state is empty', () => {
    const noState = { ...mockRecall, state: '' }
    render(<RecallCard recall={noState} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    // The firm line shows "Acme Foods Inc. • ..." but no standalone state badge
    expect(screen.queryByText('CA')).not.toBeInTheDocument()
  })

  it('renders NEW badge when isNew is true', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={true} watchlist={[]} />)
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('does not render NEW badge when isNew is false', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.queryByText('NEW')).not.toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<RecallCard recall={mockRecall} onSelect={onSelect} isNew={false} watchlist={[]} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(mockRecall)
  })

  it('calls onSelect on Enter key', () => {
    const onSelect = vi.fn()
    render(<RecallCard recall={mockRecall} onSelect={onSelect} isNew={false} watchlist={[]} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(mockRecall)
  })

  it('calls onSelect on Space key', () => {
    const onSelect = vi.fn()
    render(<RecallCard recall={mockRecall} onSelect={onSelect} isNew={false} watchlist={[]} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onSelect).toHaveBeenCalledWith(mockRecall)
  })

  it('does not call onSelect on other keys', () => {
    const onSelect = vi.fn()
    render(<RecallCard recall={mockRecall} onSelect={onSelect} isNew={false} watchlist={[]} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows Watching badge when recall matches watchlist', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={['salmonella']} />)
    expect(screen.getByText('Watching')).toBeInTheDocument()
    expect(screen.getByText(/Watch: salmonella/)).toBeInTheDocument()
  })

  it('does not show Watching badge when no watchlist match', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={['unrelated']} />)
    expect(screen.queryByText('Watching')).not.toBeInTheDocument()
  })

  it('renders distribution pattern', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByText(/Dist: CA, NY, TX/)).toBeInTheDocument()
  })

  it('handles empty distribution pattern gracefully', () => {
    const emptyDist = { ...mockRecall, distributionPattern: '' }
    render(<RecallCard recall={emptyDist} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Dist:')).toBeInTheDocument()
  })

  it('renders dietary disclaimer when dietary filters active but no match', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} dietary={['gluten']} />)
    expect(screen.getByText(/No dietary match/)).toBeInTheDocument()
  })

  it('renders dietary match info when dietary filters match', () => {
    // The dietary module uses 'peanuts' as concern key, matching "peanut" in text
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} dietary={['peanuts']} />)
    // Should show dietary match since product description contains "Peanut"
    expect(screen.getByText(/Dietary:/)).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    render(<RecallCard recall={mockRecall} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'View recall F-1234-2025: Organic Peanut Butter'
    )
  })

  it('handles Class II classification badge styling', () => {
    const classII = { ...mockRecall, classification: 'Class II' as const }
    render(<RecallCard recall={classII} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Class II')).toBeInTheDocument()
  })

  it('handles Class III classification badge styling', () => {
    const classIII = { ...mockRecall, classification: 'Class III' as const }
    render(<RecallCard recall={classIII} onSelect={vi.fn()} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Class III')).toBeInTheDocument()
  })
})
