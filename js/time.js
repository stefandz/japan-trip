// Timezone-aware "now". The phone's own timezone setting is never used.
import { CONFIG } from '../config.js';

export function tzForDay(day) {
  return CONFIG.TIMEZONE_BY_DAY[day] || CONFIG.DEFAULT_TIMEZONE;
}

// ?now=2026-10-10T11:00 pretends it's that JST wall-clock time (for testing).
export function nowInstant() {
  const override = new URLSearchParams(location.search).get('now');
  return override ? new Date(`${override}+09:00`) : new Date();
}

// Wall-clock date/time of an instant in a given zone.
export function wallClock(instant, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant).map(p => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// The instant at which it's `date` `minutes` on the wall clock in `tz`.
export function instantFor(date, minutes, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const wc = wallClock(new Date(guess), tz);
  const drift = (Date.parse(wc.date) + wc.minutes * 60000) - Date.UTC(y, m - 1, d);
  return new Date(guess - (drift - minutes * 60000));
}

export const fmtMinutes = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
