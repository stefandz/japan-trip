// Calendar-alert fallback for early mornings (web pages can't set iOS alarms).
import { CONFIG } from '../config.js';
import { instantFor, fmtMinutes } from './time.js';

export function earlyStart(day) {
  const [h, m] = CONFIG.EARLY_START_BEFORE.split(':').map(Number);
  const first = day.cards.find(c => c.start != null);
  if (!first || first.start >= h * 60 + m) return null;
  const wakeMin = Math.max(0, first.start - CONFIG.WAKE_LEAD_MINUTES);
  return { card: first, wakeMin, wakeLabel: fmtMinutes(wakeMin) };
}

export function icsHref(day, early) {
  const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = instantFor(day.date, early.wakeMin, day.tz);
  const end = new Date(start.getTime() + 15 * 60000);
  const text = `${early.card.activity} at ${early.card.exactTime.replace('~', '')}`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//japan-trip//EN', 'BEGIN:VEVENT',
    `UID:wake-${day.date}@japan-trip`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:⏰ Wake up — ${esc(text)}`,
    `DESCRIPTION:${esc(`Day ${day.day} early start. First up: ${text}.`)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${esc('Wake up!')}`, 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT5M', `DESCRIPTION:${esc('Seriously, wake up')}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
}

const esc = s => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
