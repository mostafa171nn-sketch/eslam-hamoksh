import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDocumentSchema,
  updateDocumentSchema,
  reportQuerySchema,
  createPaymentSchema,
  createSubscriptionSchema,
} from '../../src/validation';

describe('Validation Schemas', () => {
  describe('createDocumentSchema', () => {
    it('accepts valid document input', () => {
      const result = createDocumentSchema.safeParse({ title: 'My Certificate' });
      assert.ok(result.success);
    });

    it('requires title', () => {
      const result = createDocumentSchema.safeParse({});
      assert.ok(!result.success);
    });

    it('rejects empty title', () => {
      const result = createDocumentSchema.safeParse({ title: '' });
      assert.ok(!result.success);
    });

    it('accepts optional type', () => {
      const result = createDocumentSchema.safeParse({ title: 'ID', type: 'NATIONAL_ID' });
      assert.ok(result.success);
    });

    it('rejects invalid type', () => {
      const result = createDocumentSchema.safeParse({ title: 'ID', type: 'INVALID' });
      assert.ok(!result.success);
    });
  });

  describe('updateDocumentSchema', () => {
    it('accepts partial update', () => {
      const result = updateDocumentSchema.safeParse({ title: 'Updated Title' });
      assert.ok(result.success);
    });

    it('accepts empty body (all optional)', () => {
      const result = updateDocumentSchema.safeParse({});
      assert.ok(result.success);
    });
  });

  describe('reportQuerySchema', () => {
    it('accepts empty query', () => {
      const result = reportQuerySchema.safeParse({});
      assert.ok(result.success);
    });

    it('accepts valid date range', () => {
      const result = reportQuerySchema.safeParse({ from: '2026-01-01', to: '2026-12-31' });
      assert.ok(result.success);
    });

    it('rejects invalid date format', () => {
      const result = reportQuerySchema.safeParse({ from: '01-01-2026' });
      assert.ok(!result.success);
    });

    it('coerces page to number', () => {
      const result = reportQuerySchema.safeParse({ page: '2', limit: '50' });
      assert.ok(result.success);
      if (result.success) {
        assert.equal(result.data.page, 2);
        assert.equal(result.data.limit, 50);
      }
    });
  });
});
