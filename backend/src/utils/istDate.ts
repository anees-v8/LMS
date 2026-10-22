/**
 * The whole platform is India-only (coaching institutes).
 * These helpers compute "today" in IST explicitly, regardless of the
 * server's own timezone, so day-of-week / date lookups are consistent no
 * matter when or where the code runs.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The current date/time shifted into IST wall-clock time. */
export function nowInIst(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** 0=Sun..6=Sat, in IST — matches timetable.day_of_week's convention. */
export function istDayOfWeek(): number {
  return nowInIst().getUTCDay();
}

/** 'YYYY-MM-DD' for the current IST calendar day. */
export function istDateString(): string {
  return nowInIst().toISOString().slice(0, 10);
}

/** Formats an arbitrary Date/timestamp as an IST-localized string. */
export function formatIst(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}
