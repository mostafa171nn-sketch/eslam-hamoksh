/**
 * Standard application error. Carries an HTTP status and a safe, user-facing
 * message. Internal details are never exposed to clients.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'You must be logged in to access this resource.', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You are not authorized to perform this action.', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static paymentRequired(message = 'This feature is not available on your current plan.', code = 'PAYMENT_REQUIRED') {
    return new ApiError(402, message, code);
  }

  static notFound(message: string, code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code = 'CONFLICT', details?: unknown) {
    return new ApiError(409, message, code, details);
  }

  static validation(message: string, details?: unknown) {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static tooManyRequests(message = 'Too many requests. Please try again later.') {
    return new ApiError(429, message, 'RATE_LIMITED');
  }

  static internal(message = 'Something went wrong.') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}
