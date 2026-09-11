import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  forgotPasswordPhoneSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResendSchema,
} from '../../src/validation';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('Forgot-password phone OTP validation', () => {
  describe('forgotPasswordPhoneSchema', () => {
    it('accepts an E.164 phone', () => {
      const r = forgotPasswordPhoneSchema.safeParse({ phone: '+201111111111' });
      assert.ok(r.success);
    });

    it('accepts a local formatted number', () => {
      const r = forgotPasswordPhoneSchema.safeParse({ phone: '0111 111 1111' });
      assert.ok(r.success);
    });

    it('rejects a missing phone', () => {
      const r = forgotPasswordPhoneSchema.safeParse({});
      assert.ok(!r.success);
    });

    it('rejects an empty phone', () => {
      const r = forgotPasswordPhoneSchema.safeParse({ phone: '' });
      assert.ok(!r.success);
    });

    it('rejects a phone that is far too short', () => {
      const r = forgotPasswordPhoneSchema.safeParse({ phone: '123' });
      assert.ok(!r.success);
    });
  });

  describe('forgotPasswordVerifySchema', () => {
    it('accepts a valid uuid + 6-digit code', () => {
      const r = forgotPasswordVerifySchema.safeParse({ verificationId: UUID, code: '123456' });
      assert.ok(r.success);
    });

    it('rejects a non-uuid verificationId', () => {
      const r = forgotPasswordVerifySchema.safeParse({ verificationId: 'abc', code: '123456' });
      assert.ok(!r.success);
    });

    it('rejects a non-digit code', () => {
      const r = forgotPasswordVerifySchema.safeParse({ verificationId: UUID, code: '12345a' });
      assert.ok(!r.success);
    });

    it('rejects a 5-digit code', () => {
      const r = forgotPasswordVerifySchema.safeParse({ verificationId: UUID, code: '12345' });
      assert.ok(!r.success);
    });
  });

  describe('forgotPasswordResendSchema', () => {
    it('accepts a valid verificationId', () => {
      const r = forgotPasswordResendSchema.safeParse({ verificationId: UUID });
      assert.ok(r.success);
    });

    it('rejects a missing verificationId', () => {
      const r = forgotPasswordResendSchema.safeParse({});
      assert.ok(!r.success);
    });
  });
});