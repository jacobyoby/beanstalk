import { type ReactNode, useEffect, useRef } from "react";
import { formatRecallDate, toISODate } from "../lib/formatDate";
import type { AdverseEvent } from "../types/event";
import { FDA_EVENT_DISCLAIMER } from "../types/event";

interface Props {
  event: AdverseEvent;
  onClose: () => void;
}

interface FactProps {
  term: string;
  children: ReactNode;
}

function Fact({ term, children }: FactProps) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2 py-1.5">
      <dt className="text-zinc-500 dark:text-zinc-400">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function EventDetail({ event, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const brandNames =
    event.products
      .map((p) => p.nameBrand)
      .filter(Boolean)
      .join(", ") || "Unknown product";
  const consumer =
    [
      event.consumer.gender,
      event.consumer.age ? `${event.consumer.age}${event.consumer.ageUnit ? ` ${event.consumer.ageUnit}` : ""}` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "—";

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute("disabled") && el.closest('[role="dialog"]'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      prevFocusRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="animate-slide-in relative flex h-full w-full max-w-xl flex-col bg-paper shadow-2xl motion-reduce:animate-none dark:bg-zinc-900">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip chip-signal font-semibold">Early signal</span>
              <span className="chip chip-neutral">Unverified community report</span>
            </div>
            <h2
              id="event-title"
              className="font-display text-xl font-semibold leading-snug text-zinc-900 dark:text-zinc-50"
            >
              {brandNames}
            </h2>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="btn shrink-0"
            aria-label="Close adverse event details"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          <p
            className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs leading-relaxed text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
            role="note"
          >
            <strong>Disclaimer:</strong> {FDA_EVENT_DISCLAIMER} This is not a recall.
          </p>

          <section className="space-y-2">
            <h3 className="label">Report</h3>
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <Fact term="Report #">{event.reportNumber || "—"}</Fact>
              <Fact term="Date started">
                {event.dateStarted ? (
                  <time dateTime={toISODate(event.dateStarted)}>{formatRecallDate(event.dateStarted)}</time>
                ) : (
                  "—"
                )}
              </Fact>
              {event.dateCreated && (
                <Fact term="Date created">
                  <time dateTime={toISODate(event.dateCreated)}>{formatRecallDate(event.dateCreated)}</time>
                </Fact>
              )}
              <Fact term="Consumer">{consumer}</Fact>
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="label">Reactions and outcomes</h3>
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <Fact term="Reactions">{event.reactions.length ? event.reactions.join(", ") : "—"}</Fact>
              <Fact term="Outcomes">{event.outcomes.length ? event.outcomes.join(", ") : "—"}</Fact>
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="label">Products</h3>
            {event.products.length === 0 && <p>—</p>}
            <ul className="space-y-2">
              {event.products.map((p) => (
                <li
                  key={`${p.nameBrand}-${p.role}-${p.industryCode}-${p.industryName}`}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{p.nameBrand || "Unnamed product"}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {[p.role, p.industryName, p.industryCode ? `code ${p.industryCode}` : ""]
                      .filter(Boolean)
                      .join(" · ") || "No industry details"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="label">Source</h3>
            <p>
              <a
                href="https://www.fda.gov/food/compliance-enforcement-food/cfsan-adverse-event-reporting-system-caers"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center font-medium text-violet-800 underline underline-offset-2 dark:text-violet-300"
              >
                About FDA CAERS →
              </a>
            </p>
            <p className="hint">
              Developer:{" "}
              <a
                href={`https://api.fda.gov/food/event.json?search=report_number:"${encodeURIComponent(event.reportNumber)}"`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                raw openFDA JSON
              </a>
            </p>
            <p className="hint">{FDA_EVENT_DISCLAIMER}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
