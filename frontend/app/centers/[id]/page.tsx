'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  Users,
  GraduationCap,
  Mail,
  Phone,
  User as UserIcon,
  MessageSquare,
  Star,
} from 'lucide-react';
import { PublicNav } from '../../../src/components/layout/PublicNav';
import { PencilLoader } from '../../../src/components/ui/PencilLoader';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Modal } from '../../../src/components/ui/Modal';
import { Textarea } from '../../../src/components/ui/Textarea';
import { api, type PublicCenter, type PublicCenterTeacher } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import { useToast } from '../../../src/context/ToastContext';
import { useT } from '../../../src/i18n';
import { errorMessage } from '../../../src/hooks/useApi';
import { AuthPrompt } from '../../../src/components/AuthPrompt';
import { PageBackButton } from '@/src/components/layout/PageBackButton';

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
        />
      ))}
    </span>
  );
}

export default function CenterDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const { t, dir } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [center, setCenter] = useState<PublicCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Teachers are loaded separately so the count ALWAYS matches the list below.
  const [teachers, setTeachers] = useState<PublicCenterTeacher[] | null>(null);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState('');

  // Center rating state.
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [myStars, setMyStars] = useState<number | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateStars, setRateStars] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [savingRating, setSavingRating] = useState(false);

  const path = `/centers/${id}`;
  // Eligible raters mirror the backend rule (students / parents / teachers).
  const canRate =
    !!user && ['STUDENT', 'PARENT', 'TEACHER'].includes(user.role);

  const isStudent = user?.role === 'STUDENT';
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!isStudent || !id) return;
    api
      .checkFollow(id)
      .then((res) => setIsFollowing(res.data.isFollowing))
      .catch(() => setIsFollowing(false));
  }, [isStudent, id]);

  const toggleFollow = async () => {
    if (!isStudent) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowCenter(id);
        setIsFollowing(false);
        toast.success('Unfollowed center');
      } else {
        await api.followCenter(id);
        setIsFollowing(true);
        toast.success('Following center - you will be notified of new schedules');
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setFollowLoading(false);
    }
  };

  const requireAuth = (action: () => void) => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    action();
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setTeachersLoading(true);
    setTeachers(null);
    setError('');
    Promise.all([
      api.getPublicCenter(id),
      api.getCenterTeachers(id).catch((err) => ({ error: err })),
      api.getCenterRating(id),
    ])
      .then(([centerRes, teachersRes, ratingRes]) => {
        if (!active) return;
        setCenter(centerRes.data);
        setRatingAvg(ratingRes.data.average ?? 0);
        setRatingCount(ratingRes.data.count ?? 0);
        if ('error' in teachersRes) {
          setTeachersError(
            teachersRes.error instanceof Error ? teachersRes.error.message : 'Failed to load teachers.',
          );
          setTeachers([]);
        } else {
          setTeachers(teachersRes.data ?? []);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load center.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setTeachersLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    api
      .getMyCenterRating(id)
      .then((res) => {
        if (!active) return;
        if (res.data) {
          setMyStars(res.data.stars);
          setRateStars(res.data.stars);
          setRateComment(res.data.comment ?? '');
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, id]);

  const submitRating = async () => {
    if (rateStars < 1 || rateStars > 5) return;
    setSavingRating(true);
    try {
      await api.rateCenter(id, {
        stars: rateStars,
        comment: rateComment.trim() || undefined,
      });
      toast.success(t('centerRatedToast'));
      setMyStars(rateStars);
      setRateOpen(false);
      const res = await api.getCenterRating(id);
      setRatingAvg(res.data.average);
      setRatingCount(res.data.count);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <PublicNav />
        <div className="flex justify-center py-24">
          <PencilLoader label={t('loading')} />
        </div>
      </div>
    );
  }

  if (error || !center) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <PublicNav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-sm text-red-600 dark:text-red-300">{error || t('centerNotFound')}</p>
          <Link href="/centers" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            ← {t('centers')}
          </Link>
        </div>
      </div>
    );
  }

  const teacherList: PublicCenterTeacher[] = teachers ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageBackButton fallback="/centers" className="mb-4" />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card bodyClassName="p-6">
              <div className="flex items-start gap-4">
                {center.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={center.photoUrl} alt={center.name} className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    {center.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{center.name}</h1>
                  {center.nameEn && <p className="text-sm text-slate-500 dark:text-slate-400">{center.nameEn}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Stars value={ratingAvg} size="h-3.5 w-3.5" />
                      <span className="font-medium text-slate-700 dark:text-slate-200">{ratingAvg.toFixed(1)}</span>
                      <span>({ratingCount > 0 ? t('ratingsCount').replace('{count}', String(ratingCount)) : t('noRatingsYet')})</span>
                    </span>
                    {center.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {center.city}
                      </span>
                    )}
                    {center.centerEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" /> {center.centerEmail}
                      </span>
                    )}
                    {center.centerPhone && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="h-4 w-4" /> {center.centerPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {center.description && (
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{center.description}</p>
              )}
              {center.address && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t('address')}:</span> {center.address}
                </p>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">
                <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{t('subject')}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {center.subjects.map((s) => (
                    <Badge key={s.id} tone="blue">{s.name}</Badge>
                  ))}
                  {center.subjects.length === 0 && (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Rate this center */}
            <Card bodyClassName="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('centerRating')}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars value={ratingAvg} />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ratingAvg.toFixed(1)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {ratingCount > 0 ? `(${t('ratingsCount').replace('{count}', String(ratingCount))})` : `(${t('noRatingsYet')})`}
                    </span>
                  </div>
                </div>
                {!canRate ? (
                  user ? null : (
                    <Button size="sm" variant="outline" onClick={() => router.push(`/login?next=${encodeURIComponent(path)}`)}>
                      <Star className="h-4 w-4" /> {t('login')}
                    </Button>
                  )
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setRateOpen(true)}>
                    <Star className="h-4 w-4" /> {myStars != null ? t('yourCenterRating') : t('rateCenterCta')}
                  </Button>
                )}
              </div>
              {myStars != null && canRate && (
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('yourCenterRating')}: <Stars value={myStars} size="h-3.5 w-3.5" />
                </p>
              )}
              {!user && (
                <p className="mt-3">
                  <AuthPrompt next={path} compact title={t('loginRequiredDesc')} />
                </p>
              )}
            </Card>

            <div>
              <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
                {t('teachers')} ({teachersLoading ? '…' : teacherList.length})
              </h2>
              {teachersLoading ? (
                <div className="flex justify-center py-8">
                  <PencilLoader size="sm" label={t('loadingCenterTeachers')} />
                </div>
              ) : teachersError ? (
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {t('failedLoadCenterTeachers')}
                </p>
              ) : teacherList.length === 0 ? (
                <p className="text-sm text-slate-400">{t('noTeachersInCenter')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {teacherList.map((teacher) => (
                    <Link key={teacher.id} href={`/teachers/${teacher.id}`} className="group">
                      <Card bodyClassName="p-4 transition group-hover:border-brand-300 group-hover:shadow">
                        <div className="flex items-center gap-3">
                          {teacher.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={teacher.photo} alt={teacher.fullName} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                              <UserIcon className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                              {teacher.fullName}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {teacher.subjects.map((s) => s.name).join('، ')}
                            </p>
                          </div>
                          {(teacher.ratingCount ?? 0) > 0 && (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {(teacher.rating ?? 0).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card bodyClassName="p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('stats')}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                  <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="h-4 w-4" /> {t('studentsCount')}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{center.studentCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                  <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <GraduationCap className="h-4 w-4" /> {t('teachers')}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    {teachersLoading ? '…' : teacherList.length}
                  </p>
                </div>
              </div>
            </Card>

            {isStudent && (
              <Button
                variant={isFollowing ? 'outline' : 'primary'}
                className="w-full"
                loading={followLoading}
                onClick={toggleFollow}
              >
                {isFollowing ? 'Following' : 'Follow Center'}
              </Button>
            )}

            {!user ? (
              <AuthPrompt next={path} title={t('loginRequired')} />
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  requireAuth(() => toast.info(t('messageFromDashboard')))
                }
              >
                <MessageSquare className="h-4 w-4" /> {t('contactCenter')}
              </Button>
            )}

            <Link
              href="/register/student"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Register as Student (no center required)
              <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </main>

      {/* Center rating modal */}
      <Modal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        title={t('rateCenterCta')}
        footer={
          <>
            <Button variant="outline" onClick={() => setRateOpen(false)} disabled={savingRating}>
              {t('cancel')}
            </Button>
            <Button onClick={submitRating} loading={savingRating}>
              {t('submitRating')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('yourCenterRating')}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRateStars(i)}
                className="rounded p-1 transition hover:scale-110"
                aria-label={`${i} ${t('stars')}`}
              >
                <Star className={`h-7 w-7 ${i <= rateStars ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
              </button>
            ))}
          </div>
          <Textarea
            label={t('commentOptional')}
            rows={3}
            placeholder={t('shareExperience')}
            value={rateComment}
            onChange={(e) => setRateComment(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
