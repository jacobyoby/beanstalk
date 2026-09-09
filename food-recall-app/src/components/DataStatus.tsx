import type { FetchError } from "../lib/api";

interface Props {
  /** What the live records are, e.g. "FDA data" or "CAERS data". */
  sourceLabel: string;
  isDemo: boolean;
  isStale: boolean;
  error: FetchError | null;
  lastSynced: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** One pill that always says where the visible records came from and when. */
export default function DataStatus({ sourceLabel, isDemo, isStale, error, lastSynced }: Props) {
  const retrieved = lastSynced ? formatTime(lastSynced) : "not yet retrieved";
  if (isDemo) {
    return <Pill dot="bg-violet-500" text="Demo data" detail="fictional records" />;
  }
  if (isStale) {
    return <Pill dot="bg-amber-500" text="Stale cache" detail={`from ${retrieved}`} />;
  }
  if (error) {
    return <Pill dot="bg-red-500" text={`Error ${error.code}`} detail={retrieved} />;
  }
  return <Pill dot="bg-emerald-500" text={`Live ${sourceLabel}`} detail={`retrieved ${retrieved}`} />;
}

interface PillProps {
  dot: string;
  text: string;
  detail: string;
}

function Pill({ dot, text, detail }: PillProps) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-paper px-3 py-1 text-xs text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      role="status"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="font-medium">{text}</span>
      <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400">{detail}</span>
    </span>
  );
}
