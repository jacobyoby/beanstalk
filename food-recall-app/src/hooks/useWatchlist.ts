import { useState, useCallback, useEffect } from 'react'
import { getWatchlist, addToWatchlist, removeFromWatchlist, saveWatchlist } from '../lib/watchlist'

export function useWatchlist() {
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    setItems(getWatchlist())
  }, [])

  const add = useCallback((term: string) => {
    setItems(prev => {
      const normalized = term.trim().toLowerCase()
      if (!normalized || prev.includes(normalized)) return prev
      const updated = [...prev, normalized]
      saveWatchlist(updated)
      return updated
    })
  }, [])

  const remove = useCallback((term: string) => {
    setItems(prev => {
      const updated = prev.filter(t => t !== term)
      saveWatchlist(updated)
      return updated
    })
  }, [])

  // Keep in sync with direct localStorage changes (addToWatchlist/removeFromWatchlist)
  const refresh = useCallback(() => {
    setItems(getWatchlist())
  }, [])

  return { items, add, remove, refresh }
}
