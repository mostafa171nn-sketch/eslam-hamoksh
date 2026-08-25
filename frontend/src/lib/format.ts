const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Localized weekday name. `lang` defaults to English for backwards compatibility. */
export function dayName(day: number, lang: 'ar' | 'en' = 'en'): string {
  const names = lang === 'ar' ? DAY_NAMES_AR : DAY_NAMES;
  return names[day] ?? (lang === 'ar' ? 'غير معروف' : 'Unknown');
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h)) return value;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `EGP ${value.toLocaleString()}`;
}

export function timeAgo(value: string | Date, lang: 'ar' | 'en' = 'en'): string {
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (lang === 'ar') {
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `قبل ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `قبل ${days} ي`;
  } else {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
  }
  return formatDate(d);
}

export function isToday(value: string | Date): boolean {
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isOverdue(value: string | Date): boolean {
  return new Date(value).getTime() < Date.now();
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
