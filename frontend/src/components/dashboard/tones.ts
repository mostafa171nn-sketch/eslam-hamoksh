import { BookOpen, Calculator, FlaskConical, Languages, Monitor, Landmark, type LucideIcon } from 'lucide-react';

export type Tone = 'brand' | 'gold' | 'green' | 'teal' | 'violet' | 'coral' | 'slate';

/** Soft chip/text tint for a given tone (composable with ring or border). */
export const chipTone: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-400/25',
  gold: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-400/25',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/25',
  coral: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25',
  slate: 'bg-slate-100 text-slate-600 ring-slate-600/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/25',
};

/** Boxed icon-tile tint for a given tone. */
export const tileTone: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  gold: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  coral: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};

/** Stroke color used by decorative SVG ring/line elements. */
export const strokeTone: Record<Tone, string> = {
  brand: 'stroke-brand-500',
  gold: 'stroke-amber-500',
  green: 'stroke-emerald-500',
  teal: 'stroke-teal-500',
  violet: 'stroke-violet-500',
  coral: 'stroke-rose-500',
  slate: 'stroke-slate-400',
};

const SUBJECT_PATTERNS: Array<{ tone: Tone; icon: LucideIcon; test: RegExp }> = [
  { tone: 'brand', icon: Calculator, test: /(math|mathematics|algebra|geometry|statistics|رياضيات|الرياضيات)/i },
  { tone: 'teal', icon: FlaskConical, test: /(physics|chemistry|biology|science|فيزياء|كيمياء|أحياء|علوم)/i },
  { tone: 'coral', icon: Languages, test: /(arabic|english|french|grammar|languages?|عربي|إنجليزي|إنجليزية|فرنسي|لغة)/i },
  { tone: 'violet', icon: Monitor, test: /(computer|programming|ict|technology|digital|online|حاسوب|برمجة|تقنية)/i },
  { tone: 'gold', icon: Landmark, test: /(history|geography|social|national|civics|تاريخ|جغرافيا|اجتماعيات|دراسات)/i },
];

/** Pick an icon + tone for a subject name (Arabic or English friendly). */
export function subjectVisual(subjectName: string | null | undefined): { tone: Tone; icon: LucideIcon } {
  const name = (subjectName ?? '').trim().toLowerCase();
  if (!name) return { tone: 'slate', icon: BookOpen };
  for (const entry of SUBJECT_PATTERNS) {
    if (entry.test.test(name)) return { tone: entry.tone, icon: entry.icon };
  }
  return { tone: 'brand', icon: BookOpen };
}