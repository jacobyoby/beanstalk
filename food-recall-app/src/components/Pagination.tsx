interface Props {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function Pagination({ page, totalPages, onPrevious, onNext }: Props) {
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4">
      <button type="button" disabled={page === 0} onClick={onPrevious} className="btn" aria-label="Previous page">
        Previous
      </button>
      <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
        Page {page + 1} of {totalPages}
      </p>
      <button type="button" disabled={page + 1 >= totalPages} onClick={onNext} className="btn" aria-label="Next page">
        Next
      </button>
    </nav>
  );
}
