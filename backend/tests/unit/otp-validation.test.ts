import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from '../../src/validation/otp.validation';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('Registration OTP validation', () => {
  describe('requestOtpSchema', () => {
    const validPayload = {
      username: 'john.doe',
      fullName: 'John Doe',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass123',
      phone: '+201011111111',
      gradeId: UUID,
      subjects: ['s1'],
    };

    it('accepts a valid registration request', () => {
      const r = requestOtpSchema.safeParse({
        phone: '+201011111111',
        purpose: 'REGISTER_STUDENT',
        payload: validPayload,
      });
      assert.ok(r.success);
    });

    it('accepts all four registration purposes', () => {
      for (const purpose of ['REGISTER_STUDENT', 'REGISTER_PARENT', 'REGISTER_TEACHER', 'REGISTER_CENTER']) {
        const r = requestOtpSchema.safeParse({ phone: '+201011111111', purpose, payload: validPayload });
        assert.ok(r.success, `purpose ${purpose} should pass`);
      }
    });

    it('accepts a locally formatted phone', () => {
      const r = requestOtpSchema.safeParse({
        phone: '0111 111 1111',
        purpose: 'REGISTER_STUDENT',
        payload: validPayload,
      });
      assert.ok(r.success);
    });

    it('rejects a missing phone', () => {
      const r = requestOtpSchema.safeParse({ purpose: 'REGISTER_STUDENT', payload: validPayload });
      assert.ok(!r.success);
    });

    it('rejects a phone that is too short', () => {
      const r = requestOtpSchema.safeParse({ phone: '123', purpose: 'REGISTER_STUDENT', payload: validPayload });
      assert.ok(!r.success);
    });

    it('rejects an unknown purpose', () => {
      const r = requestOtpSchema.safeParse({ phone: '+201011111111', purpose: 'REGISTER_ADMIN', payload: validPayload });
      assert.ok(!r.success);
    });

    it('rejects a missing payload', () => {
      const r = requestOtpSchema.safeParse({ phone: '+201011111111', purpose: 'REGISTER_STUDENT' });
      assert.ok(!r.success);
    });

    it('rejects a non-object payload', () => {
      const r = requestOtpSchema.safeParse({ phone: '+201011111111', purpose: 'REGISTER_STUDENT', payload: 'nope' });
      assert.ok(!r.success);
    });
  });

  describe('verifyOtpSchema', () => {
    it('accepts a valid uuid + 6-digit code', () => {
      const r = verifyOtpSchema.safeParse({ verificationId: UUID, code: '123456' });
      assert.ok(r.success);
    });

    it('rejects a non-uuid verificationId', () => {
      const r = verifyOtpSchema.safeParse({ verificationId: 'abc', code: '123456' });
      assert.ok(!r.success);
    });

    it('rejects a missing verificationId', () => {
      const r = verifyOtpSchema.safeParse({ code: '123456' });
      assert.ok(!r.success);
    });

    it('rejects a non-digit code', () => {
      const r = verifyOtpSchema.safeParse({ verificationId: UUID, code: '12345a' });
      assert.ok(!r.success);
    });

    it('rejects a 5-digit code', () => {
      const r = verifyOtpSchema.safeParse({ verificationId: UUID, code: '12345' });
      assert.ok(!r.success);
    });

    it('rejects a 7-digit code', () => {
      const r = verifyOtpSchema.safeParse({ verificationId: UUID, code: '1234567' });
      assert.ok(!r.success);
    });

    it('rejects a missing code', () => {
      const r = verifyOtpSchema.safeParse({ verificationId: UUID });
      assert.ok(!r.success);
    });
  });

  describe('resendOtpSchema', () => {
    it('accepts a valid verificationId', () => {
      const r = resendOtpSchema.safeParse({ verificationId: UUID });
      assert.ok(r.success);
    });

    it('rejects a missing verificationId', () => {
      const r = resendOtpSchema.safeParse({});
      assert.ok(!r.success);
    });

    it('rejects a non-uuid verificationId', () => {
      const r = resendOtpSchema.safeParse({ verificationId: 'nope' });
      assert.ok(!r.success);
    });
  });
});