/**
 * The whole platform is India-only (coaching institutes), but this app runs
 * on Vercel, whose serverless functions default to UTC — not IST. Any
 * "what day is it today" check done with a bare `new Date().getDay()` (or
 * Postgres's `CURRENT_DATE`, which is also UTC on Supabase by default) is
 * wrong for roughly 5.5 hours every night: from 12:00 AM to 5:30 AM IST,
 * UTC is still on the *previous* calendar day, so "today's" timetable
 * query silently returns yesterday's (usually empty) schedule instead.
 *
 * These helpers compute "today" in IST explicitly, regardless of the
 * server's own timezone, so day-of-week / date lookups are consistent no
 * matter when or where the code runs.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The current date/time shifted into IST wall-clock time. Do not read
 *  UTC-based getters (getDay/getDate/etc.) off any *other* Date — they'd
 *  give you the server's UTC day again. Use this one. */
export function nowInIst(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** 0=Sun..6=Sat, in IST — matches timetable.day_of_week's convention. */
export function istDayOfWeek(): number {
  return nowInIst().getUTCDay();
}

/** 'YYYY-MM-DD' for the current IST calendar day — for comparing against
 *  DATE columns (e.g. attendance.date) instead of Postgres's CURRENT_DATE,
 *  which is UTC-based unless the session timezone is set to Asia/Kolkata. */
export function istDateString(): string {
  return nowInIst().toISOString().slice(0, 10);
}

/** Formats an arbitrary Date/timestamp (e.g. a scheduled test's
 *  TIMESTAMPTZ) as an IST-localized string for user-facing text like
 *  notifications. `date.toLocaleString('en-IN')` alone is NOT enough —
 *  without an explicit timeZone it uses the server's own runtime timezone
 *  (UTC on Vercel), not IST, so it looks "converted" but silently isn't. */
export function formatIst(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}
