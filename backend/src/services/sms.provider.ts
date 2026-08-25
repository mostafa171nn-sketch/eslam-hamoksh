import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export interface SmsProvider {
  send(toE164: string, body: string): Promise<{ messageId: string }>;
}

class LogSmsProvider implements SmsProvider {
  async send(toE164: string, body: string) {
    if (env.OTP_DEV_MODE && !env.isProd) {
      console.log('[OTP DEV] SMS to ' + toE164 + ': ' + body);
    } else if (env.isProd) {
      console.warn('[SMS] Production with SMS_PROVIDER=log — OTP not actually delivered to ' + toE164);
      console.log('[SMS] would send to ' + toE164 + ': ' + body);
    } else {
      console.log('[SMS DEV] would send to ' + toE164 + ': ' + body);
    }
    return { messageId: 'log-' + Date.now() };
  }
}

class TwilioSmsProvider implements SmsProvider {
  async send(toE164: string, body: string) {
    const sid = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_FROM;
    if (!sid || !token || !from) {
      throw ApiError.internal(
        'SMS provider not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM or use SMS_PROVIDER=log with OTP_DEV_MODE=true for development.',
        'SMS_NOT_CONFIGURED',
      );
    }
    try {
      // @ts-ignore - twilio is optional peer dep; loaded only when provider=twilio
      const twilio = await import('twilio');
      const client = (twilio.default ?? (twilio as unknown as { default: unknown })).default
        ? (twilio as unknown as { default: (sid: string, token: string) => { messages: { create: (o: unknown) => Promise<{ sid: string }> } } }).default(sid, token)
        : (twilio as unknown as (sid: string, token: string) => { messages: { create: (o: unknown) => Promise<{ sid: string }> } })(sid, token);
      const msg = await client.messages.create({ to: toE164, from, body });
      return { messageId: msg.sid };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw ApiError.internal('Failed to send SMS via Twilio: ' + msg, 'SMS_SEND_FAILED');
    }
  }
}

let cached: SmsProvider | null = null;
export function getSmsProvider(): SmsProvider {
  if (cached) return cached;
  const provider = env.SMS_PROVIDER.toLowerCase() as 'log' | 'twilio';
  if (provider === 'twilio') cached = new TwilioSmsProvider();
  else cached = new LogSmsProvider();
  return cached;
}

/** For tests: reset cached provider after env changes. */
export function _resetSmsProviderCache() {
  cached = null;
}