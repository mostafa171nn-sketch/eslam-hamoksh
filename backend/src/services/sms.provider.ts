import { ApiError } from '../utils/ApiError';
export interface SmsProvider { send(toE164: string, body: string): Promise<{ messageId: string }>; }
class LogSmsProvider implements SmsProvider {
  async send(toE164: string, body: string) {
    const isDev = process.env.OTP_DEV_MODE === 'true';
    if (isDev) console.log('[OTP DEV] SMS to ' + toE164 + ': ' + body);
    else console.log('[SMS] would send to ' + toE164);
    return { messageId: 'log-' + Date.now() };
  }
}
class TwilioSmsProvider implements SmsProvider {
  async send(toE164: string, body: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw ApiError.internal('SMS provider not configured. Set TWILIO_* env vars or use OTP_DEV_MODE=true');
    try {
      // @ts-ignore
      const twilio = await import('twilio');
      const client = twilio.default(sid, token);
      const msg = await client.messages.create({ to: toE164, from, body });
      return { messageId: msg.sid };
    } catch (e:any) { throw ApiError.internal('Failed to send SMS via Twilio: ' + (e.message||'unknown')); }
  }
}
let cached: SmsProvider | null = null;
export function getSmsProvider(): SmsProvider {
  if (cached) return cached;
  const provider = (process.env.SMS_PROVIDER || 'log').toLowerCase();
  if (provider === 'twilio') cached = new TwilioSmsProvider();
  else cached = new LogSmsProvider();
  return cached;
}