import { useEffect, useRef } from "react";
import { formatRecallDate } from "../lib/formatDate";
import type { AdverseEvent } from "../types/event";
import { OPENFDA_AS_PUBLISHED, type Recall } from "../types/recall";
import RelatedEvents from "./RelatedEvents";

interface Props {
  recall: Recall;
  onClose: () => void;
  onSelectEvent?: (event: AdverseEvent) => void;
}

export default function RecallDetail({ recall, onClose, onSelectEvent }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
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
          (last as HTMLElement).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement).focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocusRef.current?.focus();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="recall-title">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-lg bg-white dark:bg-zinc-800 h-full overflow-auto p-6 shadow-xl">
        <div className="flex justify-between items-start gap-4">
          <h2 id="recall-title" className="text-lg font-bold dark:text-zinc-100">
            {recall.productDescription}
          </h2>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="border dark:border-zinc-600 rounded-lg px-3 py-2 text-sm shrink-0 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-600 min-h-[44px] min-w-[44px]"
            aria-label="Close recall details"
          >
            Close
          </button>
        </div>
        <dl className="mt-4 space-y-3 text-sm dark:text-zinc-300">
          <div>
            <dt className="font-semibold">Recall #</dt>
            <dd>
              {recall.recallNumber} (Event {recall.eventId})
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Classification</dt>
            <dd>{recall.classification}</dd>
          </div>
          <div>
            <dt className="font-semibold">Status</dt>
            <dd>{recall.status}</dd>
            <dd className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{OPENFDA_AS_PUBLISHED}</dd>
          </div>
          <div>
            <dt className="font-semibold">Reason</dt>
            <dd>{recall.reasonForRecall}</dd>
          </div>
          <div>
            <dt className="font-semibold">Firm</dt>
            <dd>
              {recall.recallingFirm} — {recall.city}, {recall.state}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Distribution</dt>
            <dd>{recall.distributionPattern}</dd>
          </div>
          <div>
            <dt className="font-semibold">Code Info</dt>
            <dd
              className="whitespace-pre-wrap break-words max-h-64 overflow-auto border-zinc-400 rounded p-2 bg-zinc-50 dark:bg-zinc-900 text-xs select-text"
              tabIndex={0}
            >
              {recall.codeInfo || "—"}
            </dd>
            <dd className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Source: FDA code_info</dd>
          </div>
          {recall.moreCodeInfo && (
            <div>
              <dt className="font-semibold">More Code Info (continuation)</dt>
              <dd
                className="whitespace-pre-wrap break-words max-h-64 overflow-auto border-zinc-400 rounded p-2 bg-zinc-50 dark:bg-zinc-900 text-xs select-text"
                tabIndex={0}
              >
                {recall.moreCodeInfo}
              </dd>
              <dd className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Source: FDA more_code_info — lot 8L5M30 appears only here
              </dd>
            </div>
          )}
          <div>
            <dt className="font-semibold">Initiation Date</dt>
            <dd>{formatRecallDate(recall.recallInitiationDate)}</dd>
          </div>
          {recall.centerClassificationDate && (
            <div>
              <dt className="font-semibold">FDA Classification Date</dt>
              <dd>{formatRecallDate(recall.centerClassificationDate)}</dd>
            </div>
          )}
          {recall.terminationDate && (
            <div>
              <dt className="font-semibold">Termination Date</dt>
              <dd>{formatRecallDate(recall.terminationDate)}</dd>
            </div>
          )}
          {recall.productQuantity && (
            <div>
              <dt className="font-semibold">Quantity</dt>
              <dd>{recall.productQuantity}</dd>
            </div>
          )}
          {recall.initialFirmNotification && (
            <div>
              <dt className="font-semibold">Firm Notification</dt>
              <dd>{recall.initialFirmNotification}</dd>
            </div>
          )}
          {(recall.address1 || recall.postalCode) && (
            <div>
              <dt className="font-semibold">Firm Address</dt>
              <dd>
                {[recall.address1, recall.address2, `${recall.city}, ${recall.state} ${recall.postalCode}`]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-semibold">Voluntary/Mandated</dt>
            <dd>{recall.voluntaryMandated}</dd>
          </div>
        </dl>
        <a
          href={`https://www.accessdata.fda.gov/scripts/ires/index.cfm#tabNav_advancedSearch?Product=${encodeURIComponent(
            recall.productDescription.slice(0, 80),
          )}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm underline text-blue-600 dark:text-blue-400"
        >
          View on FDA Enforcement Reports →
        </a>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          Developer:{" "}
          <a
            href={`https://api.fda.gov/food/enforcement.json?search=recall_number:"${recall.recallNumber}"`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            raw openFDA JSON
          </a>
        </p>
        {onSelectEvent && (
          <RelatedEvents
            productDescription={recall.productDescription}
            onSelectEvent={(event) => {
              onClose();
              onSelectEvent(event);
            }}
          />
        )}
      </div>
    </div>
  );
}
