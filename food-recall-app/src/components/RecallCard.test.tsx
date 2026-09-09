import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecallCard from './RecallCard'
import type { Recall } from '../types/recall'

const makeRecall = (overrides: Partial<Recall> = {}): Recall => ({
  id: 'F-001-2026',
  recallNumber: 'F-001-2026',
  eventId: '90001',
  productDescription: 'Chocolate Bar, 3oz',
  reasonForRecall: 'Undeclared milk allergen',
  classification: 'Class I',
  status: 'Ongoing',
  distributionPattern: 'Nationwide',
  recallingFirm: 'Test Corp',
  city: 'New York',
  state: 'NY',
  country: 'United States',
  recallInitiationDate: '20260115',
  productType: 'Food',
  codeInfo: 'Lot 123',
  moreCodeInfo: '',
  voluntaryMandated: 'Voluntary: Firm Initiated',
  address1: '',
  address2: '',
  postalCode: '',
  centerClassificationDate: '',
  initialFirmNotification: '',
  productQuantity: '',
  terminationDate: '',
  ...overrides,
})

describe('RecallCard', () => {
  it('renders product description', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Chocolate Bar, 3oz')).toBeTruthy()
  })

  it('renders reason for recall', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Undeclared milk allergen')).toBeTruthy()
  })

  it('renders classification badge', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Class I')).toBeTruthy()
  })

  it('renders status badge', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText('Ongoing')).toBeTruthy()
  })

  it('renders state badge when present', () => {
    render(<RecallCard recall={makeRecall({ state: 'CA' })} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText('CA')).toBeTruthy()
  })

  it('does not render state badge when empty', () => {
    render(<RecallCard recall={makeRecall({ state: '' })} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.queryByText('CA')).toBeNull()
  })

  it('renders NEW badge when isNew is true', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={true} watchlist={[]} />)
    expect(screen.getByText('NEW')).toBeTruthy()
  })

  it('does not render NEW badge when isNew is false', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.queryByText('NEW')).toBeNull()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    const recall = makeRecall()
    render(<RecallCard recall={recall} onSelect={onSelect} isNew={false} watchlist={[]} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(recall)
  })

  it('calls onSelect on Enter key', () => {
    const onSelect = vi.fn()
    render(<RecallCard recall={makeRecall()} onSelect={onSelect} isNew={false} watchlist={[]} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalled()
  })

  it('calls onSelect on Space key', () => {
    const onSelect = vi.fn()
    render(<RecallCard recall={makeRecall()} onSelect={onSelect} isNew={false} watchlist={[]} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onSelect).toHaveBeenCalled()
  })

  it('has correct aria-label', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'View recall F-001-2026: Chocolate Bar, 3oz'
    )
  })

  it('shows Watching badge when watchlist matches', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={['milk']} />)
    expect(screen.getByText('Watching')).toBeTruthy()
    expect(screen.getByText('Watch: milk')).toBeTruthy()
  })

  it('does not show Watching badge when watchlist does not match', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={['sesame']} />)
    expect(screen.queryByText('Watching')).toBeNull()
  })

  it('shows dietary match info when dietary concerns selected and matched', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} dietary={['milk']} />)
    expect(screen.getByText(/Dietary:/)).toBeTruthy()
  })

  it('shows no-dietary-match message when dietary selected but no match', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} dietary={['sesame']} />)
    expect(screen.getByText(/No dietary match/)).toBeTruthy()
  })

  it('does not show dietary info when no dietary concerns selected', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.queryByText(/Dietary:/)).toBeNull()
    expect(screen.queryByText(/No dietary match/)).toBeNull()
  })

  it('renders formatted date', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText(/Jan 15, 2026/)).toBeTruthy()
  })

  it('renders firm name', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText(/Test Corp/)).toBeTruthy()
  })

  it('renders distribution pattern', () => {
    render(<RecallCard recall={makeRecall()} onSelect={() => {}} isNew={false} watchlist={[]} />)
    expect(screen.getByText(/Dist: Nationwide/)).toBeTruthy()
  })
})
