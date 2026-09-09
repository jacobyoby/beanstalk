import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from './SearchBar'

describe('SearchBar', () => {
  it('renders label', () => {
    render(<SearchBar value="" onChange={() => {}} />)
    expect(screen.getByText('Search')).toBeTruthy()
  })

  it('renders input with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} />)
    expect(screen.getByPlaceholderText('Product, reason, firm, reaction…')).toBeTruthy()
  })

  it('displays current value', () => {
    render(<SearchBar value="salmonella" onChange={() => {}} />)
    expect(screen.getByDisplayValue('salmonella')).toBeTruthy()
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Product, reason, firm, reaction…'), { target: { value: 'milk' } })
    expect(onChange).toHaveBeenCalledWith('milk')
  })

  it('has accessible label linked to input', () => {
    render(<SearchBar value="" onChange={() => {}} />)
    const input = screen.getByLabelText('Search')
    expect(input).toBeTruthy()
    expect(input.tagName).toBe('INPUT')
  })
})
