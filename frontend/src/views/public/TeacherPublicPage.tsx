'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Calendar as CalendarIcon,
  FileText,
  GraduationCap,
  Library,
  Pencil,
  Play,
  Sparkles,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useT, type DictKey } from '../../i18n';
import { gradeStageChips } from './teachers/TeacherCard';
import type { AvailableSlot, AvailabilitySlot, BookLessonInput, Review, TeacherProfile } from '../../lib/types';
import { dayName, formatCurrency, formatTime } from '../../lib/format';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';

export interface TeacherPublicPageProps {
  initialProfile?: TeacherProfile;
}

const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

function minutesOf(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextWeekday(day: number, base = new Date()): string {
  const ref = new Date(base);
  ref.setHours(12, 0, 0, 0);
  let diff = (day - ref.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  const out = new Date(ref);
  out.setDate(ref.getDate() + diff);
  return localDateStr(out);
}

const PANEL = {
  base: 'rounded-[26px] border border-[#dce9f5] bg-white shadow-[0_14px_38px_rgba(18,65,109,.06)]',
  mobile: 'rounded-tl-[26px] rounded-tr-[26px] rounded-br-[12px] rounded-bl-[26px] p-[14px]',
  desktop: 'min-[781px]:rounded-[28px] min-[781px]:p-6',
};

const PROOF_TINTS = [
  { grad: 'bg-[linear-gradient(145deg,#e2f2ff,#f4fbff)]', icon: 'bg-[#d3eaff] text-[#0877e6]' },
  { grad: 'bg-[linear-gradient(145deg,#fff2cd,#fffaf0)]', icon: 'bg-[#ffe7a6] text-[#bd8604]' },
  { grad: 'bg-[linear-gradient(145deg,#d9f6ea,#f1fcf7)]', icon: 'bg-[#c2f0dd] text-[#0d9e74]' },
  { grad: 'bg-[linear-gradient(145deg,#ffe2e7,#fff4f5)]', icon: 'bg-[#ffd0d7] text-[#e04b5a]' },
];

interface SkillSpec {
  key: DictKey;
  Icon: LucideIcon;
  tint: number;
}

const SKILL_SETS: Record<string, SkillSpec[]> = {
  'الرياضيات': [
    { key: 'skillClarify', Icon: Sparkles, tint: 0 },
    { key: 'skillFollowUp', Icon: Users, tint: 1 },
    { key: 'skillSolving', Icon: Star, tint: 2 },
    { key: 'skillStrongBase', Icon: BookOpen, tint: 3 },
  ],
  'الفيزياء': [
    { key: 'skillConcepts', Icon: Sparkles, tint: 0 },
    { key: 'skillSolving', Icon: Star, tint: 2 },
    { key: 'skillPractical', Icon: BookOpen, tint: 3 },
    { key: 'skillFollowUp', Icon: Users, tint: 1 },
  ],
  'اللغة العربية': [
    { key: 'skillSimplify', Icon: Sparkles, tint: 0 },
    { key: 'skillLanguageDrill', Icon: BookOpen, tint: 3 },
    { key: 'skillFollowUp', Icon: Users, tint: 1 },
    { key: 'skillFoundation', Icon: Star, tint: 2 },
  ],
};

const GENERAL_SKILLS: SkillSpec[] = [
  { key: 'skillSimplify', Icon: Sparkles, tint: 0 },
  { key: 'skillPracticeTraining', Icon: BookOpen, tint: 3 },
  { key: 'skillFollowUp', Icon: Users, tint: 1 },
  { key: 'skillStrongBase', Icon: Star, tint: 2 },
];

const SKILL_BG = [
  'bg-[linear-gradient(135deg,#e4f5ff,#fff)]',
  'bg-[linear-gradient(135deg,#eee9ff,#fff)]',
  'bg-[linear-gradient(135deg,#fff0f2,#fff)]',
  'bg-[linear-gradient(135deg,#e8fbf4,#fff)]',
];

const SKILL_ICON = ['text-[#0877e6]', 'text-[#7558ee]', 'text-[#ff6d76]', 'text-[#16bc8c]'];

const BADGES: { key: DictKey; symbol: string; tone: string; medal: string }[] = [
  { key: 'achievementExcellence', symbol: '★', tone: '', medal: 'bg-[linear-gradient(145deg,#ffd861,#e99a04)]' },
  { key: 'achievementProgress', symbol: '↗', tone: 'silver', medal: 'bg-[linear-gradient(145deg,#dfe7f2,#8597ad)]' },
  { key: 'achievementCooperative', symbol: '●', tone: 'bronze', medal: 'bg-[linear-gradient(145deg,#f2b17c,#ad5d2e)]' },
  { key: 'achievementCommitted', symbol: '◆', tone: 'diamond', medal: 'bg-[linear-gradient(145deg,#53c7ff,#3968e9)]' },
];

const MATERIALS: { key: DictKey; Icon: LucideIcon }[] = [
  { key: 'materialFiles', Icon: FileText },
  { key: 'materialRevision', Icon: Star },
  { key: 'materialHomework', Icon: CalendarIcon },
  { key: 'materialBank', Icon: Sparkles },
];

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.3A8 8 0 1 1 20 11.5Z" />
      <path d="M9 9.1c.5 2.5 2.4 4.5 5 5l1.1-1" />
    </svg>
  );
}

function YoutubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" />
      <path
        d="M15.2 8.6h-1.3a2.4 2.4 0 0 0-2.4 2.4v.7H9.7v2h1.8v5.1h2v-5.1h1.5l.4-2h-1.9v-.7a.4.4 0 0 1 .4-.5h1.3Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

const SOCIALS: { key: DictKey; mark: ReactNode; tint: string }[] = [
  { key: 'contactYoutube', mark: <YoutubeGlyph />, tint: 'text-[#e5384b]' },
  { key: 'contactInstagram', mark: <InstagramGlyph />, tint: 'text-[#d25a9c]' },
  { key: 'contactWhatsapp', mark: <WhatsAppGlyph />, tint: 'text-[#12a170]' },
  { key: 'contactFacebook', mark: <FacebookGlyph />, tint: 'text-[#2273e6]' },
];

function StarsInline({ value }: { value: number }) {
  return (
    <span className="text-[#f1ad22]" aria-label={`${value} / 5`}>
      {'★'.repeat(Math.round(value))}
    </span>
  );
}

