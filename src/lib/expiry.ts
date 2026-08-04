// Notes tagged to delete themselves at the end of the day.
//
// The deadline is 11:59 PM on the night the tag was applied — not the night
// the note was written — so it is stored per-note as `expires_at` rather than
// derived from `created_at`.
//
// Everything here is local time, matching `dayKeyFromMs` in utils/date.ts: a
// day in DayFeed is the user's day, not UTC's.
import type { Note } from '../db/types';

const EXPIRY_HOUR = 23;
const EXPIRY_MINUTE = 59;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 23:59:00.000 local on the day containing `now`. */
export function expiryForDay(now: number): number {
  const d = new Date(now);
  d.setHours(EXPIRY_HOUR, EXPIRY_MINUTE, 0, 0);
  return d.getTime();
}

/**
 * Milliseconds until the next 11:59 PM, for arming the in-app timer.
 *
 * If today's deadline has already passed, this rolls to tomorrow's — computed
 * by re-deriving from a timestamp a day later rather than adding 24h to the
 * result, so it stays correct across a daylight-saving change.
 */
export function msUntilNextExpiry(now: number): number {
  const today = expiryForDay(now);
  if (today > now) return today - now;
  return expiryForDay(now + DAY_MS) - now;
}

/** Whether a note is tagged to expire (regardless of whether it is due yet). */
export function isExpiring(note: Pick<Note, 'expires_at'>): boolean {
  return note.expires_at != null;
}

/** Whether a note's deadline has arrived. */
export function isExpired(note: Pick<Note, 'expires_at'>, now: number): boolean {
  return note.expires_at != null && note.expires_at <= now;
}
