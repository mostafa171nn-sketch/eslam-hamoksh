'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '../../src/layouts/AuthLayout';
import { OtpInput } from '../../src/components/auth/OtpInput';
import { Button } from '../../src/components/ui/Button';
import { InlineError } from '../../src/components/ui/ErrorAlert';
import { api } from '../../src/lib/api';
import { useT } from '../../src/i18n';
import { Suspense } from 'react';

function VerifyPhoneInner() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vidFromUrl = searchParams.get('vid') || '';

  const [verificationId, setVerificationId] = useState(vidFromUrl);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Load session + URL persistence (survives refresh, back nav)
  useEffect(() => {
    if (vidFromUrl && !verificationId) setVerificationId(vidFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vidFromUrl]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('otp_verification') : null;
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        if (!verificationId && obj.verificationId) setVerificationId(obj.verificationId);
        if (obj.maskedPhone) setMaskedPhone(obj.maskedPhone);
        if (obj.phone) setRawPhone(obj.phone);
        if (obj.expiresAt) setExpiresAt(obj.expiresAt);
        if (obj.resendCooldown && typeof obj.resendCooldown === 'number') {
          // initial cooldown from server
        }
      } catch {}
    }
    // If maskedPhone missing but vidFromUrl matches stored, we already have it
  }, [verificationId]);

  // Keep URL param and storage in sync when verificationId changes
  useEffect(() => {
    if (verificationId && vidFromUrl !== verificationId) {
      // shallow replace without full navigation
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('vid', verificationId);
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [verificationId, vidFromUrl]);

  // OTP expiry countdown (5 min)
  useEffect(() => {
    if (!expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff === 0) setCooldown(0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      setError(t('requiredField') || 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.verifyOtp({ verificationId, code });
      // Clear sensitive session
      if (typeof window !== 'undefined') sessionStorage.removeItem('otp_verification');
      const data = res.data as { studentNumber?: string };
      if (data?.studentNumber) {
        setSuccess(`${t('registrationSucceeded')} — ${t('studentNumberLabel')}: ${data.studentNumber}`);
      } else {
        setSuccess(t('registrationSucceeded') || 'Registration completed. You can now sign in.');
      }
      // Redirect after short delay to show success
      setTimeout(() => router.push('/login?verified=1'), 1500);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string; status?: number };
      const msg = err?.message || t('somethingWentWrong') || 'Something went wrong.';
      const low = msg.toLowerCase();
      if (low.includes('invalid verification code') || err?.code === 'INVALID_CODE') {
        setError(t('invalidCode') || 'Invalid verification code.');
      } else if (low.includes('verification code expired') || low.includes('expired') || err?.code === 'EXPIRED') {
        setError(t('codeExpired') || 'Verification code expired. Please request a new code.');
      } else if (low.includes('too many') || err?.status === 429) {
        setError(msg);
      } else if (low.includes('already been used') || low.includes('already verified')) {
        setError('This code has already been used. Please request a new code if needed.');
      } else if (low.includes('phone') && low.includes('already registered')) {
        setError('This phone number is already registered.');
      } else if (low.includes('session')) {
        setError(t('sessionExpired') || 'Verification session expired. Please register again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [code, verificationId, router, t]);

  const handleResend = useCallback(async () => {
    if (!verificationId) return;
    setResendLoading(true);
    setError('');
    try {
      const res = await api.resendOtp(verificationId);
      const data = res.data as { expiresAt: string; maskedPhone: string; resendCooldown?: number };
      setExpiresAt(data.expiresAt);
      setMaskedPhone(data.maskedPhone || maskedPhone);
      setCooldown(data.resendCooldown ?? 45);
      setCode('');
      // Persist refreshed expiry
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('otp_verification');
        if (stored) {
          try {
            const obj = JSON.parse(stored);
            obj.expiresAt = data.expiresAt;
            obj.maskedPhone = data.maskedPhone || obj.maskedPhone;
            sessionStorage.setItem('otp_verification', JSON.stringify(obj));
          } catch {}
        }
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
    }
  }, [verificationId, maskedPhone]);

  const handleEditPhone = () => {
    router.push('/register');
  };

  if (!verificationId) {
    return (
      <AuthLayout
        title={t('verifyPhoneTitle') || 'Verify Your Phone Number'}
        subtitle={t('verifyPhoneSubtitle') || 'Enter the code sent to your phone.'}
      >
        <InlineError message={t('sessionExpired') || 'Verification session expired. Please register again.'} />
        <Button onClick={() => router.push('/register')} className="mt-4 w-full">
          {t('register')}
        </Button>
      </AuthLayout>
    );
  }

  const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

  return (
    <AuthLayout
      title={t('verifyPhoneTitle') || 'Verify Your Phone Number'}
      subtitle={
        maskedPhone
          ? `${t('otpSentTo') || 'We sent a verification code to:'} ${maskedPhone}`
          : rawPhone
            ? `${t('otpSentTo') || 'We sent a verification code to:'} ${rawPhone}`
            : t('verifyPhoneSubtitle') || 'Enter the code sent to your phone.'
      }
    >
      <div className="space-y-5">
        {error && <InlineError message={error} />}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            {success}
          </div>
        )}

        {isExpired && !success && (
          <InlineError message={t('codeExpired') || 'Verification code expired. Please request a new code.'} />
        )}

        {remainingSeconds !== null && !isExpired && (
          <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            Code expires in {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
          </p>
        )}

        <div className="space-y-3">
          <OtpInput value={code} onChange={setCode} disabled={loading || !!success} />
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">Enter the 6-digit code sent via SMS</p>
        </div>

        <Button onClick={handleVerify} loading={loading} className="w-full" disabled={code.length !== 6 || !!success || isExpired}>
          {t('verify') || 'Verify'}
        </Button>

        <div className="space-y-2 text-center text-sm">
          {cooldown > 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              {t('resendIn') || "Didn't receive the code? Resend in"} {cooldown}s
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading || !!success}
              className="font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-400"
            >
              {resendLoading ? t('loading') || 'Sending...' : t('resendOtp') || 'Resend code'}
            </button>
          )}

          <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
            <button onClick={handleEditPhone} className="underline hover:text-slate-600 dark:hover:text-slate-300">
              Edit phone number
            </button>
            <span>·</span>
            <Link href="/register" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              Start over
            </Link>
          </div>
        </div>

        {/* Masked phone preview + raw for debug via storage only - never expose OTP */}
        {rawPhone && (
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            Code sent to {maskedPhone || rawPhone} ·{' '}
            <span className="hidden sm:inline">Check your SMS inbox. Standard rates may apply.</span>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={null}>
      <VerifyPhoneInner />
    </Suspense>
  );
}
