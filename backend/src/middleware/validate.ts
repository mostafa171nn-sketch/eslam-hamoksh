import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

/** Validates the given request part with a Zod schema before the handler runs. */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req[source];
    const result = schema.safeParse(value ?? {});
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      const message = details
        .map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))
        .join(' ');
      return next(ApiError.validation(message || 'Validation failed.', details));
    }
    (req as Request & Record<string, unknown>)[`validated${source[0].toUpperCase()}${source.slice(1)}`] =
      result.data;
    next();
  };
}

/** Validates the request body against a schema selected by a URL param. */
export function validateByParam(schemas: Record<string, ZodSchema>, param: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const schema = schemas[req.params[param] as string];
    if (!schema) {
      return next(
        ApiError.validation('Validation failed.', [
          { path: param, message: 'Unsupported value.' },
        ]),
      );
    }
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      const message = details
        .map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))
        .join(' ');
      return next(ApiError.validation(message || 'Validation failed.', details));
    }
    (req as Request & Record<string, unknown>).validatedBody = result.data;
    next();
  };
}
