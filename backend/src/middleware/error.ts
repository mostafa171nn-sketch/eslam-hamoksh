import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
    data: null,
    error: { code: 'NOT_FOUND' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
      error: { code: err.code, details: err.details },
    });
  }

  if (err instanceof Error && 'isFileTypeError' in err) {
    return res.status(400).json({
      success: false,
      message: err.message,
      data: null,
      error: { code: 'INVALID_FILE_TYPE' },
    });
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      data: null,
      error: { code: 'VALIDATION_ERROR', details },
    });
  }

  // Body-parser (express.json / express.urlencoded) errors. These surface as
  // plain SyntaxError objects with a `type` of "entity.parse.failed" (malformed
  // JSON) or "entity.too.large" (body over the configured limit). They carry a
  // numeric `status` (400 / 413). If unhandled they would otherwise fall through
  // to the generic 500 below and mask a perfectly client-fixable problem as an
  // opaque "Something went wrong." - exactly what made production auth debugging
  // impossible.
  if (err && typeof err === 'object' && 'type' in err && typeof (err as { type: string }).type === 'string') {
    const bodyErr = err as { type: string; status?: number; message?: string };
    if (bodyErr.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        message: 'Malformed request body. Please check your input and try again.',
        data: null,
        error: { code: 'BAD_JSON' },
      });
    }
    if (bodyErr.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        message: `Request body is too large. Maximum allowed size is ${env.MAX_UPLOAD_SIZE_MB * 1024} KB.`,
        data: null,
        error: { code: 'BODY_TOO_LARGE' },
      });
    }
    if (bodyErr.type === 'entity.verify.failed' || bodyErr.type === 'request.aborted') {
      return res.status(400).json({
        success: false,
        message: 'Could not read the request body.',
        data: null,
        error: { code: 'BODY_UNREADABLE' },
      });
    }
    // Reuse body-parser's own status (e.g. 413) for any other entity.* error.
    if (typeof bodyErr.status === 'number' && bodyErr.status >= 400 && bodyErr.status < 500) {
      return res.status(bodyErr.status).json({
        success: false,
        message: 'Malformed request body. Please check your input and try again.',
        data: null,
        error: { code: 'BAD_JSON' },
      });
    }
  }

  // Pre-flight 413 from a known PayloadTooLargeError shape.
  if (err && typeof err === 'object' && (err as { status?: number }).status === 413) {
    return res.status(413).json({
      success: false,
      message: `Request body is too large. Maximum allowed size is ${env.MAX_UPLOAD_SIZE_MB * 1024} KB.`,
      data: null,
      error: { code: 'BODY_TOO_LARGE' },
    });
  }

  // Multer errors
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: string }).code === 'string') {
    const code = (err as { code: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File is too large. Maximum allowed size is ${env.MAX_UPLOAD_SIZE_MB} MB.`,
        data: null,
        error: { code: 'FILE_TOO_LARGE' },
      });
    }
    if (code.startsWith('LIMIT_')) {
      return res.status(413).json({
        success: false,
        message: 'File upload failed.',
        data: null,
        error: { code },
      });
    }
  }

  // Prisma errors carry a machine-readable `code` (e.g. P2002, P2021) and a
  // `meta` object. Surface these in development so the root cause is obvious.
  const prismaCode = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined;
  const detail = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  if (env.isDev) {
    // eslint-disable-next-line no-console
    console.error(
      `[ERROR] ${req.method} ${req.originalUrl}\n` +
        `  name: ${err instanceof Error ? err.name : typeof err}\n` +
        `  message: ${detail}\n` +
        (prismaCode ? `  prismaCode: ${prismaCode}\n` : '') +
        (stack ? `  stack:\n${stack}\n` : ''),
    );
  } else {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${req.method} ${req.originalUrl} | ${err instanceof Error ? err.name : 'unknown'}: ${detail}` + (prismaCode ? ` (${prismaCode})` : ''));
  }

  // In development, return the actual error so the frontend can surface it.
  // In production, keep a safe generic message but the detail stays in logs.
  return res.status(500).json({
    success: false,
    message: env.isDev ? detail : 'Something went wrong.',
    data: null,
    error: env.isDev ? { code: prismaCode ?? 'INTERNAL_ERROR', name: err instanceof Error ? err.name : undefined, detail } : { code: 'INTERNAL_ERROR' },
  });
}
