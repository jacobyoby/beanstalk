import { describe, it, expect } from 'vitest'
import { formatRecallDate, isNewRecall } from './formatDate'

describe('formatRecallDate', () => {
  it('formats YYYYMMDD to readable date', () => {
    expect(formatRecallDate('20260115')).toBe('Jan 15, 2026')
  })

  it('handles single-digit months and days', () => {
    expect(formatRecallDate('20260305')).toBe('Mar 5, 2026')
  })

  it('handles December', () => {
    expect(formatRecallDate('20251225')).toBe('Dec 25, 2025')
  })

  it('returns raw string for empty input', () => {
    expect(formatRecallDate('')).toBe('')
  })

  it('returns raw string for short input', () => {
    expect(formatRecallDate('2026')).toBe('2026')
  })

  it('returns raw string for invalid month', () => {
    expect(formatRecallDate('20261301')).toBe('20261301')
  })

  it('returns raw string for non-numeric input', () => {
    expect(formatRecallDate('abcdefgh')).toBe('abcdefgh')
  })
})

describe('isNewRecall', () => {
  it('returns true for a recent date', () => {
    const today = new Date()
    const recent = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    expect(isNewRecall(recent)).toBe(true)
  })

  it('returns false for an old date', () => {
    expect(isNewRecall('20200101')).toBe(false)
  })

  it('returns false for empty input', () => {
    expect(isNewRecall('')).toBe(false)
  })

  it('respects custom days parameter', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`
    expect(isNewRecall(dateStr, 2)).toBe(true)
    expect(isNewRecall(dateStr, 0)).toBe(false)
  })
})
