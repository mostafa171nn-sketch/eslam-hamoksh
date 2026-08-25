import { AlertTriangle } from 'lucide-react';

export function Alert({
  message,
  title = 'Something went wrong',
  className = '',
}: {
  message: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10 ${className}`}>
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
      <div>
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">{title}</p>
        <p className="mt-0.5 text-sm text-red-700 dark:text-red-400">{message}</p>
      </div>
    </div>
  );
}

export function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}
