import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Assigns a correlation ID to every request and emits a single-line access log
 * after the response finishes so production issues can be traced end-to-end.
 *
 *  - `X-Request-Id` response header lets the frontend/operator correlate a
 *    failing response with the backend log line.
 *  - `res.locals.requestId` is consumed by the error handler to tag error logs
 *    with the same request.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const entry = `[${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(1)}ms)`;
    // eslint-disable-next-line no-console
    (res.statusCode >= 500 ? console.error : console.log)(entry);
  });

  next();
}