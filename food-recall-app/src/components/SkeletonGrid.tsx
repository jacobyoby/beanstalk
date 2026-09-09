const PLACEHOLDERS = ["one", "two", "three", "four", "five", "six"];

/** Six neutral card outlines shown while a page loads, so the layout does not jump. */
export default function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-hidden="true">
      {PLACEHOLDERS.map((id) => (
        <div key={id} className="panel animate-pulse space-y-3 p-4 sm:p-5">
          <div className="flex gap-2">
            <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-4 w-11/12 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800/70" />
          <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800/70" />
        </div>
      ))}
    </div>
  );
}
