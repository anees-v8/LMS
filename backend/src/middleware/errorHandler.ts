import type { Request, Response, NextFunction } from 'express';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

/** Shape of a Postgres driver error we care about. */
interface PgError extends Error {
  code?: string;
  detail?: string;
}

function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError || (typeof err === 'object' && err !== null && (err as { isApiError?: boolean }).isApiError === true);
}

/** 404 for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: `Cannot ${req.method} ${req.path}` } });
}

/** Central error handler. Must be registered LAST (4 args). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Known application errors
  if (isApiError(err)) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const pgErr = err as PgError;

  // Postgres unique-violation → 409
  if (pgErr && pgErr.code === '23505') {
    let userMsg = 'Resource already exists';
    const detail = pgErr.detail || '';
    if (detail.includes('(phone)=')) {
      userMsg = 'This phone number is already registered with another account.';
    } else if (detail.includes('(email)=')) {
      userMsg = 'This email address is already in use by another account.';
    } else if (detail.includes('(slug)=')) {
      userMsg = 'This institute URL / slug is already taken. Please choose another.';
    } else if (detail.includes('(roll_no, tenant_id)=') || detail.includes('(roll_no)=')) {
      userMsg = 'A student with this roll number already exists in this institute.';
    } else if (detail.includes('(contact_phone)=')) {
      userMsg = 'This contact phone number is already registered for another institute.';
    }
    res.status(409).json({
      error: { code: 'DUPLICATE', message: userMsg, detail: pgErr.detail },
    });
    return;
  }
  // Postgres FK violation → 400
  if (pgErr && pgErr.code === '23503') {
    res.status(400).json({
      error: { code: 'FK_VIOLATION', message: 'Referenced resource does not exist' },
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error('Unhandled error', { error: message, stack: env.isProd ? undefined : stack });
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProd ? 'Something went wrong' : message,
    },
  });
}
