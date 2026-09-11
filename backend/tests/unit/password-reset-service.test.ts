import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { hash } from '@node-rs/argon2';
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
  type PasswordResetDeps,
  type PhoneVerificationLike,
} from '../../src/services/password-reset.service';
import { maskPhone } from '../../src/utils/phone';

const PHONE = '+201111111111';
const USER = { id: 'user-1', phoneE164: PHONE, phoneVerified: false };
const NOW = Date.now();
const UUID = '11111111-1111-4111-8111-111111111111';

function makeRow(otpHash: string, overrides: Partial<PhoneVerificationLike> = {}): PhoneVerificationLike {
  return {
    id: UUID,
    phoneE164: PHONE,
    purpose: 'PASSWORD_RESET',
    otpHash,
    payloadEnc: null,
    expiresAt: new Date(NOW + 5 * 60 * 1000),
    verifiedAt: null,
    attempts: 0,
    maxAttempts: 5,
    resendCount: 0,
    createdAt: new Date(NOW - 60_000),
    updatedAt: new Date(NOW - 60_000),
    ...overrides,
  };
}

function createHarness(seedRows: PhoneVerificationLike[] = []) {
  const rows = new Map<string, PhoneVerificationLike>(seedRows.map((r) => [r.id, r]));
  const smsDeliveries: string[] = [];
  const userUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
  const createdTokens: Array<Record<string, unknown>> = [];
  let ids = 0;

  const verificationRepo: PasswordResetDeps['verificationRepo'] = {
    findByPhone: async (phoneE164, purpose) => {
      const matches = [...rows.values()]
        .filter((r) => r.phoneE164 === phoneE164 && r.purpose === purpose && !r.verifiedAt)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return matches[0] ?? null;
    },
    findById: async (id) => rows.get(id) ?? null,
    create: async (data: Record<string, unknown>) => {
      const row = makeRow(String(data.otpHash), {
        id: `ver-${++ids}`,
        phoneE164: String(data.phoneE164),
        payloadEnc: data.payloadEnc ? String(data.payloadEnc) : null,
        maxAttempts: Number(data.maxAttempts),
      });
      rows.set(row.id, row);
      return row;
    },
    update: async (id, data) => {
      const row = rows.get(id)!;
      const merged: PhoneVerificationLike = {
        ...row,
        otpHash: data.otpHash ? String(data.otpHash) : row.otpHash,
        payloadEnc: data.payloadEnc !== undefined ? String(data.payloadEnc) : row.payloadEnc,
        expiresAt: data.expiresAt ? new Date(data.expiresAt as Date) : row.expiresAt,
        verifiedAt: data.verifiedAt ? new Date(data.verifiedAt as Date) : row.verifiedAt,
        attempts:
          data.attempts && typeof data.attempts === 'object'
            ? row.attempts + (data.attempts as { increment: number }).increment
            : (data.attempts as number | undefined) ?? row.attempts,
        resendCount:
          data.resendCount && typeof data.resendCount === 'object'
            ? row.resendCount + (data.resendCount as { increment: number }).increment
            : (data.resendCount as number | undefined) ?? row.resendCount,
      };
      rows.set(id, merged);
      return merged;
    },
    delete: async (id) => {
      rows.delete(id);
      return undefined;
    },
  };

  const userRepo: PasswordResetDeps['userRepo'] = {
    findByPhoneE164: async (e164) => (e164 === PHONE ? USER : null),
    findById: async (id) => (id === USER.id ? USER : null),
    update: async (id, data) => {
      userUpdates.push({ id, data });
      return USER;
    },
    createPasswordResetToken: async (data) => {
      createdTokens.push(data);
      return data;
    },
  };

  const deps: Partial<PasswordResetDeps> = {
    userRepo,
    verificationRepo,
    smsProvider: {
      send: async (_to, body) => {
        smsDeliveries.push(body);
      },
    },
  };

  return { deps, rows, smsDeliveries, userUpdates, createdTokens };
}

