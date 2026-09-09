import { useEffect, useRef, type ReactNode } from 'react'
import type { Recall } from '../types/recall'
import { formatRecallDate, toISODate } from '../lib/formatDate'
import { riskLevel } from '../lib/classification'
import { categorizeReason } from '../lib/reasonCategory'
import RiskBadge from './RiskBadge'
import { statusChipClass } from './RecallCard'

interface Props {
  recall: Recall
  isDemo?: boolean
  onClose: () => void
}

interface SectionProps {
  title: string
  children: ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="label">{title}</h3>
      <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{children}</div>
    </section>
  )
}

interface FactProps {
  term: string
  children: ReactNode
}

function Fact({ term, children }: FactProps) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 py-1.5">
      <dt className="text-zinc-500 dark:text-zinc-400">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

interface CodeBlockProps {
  text: string
  source: string
}

function CodeBlock({ text, source }: CodeBlockProps) {
  return (
    <div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200" tabIndex={0}>
        {text}
      </pre>
      <p className="hint mt-1">Source: {source}</p>
    </div>
  )
}

function DateFact({ term, raw }: { term: string; raw: string }) {
  return (
    <Fact term={term}>
      <time dateTime={toISODate(raw)}>{formatRecallDate(raw)}</time>
    </Fact>
  )
}

export default function RecallDetail({ recall, isDemo = false, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled') && el.closest('[role="dialog"]'))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      prevFocusRef.current?.focus()
    }
  }, [onClose])

  const risk = riskLevel(recall.classification)
  const category = categorizeReason(recall.reasonForRecall)
  const firmLocation = [recall.city, recall.state].filter(Boolean).join(', ')
  const address = [recall.address1, recall.address2, [recall.city, recall.state, recall.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const classificationNote = recall.rawClassification && recall.rawClassification !== recall.classification ? ` (FDA value: “${recall.rawClassification}”)` : ''
  const statusNote = recall.rawStatus && recall.rawStatus !== recall.status ? ` (FDA value: “${recall.rawStatus}”)` : ''

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="recall-title">
      <div className="absolute inset-0 bg-zinc-900/50" onClick={onClose} aria-hidden="true" />
      <div className="animate-slide-in relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-zinc-900">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <RiskBadge classification={recall.classification} />
              <span className={statusChipClass(recall.status)}>{recall.status}</span>
              {category && <span className="chip chip-neutral">{category}</span>}
            </div>
            <h2 id="recall-title" className="text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{recall.productDescription}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="btn shrink-0" aria-label="Close recall details">Close</button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Section title="Why it was recalled">
            <p>{recall.reasonForRecall || 'Not stated'}</p>
            <p className="hint mt-2">{isDemo ? 'Fictional classification for interface demonstration.' : risk.definition}</p>
          </Section>

          <Section title="Where it was sold">
            <p>{recall.distributionPattern || 'Not stated'}</p>
          </Section>

          <Section title="How to identify it">
            {recall.codeInfo ? <CodeBlock text={recall.codeInfo} source={isDemo ? 'Fictional code_info' : 'FDA code_info'} /> : <p>No lot or code information in this record.</p>}
            {recall.moreCodeInfo && <div className="mt-3"><CodeBlock text={recall.moreCodeInfo} source={isDemo ? 'Fictional more_code_info (continuation)' : 'FDA more_code_info (continuation)'} /></div>}
            {recall.productQuantity && <p className="mt-2">Quantity: {recall.productQuantity}</p>}
          </Section>

          <Section title="Who recalled it">
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <Fact term="Firm">{recall.recallingFirm || 'Not stated'}{firmLocation && ` · ${firmLocation}`}</Fact>
              {address && <Fact term="Address">{address}</Fact>}
              <Fact term="Type">{recall.voluntaryMandated || 'Not stated'}</Fact>
              {recall.initialFirmNotification && <Fact term="Notified by">{recall.initialFirmNotification}</Fact>}
            </dl>
          </Section>

          <Section title="Timeline">
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recall.recallInitiationDate ? <DateFact term="Initiated" raw={recall.recallInitiationDate} /> : <Fact term="Initiated">Not stated</Fact>}
              {recall.centerClassificationDate && <DateFact term="FDA classified" raw={recall.centerClassificationDate} />}
              {recall.terminationDate && <DateFact term="Terminated" raw={recall.terminationDate} />}
            </dl>
          </Section>

          <Section title="Record">
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <Fact term="Recall number">{recall.recallNumber || 'Not stated'}</Fact>
              <Fact term="Event">{recall.eventId || 'Not stated'}</Fact>
              <Fact term="Classification">{recall.classification}{classificationNote}</Fact>
              <Fact term="Status">{recall.status}{statusNote}</Fact>
            </dl>
            {!isDemo && recall.recallNumber && <><a
              href={`https://www.accessdata.fda.gov/scripts/ires/index.cfm#tabNav_advancedSearch?Product=${encodeURIComponent(recall.productDescription.slice(0, 120))}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-800 underline underline-offset-2 dark:text-emerald-300"
            >
              View on FDA Enforcement Reports
            </a>
            <p className="hint"><a
              href={`https://api.fda.gov/food/enforcement.json?${new URLSearchParams({ search: `recall_number:"${recall.recallNumber}"` })}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center underline underline-offset-2"
            >Raw openFDA JSON</a></p></>}
          </Section>
        </div>
      </div>
    </div>
  )
}
