import { useEffect, useRef } from 'react'
import type { AdverseEvent } from '../types/event'
import { FDA_EVENT_DISCLAIMER } from '../types/event'
import { formatRecallDate } from '../lib/formatDate'

interface Props {
  event: AdverseEvent
  onClose: () => void
}

export default function EventDetail({ event, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)
  const brandNames = event.products.map(p => p.nameBrand).filter(Boolean).join(', ') || 'Unknown product'

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.hasAttribute('disabled') && el.closest('[role="dialog"]'))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prevFocusRef.current?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-lg bg-white dark:bg-zinc-800 h-full overflow-auto p-6 shadow-xl">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-1">
              Early signal · Unverified community report
            </p>
            <h2 id="event-title" className="text-lg font-bold dark:text-zinc-100">{brandNames}</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="border dark:border-zinc-600 rounded-lg px-3 py-2 text-sm shrink-0 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-600 min-h-[44px] min-w-[44px]"
            aria-label="Close adverse event details"
          >
            Close
          </button>
        </div>

        <div
          className="mt-4 text-xs leading-relaxed text-violet-900 dark:text-violet-200 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-lg p-3"
          role="note"
        >
          <strong>Disclaimer:</strong> {FDA_EVENT_DISCLAIMER} This is not a recall.
        </div>

        <dl className="mt-4 space-y-3 text-sm dark:text-zinc-300">
          <div>
            <dt className="font-semibold">Report #</dt>
            <dd>{event.reportNumber || '—'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Date started</dt>
            <dd>{formatRecallDate(event.dateStarted) || '—'}</dd>
          </div>
          {event.dateCreated && (
            <div>
              <dt className="font-semibold">Date created</dt>
              <dd>{formatRecallDate(event.dateCreated)}</dd>
            </div>
          )}
          <div>
            <dt className="font-semibold">Reactions</dt>
            <dd>{event.reactions.length ? event.reactions.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Outcomes</dt>
            <dd>{event.outcomes.length ? event.outcomes.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Consumer</dt>
            <dd>
              {[
                event.consumer.gender,
                event.consumer.age
                  ? `${event.consumer.age}${event.consumer.ageUnit ? ` ${event.consumer.ageUnit}` : ''}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Products</dt>
            <dd className="space-y-2">
              {event.products.length === 0 && '—'}
              {event.products.map((p, i) => (
                <div key={`${p.nameBrand}-${i}`} className="border dark:border-zinc-600 rounded-lg p-2 bg-zinc-50 dark:bg-zinc-900 text-xs">
                  <p className="font-medium dark:text-zinc-100">{p.nameBrand || 'Unnamed product'}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {[p.role, p.industryName, p.industryCode ? `code ${p.industryCode}` : '']
                      .filter(Boolean)
                      .join(' · ') || 'No industry details'}
                  </p>
                </div>
              ))}
            </dd>
          </div>
        </dl>

        <a
          href="https://www.fda.gov/food/compliance-enforcement-food/cfsan-adverse-event-reporting-system-caers"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm underline text-violet-700 dark:text-violet-400"
        >
          About FDA CAERS →
        </a>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          Developer:{' '}
          <a
            href={`https://api.fda.gov/food/event.json?search=report_number:"${encodeURIComponent(event.reportNumber)}"`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            raw openFDA JSON
          </a>
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-4 border-t dark:border-zinc-700 pt-3">
          {FDA_EVENT_DISCLAIMER}
        </p>
      </div>
    </div>
  )
}