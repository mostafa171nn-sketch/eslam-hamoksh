import type { ReactNode } from 'react';

export type CenterPillTone = 'green' | 'amber' | 'red' | 'blue' | 'slate';

const TONES: Record<CenterPillTone, string> = {
  green: 'mj-pill--green',
  amber: 'mj-pill--amber',
  red: 'mj-pill--red',
  blue: 'mj-pill--blue',
  slate: 'mj-pill--slate',
};

export function CenterPill({ children, tone = 'slate', dot }: { children: ReactNode; tone?: CenterPillTone; dot?: boolean }) {
  return (
    <span className={`mj-pill ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}