export default function TeacherPublicPage({ initialProfile }: TeacherPublicPageProps) {
  const { t, lang } = useT();
  const toast = useToast();
  const { user } = useAuth();
  const params = useParams<{ id?: string }>();
  const id = (params?.id ?? '') as string;

  const { data, initialLoading, error, reload } = useApi(() => api.getTeacher(id), [id], { initialData: initialProfile });

  const teacher = data;

  const subjectName = teacher?.subjects?.[0]?.name ?? '';

  const introText =
    teacher?.fullName && subjectName
      ? t('teacherAboutIntroFull', { name: teacher.fullName, subject: subjectName })
      : subjectName
        ? t('teacherAboutIntroSubject', { subject: subjectName })
        : (teacher?.fullName ?? '');
  const introAt = subjectName ? introText.indexOf(subjectName) : -1;
  const introBefore = introAt > 0 ? introText.slice(0, introAt) : '';
  const introAfter = introAt >= 0 ? introText.slice(introAt + subjectName.length) : '';

  const subjectsOptions = useMemo(
    () => (teacher?.subjects ?? []).map((s) => ({ value: s.id, label: s.name })),
    [teacher],
  );
  const gradeNames = useMemo(
    () => gradeStageChips(teacher?.grades ?? [], t),
    [teacher, t],
  );
  const skills = useMemo(
    () => SKILL_SETS[subjectName] ?? GENERAL_SKILLS,
    [subjectName],
  );

  const todayStr = localDateStr(new Date());
  const maxDate = localDateStr(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));

  /* ---- Weekly-slot booking sheet ---- */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<AvailabilitySlot | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookedOk, setBookedOk] = useState(false);
  const sheetOpenerRef = useRef<HTMLElement | null>(null);

  const loadSlots = async (d: string) => {
    if (!d) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await api.getAvailableSlots<AvailableSlot[]>(id, d, d);
      setSlots(res.data ?? []);
    } catch (err) {
      setBookError(errorMessage(err));
    } finally {
      setSlotsLoading(false);
    }
  };

  const openSheet = (slot: AvailabilitySlot) => {
    sheetOpenerRef.current = document.activeElement as HTMLElement;
    setPickedSlot(slot);
    setSubjectId(teacher?.subjects?.[0]?.id ?? '');
    setDate(nextWeekday(slot.day));
    setSelectedSlot(null);
    setBookError('');
    setBookedOk(false);
    setSheetOpen(true);
  };

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setPickedSlot(null);
    setBookedOk(false);
    if (sheetOpenerRef.current) {
      sheetOpenerRef.current.focus();
      sheetOpenerRef.current = null;
    }
  }, []);

  /* Hero CTAs — reuse the existing booking sheet flow, nothing else. */
  const firstAvailabilitySlot = useMemo(() => {
    const avail = teacher?.availability ?? [];
    if (!avail.length) return null;
    return [...avail].sort((a, b) => {
      const da = DAY_ORDER.indexOf(a.day);
      const db = DAY_ORDER.indexOf(b.day);
      if (da !== db) return da - db;
      return minutesOf(a.startTime ?? '00:00') - minutesOf(b.startTime ?? '00:00');
    })[0];
  }, [teacher]);

  const bookFirstSlot = () => {
    if (firstAvailabilitySlot) {
      openSheet(firstAvailabilitySlot);
    } else {
      document.getElementById('teacherLessons')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* ---- Hero social strip ----
     URLs are read defensively from teacher data so the icons become real
     external links whenever the API supplies them; today the profile has no
     social fields, so every icon uses the existing `linkUnavailable` fallback. */
  const socialHref = (key: DictKey): string | null => {
    if (!teacher) return null;
    const rec = teacher as unknown as {
      socialLinks?: Record<string, string | null | undefined>;
      social?: Record<string, string | null | undefined>;
    };
    const map = rec.socialLinks ?? rec.social ?? {};
    const url = map[key];
    return typeof url === 'string' && url.trim() ? url : null;
  };

  /* ---- Intro-video lightbox ---- */
  const [videoOpen, setVideoOpen] = useState(false);
  const videoOpenerRef = useRef<HTMLElement | null>(null);
  const videoUrl = useMemo(() => {
    if (!teacher) return null;
    const rec = teacher as unknown as { videoUrl?: string | null; introVideo?: string | null };
    const v = rec.videoUrl ?? rec.introVideo ?? null;
    return typeof v === 'string' && v.trim() ? v : null;
  }, [teacher]);

  const openVideo = () => {
    videoOpenerRef.current = document.activeElement as HTMLElement;
    setVideoOpen(true);
  };

  const closeVideo = useCallback(() => {
    setVideoOpen(false);
    if (videoOpenerRef.current) {
      videoOpenerRef.current.focus();
      videoOpenerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (videoOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [videoOpen]);

  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVideo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [videoOpen, closeVideo]);

  useEffect(() => {
    if (sheetOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, closeSheet]);

  useEffect(() => {
    if (sheetOpen && !bookedOk && date) void loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen, date, bookedOk]);

  const confirmBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setBookError(t('selectSlotFirst'));
      return;
    }
    setBooking(true);
    setBookError('');
    const payload: BookLessonInput = {
      teacherId: id,
      subjectId: subjectId || undefined,
      date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      locationId: selectedSlot.locationId ?? undefined,
      centerId: (selectedSlot as AvailableSlot & { centerId?: string }).centerId ?? undefined,
    };
    try {
      await api.bookLesson(payload);
      setBookedOk(true);
      toast.success(t('lessonBooked'));
      reload();
    } catch (err) {
      setBookError(errorMessage(err));
    } finally {
      setBooking(false);
    }
  };

  /* ---- Calendar geometry ---- */
  const calendar = useMemo(() => {
    const avail = teacher?.availability ?? [];
    const starts = avail.map((a) => minutesOf(a.startTime ?? '00:00'));
    const ends = avail.map((a) => minutesOf(a.endTime ?? '00:00'));
    const firstHour = starts.length ? Math.floor(Math.min(...starts) / 60) : 14;
    const lastHour = ends.length ? Math.max(firstHour + 2, Math.ceil(Math.max(...ends) / 60)) : 22;
    const halfRows = Math.max(4, (lastHour - firstHour) * 2);
    const perDay = new Map<number, number>();
    avail.forEach((a) => perDay.set(a.day, (perDay.get(a.day) ?? 0) + 1));
    const events = avail.map((a) => ({
      slot: a,
      col: ((a.day + 1) % 7) + 2,
      startRow: 2 + Math.round((minutesOf(a.startTime ?? '00:00') - firstHour * 60) / 30),
      rowSpan: Math.max(1, Math.round((minutesOf(a.endTime ?? '00:00') - minutesOf(a.startTime ?? '00:00')) / 30)),
    }));
    return { firstHour, lastHour, halfRows, perDay, events };
  }, [teacher]);

  /* ---- Reviews ---- */
  const reviews = teacher?.reviews ?? [];
  const studentReviews = reviews.filter((r) => r.author.type === 'student');
  const parentReviews = reviews.filter((r) => r.author.type === 'parent');
  const tabs: Review[][] = [studentReviews, parentReviews, []];
  const [tabIndex, setTabIndex] = useState(0);
  const currentReviews = tabs[tabIndex] ?? [];

  const ratingBars = useMemo(() => {
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((n) => {
      const count = reviews.filter((r) => Math.round(r.stars) === n).length;
      return { n, count, pct: Math.round((count / total) * 100) };
    });
  }, [reviews]);

  const joinHref = `/login?next=${encodeURIComponent(`/teachers/${id}`)}`;
  const hourLabel = (h: number) => (
    <div
      key={`cal-hour-${h}`}
      className="tp-calendar-time sticky start-0 z-[6] flex items-start justify-center gap-[1px] border-b border-[#e4eef6] border-s border-[#d9e9f5] pt-[7px] font-black text-[#486985]"
      style={{ gridColumn: 1, gridRow: `${((h - calendar.firstHour) * 2) + 2} / span 2` }}
    >
      <bdi dir="ltr">
        <span className="text-[11px] min-[781px]:text-[13px]">{h > 12 ? h - 12 : h}:00</span>
      </bdi>
      <small className="text-[9px] opacity-70 min-[781px]:text-[10px]">{lang === 'ar' ? 'م' : 'PM'}</small>
    </div>
  );

  if (initialLoading) return <PencilLoader label={t('loadingTeacherProfile')} />;
  if (error || !teacher) return <Alert message={error || t('failedLoadTeacherProfile')} />;

  const photoUrl = teacher.photo || null;

  const scheduleBody = (
    <>
      <div className="tp-calendar-hint mb-[13px] flex items-start gap-[9px] rounded-[14px] border border-[#d3e6f5] bg-[#f4faff] px-[12px] py-[10px] text-[12px] font-bold leading-[1.7] text-[#517190] min-[781px]:text-[13px]">
        <span className="grid h-[29px] w-[29px] flex-none place-items-center rounded-full bg-[#e8f5ff] text-[14px] text-[#087ee4]">
          <span aria-hidden="true">ℹ</span>
        </span>
        <span>{t('scheduleHint')}</span>
      </div>
      <div
        className="tp-calendar-viewport max-w-full overflow-x-auto overscroll-x-contain border border-[#cfe2f2] bg-[#f8fcff] shadow-[inset_0_1px_0_#fff,0_16px_36px_rgba(23,86,139,.08)] [scrollbar-color:#8ac8f6_#edf7ff] [scrollbar-width:thin] rounded-[19px] min-[781px]:rounded-[24px]"
        tabIndex={0}
        aria-label={t('scheduleHeading')}
      >
        <style>{`
          .tmv-cal{grid-template-columns:54px repeat(7,142px);grid-template-rows:56px repeat(var(--tmv-n),36px)}
          .tmv-lane{background:repeating-linear-gradient(to bottom,transparent 0,transparent 34px,#e5eff7 34px,#e5eff7 36px);border-left:1px solid #dbeaf5}
          .tmv-lane.is-rest{background:repeating-linear-gradient(135deg,#f4f7fa 0,#f4f7fa 8px,#eef3f7 8px,#eef3f7 16px)}
          @media(min-width:781px){
            .tmv-cal{grid-template-columns:64px repeat(7,minmax(148px,1fr));grid-template-rows:62px repeat(var(--tmv-n),38px)}
            .tmv-lane{background:repeating-linear-gradient(to bottom,transparent 0,transparent 36px,#e5eff7 36px,#e5eff7 38px)}
          }
        `}</style>
        <div
          className="tmv-cal relative grid min-w-[1048px] pb-2 min-[781px]:min-w-[1100px]"
          style={{ '--tmv-n': calendar.halfRows } as CSSProperties}
        >
          <div className="tp-calendar-corner sticky top-0 start-0 z-[10] grid place-items-center border-b border-[#cfe2f2] border-s border-[#d9e9f5] bg-[#f8fcff] text-[11px] font-black text-[#657e99]" style={{ gridColumn: 1, gridRow: 1 }}>
            {t('timeColumn')}
          </div>
          {DAY_ORDER.map((day, i) => {
            const count = calendar.perDay.get(day) ?? 0;
            const isRest = count === 0;
            return (
              <div
                key={day}
                className={`tp-calendar-day sticky top-0 z-[8] flex flex-col items-center justify-center gap-[2px] border-b border-[#cfe2f2] border-s border-[#d9e9f5] backdrop-blur-[10px] ${
                  isRest ? 'bg-[#f6f8fb] [&>b]:text-[#8391a2] [&>small]:text-[#a4b2c0]' : 'bg-[rgba(241,248,255,.97)]'
                }`}
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                <b className="text-[12px] font-black text-[#0b3975] min-[781px]:text-[15px]">{dayName(day, lang)}</b>
                <small className="text-[10px] font-bold text-[#688099] min-[781px]:text-[11px]">
                  {isRest ? t('restDay') : `${count} ${count === 1 ? t('sessionsFew') : t('sessionsMany')}`}
                </small>
              </div>
            );
          })}
          {DAY_ORDER.map((day, i) => (
            <div
              key={`lane-${day}`}
              aria-hidden="true"
              className="tmv-lane"
              style={{ gridColumn: i + 2, gridRow: `2 / ${2 + calendar.halfRows}` }}
            />
          ))}
          {Array.from({ length: calendar.lastHour - calendar.firstHour }, (_, i) => hourLabel(calendar.firstHour + i))}
          {calendar.events.map((ev, i) => {
            const loc = ev.slot.location?.name || t('online');
            const time = `${formatTime(ev.slot.startTime, lang)} - ${formatTime(ev.slot.endTime, lang)}`;
            return (
              <button
                key={`${ev.slot.day}-${ev.slot.startTime}-${i}`}
                type="button"
                onClick={() => openSheet(ev.slot)}
                className="tmv-evt relative z-[3] block w-full min-w-0 overflow-hidden rounded-[5px] bg-[linear-gradient(145deg,#e6f4ff,#d8edff)] px-[6px] py-[3px] text-start shadow-[inset_0_0_0_1px_rgba(87,165,226,.28)] transition hover:brightness-[1.06] active:scale-[0.99] min-[781px]:rounded-[7px] min-[781px]:px-[8px] min-[781px]:py-[5px]"
                style={{ gridColumn: ev.col, gridRow: `${ev.startRow} / span ${ev.rowSpan}` }}
              >
                <time className="block truncate text-[10px] font-black leading-[1.3] text-[#087bda] min-[781px]:text-[11px]">
                  <bdi dir="ltr">{time}</bdi>
                </time>
                <strong className="block truncate text-[10px] font-black leading-[1.3] text-[#0b3a75] min-[781px]:text-[12px]">
                  {subjectName || t('generalSubject')}
                </strong>
                {gradeNames.length > 0 && (
                  <span className="hidden truncate text-[10px] font-bold text-[#486c8e] min-[781px]:block">
                    {gradeNames.join(' · ')}
                  </span>
                )}
                <em className="block truncate text-[9px] not-italic font-bold text-[#5f7d97] min-[781px]:text-[10px]">{loc}</em>
                <span className="mt-[1px] block truncate text-[10px] font-black text-[#087bd4] min-[781px]:mt-[2px] min-[781px]:text-[11px]">
                  <bdi dir="ltr">{formatCurrency(teacher.hourlyRate, lang)}</bdi> {t('perSession')} <b aria-hidden="true">↗</b>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  const sheetGroupCard = pickedSlot ? (
    <div className="mb-4 rounded-[20px] border border-[#cfe3f3] bg-[linear-gradient(145deg,#f4faff,#eaf6ff)] p-[15px] text-[#315371]">
      <div className="flex w-full flex-wrap items-center gap-3">
        <strong className="min-w-0 flex-1 text-[19px] font-black text-[#0b3d78]">
          {subjectName || t('generalSubject')}
        </strong>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-[9px] py-[6px] text-[12px] font-bold text-[#385e7f]">
          {dayName(pickedSlot.day, lang)} · <bdi dir="ltr">{formatTime(pickedSlot.startTime, lang)} - {formatTime(pickedSlot.endTime, lang)}</bdi>
        </span>
        <span className="rounded-full bg-white px-[9px] py-[6px] text-[12px] font-bold text-[#385e7f]">
          {pickedSlot.location?.name || t('online')}
        </span>
        {gradeNames.length > 0 && (
          <span className="rounded-full bg-white px-[9px] py-[6px] text-[12px] font-bold text-[#385e7f]">
            {gradeNames.join(' · ')}
          </span>
        )}
      </div>
      <b className="mt-2 inline-block text-[15px] font-black text-[#087bda]">
        <bdi dir="ltr">{formatCurrency(teacher.hourlyRate, lang)}</bdi> {t('perSession')}
      </b>
    </div>
  ) : null;

  return (
    <main id="teacherOverview" className="mx-auto grid w-full max-w-[1080px] gap-4 px-4 pt-[18px] pb-[calc(150px+env(safe-area-inset-bottom))] min-[781px]:pb-16">
      {/* ── Hero (compact premium card) ─────────────────────── */}
      <header
        className="tp-hero relative isolate overflow-hidden rounded-[28px] border border-[#dceaf6] bg-[linear-gradient(155deg,#eef7ff_0%,#ffffff_46%,#f2f9ff_100%)] shadow-[0_18px_44px_rgba(18,65,109,.09)]"
        aria-labelledby="tpName"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -start-28 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(53,198,255,.24),transparent_70%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -end-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(117,88,238,.14),transparent_70%)]" />

        <div className="relative flex items-start gap-4 p-4 min-[641px]:items-center min-[641px]:gap-9 min-[641px]:p-8 min-[641px]:ps-10">
          <div className="min-w-0 max-w-full flex-1 text-start">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="tp-trust-mark inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#bcdcf7] bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#0878e8]">
                <span aria-hidden="true" className="grid h-4 w-4 flex-none place-items-center rounded-full bg-[#168ff2] text-[9px] text-white">✓</span>
                <span className="truncate">{t('maarejVerified')}</span>
              </span>
              <span className="tp-eyebrow text-[11px] font-black text-[#6b84a6] min-[641px]:text-[13px]">{t('teacherEyebrow')}</span>
            </div>

            <h1 id="tpName" className="mt-1.5 text-[24px] font-black leading-[1.12] text-[#0b2c61] sm:text-[30px] min-[641px]:mt-2 min-[641px]:text-[38px]">
              {teacher.fullName}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 min-[641px]:mt-2">
              <p className="tp-role text-[14px] font-extrabold text-[#3d5a83] min-[641px]:text-[16px]">
                {t('teacherLabel')} {subjectName || t('generalSubject')}
              </p>
              <span aria-hidden="true" className="text-[13px] font-black text-[#9db0c6]">·</span>
              <div className="tp-rating flex items-center gap-1.5">
                <span aria-hidden="true" className="text-[14px] text-[#f1ad22]">★</span>
                <b className="text-[14px] font-black leading-none text-[#0b2c61]">
                  <bdi dir="ltr">{Number(teacher.rating ?? 0).toFixed(1)}</bdi>
                </b>
                <span className="text-[12px] font-bold text-[#6b84a6]">
                  {t('ratingsCount', { count: teacher.ratingCount ?? 0 })}
                </span>
              </div>
            </div>

            <p className="tp-promise mt-2 inline-flex max-w-full items-center gap-2 rounded-[12px] border border-[#e2effb] bg-white/80 px-3 py-1.5 text-[12px] font-bold leading-[1.5] text-[#31547a] min-[641px]:mt-2.5 min-[641px]:text-[13px]">
              {subjectName === 'الرياضيات' ? t('teacherMathPromise') : t('teacherPromise')}
            </p>

            <div className="tp-socials mt-2.5 grid w-full max-w-[210px] grid-cols-4 gap-1.5 min-[641px]:mt-3">
              {SOCIALS.map((c) => {
                const href = socialHref(c.key);
                const label = href ? t(c.key) : `${t(c.key)} — ${t('linkUnavailable')}`;
                const glyph = <span className={`grid h-full w-full place-items-center [&_svg]:h-[17px] [&_svg]:w-[17px] ${c.tint}`}>{c.mark}</span>;
                const cls =
                  'tp-social grid aspect-square min-w-0 w-full max-w-[40px] place-items-center rounded-full border border-[#dfeaf5] bg-white shadow-[0_5px_14px_rgba(33,80,137,.08)] transition hover:-translate-y-[1px] hover:border-[#b7d5ef] hover:shadow-[0_9px_20px_rgba(33,80,137,.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168ff2] focus-visible:ring-offset-2';
                return href ? (
                  <a key={c.key} href={href} target="_blank" rel="noopener noreferrer" aria-label={t(c.key)} title={t(c.key)} className={cls}>
                    {glyph}
                  </a>
                ) : (
                  <span key={c.key} role="img" aria-label={label} title={label} className={`${cls} cursor-default`}>
                    {glyph}
                  </span>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 min-[641px]:mt-3.5">
              <button
                type="button"
                onClick={bookFirstSlot}
                className="tp-cta-book inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[13px] bg-[linear-gradient(135deg,#35c6ff,#087cf0_62%,#5a55e8)] px-4 text-[13px] font-black text-white shadow-[0_12px_26px_rgba(8,124,240,.32)] transition hover:brightness-[1.06] active:scale-[0.99] min-[641px]:min-h-[44px] min-[641px]:px-5 min-[641px]:text-[14px]"
              >
                {t('bookSession')}
                <span aria-hidden="true">←</span>
              </button>
            </div>
          </div>

          <div className="tp-hero-avatar shrink-0">
            <span className="relative block rounded-full bg-white p-[6px] shadow-[0_12px_32px_rgba(8,124,240,.18)] ring-1 ring-[#d8ebfa]">
              <Avatar src={photoUrl} name={teacher.fullName || '?'} size="hero" className="rounded-full ring-4 ring-white" />
            </span>
          </div>
        </div>
      </header>

      {/* ── Intro video — compact preview + lightbox (part of the intro composition) ── */}
      <section id="teacherVideo" className={`tp-panel tp-video-panel ${PANEL.base} ${PANEL.mobile} ${PANEL.desktop}`}>
        <div className="grid gap-4 min-[781px]:grid-cols-[minmax(0,1fr)_minmax(250px,360px)] min-[781px]:items-center min-[781px]:gap-8">
          <div className="tp-video-intro min-w-0 text-start">
            <small className="block text-[11px] font-black text-[#087bd4] min-[781px]:text-[12px]">{t('videoStudentMessage')}</small>
            <h2 className="mt-[2px] text-[20px] font-black leading-[1.35] text-[#0c2c61] min-[781px]:text-[26px]">{t('videoWatchTitle')}</h2>
            <p className="mt-2 max-w-[540px] text-[13px] leading-[1.8] text-[#587089] min-[781px]:text-[14px]">
              {teacher.bio?.trim() || (subjectName === 'الرياضيات' ? t('teacherMathPromise') : t('teacherPromise'))}
            </p>
            <div className="tp-video-facts mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-[#6b84a6]">
              <span>{teacher.yearsExperience} {t(teacher.yearsExperience === 1 ? 'yearOne' : 'yearsUnit')}</span>
              <span aria-hidden="true">·</span>
              <span>{(teacher.subjects ?? []).length} {t((teacher.subjects ?? []).length === 1 ? 'subjectOne' : 'subjectMany')}</span>
              {(teacher.availability ?? []).length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{(teacher.availability ?? []).length} {t('sessionsMany')}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={openVideo}
            className="tp-video group relative aspect-video w-full overflow-hidden rounded-[16px] border border-[#d8e8f6] bg-[#f0f6fc] text-start shadow-[0_14px_34px_rgba(10,51,103,.12)] min-[781px]:rounded-[18px]"
            aria-label={t('videoWatchTitle')}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]" />
            ) : (
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(53,198,255,.22),transparent_55%)]" />
            )}
            <span className="absolute inset-0 bg-[linear-gradient(0deg,rgba(6,32,72,.66),transparent_62%)]" aria-hidden="true" />
            <span className="tp-play absolute top-1/2 left-1/2 grid h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[rgba(8,120,240,.78)] text-white shadow-[0_12px_28px_rgba(3,24,62,.32)] backdrop-blur-[6px] transition group-hover:scale-[1.08] group-hover:bg-[#0878e8] min-[781px]:h-[52px] min-[781px]:w-[52px]">
              <Play className="h-5 w-5 fill-current min-[781px]:h-6 min-[781px]:w-6" />
            </span>
            {!videoUrl && (
              <span className="tp-video-pending absolute end-2 bottom-2 rounded-full bg-[rgba(4,22,60,.62)] px-2.5 py-1 text-[10px] font-black text-[#bfe4ff] backdrop-blur-[4px]">
                {t('videoStatusPending')}
              </span>
            )}
          </button>
        </div>

        {/* ── Intro-video lightbox ── */}
        {videoOpen && (() => {
          return (
            <div
              className="tp-video-backdrop fixed inset-0 z-[130] grid animate-tp-fade place-items-center bg-[rgba(5,28,66,.72)] p-4 backdrop-blur-[3px]"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeVideo();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t('videoWatchTitle')}
                className="tp-video-modal relative w-full max-w-[860px] animate-tp-up overflow-hidden rounded-[22px] bg-black shadow-[0_30px_80px_rgba(2,18,48,.5)]"
              >
                <button
                  type="button"
                  onClick={closeVideo}
                  aria-label={t('closeLabel')}
                  className="absolute end-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-[22px] font-black leading-none text-white backdrop-blur-[4px] transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  ×
                </button>
                {videoUrl ? (
                  <video key={videoUrl} src={videoUrl} controls autoPlay playsInline className="aspect-video h-auto w-full">
                    <p className="p-4 text-center text-[13px] font-bold text-slate-300">{t('videoUnsupported')}</p>
                  </video>
                ) : (
                  <div className="relative grid aspect-video w-full place-items-center bg-[#081b3a]">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(53,198,255,.2),transparent_55%)]" />
                    <div className="relative px-6 text-center">
                      <span className="mx-auto mb-3 grid h-[58px] w-[58px] place-items-center rounded-full border-2 border-white bg-[rgba(8,120,240,.72)] text-white shadow-[0_12px_30px_rgba(3,24,62,.38)]">
                        <Play className="h-6 w-6 fill-current" />
                      </span>
                      <strong className="block text-[16px] font-black text-white">{t('videoNotAdded')}</strong>
                      <small className="mt-1 block text-[12px] font-bold text-[#9fc2e6]">{t('videoStatusPending')}</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {/* ── Get to know your teacher ─────────────────────────── */}
      <section
        id="teacherQuick"
        className={`tp-panel group/quick relative isolate overflow-hidden bg-[linear-gradient(155deg,#edf6ff_0%,#f5faff_42%,#fffdf6_100%)] ${PANEL.base} ${PANEL.mobile} ${PANEL.desktop}`}
      >
        {/* ── Playful decorations (subtle, non-obstructive, RTL-safe) ── */}
        <span aria-hidden="true" className="pointer-events-none absolute -end-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(53,198,255,.18),transparent_70%)] opacity-70 transition-transform duration-700 ease-out group-hover/quick:scale-[1.04]" />
        <span aria-hidden="true" className="pointer-events-none absolute -start-12 bottom-0 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,rgba(22,188,140,.13),transparent_70%)] opacity-60" />
        <span aria-hidden="true" className="pointer-events-none absolute -start-8 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,#bcd9f2_1.3px,transparent_1.3px)] bg-[size:15px_15px] opacity-60 [mask-image:radial-gradient(circle_at_center,black_25%,transparent_70%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute end-24 bottom-5 h-2 w-2 rounded-full bg-[#ffd861] shadow-[0_0_0_4px_rgba(255,216,97,.18)]" />
        <span aria-hidden="true" className="pointer-events-none absolute end-40 bottom-2 h-1.5 w-1.5 rounded-full bg-[#16bc8c] shadow-[0_0_0_3px_rgba(22,188,140,.16)]" />
        <span aria-hidden="true" className="pointer-events-none absolute end-10 top-28 h-1.5 w-1.5 rounded-full bg-[#ff9aa3] shadow-[0_0_0_3px_rgba(255,154,163,.16)]" />
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="pointer-events-none absolute end-[38%] top-6 h-4 w-4 rotate-12 text-[#ffd861] opacity-80">
          <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9-7.9-2.6 7.9-2.6z" />
        </svg>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="pointer-events-none absolute bottom-16 start-[8%] h-3.5 w-3.5 -rotate-12 text-[#ff9aa3] opacity-70">
          <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9-7.9-2.6 7.9-2.6z" />
        </svg>
        {/* curved dotted connector between intro and fact cards (desktop) */}
        <svg aria-hidden="true" viewBox="0 0 90 130" fill="none" className="pointer-events-none absolute start-[46%] top-[46%] z-0 hidden h-[130px] w-[90px] -translate-y-1/2 min-[781px]:block">
          <path d="M72 10 C 24 34, 24 96, 72 120" stroke="#a9d3ef" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.5 10" />
          <circle cx="72" cy="10" r="4" fill="#ffd861" />
          <circle cx="72" cy="120" r="4" fill="#ff9aa3" />
        </svg>

        <div className="relative z-10">
          <div className="relative grid gap-4 min-[781px]:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] min-[781px]:items-stretch min-[781px]:gap-6">
            {/* ── RIGHT (RTL): header + teacher intro ── */}
            <div className="flex min-w-0 flex-col">
              <div className="mb-[11px] min-[781px]:mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffe0a0] bg-[#fff5d8] px-3 py-1 text-[11px] font-black text-[#8a6d1a] shadow-[0_4px_10px_rgba(233,162,4,.14)] min-[781px]:text-[12px]">
                  <Sparkles className="h-3.5 w-3.5 text-[#e9a204]" />
                  {t('teacherAboutEyebrow')}
                </span>
                <h2 className="mt-2 text-[22px] font-black leading-[1.3] text-[#0c2c61] min-[781px]:mt-2.5 min-[781px]:text-[30px]">
                  <span className="rounded-[7px] bg-[linear-gradient(180deg,transparent_56%,#ffedb8_56%)] px-1.5 box-decoration-clone">
                    {t('teacherAboutHeading')}
                  </span>
                </h2>
                <p className="mt-1.5 max-w-[400px] text-[12px] font-bold leading-[1.7] text-[#6b84a6] min-[781px]:text-[13px]">
                  {t('teacherAboutSub')}
                </p>
              </div>

              {/* Main description card — the visual focus */}
              <div className="group relative flex flex-col overflow-hidden rounded-[22px] border border-[#e2eef9] bg-white/95 p-4 shadow-[0_18px_44px_rgba(18,65,109,.08)] backdrop-blur-[2px] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:shadow-[0_22px_50px_rgba(18,65,109,.12)] min-[781px]:rounded-[26px] min-[781px]:p-6">
                <svg aria-hidden="true" viewBox="0 0 32 24" fill="currentColor" className="pointer-events-none absolute end-4 top-1 h-8 w-10 text-[#d8ecff]">
                  <path d="M2 22V12C2 5 6 1 13 0v4c-4 1.2-6 3.4-6.5 7H11v11H2zm16 0V12c0-7 4-11 11-12v4c-4 1.2-6 3.4-6.5 7H27v11H18z" />
                </svg>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="pointer-events-none absolute -start-2 -top-2 h-6 w-6 -rotate-12 text-[#ffd861]">
                  <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9-7.9-2.6 7.9-2.6z" />
                </svg>
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-1.5 -end-1.5 rotate-[20deg] text-[#ff9aa3]">
                  <Pencil className="h-5 w-5" />
                </span>
                <span aria-hidden="true" className="pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_center,rgba(53,198,255,.12),transparent_70%)] opacity-70" />
                <span aria-hidden="true" className="pointer-events-none absolute -start-8 bottom-0 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_center,rgba(22,188,140,.1),transparent_70%)] opacity-60" />

                <div className="relative z-10 flex flex-1 flex-col">
                  {/*
                    Factual intro line: built only from real profile data (teacher
                    name + subject). The subject is highlighted for hierarchy.
                    No invented quotes or teaching-style claims.
                  */}
                  {(teacher.fullName || subjectName) && (
                    <p className="text-[15px] font-extrabold leading-[1.8] text-[#0f3f7f] min-[781px]:text-[17px] min-[781px]:leading-[1.85]">
                      {introAt === -1 ? (
                        introText
                      ) : (
                        <>
                          {introBefore}
                          <span className="mx-0.5 inline-block rounded-[7px] bg-[#ffefad] px-1.5 py-0.5 font-black text-[#0b3368] shadow-[0_2px_0_#ecd27a]">
                            {subjectName}
                          </span>
                          {introAfter}
                        </>
                      )}
                    </p>
                  )}

                  {teacher.bio && (
                    <p className="mt-3 text-[13px] leading-[1.85] text-[#587089] min-[781px]:mt-4 min-[781px]:text-[14px] min-[781px]:leading-[1.9]">
                      {teacher.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── LEFT: playful mini fact cards (real data only) ── */}
            <div className="grid grid-cols-2 gap-2 min-[781px]:content-stretch min-[781px]:gap-3">
              {[
                {
                  key: 'proofExperienceLabel',
                  Icon: GraduationCap,
                  value: `${teacher.yearsExperience ?? 0} ${t((teacher.yearsExperience ?? 0) === 1 ? 'yearOne' : 'yearsUnit')}`,
                },
                {
                  key: 'proofSubjectsLabel',
                  Icon: BookOpen,
                  value: `${(teacher.subjects ?? []).length} ${t((teacher.subjects ?? []).length === 1 ? 'subjectOne' : 'subjectMany')}`,
                },
                {
                  key: 'proofStagesLabel',
                  Icon: Users,
                  value: `${gradeNames.length} ${t(gradeNames.length === 1 ? 'stagesOne' : 'stagesMany')}`,
                },
                {
                  key: 'proofSystemLabel',
                  Icon: CalendarIcon,
                  value: `${(teacher.availability ?? []).length} ${t('sessionsMany')}`,
                },
              ].map((item, i) => {
                const tint = PROOF_TINTS[i % PROOF_TINTS.length];
                return (
                  <div
                    key={item.key}
                    title={`${t(item.key as DictKey)}: ${item.value}`}
                    className={`group relative flex flex-col items-start justify-between overflow-hidden rounded-[20px] border border-white/80 p-[12px] shadow-[0_10px_26px_rgba(18,65,109,.07)] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:shadow-[0_16px_34px_rgba(18,65,109,.12)] min-[781px]:p-[14px] ${tint.grad}`}
                  >
                    <span aria-hidden="true" className="pointer-events-none absolute end-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white/90" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 -start-4 h-14 w-14 rounded-full bg-white/25" />
                    <span className={`relative z-10 grid h-[36px] w-[36px] flex-none place-items-center rounded-full bg-white shadow-[0_6px_14px_rgba(18,65,109,.12)] transition-transform duration-300 ease-out group-hover:scale-[1.08] min-[781px]:h-10 min-[781px]:w-10 ${tint.icon}`}>
                      <item.Icon className="h-5 w-5 min-[781px]:h-[22px] min-[781px]:w-[22px]" />
                    </span>
                    <div className="relative z-10 mt-2.5 min-w-0">
                      <strong className="block truncate text-[15px] font-black leading-[1.3] text-[#0b3368] min-[781px]:text-[16px]">{item.value}</strong>
                      <small className="mt-0.5 block text-[11px] font-bold leading-[1.5] text-[#5f7f9f] min-[781px]:text-[12px]">{t(item.key as DictKey)}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Skills ───────────────────────────────────────────── */}
      <section id="teacherAbout" className={`tp-panel ${PANEL.base} ${PANEL.mobile} ${PANEL.desktop}`}>
        <div className="tp-section-head mb-[11px] flex items-center gap-[9px] min-[781px]:mb-[18px] min-[781px]:gap-3">
          <span className="tp-section-icon flex h-10 w-10 items-center justify-center rounded-[13px] bg-[linear-gradient(145deg,#eaf5ff,#ddecff)] text-[20px] font-black text-[#087cf0] shadow-[0_10px_24px_rgba(8,124,240,.14)] min-[781px:h-[46px] min-[781px]:w-[46px] min-[781px]:rounded-[15px]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <small className="block text-[10px] font-black text-[#087bd4] min-[781px]:text-[12px]">{t('skillsEyebrow')}</small>
            <h2 className="mt-[1px] text-[19px] font-black leading-[1.35] text-[#0c2c61] min-[781px]:mt-[3px] min-[781px:text-[25px]">{t('skillsHeading')}</h2>
          </div>
        </div>
        <div className="tp-skills grid grid-cols-2 gap-[7px] min-[781px]:flex min-[781px]:gap-[10px]">
          {skills.map((s, i) => (
            <div
              key={s.key}
              className={`tp-skill flex min-h-[60px] min-w-0 items-center gap-[8px] rounded-[18px] p-[8px] ${SKILL_BG[i % SKILL_BG.length]} min-[781px]:flex min-[781px]:min-h-[0] min-[781px]:flex-1 min-[781px]:basis-[190px] min-[781px]:gap-[10px] min-[781px]:rounded-[20px] min-[781px]:p-[11px] min-[781px]:shadow-[0_12px_28px_rgba(29,80,133,.1)]`}
            >
              <span className={`tp-skill-icon grid h-[32px] w-[32px] flex-none place-items-center rounded-[11px] bg-white ${SKILL_ICON[i % SKILL_ICON.length]} min-[781px:h-9 min-[781px]:w-9`}>
                <s.Icon className="h-[18px] w-[18px]" />
              </span>
              <strong className="min-w-0 text-[13px] font-black leading-[1.4] text-[#0b3368] min-[781px:text-[14px]">{t(s.key)}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* ── Schedule ─────────────────────────────────────────── */}
      <section id="teacherLessons" className={`tp-panel tp-schedule min-w-0 ${PANEL.base} ${PANEL.mobile} ${PANEL.desktop}`}>
        <div className="tp-section-head mb-[11px] flex items-center gap-[9px] min-[781px]:mb-[15px] min-[781px]:gap-3">
          <span className="tp-section-icon flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#e6f8f1] text-[20px] font-black text-[#079b70] shadow-[0_10px_24px_rgba(8,124,240,.14)] min-[781px:h-[46px] min-[781px]:w-[46px] min-[781px]:rounded-[15px]">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <small className="block text-[10px] font-black text-[#087bd4] min-[781px]:text-[12px]">{t('scheduleEyebrow')}</small>
            <h2 className="mt-[1px] text-[19px] font-black leading-[1.35] text-[#0c2c61] min-[781px]:mt-[3px] min-[781px:text-[25px]">{t('scheduleHeading')}</h2>
          </div>
        </div>
        {scheduleBody}
      </section>

      {/* ── Achievements ─────────────────────────────────────── */}
      <section id="teacherBadges" className={`tp-panel tp-achievements ${PANEL.base} ${PANEL.mobile} ${PANEL.desktop}`}>
        <div className="tp-section-head mb-[11px] flex items-center gap-[9px] min-[781px]:mb-4 min-[781px]:gap-3">
          <span className="tp-section-icon flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#fff2d5] text-[20px] font-black text-[#d98d00] shadow-[0_10px_24px_rgba(217,141,0,.16)] min-[781px]:h-[46px] min-[781px]:w-[46px] min-[781px]:rounded-[15px]">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <small className="block text-[10px] font-black text-[#b98a1c] min-[781px]:text-[12px]">{t('achievementsEyebrow')}</small>
            <h2 className="mt-[1px] text-[19px] font-black leading-[1.35] text-[#0c2c61] min-[781px]:mt-[3px] min-[781px]:text-[25px]">{t('achievementsHeading')}</h2>
          </div>
        </div>
        <div className="tp-badges grid grid-cols-2 gap-2 min-[781px]:grid-cols-4 min-[781px]:gap-3">
          {BADGES.map((b) => (
            <div
              key={b.key}
              className={`tp-badge ${b.tone} relative flex min-h-[118px] flex-col items-center justify-center overflow-hidden rounded-[16px] border border-[#e5ecf4] bg-[linear-gradient(150deg,#fbfdff,#f4f8fc)] px-[9px] py-[11px] text-center min-[781px]:min-h-[132px] min-[781px]:rounded-[20px] min-[781px]:px-[15px]`}
            >
              <span
                className={`tp-medal grid h-[54px] w-[54px] place-items-center text-[23px] font-black text-white ${b.medal} drop-shadow-[0_8px_10px_rgba(0,0,0,.14)] min-[781px]:h-[64px] min-[781px]:w-[64px] min-[781px]:text-[28px]`}
                style={{ clipPath: 'polygon(50% 0,89% 20%,95% 66%,68% 100%,32% 100%,5% 66%,11% 20%)' }}
              >
                {b.symbol}
              </span>
              <strong className="mt-[6px] text-[13px] font-black leading-[1.3] text-[#0c2c61] min-[781px]:mt-[8px] min-[781px]:text-[14px]">{t(b.key)}</strong>
              <small className="mt-[2px] text-[11px] font-bold text-[#93a5b8]">{t('comingSoon')}</small>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reviews ──────────────────────────────────────────── */}
      <section id="teacherReviews" className={`tp-panel ${PANEL.base} ${PANEL.mobile} ${PANEL.desktop}`}>
        <div className="tp-section-head mb-[11px] flex items-center gap-[9px] min-[781px]:mb-[18px] min-[781px]:gap-3">
          <span className="tp-section-icon flex h-10 w-10 items-center justify-center rounded-[13px] bg-[linear-gradient(145deg,#eaf5ff,#ddecff)] text-[20px] font-black text-[#087cf0] shadow-[0_10px_24px_rgba(8,124,240,.14)] min-[781px:h-[46px] min-[781px]:w-[46px] min-[781px]:rounded-[15px]">
            <Star className="h-5 w-5" />
          </span>
          <div>
            <small className="block text-[10px] font-black text-[#087bd4] min-[781px]:text-[12px]">{t('ratingBreakdown')}</small>
            <h2 className="mt-[1px] text-[19px] font-black leading-[1.35] text-[#0c2c61] min-[781px]:mt-[3px] min-[781px:text-[25px]">{t('reviewsHeading')}</h2>
          </div>
        </div>
        <div className="tp-reviews grid gap-[8px] min-[781px]:grid-cols-[190px_minmax(0,1fr)] min-[781px]:gap-[14px]">
<div className="tp-score grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-[14px] border border-[#e1ebf5] bg-[#f4f9ff] p-[11px] min-[781px]:block min-[781px]:flex-none min-[781px]:rounded-[18px] min-[781px]:p-4">
            <strong className="block text-[27px] font-black leading-none min-[781px]:text-[35px]">
              <bdi dir="ltr">{Number(teacher.rating ?? 0).toFixed(1)}</bdi> <span className="text-[#f1ad22]">★</span>
            </strong>
            <small className="mt-[2px] text-[10px] font-bold text-[#70869d] min-[781px]:mt-[2px] min-[781px:text-[12px]">
              {t('ratingsCount', { count: reviews.length })}
            </small>
            <div
              className="tp-rating-bars col-span-full mt-[10px] space-y-[5px]"
              aria-label={t('ratingBreakdown')}
            >
              {ratingBars.map((bar) => (
                <span key={bar.n} className="flex items-center gap-[6px] text-[10px] font-bold text-[#607890]">
                  <b className="w-[18px] text-start">{bar.n} ★</b>
                  <i className="relative h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#e3ebf4] not-italic">
                    <em className="absolute inset-y-0 start-0 rounded-full bg-[#f1ad22]" style={{ width: `${bar.pct}%` }} />
                  </i>
                  <small className="w-[30px] text-end text-[10px] text-[#70869d]">{bar.pct}%</small>
                </span>
              ))}
            </div>
          </div>
          <div className="tp-reviews-main">
            <div className="tp-tabs grid grid-cols-3 gap-[5px] min-[781px]:flex min-[781px]:justify-start min-[781px]:gap-[7px]">
              {[
                { key: 'tabStudents' as DictKey, label: t('studentsTabLabel') },
                { key: 'tabParents' as DictKey, label: t('tabParents') },
                { key: 'tabCenters' as DictKey, label: t('tabCenters') },
              ].map((tab, i) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTabIndex(i)}
                  aria-pressed={tabIndex === i}
                  className={`min-w-0 truncate rounded-[10px] border border-[#dce8f4] px-[3px] py-[7px] text-[12px] font-bold whitespace-nowrap min-[781px]:rounded-[12px] min-[781px]:px-3 ${
                    tabIndex === i
                      ? 'bg-[#e8f4ff] text-[#076dce] dark:bg-sky-500/20'
                      : 'bg-white text-[#607890] hover:border-[#bcd8ef] dark:bg-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="tp-review-content mt-[7px] min-h-[140px] rounded-[15px] border border-[#e2ebf4] p-[10px] text-[13px] text-[#607990] min-[781px]:mt-[10px] min-[781px]:rounded-[15px] min-[781px]:p-[15px] min-[781px]:text-[14px]">
              {currentReviews.length === 0 ? (
                <p className="py-6 text-center text-[13px] font-bold text-[#8497aa]">
                  {tabIndex === 2 ? t('noCenterReviews') : t('noReviewsYet')}
                </p>
              ) : (
                currentReviews.map((r) => (
                  <article key={r.id} className="tp-review-card border-b border-[#edf3f8] py-[11px] last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="truncate text-[14px] font-black text-[#153665]">{r.author.fullName}</strong>
                      <StarsInline value={r.stars} />
                    </div>
                    {r.comment && <p className="mt-[6px] leading-[1.75]">{r.comment}</p>}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Materials ────────────────────────────────────────── */}
      <section id="teacherMaterials" className={`tp-panel ${PANEL.base} ${PANEL.mobile} ${PANEL.desktop}`}>
        <div className="tp-section-head mb-[11px] flex items-center gap-[9px] min-[781px]:mb-[18px] min-[781px]:gap-3">
          <span className="tp-section-icon flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f1edff] text-[20px] font-black text-[#7355da] shadow-[0_10px_24px_rgba(8,124,240,.14)] min-[781px:h-[46px] min-[781px]:w-[46px] min-[781px]:rounded-[15px]">
            <Library className="h-5 w-5" />
          </span>
          <div>
            <small className="block text-[10px] font-black text-[#087bd4] min-[781px]:text-[12px]">{t('materialsEyebrow')}</small>
            <h2 className="mt-[1px] text-[19px] font-black leading-[1.35] text-[#0c2c61] min-[781px]:mt-[3px] min-[781px:text-[25px]">{t('materialsHeading')}</h2>
          </div>
        </div>
        <div className="tp-materials grid grid-cols-2 gap-[7px] min-[781px]:grid-cols-4 min-[781px]:gap-[9px]">
          {MATERIALS.map((m) => (
            <div key={m.key} className="tp-material flex min-w-0 items-center gap-[7px] rounded-[13px] border border-[#e0eaf4] bg-[#f8fbff] p-[9px] min-[781px]:rounded-[17px] min-[781px]:p-[13px] min-[781px]:shadow-[0_8px_22px_rgba(55,76,132,.08)]">
              <span className="grid h-[31px] w-[31px] flex-none place-items-center rounded-[9px] bg-white text-[#0878e8] min-[781px:h-9 min-[781px]:w-9 min-[781px]:rounded-[11px]">
                <m.Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <b className="block truncate text-[13px] font-black text-[#122f57] min-[781px]:text-[14px]">{t(m.key)}</b>
                <small className="block text-[11px] font-bold text-[#7b8fa2] min-[781px]:text-[11px]">{t('comingSoon')}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Booking sheet ────────────────────────────────────── */}
      {sheetOpen && pickedSlot && (() => {
        const isStudent = user?.role === 'STUDENT';
        const formEnabled = isStudent;

        return (
          <div
            className="tp-sheet-backdrop fixed inset-0 z-[110] grid animate-tp-fade place-items-end bg-[rgba(5,28,66,.64)] backdrop-blur-[2px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeSheet();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tpSheetTitle"
              className="tp-sheet relative max-h-[min(82vh,720px)] w-full max-w-[520px] animate-tp-up overflow-y-auto rounded-t-[27px] bg-white px-[18px] pb-[calc(25px+env(safe-area-inset-bottom))] pt-[29px] shadow-[0_-15px_45px_rgba(7,38,77,.25)] dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={closeSheet}
                aria-label={t('closeLabel')}
                className="absolute left-[16px] top-[14px] grid h-[37px] w-[37px] place-items-center rounded-[12px] bg-[#edf5fd] text-[22px] font-black leading-none text-[#126cc1] transition hover:bg-[#e0eef9] dark:bg-slate-800 dark:text-sky-300"
              >
                ×
              </button>

              {bookedOk ? (
                <div className="tp-join-success px-1 pt-4 pb-2 text-center">
                  <span className="mx-auto mb-[14px] grid h-[78px] w-[78px] place-items-center rounded-[28px] bg-[linear-gradient(145deg,#168ff2,#075cc7)] text-[38px] font-black text-white shadow-[0_18px_34px_rgba(12,112,213,.25)]">✓</span>
                  <h2 id="tpSheetTitle" className="text-[24px] font-black text-[#082f69] dark:text-sky-200">{t('lessonBooked')}</h2>
                  <p className="mt-2 text-[14px] font-bold text-[#58708f] dark:text-slate-300">
                    {subjectName || t('generalSubject')} — {teacher.fullName}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeSheet();
                      document.getElementById('teacherLessons')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="tp-sheet-action mt-[20px] inline-flex min-h-[45px] w-full items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#35c6ff,#087cf0_62%,#6255e8)] px-[18px] py-[9px] text-center font-black text-white shadow-[0_14px_30px_rgba(8,124,240,.34)] transition hover:brightness-110"
                  >
                    {t('backToSchedule')}
                  </button>
                </div>
              ) : !user ? (
                <div className="tp-join-simple">
                  <div className="tp-join-head mb-3">
                    <h2 id="tpSheetTitle" className="text-[22px] font-black text-[#082f69] dark:text-sky-200">{t('joinRequestTitle')}</h2>
                  </div>
                  {sheetGroupCard}
                  <Link
                    href={joinHref}
                    className="tp-sheet-action inline-flex min-h-[45px] w-full items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#35c6ff,#087cf0_62%,#6255e8)] px-[18px] py-[9px] text-center font-black text-white shadow-[0_14px_30px_rgba(8,124,240,.34)] transition hover:brightness-110"
                  >
                    {t('loginToJoin')}
                  </Link>
                </div>
              ) : !formEnabled ? (
                <div className="tp-join-simple">
                  <div className="tp-join-head mb-3">
                    <h2 id="tpSheetTitle" className="text-[22px] font-black text-[#082f69] dark:text-sky-200">{t('joinRequestTitle')}</h2>
                  </div>
                  {sheetGroupCard}
                  <p className="rounded-[14px] bg-[#fff6e4] p-[13px] text-[13px] font-bold leading-[1.7] text-[#8a6a1f] dark:bg-amber-500/15 dark:text-amber-200">
                    {t('studentsOnlyBooking')}
                  </p>
                </div>
              ) : (
                <form onSubmit={confirmBooking}>
                  <div className="tp-join-head mb-3">
                    <h2 id="tpSheetTitle" className="text-[22px] font-black text-[#082f69] dark:text-sky-200">{t('joinRequestTitle')}</h2>
                  </div>
                  {sheetGroupCard}

                  {subjectsOptions.length > 1 && (
                    <div className="mb-3">
                      <Select
                        label={t('subject')}
                        name="subject"
                        value={subjectId}
                        options={subjectsOptions}
                        onChange={(e) => setSubjectId(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <Input
                      type="date"
                      name="date"
                      label={t('date')}
                      value={date}
                      min={todayStr}
                      max={maxDate}
                      onChange={(e) => setDate(e.target.value || todayStr)}
                    />
                  </div>
                  <p className="mb-2 text-[13px] font-black text-[#24425f] dark:text-slate-200">{t('availableTimes')}</p>

                  {slotsLoading ? (
                    <div className="flex justify-center py-5">
                      <PencilLoader label={t('loadingTimes')} />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="rounded-[13px] bg-[#f4f8fb] p-3 text-center text-[13px] font-bold text-[#788fa3] dark:bg-slate-800">
                      {t('noAvailabilityDate')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => {
                        const active = selectedSlot?.startTime === s.startTime && selectedSlot?.date === s.date;
                        const disabled = s.booked && !s.bookedByMe;
                        return (
                          <button
                            key={`${s.date}-${s.startTime}`}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSlot(s)}
                            aria-pressed={active}
                            className={`rounded-[11px] border px-2 py-[9px] text-[12px] font-black transition ${
                              disabled
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : active
                                ? 'border-[#087cf0] bg-[#e8f4ff] text-[#076dce] shadow-[inset_0_0_0_1px_#087cf0]'
                                : 'border-[#dce8f4] bg-white text-[#173a61] hover:border-[#93c8f2]'
                            }`}
                          >
                            <span className="block">
                              <bdi dir="ltr">{formatTime(s.startTime, lang)}</bdi>
                            </span>
                            <span className="block text-[10px] opacity-70">
                              <bdi dir="ltr">{formatTime(s.endTime, lang)}</bdi>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mb-3 mt-4 flex items-center justify-between gap-3">
                    <b className="text-[15px] font-black text-[#0b3d78] dark:text-sky-200">
                      <bdi dir="ltr">{formatCurrency(teacher.hourlyRate, lang)}</bdi> {t('perSession')}
                    </b>
                    <span className="text-[13px] font-bold text-[#6a8298]">{t('sessionPriceLabel')}</span>
                  </div>

                  {bookError && (
                    <div className="mb-3">
                      <InlineError message={bookError} />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={booking || slotsLoading || !selectedSlot}
                    className="tp-sheet-action mt-[14px] inline-flex min-h-[45px] w-full items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#35c6ff,#087cf0_62%,#6255e8)] px-[18px] py-[9px] text-center font-black text-white shadow-[0_14px_30px_rgba(8,124,240,.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {booking ? t('loadingTeacherProfile') : t('confirmBooking')}
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })()}
    </main>
  );
}