describe('Password reset OTP: request', () => {
  it('unknown phone: returns generic fabricated response, no SMS, no DB rows, no devOtp', async () => {
    const h = createHarness();
    const res = await requestPasswordResetOtp('+201599999999', h.deps);
    assert.ok(res.verificationId);
    assert.equal(res.maskedPhone, maskPhone('+201599999999'));
    assert.ok(res.expiresAt > new Date(NOW));
    assert.equal(res.resendCooldown, 45);
    assert.equal(res.devOtp, undefined, 'fabricated responses must never leak a code');
    assert.equal(h.smsDeliveries.length, 0);
    assert.equal(h.rows.size, 0);
  });

  it('registered phone: creates PASSWORD_RESET session, sends one SMS, returns devOtp in dev mode', async () => {
    const h = createHarness();
    const res = await requestPasswordResetOtp(PHONE, h.deps);
    assert.ok(res.verificationId.startsWith('ver-'));
    assert.equal(res.maskedPhone, maskPhone(PHONE));
    assert.equal(h.smsDeliveries.length, 1);
    assert.match(h.smsDeliveries[0], /verification code is \d{6}/);
    const row = h.rows.get(res.verificationId);
    assert.ok(row);
    assert.equal(row.purpose, 'PASSWORD_RESET');
    assert.equal(row.maxAttempts, 5);
    assert.equal(row.attempts, 0);
    assert.ok(res.devOtp, 'dev mode exposes the code for QA');
    assert.equal(h.rows.size, 1);
  });

  it('inside cooldown: reuses the same session, sends no new SMS', async () => {
    const codeHash = await hash('112233');
    const seed = makeRow(codeHash, { updatedAt: new Date(NOW - 5_000) });
    const h = createHarness([seed]);
    const res = await requestPasswordResetOtp(PHONE, h.deps);
    assert.equal(res.verificationId, seed.id);
    assert.equal(h.smsDeliveries.length, 0, 'no SMS while inside the resend cooldown');
  });

  it('resend budget exhausted: reuses the session, sends no new SMS', async () => {
    const codeHash = await hash('112233');
    const seed = makeRow(codeHash, { updatedAt: new Date(NOW - 3600_000), resendCount: 5 });
    const h = createHarness([seed]);
    const res = await requestPasswordResetOtp(PHONE, h.deps);
    assert.equal(res.verificationId, seed.id);
    assert.equal(h.smsDeliveries.length, 0);
  });

  it('after cooldown: rotates the code on the existing session (one SMS, new devOtp)', async () => {
    const codeHash = await hash('112233');
    const seed = makeRow(codeHash, { updatedAt: new Date(NOW - 120_000), resendCount: 1 });
    const h = createHarness([seed]);
    const res = await requestPasswordResetOtp(PHONE, h.deps);
    assert.equal(res.verificationId, seed.id);
    assert.equal(h.smsDeliveries.length, 1);
    assert.equal(h.rows.get(seed.id)!.resendCount, 1 + 1);
    assert.ok(res.devOtp);
  });

  it('sms failure on fresh session rolls the verification row back', async () => {
    const h = createHarness();
    h.deps.smsProvider = {
      send: async () => {
        throw new Error('provider down');
      },
    };
    await assert.rejects(() => requestPasswordResetOtp(PHONE, h.deps), /provider down/);
    assert.equal(h.rows.size, 0, 'failed-send session must be rolled back');
  });
});

