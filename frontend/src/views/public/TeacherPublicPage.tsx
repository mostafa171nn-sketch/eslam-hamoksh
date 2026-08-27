'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, CheckCircle2, Heart, MapPin, MessageSquare, Star } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { AuthPrompt } from '../../components/AuthPrompt';
import type { AvailableSlot, BookLessonInput } from '../../lib/types';
import { dayName, formatCurrency, formatDate, formatTime, timeAgo } from '../../lib/format';

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </span>
  );
}

function durationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TeacherPublicPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const toast = useToast();
  const { t, lang } = useT();
  const { user } = useAuth();
  const path = `/teachers/${id}`;

  const requireAuth = (action: () => void) => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    action();
  };

  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, initialLoading, error, reload } = useApi(() => api.getTeacher(id), [id]);

  const canRate = user?.role === 'STUDENT' || user?.role === 'PARENT';
  const isStudent = user?.role === 'STUDENT';

  const [favorited, setFavorited] = useState(false);

  const handleMessage = () => {
    requireAuth(() => toast.info(t('messagingEnrollNote')));
  };

  const handleFavorite = () => {
    requireAuth(() => {
      setFavorited((prev) => {
        toast.success(prev ? t('favoriteRemoved') : t('favoriteAdded'));
        return !prev;
      });
    });
  };

  const today = new Date();
  const todayStr = localDateStr(today);
  const maxDate = localDateStr(new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000));

  // Booking modal state
  const [bookOpen, setBookOpen] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(todayStr);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');

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
      toast.error(errorMessage(err));
    } finally {
      setSlotsLoading(false);
    }
  };

  const openBook = () => {
    setSubjectId(data?.subjects[0]?.id ?? '');
    setDate(todayStr);
    setSelectedSlot(null);
    setBookError('');
    setBookOpen(true);
    loadSlots(todayStr);
  };

  useEffect(() => {
    if (bookOpen && date) loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookOpen]);

  const submitRating = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post(`/ratings/${id}`, { stars, comment: comment.trim() || undefined });
      toast.success(t('ratingSubmitted'));
      setRateOpen(false);
      setComment('');
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmBooking = async () => {
    if (!selectedSlot) {
      setBookError(t('selectSlotFirst'));
      return;
    }
    if (!date) {
      setBookError(t('chooseDate'));
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
      centerId: (selectedSlot as any).centerId ?? undefined,
    };
    try {
      await api.bookLesson(payload);
      toast.success(t('lessonBooked'));
      setBookOpen(false);
      reload();
    } catch (err) {
      setBookError(errorMessage(err));
    } finally {
      setBooking(false);
    }
  };

  if (initialLoading) return <PencilLoader label={t('loadingTeacherProfile')} />;
  if (error || !data) return <Alert message={error || t('failedLoadTeacherProfile')} />;

  const selectedSubject = data.subjects.find((s) => s.id === subjectId);

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: profile + reviews */}
        <div className="space-y-6 lg:col-span-2">
          <Card bodyClassName="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar name={data.fullName} src={data.photo} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{data.fullName}</h1>
                  <Stars value={data.rating} />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {data.rating.toFixed(1)} ({data.ratingCount} {t('reviews')})
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  {data.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {data.location.name}
                    </span>
                  )}
                  <span> {formatCurrency(data.hourlyRate)} {t('perHour')}</span>
                  <span> {data.yearsExperience} {t('yearsOfExperience')}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {data.subjects.map((s) => (
                    <Badge key={s.id} tone="blue">{s.name}</Badge>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {data.grades.map((g) => (
                    <Badge key={g.id} tone="slate">{g.name}</Badge>
                  ))}
                </div>
                {data.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.bio}</p>}
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-900 dark:text-white">{data.studentCount}</strong> {t('studentsCount')}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-900 dark:text-white">{data.completedLessons}</strong> {t('completedLessonsStat')}
                  </span>
                  {canRate && (
                    <Button size="sm" variant="outline" onClick={() => requireAuth(() => setRateOpen(true))}>
                      <Star className="h-4 w-4" /> {t('rateTeacher')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {data.availability.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('weeklyAvailability')}</h2>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.availability.map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{dayName(a.day, lang)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(a.startTime)}  {formatTime(a.endTime)}
                        {a.location ? `  ${a.location.name}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
              {t('reviews')} {data.reviews.length > 0 && `(${data.reviewsTotal})`}
            </h2>
            {data.reviews.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t('noReviewsYet')}</p>
            ) : (
              <div className="space-y-3">
                {data.reviews.map((r) => (
                  <Card key={r.id} bodyClassName="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar name={r.author.fullName} src={r.author.photo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.author.fullName}</p>
                          <Stars value={r.stars} size="h-3.5 w-3.5" />
                          <span className="text-xs text-slate-400">{timeAgo(r.createdAt, lang)}</span>
                        </div>
                        {r.comment && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">{t('memberSince')} {formatDate(data.createdAt)}.</p>
          </div>
        </div>

        {/* Right: booking card */}
        <div className="space-y-6">
          <Card bodyClassName="p-6">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('bookLesson')}</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('browseSlots').replace('{name}', data.fullName)}
            </p>

            {data.isEnrolled && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" /> {t('enrolledWithTeacher')}
                </div>
                {typeof data.myLessonsCount === 'number' && data.myLessonsCount > 0 && (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                    {t('upcomingLessonsCount').replace('{count}', String(data.myLessonsCount))}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('hourlyRateLabel')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(data.hourlyRate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('availableDays')}</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {data.availability.length > 0
                    ? Array.from(new Set(data.availability.map((a) => a.day)))
                        .sort()
                        .map((d) => dayName(d, lang))
                        .join(', ')
                    : t('notSet')}
                </span>
              </div>
            </div>

            {!user ? (
              <AuthPrompt next={path} title={t('loginToBook')} />
            ) : isStudent ? (
              <div className="mt-5 space-y-2">
                <Button className="w-full" onClick={openBook}>
                  <CalendarPlus className="h-4 w-4" /> {t('bookLesson')}
                </Button>
                {data.isEnrolled && (
                  <Link href="/student/lessons" className="block">
                    <Button variant="outline" className="w-full">{t('viewMyLessons')}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400 dark:bg-slate-800/60">
                {t('studentsOnlyBooking')}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={handleMessage}>
                <MessageSquare className="h-4 w-4" /> {t('messageTeacher')}
              </Button>
              <Button variant="ghost" size="sm" className="flex-1" onClick={handleFavorite}>
                <Heart className={`h-4 w-4 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
                {favorited ? t('removeFromFavorites') : t('addToFavorites')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Booking modal */}
      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title={t('bookingModalTitle').replace('{name}', data.fullName)}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setBookOpen(false)} disabled={booking}>{t('cancel')}</Button>
            <Button onClick={confirmBooking} loading={booking} disabled={!selectedSlot}>
              {t('confirmBooking')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <InlineError message={bookError} />

          <Select
            label={t('subject')}
            options={(data.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            placeholder={t('generalSubject')}
          />

          <Input
            label={t('date')}
            type="date"
            min={todayStr}
            max={maxDate}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedSlot(null);
              loadSlots(e.target.value);
            }}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('availableTimes')}</p>
            {slotsLoading ? (
              <PencilLoader label={t('loadingTimes')} />
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-400">{t('noAvailabilityDate')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((s) => {
                  const disabled = s.booked;
                  const active = selectedSlot?.startTime === s.startTime && selectedSlot?.endTime === s.endTime;
                  return (
                    <button
                      key={`${s.startTime}-${s.endTime}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedSlot(s)}
                      className={`rounded-lg border px-3 py-2 text-start text-sm transition ${
                        disabled
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600'
                          : active
                            ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200'
                            : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <p className="font-medium">{formatTime(s.startTime)}</p>
                      <p className="text-xs text-slate-400">
                        {durationLabel(s.startTime, s.endTime)}
                        {s.booked ? `  ${t('booked')}` : ''}
                        {(s as any).centerId ? ` · Center` : ''}
                        {s.location?.name ? ` · ${s.location.name}` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
              <p className="mb-2 font-medium text-slate-900 dark:text-white">{t('bookingSummary')}</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                <li><span className="text-slate-400">{t('teacherLabel')}:</span> {data.fullName}</li>
                <li><span className="text-slate-400">{t('subject')}:</span> {selectedSubject?.name ?? t('generalSubject')}</li>
                <li><span className="text-slate-400">{t('date')}:</span> {formatDate(selectedSlot.date)} ({dayName(selectedSlot.day, lang)})</li>
                <li><span className="text-slate-400">{t('time')}:</span> {formatTime(selectedSlot.startTime)}  {formatTime(selectedSlot.endTime)}</li>
                <li><span className="text-slate-400">{t('duration')}:</span> {durationLabel(selectedSlot.startTime, selectedSlot.endTime)}</li>
                <li><span className="text-slate-400">{t('location')}:</span> {selectedSlot.location?.name ?? t('online')}</li>
                {(selectedSlot as any).centerId && <li><span className="text-slate-400">Center:</span> {(selectedSlot as any).centerId.slice(0,8)}…</li>}
                <li><span className="text-slate-400">{t('price')}:</span> {formatCurrency(data.hourlyRate)} {t('perHour')}</li>
              </ul>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        title={t('rateTeacher')}
        footer={
          <>
            <Button variant="outline" onClick={() => setRateOpen(false)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={submitRating} loading={saving}>{t('submitRating')}</Button>
          </>
        }
      >
        <form onSubmit={submitRating} className="space-y-4">
          <InlineError message={formError} />
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('yourRating')}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i)}
                  className="rounded p-1 transition hover:scale-110"
                  aria-label={`${i} ${t('stars')}`}
                >
                  <Star className={`h-7 w-7 ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600 dark:text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label={t('commentOptional')}
            rows={3}
            placeholder={t('shareExperience')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
