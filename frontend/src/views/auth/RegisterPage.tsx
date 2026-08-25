'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Button } from '../../components/ui/Button';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { InlineError } from '../../components/ui/ErrorAlert';
import { api, type PublicCenter } from '../../lib/api';
import type { Subject, Grade } from '../../lib/types';
import { errorMessage } from '../../hooks/useApi';
import { useT } from '../../i18n';
import { normalizePhone } from '../../lib/phone';

type RegisterRole = 'teacher' | 'student' | 'parent';

const ROLE_TO_API
  void ROLE_TO_API;: Record<RegisterRole, 'TEACHER' | 'STUDENT' | 'PARENT'> = {
  teacher: 'TEACHER',
  student: 'STUDENT',
  parent: 'PARENT',
};

const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const params = useParams<{ role: string }>();
  const role = params?.role;
  const validRole: RegisterRole | null =
    role === 'teacher' || role === 'student' || role === 'parent' ? role : null;
  const isCenter = role === 'center';
  const router = useRouter();

  const { t } = useT();

  const [centers, setCenters] = useState<PublicCenter[]>([]);
  const [centersLoading, setCentersLoading] = useState(false);
  const [centersError, setCentersError] = useState(false);
  // Deep link support: /register/student?center=<id> preselects the center
  // (used by the "Register" CTA on the public center detail page).
  const searchParams = useSearchParams();
  const preselectedCenterId = searchParams?.get('center') ?? '';
  const [centerId, setCenterId] = useState(preselectedCenterId);

  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [gradesList, setGradesList] = useState<Grade[]>([]);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [gradeId, setGradeId] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentNumber, setStudentNumber] = useState<string | null>(null);
  void setStudentNumber; void studentNumber;

  const loadCenters = useCallback(() => {
    // Same real Learning Centers dataset as the public centers page
    // (GET /centers/search) — never a static list.
    setCentersLoading(true);
    setCentersError(false);
    api
      .searchCenters({ limit: 100 })
      .then((res) => setCenters(res.data.items ?? []))
      .catch(() => {
        setCenters([]);
        setCentersError(true);
      })
      .finally(() => setCentersLoading(false));
  }, []);

  const loadCatalog = useCallback(() => {
    api
      .get<Subject[]>('/catalog/subjects')
      .then((res) => setSubjectsList(res.data ?? []))
      .catch(() => setSubjectsList([]));
    api
      .get<Grade[]>('/catalog/grades')
      .then((res) => setGradesList(res.data ?? []))
      .catch(() => setGradesList([]));
  }, []);

  useEffect(() => {
    if (validRole) loadCenters();
    if (validRole === 'teacher' || validRole === 'student') loadCatalog();
  }, [validRole, loadCenters, loadCatalog]);

  // Sync deep-linked center once search params are available after hydration.
  useEffect(() => {
    if (preselectedCenterId) {
      setCenterId((prev) => prev || preselectedCenterId);
    }
  }, [preselectedCenterId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (username.trim().length < 3) errs.username = t('usernameMinChars');
    else if (!USERNAME_RE.test(username.trim()))
      errs.username = t('usernameAllowedChars');
    if (fullName.trim().length < 2) errs.fullName = t('fullName') + ' ' + t('required');
    if (email.trim() && !EMAIL_RE.test(email.trim())) errs.email = t('validEmailOptional');
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      errs.password = t('passwordRule');
    if (password !== confirmPassword) errs.confirmPassword = t('passwordsNoMatch');
    if (phone.trim().length < 8) errs.phone = t('validPhone');
    if (validRole === 'teacher') {
      if (subjects.length === 0) errs.subjects = t('selectAtLeastOneSubject');
      if (grades.length === 0) errs.grades = t('selectAtLeastOneGrade');
      if (yearsExperience === '' || Number(yearsExperience) < 0) errs.yearsExperience = t('enterYearsExperience');
      if (hourlyRate === '' || Number(hourlyRate) < 0) errs.hourlyRate = t('enterHourlyRate');
    }
    if (validRole === 'student' && subjects.length === 0) errs.subjects = t('selectAtLeastOneSubject');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setServerError('');
    try {
      const base: Record<string, unknown> = {
        username: username.trim(),
        fullName: fullName.trim(),
        password,
        confirmPassword,
        phone: phone.trim() || undefined,
        centerId,
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      if (validRole === 'teacher') {
        Object.assign(base, {
          subjects,
          grades,
          yearsExperience: Number(yearsExperience),
          hourlyRate: Number(hourlyRate),
        });
      }
      if (validRole === 'student') {
        Object.assign(base, { subjects, ...(gradeId ? { gradeId } : {}) });
      }
      const purposeMap: Record<string, string> = { teacher: 'REGISTER_TEACHER', student: 'REGISTER_STUDENT', parent: 'REGISTER_PARENT' };
      const purpose = purposeMap[validRole as string] as any;
      // build normalized phone
      let normalizedPhone = phone.trim();
      try { normalizedPhone = normalizePhone(phone.trim()); } catch {}
      const payload = { ...base, phone: normalizedPhone };
      const otpRes = await api.requestOtp({ phone: normalizedPhone, purpose, payload });
      const { verificationId, maskedPhone, expiresAt } = otpRes.data as any;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('otp_verification', JSON.stringify({ verificationId, maskedPhone, expiresAt, phone: normalizedPhone }));
      }
      router.push('/verify-phone?vid=' + encodeURIComponent(verificationId));
    } catch (err) {
      setServerError(errorMessage(err, t('registrationFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (isCenter) {
    return (
      <AuthLayout title={t('registerCenter')} subtitle={t('registerCenterSubtitle')}>
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('centerOwnersNote')}
          </p>
          <Link
            href="/centers/register"
            className="block rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t('registerCenter')} ?
          </Link>
          <Link href="/register" className="block text-sm font-medium text-brand-600 hover:text-brand-700">
            ? {t('back')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (!validRole) {
    return (
      <AuthLayout title={t('chooseAccountType')} subtitle={t('chooseAccountTypeSubtitle')}>
        <div className="space-y-3">
          {(['teacher', 'student', 'parent'] as RegisterRole[]).map((r) => (
            <Link
              key={r}
              href={`/register/${r}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 text-start shadow-sm transition hover:border-brand-400 hover:shadow dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('registerAsRole').replace('{role}', t(r))}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {r === 'teacher' && t('roleDescTeacher')}
                {r === 'student' && t('roleDescStudent')}
                {r === 'parent' && t('roleDescParent')}
              </p>
            </Link>
          ))}
          <Link
            href="/centers/register"
            className="block rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm font-medium text-brand-600 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800"
          >
            {t('registerCenter')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (studentNumber) {
    return (
      <AuthLayout title={t('register')} subtitle={t('student')}>
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-700 dark:bg-emerald-900/30">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            {t('registrationSucceeded')}
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">{t('studentNumberLabel')}</p>
          <p className="text-2xl font-bold tracking-wide text-emerald-900 dark:text-emerald-100">{studentNumber}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">{t('keepStudentNumber')}</p>
        </div>
        <Link href="/login" className="mt-4 block text-center text-sm font-medium text-brand-600 hover:text-brand-700">
          {t('login')} ?
        </Link>
      </AuthLayout>
    );
  }

  const subjectOptions = subjectsList.map((s) => ({ value: s.id, label: s.name }));
  const gradeOptions = gradesList.map((g) => ({ value: g.id, label: g.name }));

  const centerOptions = centers.map((c) => ({ value: c.id, label: c.name }));

  return (
    <AuthLayout title={`${t('register')} – ${t(validRole)}`} subtitle={t('registerSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        {serverError && <InlineError message={serverError} />}

        {centersLoading ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            {t('centersLoading')}
          </p>
        ) : centersError ? (
          <div className="space-y-1">
            <p className="text-xs text-red-600 dark:text-red-400">{t('centersLoadFailed')}</p>
            <Button type="button" variant="outline" size="sm" onClick={loadCenters}>
              {t('retry')}
            </Button>
          </div>
        ) : (
          <SearchableSelect
            label={t('centerLabel')}
            options={centerOptions}
            value={centerId}
            onChange={setCenterId}
            placeholder={t('selectCenter')}
            emptyText={t('noCentersFound')}
            error={errors.centerId}
          />
        )}

        <Input
          label={t('username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          placeholder="john.doe"
          autoComplete="username"
        />
        <Input
          label={t('fullName')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
        <Input
          label={t('emailOptional')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Input
          label={t('password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />
        <Input
          label={t('confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <Input
          label={t('phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          placeholder="+20..."
        />

        {validRole === 'teacher' && (
          <>
            <MultiSelect label={t('subjects')} options={subjectOptions} selected={subjects} onChange={setSubjects} error={errors.subjects} />
            <MultiSelect label={t('grades')} options={gradeOptions} selected={grades} onChange={setGrades} error={errors.grades} />
            <Input
              label={t('yearsExperience')}
              type="number"
              min={0}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              error={errors.yearsExperience}
            />
            <Input
              label={t('hourlyRate')}
              type="number"
              min={0}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              error={errors.hourlyRate}
            />
          </>
        )}

        {validRole === 'student' && (
          <>
            <MultiSelect label={t('subjects')} options={subjectOptions} selected={subjects} onChange={setSubjects} error={errors.subjects} />
            <Select
              label={t('gradeOptional')}
              options={[{ value: '', label: t('selectAGrade') }, ...gradeOptions]}
              value={gradeId}
              onChange={(e) => setGradeId(e.target.value)}
            />
          </>
        )}

        <Button type="submit" loading={loading} className="w-full">
          {t('register')}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          {t('login')}
        </Link>
      </p>
    </AuthLayout>
  );
}
