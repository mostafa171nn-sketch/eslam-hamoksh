'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { InlineError } from '../../components/ui/ErrorAlert';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { api } from '../../lib/api';
import type { Subject, Grade } from '../../lib/types';
import { errorMessage } from '../../hooks/useApi';
import { useT } from '../../i18n';
import { normalizePhone } from '../../lib/phone';

type RegisterRole = 'teacher' | 'student' | 'parent';

const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const params = useParams<{ role: string }>();
  const role = params?.role;
  // Center registration has its own dedicated route (/centers/register); show a
  // redirect card when explicitly requested via /register/center.
  const isCenter = role === 'center';
  // When no role is provided (generic /register), default to the parent form so
  // the user lands directly on the normal registration flow instead of a
  // "Choose an account type" chooser. Specific routes stay as-is.
  const effectiveRole = role || 'parent';
  const validRole: RegisterRole | null =
    effectiveRole === 'teacher' || effectiveRole === 'student' || effectiveRole === 'parent'
      ? effectiveRole
      : null;
  const router = useRouter();

  const { t } = useT();

  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [gradesList, setGradesList] = useState<Grade[]>([]);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');

  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [gradeId, setGradeId] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [serverDetails, setServerDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (validRole === 'teacher' || validRole === 'student') loadCatalog();
  }, [validRole, loadCatalog]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validRole) return;
    const errs: Record<string, string> = {};
    if (username.trim().length < 3) errs.username = t('usernameMinChars');
    else if (!USERNAME_RE.test(username.trim())) errs.username = t('usernameAllowedChars');
    if (fullName.trim().length < 2) errs.fullName = t('fullName') + ' ' + t('required');
    if (email.trim() && !EMAIL_RE.test(email.trim())) errs.email = t('validEmailOptional');
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) errs.password = t('passwordRule');
    if (password !== confirmPassword) errs.confirmPassword = t('passwordsNoMatch');
    // phone: require at least 8 digits after normalization
    try {
      const normalizedForCheck = normalizePhone(phone.trim(), countryCode);
      if (!/^\+\d{8,15}$/.test(normalizedForCheck)) errs.phone = t('validPhone');
    } catch {
      errs.phone = t('validPhone');
    }
    if (validRole === 'teacher') {
      if (subjects.length === 0) errs.subjects = t('selectAtLeastOneSubject');
      if (grades.length === 0) errs.grades = t('selectAtLeastOneGrade');
      if (yearsExperience === '' || Number(yearsExperience) < 0) errs.yearsExperience = t('enterYearsExperience');
      if (hourlyRate === '' || Number(hourlyRate) < 0) errs.hourlyRate = t('enterHourlyRate');
    }
    if (validRole === 'student') {
      if (subjects.length === 0) errs.subjects = t('selectAtLeastOneSubject');
      if (!gradeId) errs.gradeId = t('gradeRequired');
    }
    setErrors(errs);
    setServerDetails([]);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setServerError('');
    setServerDetails([]);
    try {
      const normalizedPhone = normalizePhone(phone.trim(), countryCode);
      const base: Record<string, unknown> = {
        username: username.trim(),
        fullName: fullName.trim(),
        password,
        confirmPassword,
        phone: normalizedPhone,
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
        Object.assign(base, { subjects, gradeId });
      }
      const ROLE_TO_API: Record<string, 'TEACHER' | 'STUDENT' | 'PARENT'> = {
        teacher: 'TEACHER',
        student: 'STUDENT',
        parent: 'PARENT',
      };
      const roleForApi = ROLE_TO_API[validRole];
      const res = await api.register({ role: roleForApi, ...(base as any) });
      const data: any = res.data;
      if (validRole === 'student' && data?.studentNumber) {
        // Show student number before redirect – keep existing UI pattern
        router.push('/login?registered=1&studentNumber=' + encodeURIComponent(data.studentNumber));
      } else {
        router.push('/login?registered=1');
      }
    } catch (err: unknown) {
      const raw = errorMessage(err, t('registrationFailed'));
      if (raw.toLowerCase().includes('phone') && raw.toLowerCase().includes('already')) {
        setErrors((prev) => ({ ...prev, phone: 'This phone number is already registered.' }));
      }
      if (raw.toLowerCase().includes('username') && raw.toLowerCase().includes('taken')) {
        setErrors((prev) => ({ ...prev, username: 'This username is already taken.' }));
      }
      setServerError(raw);
      const details = (err as { details?: Array<{ path?: string; message?: string }> })?.details;
      if (Array.isArray(details)) {
        setServerDetails(details.map((d) => (d?.path ? `${d.path}: ${d.message}` : d?.message)).filter(Boolean) as string[]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isCenter) {
    return (
      <AuthLayout title={t('registerCenter')} subtitle={t('registerCenterSubtitle')}>
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('centerOwnersNote')}</p>
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

  // Unknown/blank role: fall back to the parent registration form so the
  // generic /register always shows a normal form and never a role chooser.
  const renderRole: RegisterRole = validRole ?? 'parent';

  const subjectOptions = subjectsList.map((s) => ({ value: s.id, label: s.name }));
  const gradeOptions = gradesList.map((g) => ({ value: g.id, label: g.name }));

  return (
    <AuthLayout title={`${t('register')} – ${t(renderRole)}`} subtitle={t('registerSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        {serverError && <InlineError message={serverError} />}
        {serverDetails.length > 0 && (
          <ul className="list-inside list-disc space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {serverDetails.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
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
        <PhoneInput
          label={t('phone')}
          value={phone}
          countryCode={countryCode}
          onValueChange={setPhone}
          onCountryChange={setCountryCode}
          error={errors.phone}
          placeholder="10 1234 5678"
        />

        {renderRole === 'teacher' && (
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

        {renderRole === 'student' && (
          <>
            <MultiSelect label={t('subjects')} options={subjectOptions} selected={subjects} onChange={setSubjects} error={errors.subjects} />
            <Select
              label={`${t('grade')} *`}
              options={[{ value: '', label: t('selectGrade') }, ...gradeOptions]}
              value={gradeId}
              onChange={(e) => setGradeId(e.target.value)}
              error={errors.gradeId}
              required
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
