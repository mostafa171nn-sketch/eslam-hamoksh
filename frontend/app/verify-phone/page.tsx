'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('otp_verification') : null;
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        if (!verificationId && obj.verificationId) setVerificationId(obj.verificationId);
        if (obj.maskedPhone) setMaskedPhone(obj.maskedPhone);
        if (obj.expiresAt) setExpiresAt(obj.expiresAt);
      } catch {}
    }
    if (vidFromUrl) {
      // try to get masked from session if not set
    }
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    // derive cooldown 45s after last send
    const end = new Date(expiresAt).getTime();
    const update = () => {
      const now = Date.now();
      const remaining = Math.ceil((end - now)/1000);
      // cooldown is fixed 45s, but we approximate via expires
      // For resend, we track separate cooldown
      if (remaining > 0 && remaining < 45) setCooldown(remaining);
      else if (cooldown > 0 && remaining <= 0) setCooldown(0);
    };
    update();
    const id = setInterval(() => {
      if (cooldown > 0) setCooldown(c=> Math.max(0,c-1));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, cooldown]);

  // separate cooldown timer for resend
  useEffect(() => {
    if (cooldown <=0) return;
    const t = setTimeout(()=> setCooldown(c=> c-1), 1000);
    return ()=> clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) { setError(t('requiredField')); return; }
    setLoading(true); setError('');
    try {
      await api.verifyOtp({ verificationId, code });
      // clear storage
      sessionStorage.removeItem('otp_verification');
      // show success and redirect to login
      router.push('/login?verified=1');
    } catch (e:any) {
      const msg = e?.message || t('somethingWentWrong');
      if (msg.includes('Invalid')) setError(t('invalidCode') || 'Invalid verification code. Please try again.');
      else if (msg.includes('expired')) setError(t('codeExpired') || 'This verification code has expired. Please request a new code.');
      else if (msg.includes('Too many')) setError(msg);
      else setError(msg);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResendLoading(true); setError('');
    try {
      const res = await api.resendOtp(verificationId);
      setExpiresAt(res.data.expiresAt);
      setCooldown(45);
      setCode('');
    } catch (e:any) {
      setError(e?.message || 'Failed to resend');
    } finally { setResendLoading(false); }
  };

  if (!verificationId) {
    return (
      <AuthLayout title={t('verifyPhoneTitle') || 'Verify Your Phone Number'} subtitle={t('verifyPhoneSubtitle') || 'Enter the code sent to your phone.'}>
        <InlineError message={t('sessionExpired') || 'Verification session expired. Please register again.'} />
        <Button onClick={()=> router.push('/register')} className="mt-4 w-full">{t('register')}</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('verifyPhoneTitle') || 'Verify Your Phone Number'} subtitle={maskedPhone ? (t('otpSentTo') || 'We sent a code to ') + maskedPhone : t('verifyPhoneSubtitle') || 'Enter the code sent to your phone.'}>
      <div className="space-y-6">
        {error && <InlineError message={error} />}
        <OtpInput value={code} onChange={setCode} disabled={loading} />
        <Button onClick={handleVerify} loading={loading} className="w-full" disabled={code.length !==6}>
          {t('verify') || 'Verify'}
        </Button>
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          {cooldown > 0 ? (
            <span>{t('resendIn') || 'Did not receive the code? Resend in'} {cooldown}s</span>
          ) : (
            <button onClick={handleResend} disabled={resendLoading} className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {resendLoading ? (t('loading') || 'Loading...') : (t('resendOtp') || 'Resend OTP')}
            </button>
          )}
        </div>
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