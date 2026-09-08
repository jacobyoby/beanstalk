const STORAGE_KEY = 'ponder_watchlist'

export function getWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveWatchlist(items: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addToWatchlist(term: string): string[] {
  const items = getWatchlist()
  const normalized = term.trim().toLowerCase()
  if (!normalized || items.includes(normalized)) return items
  const updated = [...items, normalized]
  saveWatchlist(updated)
  return updated
}

export function removeFromWatchlist(term: string): string[] {
  const items = getWatchlist().filter(t => t !== term.toLowerCase())
  saveWatchlist(items)
  return items
}

export function matchesWatchlist(text: string, watchlist: string[]): string[] {
  const lower = text.toLowerCase()
  return watchlist.filter(term => lower.includes(term))
}
