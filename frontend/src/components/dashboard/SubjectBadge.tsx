'use client';

import { chipTone, subjectVisual, type Tone } from './tones';

export function SubjectBadge({
  subject,
  label,
  tone,
  className = '',
}: {
  subject?: string | null;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  const visual = subjectVisual(subject);
  const Icon = visual.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${chipTone[tone ?? visual.tone]} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label ?? subject ?? '—'}
    </span>
  );
}