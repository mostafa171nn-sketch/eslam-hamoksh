import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const btn =
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors';

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        className={`${btn} ${page === 1 ? 'cursor-not-allowed text-slate-300 dark:text-slate-600' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {start > 1 && <span className="px-1 text-sm text-slate-400">…</span>}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`${btn} ${p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span className="px-1 text-sm text-slate-400">…</span>}
      <button
        className={`${btn} ${page === totalPages ? 'cursor-not-allowed text-slate-300 dark:text-slate-600' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
