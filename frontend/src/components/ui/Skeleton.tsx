'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/4" />
    </div>
  );
}

export function PageSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div className="space-y-6">
      {withHeader && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0,1,2,3].map((i)=> <CardSkeleton key={i} />)}
      </div>
      <CardSkeleton />
    </div>
  );
}
