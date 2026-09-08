import { useState, useCallback, useEffect } from 'react'
import type { Recall } from '../types/recall'

const STORAGE_KEY = 'ponder_seen_recalls'

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveSeenIds(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function useNewRecalls() {
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSeenIds(getSeenIds())
  }, [])

  const getNewIds = useCallback((recalls: Recall[]): Set<string> => {
    return new Set(recalls.filter(r => !seenIds.has(r.id)).map(r => r.id))
  }, [seenIds])

  const markSeen = useCallback((recalls: Recall[]) => {
    setSeenIds(prev => {
      const updated = new Set(prev)
      recalls.forEach(r => updated.add(r.id))
      saveSeenIds(updated)
      return updated
    })
  }, [])

  const hasNew = useCallback((recalls: Recall[]): boolean => {
    return recalls.some(r => !seenIds.has(r.id))
  }, [seenIds])

  return { getNewIds, markSeen, hasNew, seenIds }
}
