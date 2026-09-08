const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatRecallDate(raw: string): string {
  if (!raw || raw.length < 8) return raw
  const year = raw.slice(0, 4)
  const month = parseInt(raw.slice(4, 6), 10) - 1
  const day = parseInt(raw.slice(6, 8), 10)
  if (isNaN(month) || isNaN(day) || month < 0 || month > 11) return raw
  return `${MONTHS[month]} ${day}, ${year}`
}

export function isNewRecall(initiationDate: string, days = 30): boolean {
  if (!initiationDate || initiationDate.length < 8) return false
  const year = parseInt(initiationDate.slice(0, 4), 10)
  const month = parseInt(initiationDate.slice(4, 6), 10) - 1
  const day = parseInt(initiationDate.slice(6, 8), 10)
  const recallDate = new Date(year, month, day)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return recallDate >= cutoff
}
