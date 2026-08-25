import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const asyncHandler = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  void fn(req, res, next).catch(next);
};
