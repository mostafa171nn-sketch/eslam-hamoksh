import type { ReactNode } from 'react';

export function CenterStatCard({
  value,
  label,
  sub,
  onClick,
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`mj-card mj-stat ${onClick ? 'cursor-pointer transition-colors hover:border-[color:var(--mj-accent)]' : ''}`}
    >
      <div className="mj-stat-value">{value}</div>
      <div className="mj-stat-label">{label}</div>
      {sub && <div className="mj-stat-sub">{sub}</div>}
    </div>
  );
}