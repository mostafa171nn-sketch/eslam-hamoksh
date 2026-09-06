import type { ReactNode } from 'react';

export function CenterPageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mj-page-head">
      <div>
        {eyebrow && <div className="mj-eyebrow">{eyebrow}</div>}
        <h1 className="mj-h1">{title}</h1>
        {description && <p className="mj-page-desc">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}