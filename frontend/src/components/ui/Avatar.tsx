import { initials } from '../../lib/format';

const COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];

function hash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return h;
}

export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} ${COLORS[hash(name) % COLORS.length]} flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
    >
      {initials(name)}
    </div>
  );
}
