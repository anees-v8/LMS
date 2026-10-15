import { NextResponse } from 'next/server';
import env from '../config/env';
import logger from './logger';
import { ApiError } from './ApiError';

/** Shape of a Postgres driver error we care about. */
interface PgError extends Error {
  code?: string;
  detail?: string;
}

function isApiError(err: unknown): err is ApiError {
  return (
    err instanceof ApiError ||
    (typeof err === 'object' && err !== null && (err as { isApiError?: boolean }).isApiError === true)
  );
}

/**
 * Next.js has no Express-style central error-handler middleware — every
 * route handler catches its own errors and returns this. Produces the
 * EXACT SAME JSON shape + status codes as the Express backend's
 * errorHandler.ts, so the mobile app's ApiService needs zero changes.
 *
 * Usage in a route handler:
 *   export async function GET(req: NextRequest) {
 *     try { ... return NextResponse.json(data); }
 *     catch (err) { return handleApiError(err); }
 *   }
 */
export function handleApiError(err: unknown): NextResponse {
  if (isApiError(err)) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status }
    );
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
    return NextResponse.json(
      { error: { code: 'DUPLICATE', message: userMsg, detail: pgErr.detail } },
      { status: 409 }
    );
  }
  // Postgres FK violation → 400
  if (pgErr && pgErr.code === '23503') {
    return NextResponse.json(
      { error: { code: 'FK_VIOLATION', message: 'Referenced resource does not exist' } },
      { status: 400 }
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error('Unhandled error', { error: message, stack: env.isProd ? undefined : stack });
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: env.isProd ? 'Something went wrong' : message } },
    { status: 500 }
  );
}

/** 404 for unmatched routes — Next.js's own App Router 404 handles missing
 *  files automatically, but this matches the Express shape for any route
 *  that wants to explicitly signal "not found" with the same JSON body. */
export function routeNotFound(method: string, path: string): NextResponse {
  return NextResponse.json(
    { error: { code: 'ROUTE_NOT_FOUND', message: `Cannot ${method} ${path}` } },
    { status: 404 }
  );
}
