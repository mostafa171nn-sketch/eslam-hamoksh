import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends an email. If no SMTP is configured (development), logs the message to
 * the console so flows remain testable without external credentials.
 */
export async function sendEmail(input: EmailInput): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (env.isDev) {
      // eslint-disable-next-line no-console
      console.log(`\n[DEV EMAIL] To: ${input.to}\nSubject: ${input.subject}\n${input.text}\n`);
    }
    return;
  }

  try {
    await t.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (err) {
    // Fail gracefully: email service issues must not crash the request.
    // eslint-disable-next-line no-console
    console.error('Email send failed:', err);
  }
}
