import { describe, it, expect, beforeEach } from 'vitest'
import {
  getWatchlist,
  saveWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  matchesWatchlist,
} from './watchlist'

beforeEach(() => {
  localStorage.clear()
})

describe('getWatchlist', () => {
  it('returns empty array when nothing stored', () => {
    expect(getWatchlist()).toEqual([])
  })

  it('returns stored items', () => {
    localStorage.setItem('ponder_watchlist', JSON.stringify(['salmonella', 'peanut']))
    expect(getWatchlist()).toEqual(['salmonella', 'peanut'])
  })

  it('returns empty array on corrupt data', () => {
    localStorage.setItem('ponder_watchlist', 'not-json')
    expect(getWatchlist()).toEqual([])
  })
})

describe('saveWatchlist', () => {
  it('persists to localStorage', () => {
    saveWatchlist(['listeria'])
    expect(JSON.parse(localStorage.getItem('ponder_watchlist')!)).toEqual(['listeria'])
  })
})

describe('addToWatchlist', () => {
  it('adds a new term normalized to lowercase', () => {
    const result = addToWatchlist('Salmonella')
    expect(result).toEqual(['salmonella'])
  })

  it('trims whitespace', () => {
    const result = addToWatchlist('  peanut  ')
    expect(result).toEqual(['peanut'])
  })

  it('does not add duplicates', () => {
    addToWatchlist('peanut')
    const result = addToWatchlist('peanut')
    expect(result).toEqual(['peanut'])
  })

  it('does not add empty strings', () => {
    const result = addToWatchlist('')
    expect(result).toEqual([])
  })

  it('persists to localStorage', () => {
    addToWatchlist('milk')
    expect(getWatchlist()).toEqual(['milk'])
  })
})

describe('removeFromWatchlist', () => {
  it('removes an existing term', () => {
    addToWatchlist('salmonella')
    addToWatchlist('peanut')
    const result = removeFromWatchlist('salmonella')
    expect(result).toEqual(['peanut'])
  })

  it('is case-insensitive', () => {
    addToWatchlist('peanut')
    const result = removeFromWatchlist('PEANUT')
    expect(result).toEqual([])
  })

  it('handles removing non-existent term', () => {
    addToWatchlist('milk')
    const result = removeFromWatchlist('eggs')
    expect(result).toEqual(['milk'])
  })
})

describe('matchesWatchlist', () => {
  it('returns matching terms', () => {
    const matches = matchesWatchlist(
      'Potential Salmonella contamination in peanut butter',
      ['salmonella', 'listeria']
    )
    expect(matches).toEqual(['salmonella'])
  })

  it('is case-insensitive', () => {
    const matches = matchesWatchlist('SALMONELLA found', ['salmonella'])
    expect(matches).toEqual(['salmonella'])
  })

  it('returns empty array when no matches', () => {
    const matches = matchesWatchlist('All clear product', ['salmonella', 'listeria'])
    expect(matches).toEqual([])
  })

  it('returns all matching terms', () => {
    const matches = matchesWatchlist(
      'Undeclared peanut and milk allergens',
      ['peanut', 'milk', 'soy']
    )
    expect(matches).toEqual(['peanut', 'milk'])
  })
})
