import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWatchlist } from './useWatchlist'

beforeEach(() => {
  localStorage.clear()
})

describe('useWatchlist', () => {
  it('initializes with empty array', () => {
    const { result } = renderHook(() => useWatchlist())
    expect(result.current.items).toEqual([])
  })

  it('loads existing items from localStorage', () => {
    localStorage.setItem('ponder_watchlist', JSON.stringify(['milk', 'peanut']))
    const { result } = renderHook(() => useWatchlist())
    expect(result.current.items).toEqual(['milk', 'peanut'])
  })

  it('add appends a normalized term', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.add('Salmonella') })
    expect(result.current.items).toEqual(['salmonella'])
  })

  it('add trims whitespace', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.add('  peanut  ') })
    expect(result.current.items).toEqual(['peanut'])
  })

  it('add ignores empty string', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.add('') })
    expect(result.current.items).toEqual([])
  })

  it('add ignores duplicates', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.add('milk') })
    act(() => { result.current.add('milk') })
    expect(result.current.items).toEqual(['milk'])
  })

  it('remove removes a term', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.add('milk') })
    act(() => { result.current.add('peanut') })
    act(() => { result.current.remove('milk') })
    expect(result.current.items).toEqual(['peanut'])
  })

  it('remove handles non-existent term gracefully', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.add('milk') })
    act(() => { result.current.remove('eggs') })
    expect(result.current.items).toEqual(['milk'])
  })

  it('persists to localStorage on add', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.add('milk') })
    expect(JSON.parse(localStorage.getItem('ponder_watchlist')!)).toEqual(['milk'])
  })

  it('persists to localStorage on remove', () => {
    localStorage.setItem('ponder_watchlist', JSON.stringify(['milk', 'peanut']))
    const { result } = renderHook(() => useWatchlist())
    act(() => { result.current.remove('milk') })
    expect(JSON.parse(localStorage.getItem('ponder_watchlist')!)).toEqual(['peanut'])
  })

  it('refresh re-reads from localStorage', () => {
    const { result } = renderHook(() => useWatchlist())
    localStorage.setItem('ponder_watchlist', JSON.stringify(['sesame']))
    act(() => { result.current.refresh() })
    expect(result.current.items).toEqual(['sesame'])
  })
})
