'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/ErrorAlert';
import { OtpInput } from '../../components/auth/OtpInput';
import { api } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { useT } from '../../i18n';
import { ShieldCheck } from 'lucide-react';

const DEFAULT_RESEND_COOLDOWN = 45;

export default function ForgotPasswordVerifyPage() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const verificationId = searchParams?.get('v') ?? '';
  const maskedFromUrl = searchParams?.get('m') ?? '';

  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState(maskedFromUrl);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(DEFAULT_RESEND_COOLDOWN);

  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    if (resendTimer.current) clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (resendTimer.current) clearInterval(resendTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startCooldown(DEFAULT_RESEND_COOLDOWN);
    return () => {
      if (resendTimer.current) clearInterval(resendTimer.current);
    };
  }, []);

  const verify = async (finalCode: string) => {
    if (!verificationId || finalCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyPasswordResetOtp({ verificationId, code: finalCode });
      router.push(`/change-password?token=${encodeURIComponent(res.data?.resetToken ?? '')}`);
    } catch (err) {
      setError(errorMessage(err, t('invalidCode')));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const onCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6) void verify(value);
  };

  const resend = async () => {
    if (!verificationId || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.resendPasswordResetOtp(verificationId);
      setMaskedPhone(res.data?.maskedPhone ?? maskedPhone);
      if (res.data?.resendCooldown) startCooldown(res.data.resendCooldown);
      if (res.data?.devOtp) setDevOtp(res.data.devOtp);
    } catch (err) {
      setError(errorMessage(err, t('otpFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (!verificationId) {
    return (
      <AuthLayout title={t('verifyCodeTitle')} subtitle={t('verifyCodeSubtitle')}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{t('changePasswordMissingToken')}</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            {t('requestNewCodeLink')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('verifyCodeTitle')} subtitle={t('verifyCodeSubtitle')}>
      <div className="space-y-4">
        {maskedPhone && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            <span>
              {t('codeSentTo')} <strong dir="ltr">{maskedPhone}</strong>
            </span>
          </div>
        )}

        <InlineError message={error} />

        <div className="py-2">
          <OtpInput
            length={6}
            value={code}
            onChange={onCodeChange}
            disabled={loading}
          />
        </div>

        {devOtp && process.env.NODE_ENV !== 'production' && (
          <p className="text-center text-xs text-slate-400">
            Dev code: <strong dir="ltr">{devOtp}</strong>
          </p>
        )}

        <div className="text-center text-sm text-slate-500">
          {cooldown > 0 ? (
            <span>
              {t('resendIn')} {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={loading}
              className="font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {t('resendOtp')}
            </button>
          )}
        </div>

        <Button type="button" loading={loading} className="w-full" size="lg" onClick={() => void verify(code)}>
          {t('verify')}
        </Button>

        <p className="text-center text-sm text-slate-500">
          {t('rememberedIt')}{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            {t('backToSignIn')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}