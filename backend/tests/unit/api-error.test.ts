import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../src/utils/ApiError';

describe('ApiError', () => {
  it('should create an error with status code, message, and code', () => {
    const err = new ApiError(400, 'Bad request', 'BAD_REQUEST');
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, 'Bad request');
    assert.equal(err.code, 'BAD_REQUEST');
    assert.equal(err.name, 'ApiError');
    assert.ok(err instanceof Error);
  });

  it('should support details', () => {
    const err = new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', { field: 'name' });
    assert.deepEqual(err.details, { field: 'name' });
  });

  describe('.badRequest', () => {
    it('returns 400', () => {
      const err = ApiError.badRequest('Invalid input');
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'BAD_REQUEST');
    });
  });

  describe('.unauthorized', () => {
    it('returns 401 with default message', () => {
      const err = ApiError.unauthorized();
      assert.equal(err.statusCode, 401);
      assert.equal(err.code, 'UNAUTHORIZED');
      assert.ok(err.message.length > 0);
    });
  });

  describe('.forbidden', () => {
    it('returns 403 with default message', () => {
      const err = ApiError.forbidden();
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'FORBIDDEN');
    });
  });

  describe('.paymentRequired', () => {
    it('returns 402', () => {
      const err = ApiError.paymentRequired();
      assert.equal(err.statusCode, 402);
      assert.equal(err.code, 'PAYMENT_REQUIRED');
    });
  });

  describe('.notFound', () => {
    it('returns 404', () => {
      const err = ApiError.notFound('User not found');
      assert.equal(err.statusCode, 404);
      assert.equal(err.message, 'User not found');
    });
  });

  describe('.conflict', () => {
    it('returns 409', () => {
      const err = ApiError.conflict('Duplicate entry');
      assert.equal(err.statusCode, 409);
    });
  });

  describe('.validation', () => {
    it('returns 422', () => {
      const err = ApiError.validation('Invalid data');
      assert.equal(err.statusCode, 422);
      assert.equal(err.code, 'VALIDATION_ERROR');
    });
  });

  describe('.tooManyRequests', () => {
    it('returns 429', () => {
      const err = ApiError.tooManyRequests();
      assert.equal(err.statusCode, 429);
      assert.equal(err.code, 'RATE_LIMITED');
    });
  });

  describe('.internal', () => {
    it('returns 500', () => {
      const err = ApiError.internal();
      assert.equal(err.statusCode, 500);
      assert.equal(err.code, 'INTERNAL_ERROR');
    });
  });
});