describe('Password reset OTP: verify', () => {
  it('unknown verificationId -> SESSION_EXPIRED', async () => {
    const h = createHarness();
    await assert.rejects(() => verifyPasswordResetOtp('99999999-9999-4999-8999-999999999999', '123456', h.deps), (e: any) => e.code === 'SESSION_EXPIRED');
  });

  it('already verified session -> ALREADY_VERIFIED', async () => {
    const codeHash = await hash('123456');
    const h = createHarness([makeRow(codeHash, { verifiedAt: new Date(NOW - 10_000) })]);
    await assert.rejects(() => verifyPasswordResetOtp(UUID, '123456', h.deps), (e: any) => e.code === 'ALREADY_VERIFIED');
  });

  it('expired code -> EXPIRED', async () => {
    const codeHash = await hash('123456');
    const h = createHarness([makeRow(codeHash, { expiresAt: new Date(NOW - 1000) })]);
    await assert.rejects(() => verifyPasswordResetOtp(UUID, '123456', h.deps), (e: any) => e.code === 'EXPIRED');
  });

  it('max attempts already reached -> 429', async () => {
    const codeHash = await hash('123456');
    const h = createHarness([makeRow(codeHash, { attempts: 5, maxAttempts: 5 })]);
    await assert.rejects(() => verifyPasswordResetOtp(UUID, '123456', h.deps), (e: any) => e.statusCode === 429);
  });

  it('wrong code increments attempts -> INVALID_CODE', async () => {
    const codeHash = await hash('123456');
    const h = createHarness([makeRow(codeHash)]);
    await assert.rejects(() => verifyPasswordResetOtp(UUID, '000000', h.deps), (e: any) => e.code === 'INVALID_CODE');
    assert.equal(h.rows.get(UUID)!.attempts, 1);
  });

  it('wrong code that hits the max attempts -> 429', async () => {
    const codeHash = await hash('123456');
    const h = createHarness([makeRow(codeHash, { attempts: 4, maxAttempts: 5 })]);
    await assert.rejects(() => verifyPasswordResetOtp(UUID, '000000', h.deps), (e: any) => e.statusCode === 429);
  });

  it('missing payload -> PAYLOAD_MISSING', async () => {
    const codeHash = await hash('123456');
    const h = createHarness([makeRow(codeHash, { payloadEnc: null })]);
    await assert.rejects(() => verifyPasswordResetOtp(UUID, '123456', h.deps), (e: any) => e.code === 'PAYLOAD_MISSING');
  });

  it('user vanished between request and verify -> SESSION_EXPIRED (race guard)', async () => {
    const h = createHarness();
    const req = await requestPasswordResetOtp(PHONE, h.deps);
    h.deps.userRepo = { ...h.deps.userRepo!, findById: async () => null };
    await assert.rejects(
      () => verifyPasswordResetOtp(req.verificationId, req.devOtp!, h.deps),
      (e: any) => e.code === 'SESSION_EXPIRED',
    );
  });

  it('user phone changed between request and verify -> SESSION_EXPIRED', async () => {
    const h = createHarness();
    const req = await requestPasswordResetOtp(PHONE, h.deps);
    h.deps.userRepo = {
      ...h.deps.userRepo!,
      findById: async () => ({ id: USER.id, phoneE164: '+209999999999', phoneVerified: true }),
    };
    await assert.rejects(
      () => verifyPasswordResetOtp(req.verificationId, req.devOtp!, h.deps),
      (e: any) => e.code === 'SESSION_EXPIRED',
    );
  });

  it('correct code: marks session verified, issues hashed single-use reset token, flags phoneVerified', async () => {
    const h = createHarness();
    const req = await requestPasswordResetOtp(PHONE, h.deps);
    const res = await verifyPasswordResetOtp(req.verificationId, req.devOtp!, h.deps);

    const row = h.rows.get(req.verificationId)!;
    assert.ok(row.verifiedAt, 'session must be marked verified');

    assert.match(res.resetToken, /^[0-9a-f]{64}$/);
    assert.ok(res.expiresAt > new Date(NOW));
    assert.equal(res.maskedPhone, maskPhone(PHONE));

    const tokenRecord = h.createdTokens[0] as { tokenHash: string; expiresAt: Date; user: { connect: { id: string } } };
    assert.equal(tokenRecord.tokenHash, createHash('sha256').update(res.resetToken).digest('hex'));
    assert.equal(tokenRecord.user.connect.id, USER.id);

    const phoneUpdate = h.userUpdates.find((u) => u.data.phoneVerified);
    assert.ok(phoneUpdate, 'unverified phone should be flagged verified on success');
  });
});

describe('Password reset OTP: resend', () => {
  it('resends after cooldown and invalidates the previous code', async () => {
    const codeHash = await hash('111222');
    const seed = makeRow(codeHash, { updatedAt: new Date(NOW - 120_000) });
    const h = createHarness([seed]);
    const res = await resendPasswordResetOtp(seed.id, h.deps);
    assert.notEqual(res.devOtp, '111222', 'the code must rotate');
    assert.equal(h.smsDeliveries.length, 1);
    // old code must no longer verify
    await assert.rejects(() => verifyPasswordResetOtp(seed.id, '111222', h.deps), (e: any) => e.code === 'INVALID_CODE');
  });

  it('resend within cooldown -> 429', async () => {
    const codeHash = await hash('111222');
    const seed = makeRow(codeHash, { updatedAt: new Date(NOW - 5000) });
    const h = createHarness([seed]);
    await assert.rejects(() => resendPasswordResetOtp(seed.id, h.deps), (e: any) => e.statusCode === 429);
  });

  it('resend on a verified session -> ALREADY_VERIFIED', async () => {
    const codeHash = await hash('111222');
    const seed = makeRow(codeHash, { verifiedAt: new Date(NOW - 10_000) });
    const h = createHarness([seed]);
    await assert.rejects(() => resendPasswordResetOtp(seed.id, h.deps), (e: any) => e.code === 'ALREADY_VERIFIED');
  });

  it('resend past the resend limit -> 429', async () => {
    const codeHash = await hash('111222');
    const seed = makeRow(codeHash, { updatedAt: new Date(NOW - 120_000), resendCount: 5 });
    const h = createHarness([seed]);
    await assert.rejects(() => resendPasswordResetOtp(seed.id, h.deps), (e: any) => e.statusCode === 429);
  });
});