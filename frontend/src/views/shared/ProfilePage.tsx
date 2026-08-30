import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { Avatar } from '../../components/ui/Avatar';
import { InlineError } from '../../components/ui/ErrorAlert';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Grade, Location, Subject } from '../../lib/types';
import { dayName, formatDate } from '../../lib/format';

interface AvailRow {
  day: string;
  startTime: string;
  endTime: string;
  locationId: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const { t, lang } = useT();

  const DAY_OPTIONS_LOCALIZED = [
    { value: '0', label: t('sunday') },
    { value: '1', label: t('monday') },
    { value: '2', label: t('tuesday') },
    { value: '3', label: t('wednesday') },
    { value: '4', label: t('thursday') },
    { value: '5', label: t('friday') },
    { value: '6', label: t('saturday') },
  ];

  const roleLabel =
    user?.role === 'SUPER_ADMIN'
      ? t('superAdminRole')
      : user?.role === 'CENTER_ADMIN' || user?.role === 'ADMIN'
        ? t('roleCenterAdminLabel')
        : user?.role === 'TEACHER'
          ? t('teacherRole')
          : user?.role === 'STUDENT'
            ? t('studentRole')
            : t('parentRole');

  const [saving, setSaving] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [bio, setBio] = useState(user?.role === 'TEACHER' ? (user.teacher.bio ?? '') : '');
  const [yearsExperience, setYearsExperience] = useState(user?.role === 'TEACHER' ? String(user.teacher.yearsExperience) : '0');
  const [hourlyRate, setHourlyRate] = useState(user?.role === 'TEACHER' ? String(user.teacher.hourlyRate) : '0');
  const [locationId, setLocationId] = useState(user?.role === 'TEACHER' ? (user.teacher.location?.id ?? '') : '');
  const [gradeId, setGradeId] = useState(user?.role === 'STUDENT' ? (user.student.grade?.id ?? '') : '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    user?.role === 'TEACHER' ? user.teacher.subjects.map((s) => s.id) : user?.role === 'STUDENT' ? user.student.subjects.map((s) => s.id) : [],
  );
  const [selectedGrades, setSelectedGrades] = useState<string[]>(user?.role === 'TEACHER' ? user.teacher.grades.map((g) => g.id) : []);
  const [availability, setAvailability] = useState<AvailRow[]>(
    user?.role === 'TEACHER'
      ? user.teacher.availability.map((a) => ({
          day: String(a.day),
          startTime: a.startTime,
          endTime: a.endTime,
          locationId: a.location?.id ?? '',
        }))
      : [],
  );
  const [linkStudentId, setLinkStudentId] = useState('');
  const [copied, setCopied] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkedOk, setLinkedOk] = useState(false);
  const [linkError, setLinkError] = useState('');

  // A child is a duplicate if its student number is already linked.
  const alreadyLinkedChild = (() => {
    if (user?.role !== 'PARENT') return false;
    const id = linkStudentId.trim();
    if (!id) return false;
    return user.parent.children.some((c) => c.studentNumber === id);
  })();

  const copyStudentId = async () => {
    const id = user?.role === 'STUDENT' ? user.student.studentNumber : null;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const { data: catalog } = useApi(
    () =>
      Promise.all([
        api.get<Subject[]>('/catalog/subjects'),
        api.get<Grade[]>('/catalog/grades'),
        api.get<Location[]>('/catalog/locations'),
      ]).then(([s, g, l]) =>
        Promise.resolve({ success: true as const, message: '', data: { subjects: s.data ?? [], grades: g.data ?? [], locations: l.data ?? [] } }),
      ),
    [],
  );

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone ?? '');
    if (user.role === 'TEACHER') {
      setBio(user.teacher.bio ?? '');
      setYearsExperience(String(user.teacher.yearsExperience));
      setHourlyRate(String(user.teacher.hourlyRate));
      setLocationId(user.teacher.location?.id ?? '');
      setSelectedSubjects(user.teacher.subjects.map((s) => s.id));
      setSelectedGrades(user.teacher.grades.map((g) => g.id));
      setAvailability(
        user.teacher.availability.map((a) => ({
          day: String(a.day),
          startTime: a.startTime,
          endTime: a.endTime,
          locationId: a.location?.id ?? '',
        })),
      );
    }
    if (user.role === 'STUDENT') {
      setGradeId(user.student.grade?.id ?? '');
      setSelectedSubjects(user.student.subjects.map((s) => s.id));
    }
  }, [user]);

  if (!user) return <PencilLoader />;

  const canEdit = user.role !== 'ADMIN' && user.role !== 'CENTER_ADMIN' && user.role !== 'SUPER_ADMIN';

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (user.role === 'TEACHER') {
        await api.put('/teachers/me/profile', {
          fullName: fullName.trim(),
          phone: phone.trim(),
          bio: bio.trim() || undefined,
          yearsExperience: Number(yearsExperience),
          hourlyRate: Number(hourlyRate),
          locationId: locationId || null,
          subjects: selectedSubjects,
          grades: selectedGrades,
        });
      } else if (user.role === 'STUDENT') {
        await api.put('/students/me/profile', {
          fullName: fullName.trim(),
          phone: phone.trim(),
          gradeId: gradeId || undefined,
          subjects: selectedSubjects,
        });
      } else if (user.role === 'PARENT') {
        await api.put('/parents/profile', { fullName: fullName.trim(), phone: phone.trim() });
      }
      await refreshUser();
      toast.success(t('profileUpdatedToast'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    setSavingPhoto(true);
    setError('');
    try {
      if (user.role === 'TEACHER') await api.putForm('/teachers/me/photo', form);
      else if (user.role === 'STUDENT') await api.putForm('/students/me/photo', form);
      else if (user.role === 'PARENT') await api.putForm('/parents/photo', form);
      await refreshUser();
      toast.success(t('photoUpdatedToast'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingPhoto(false);
    }
  };

  const saveAvailability = async () => {
    setSavingAvail(true);
    setError('');
    try {
      await api.put('/teachers/me/availability', {
        availability: availability.map((a) => ({
          day: Number(a.day),
          startTime: a.startTime,
          endTime: a.endTime,
          ...(a.locationId ? { locationId: a.locationId } : {}),
        })),
      });
      await refreshUser();
      toast.success(t('availabilityUpdatedToast'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingAvail(false);
    }
  };

  const linkChild = async () => {
    const id = linkStudentId.trim();
    if (!id || linking || linkedOk) return;
    setError('');
    setLinkError('');
    if (alreadyLinkedChild) {
      setLinkError(t('alreadyLinkedMsg'));
      return;
    }
    setLinking(true);
    try {
      await api.post(`/parents/children/${id}`);
      await refreshUser();
      setLinkStudentId('');
      // Success state: the button switches to "Linked ?" for a moment.
      setLinkedOk(true);
      toast.success(t('studentLinkedToast'));
      window.setTimeout(() => setLinkedOk(false), 2500);
    } catch (err) {
      setLinkError(errorMessage(err));
    } finally {
      setLinking(false);
    }
  };

  const unlinkChild = async (studentId: string) => {
    setError('');
    try {
      await api.delete(`/parents/children/${studentId}`);
      await refreshUser();
      toast.success(t('studentUnlinkedToast'));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const locations: Location[] = catalog?.locations ?? [];
  const subjects: Subject[] = catalog?.subjects ?? [];
  const grades: Grade[] = catalog?.grades ?? [];

  return (
    <div>
      <PageHeader title={t('profileTitle')} subtitle={t('profileSub')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card bodyClassName="flex flex-col items-center p-6">
            <div className="relative">
              <Avatar name={user.fullName} src={user.photo} size="xl" />
              {canEdit && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={savingPhoto}
                    className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700/40 dark:bg-slate-800 disabled:opacity-50"
                    aria-label={t('changePhoto')}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPhoto(f);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{user.fullName}</h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
            <p className="mt-1 text-xs text-slate-400">{roleLabel}</p>
          </Card>

          {user.role === 'STUDENT' && user.student.studentNumber && (
            <Card title={t('myStudentIdCard')} bodyClassName="p-5">
              <p className="text-2xl font-bold tracking-widest text-slate-900 dark:text-white" dir="ltr">{user.student.studentNumber}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('giveIdParent')}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={copyStudentId}>
                {copied ? t('copied') : t('copy')}
              </Button>
            </Card>
          )}

          <Card title={t('accountCard')} bodyClassName="p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('accountUsername')}</span><span className="font-medium text-slate-900 dark:text-white">{user.username}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('accountStatus')}</span><span className="font-medium text-slate-900 dark:text-white">{user.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('memberSince')}</span><span className="font-medium text-slate-900 dark:text-white">{formatDate(user.createdAt)}</span></div>
            {user.email && <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('accountEmail')}</span><span className="font-medium text-slate-900 dark:text-white" dir="ltr">{user.email}</span></div>}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {!canEdit ? (
            <Card title={t('adminAccountCard')}>
              <p className="text-sm text-slate-500">
                {t('adminAccountsNote')}
              </p>
            </Card>
          ) : (
            <>
              <Card title={t('profileInformation')}>
                <form onSubmit={saveProfile} className="space-y-4">
                  <InlineError message={error} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label={t('fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    <Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>

                  {user.role === 'TEACHER' && (
                    <>
                      <Textarea label={t('bio')} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input label={t('yearsExperience')} type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
                        <Input label={t('hourlyRate')} type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                      </div>
                      <Select
                        label={t('branch')}
                        options={locations.map((l) => ({ value: l.id, label: l.name }))}
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        placeholder={t('noBranch')}
                      />
                      <MultiSelect
                        label={t('subjects')}
                        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                        selected={selectedSubjects}
                        onChange={setSelectedSubjects}
                      />
                      <MultiSelect
                        label={t('grades')}
                        options={grades.map((g) => ({ value: g.id, label: g.name }))}
                        selected={selectedGrades}
                        onChange={setSelectedGrades}
                      />
                    </>
                  )}

                  {user.role === 'STUDENT' && (
                    <>
                      <Select
                        label={t('grade')}
                        options={grades.map((g) => ({ value: g.id, label: g.name }))}
                        value={gradeId}
                        onChange={(e) => setGradeId(e.target.value)}
                        placeholder={t('noGrade')}
                      />
                      <MultiSelect
                        label={t('subjects')}
                        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                        selected={selectedSubjects}
                        onChange={setSelectedSubjects}
                      />
                    </>
                  )}

                  {user.role === 'PARENT' && (
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('linkedChildren')}</p>
                      {user.parent.children.length === 0 && (
                        <p className="mt-2 text-sm text-slate-400">{t('noChildrenLinkedProfile')}</p>
                      )}
                      <ul className="mt-2 space-y-2">
                        {user.parent.children.map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.fullName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{c.grade ?? t('noGrade')}</p>
                              {c.studentNumber && <p className="text-xs font-mono text-slate-400" dir="ltr">{c.studentNumber}</p>}
                            </div>
                            <button
                              type="button"
                              onClick={() => unlinkChild(c.id)}
                              className="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                            >
                              {t('unlink')}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {alreadyLinkedChild && !linkError && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t('alreadyLinkedMsg')}</p>
                      )}
                      {linkError && <InlineError message={linkError} />}
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder={t('studentIdToLink')}
                          value={linkStudentId}
                          onChange={(e) => {
                            setLinkStudentId(e.target.value);
                            setLinkedOk(false);
                          }}
                        />
                        <Button
                          type="button"
                          variant={linkedOk ? 'outline' : 'secondary'}
                          onClick={linkChild}
                          loading={linking}
                          disabled={linkedOk || alreadyLinkedChild}
                          className={linkedOk ? 'border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300' : ''}
                        >
                          {linkedOk ? t('linkedSuccess') : linking ? t('linking') : alreadyLinkedChild ? t('alreadyLinked') : t('linkChild')}
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button type="submit" loading={saving}>
                    <Save className="h-4 w-4" /> {t('saveChangesBtn')}
                  </Button>
                </form>
              </Card>

              {user.role === 'TEACHER' && (
                <Card
                  title={t('availabilityCard')}
                  subtitle={t('availabilityCardSub')}
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setAvailability((p) => [...p, { day: '0', startTime: '09:00', endTime: '17:00', locationId: locationId }])}>
                      {t('addSlotBtn')}
                    </Button>
                  }
                >
                  {availability.length === 0 && (
                    <p className="text-sm text-slate-400">{t('noSlotsYetAddOne')}</p>
                  )}
                  <div className="space-y-2">
                    {availability.map((row, i) => (
                      <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        <Select
                          options={DAY_OPTIONS_LOCALIZED}
                          value={row.day}
                          onChange={(e) => setAvailability((p) => p.map((r, j) => (j === i ? { ...r, day: e.target.value } : r)))}
                        />
                        <Input type="time" value={row.startTime} onChange={(e) => setAvailability((p) => p.map((r, j) => (j === i ? { ...r, startTime: e.target.value } : r)))} />
                        <Input type="time" value={row.endTime} onChange={(e) => setAvailability((p) => p.map((r, j) => (j === i ? { ...r, endTime: e.target.value } : r)))} />
                        <Select
                          options={locations.map((l) => ({ value: l.id, label: l.name }))}
                          value={row.locationId}
                          onChange={(e) => setAvailability((p) => p.map((r, j) => (j === i ? { ...r, locationId: e.target.value } : r)))}
                          placeholder={t('anyBranch')}
                        />
                        <button
                          type="button"
                          onClick={() => setAvailability((p) => p.filter((_, j) => j !== i))}
                          className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          {t('removeSlot')}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    {t('showingSummary')} {availability.map((a) => `${dayName(Number(a.day), lang)} ${a.startTime}-${a.endTime}`).join(', ') || t('noneLabel')}
                  </p>
                  {availability.length > 0 && (
                    <Button className="mt-3" variant="outline" onClick={saveAvailability} loading={savingAvail}>
                      {t('saveAvailability')}
                    </Button>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
