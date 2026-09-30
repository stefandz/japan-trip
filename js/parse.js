// Normalises raw Sheet tabs into the in-memory trip model.
// Columns are looked up by header text, so reordering is fine; renaming a header means updating COLS.
import { CONFIG } from '../config.js';
import { tzForDay } from './time.js';

const COLS = {
  Overview: { date: 'Date', day: 'Day', base: 'Base', overnight: 'Overnight in', headline: 'Headline plan', intensity: 'Intensity (1-5)', notes: 'Notes' },
  Itinerary: { date: 'Date', day: 'Day', slot: 'Time', exact: 'Exact time', activity: 'Activity', location: 'Location', gettingThere: 'Getting there', type: 'Type', status: 'Status', notes: 'Notes' },
  Accommodation: { city: 'City', checkIn: 'Check-in', checkOut: 'Check-out', nights: 'Nights', name: 'Option(s)', status: 'Status', confirmation: 'Confirmation code', notes: 'Notes' },
  Travel: { leg: 'Leg', date: 'Date', mode: 'Mode', number: 'Flight/Train No.', departs: 'Sched. departure', arrives: 'Sched. arrival', status: 'Status', confirmation: 'Confirmation code', notes: 'Notes' },
  'Eki Stamps': { station: 'Station', line: 'Line / operator', day: 'Day', design: 'Design / highlight', where: 'Where to find it', status: 'Status' },
  Countdown: { due: 'Due date', task: 'Task', category: 'Category', status: 'Status', notes: 'Notes' },
  'Open Decisions': { topic: 'Topic', question: 'Open question', options: 'Options', leaning: 'Leaning' },
};

// Optional tabs: the app still works if these are missing.
const OPTIONAL = new Set(['Overview', 'Countdown', 'Open Decisions', 'Eki Stamps']);

const SLOT_DEFAULT_MIN = { morning: 8 * 60, afternoon: 13 * 60, evening: 18 * 60, night: 21 * 60 };
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

export function parseTrip(tabs) {
  const read = name => records(name, tabs[name]);
  const legs = read('Travel').map(parseLeg).filter(l => l.date);
  const stays = read('Accommodation').filter(r => r.checkIn).map(r => ({ ...r, nights: Number(r.nights) || null }));
  const overview = new Map(read('Overview').map(r => [toISO(r.date), r]));
  const decisions = read('Open Decisions').filter(r => r.topic).map(parseDecision);

  const cards = [];
  const seenIds = new Map();
  for (const r of read('Itinerary')) {
    const date = toISO(r.date);
    if (!date || !r.activity) continue;
    const base = hash(`${date}|${r.activity}`);
    const n = (seenIds.get(base) || 0) + 1;
    seenIds.set(base, n);
    cards.push(parseCard(r, date, n > 1 ? `${base}-${n}` : base));
  }
  attachLegs(cards, legs);

  const dates = [...new Set([...cards.map(c => c.date), ...overview.keys()])].filter(Boolean).sort();
  const days = dates.map(date => {
    const ov = overview.get(date) || {};
    const dayCards = cards.filter(c => c.date === date);
    const dayNum = ov.day !== undefined && ov.day !== '' ? Number(ov.day) : dayCards[0]?.day;
    assignSortTimes(dayCards);
    return {
      date, day: dayNum, tz: tzForDay(dayNum),
      label: ov.date || dayCards[0]?.dateLabel || date,
      base: ov.base || '', overnightText: ov.overnight || '', headline: ov.headline || '',
      intensity: Number(ov.intensity) || null, dayNotes: ov.notes || '',
      cards: dayCards,
      stay: stays.find(s => s.checkIn <= date && date < s.checkOut) || null,
      checkIn: stays.find(s => s.checkIn === date) || null,
      checkOut: stays.find(s => s.checkOut === date) || null,
      decisions: decisions.filter(d => d.date === date || (d.day !== null && d.day === dayNum)),
    };
  });

  return {
    days, cards, legs, stays, decisions,
    stamps: read('Eki Stamps').filter(r => r.station).map(r => ({
      ...r, id: hash(r.station), sheetCollected: /got|done|yes|✅|collected/i.test(r.status || ''),
      confirmed: /^confirmed/i.test(r.design || ''),
    })),
    countdown: read('Countdown').filter(r => r.task).map(r => ({
      ...r, dueISO: toISO(r.due), done: /done|✅|complete/i.test(r.status || ''),
    })),
  };
}

function records(name, rows) {
  if (!rows || !rows.length) {
    if (OPTIONAL.has(name)) return [];
    throw new Error(`The "${name}" tab is missing or empty`);
  }
  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const idx = {};
  const missing = [];
  for (const [key, label] of Object.entries(COLS[name])) {
    idx[key] = header.indexOf(label.toLowerCase());
    if (idx[key] < 0) missing.push(label);
  }
  // Only a problem if a core column is gone; minor columns just come through blank.
  if (missing.length && !OPTIONAL.has(name) && missing.length > 2) {
    throw new Error(`"${name}" tab: can't find column(s) ${missing.map(m => `"${m}"`).join(', ')}. Did a header get renamed?`);
  }
  return rows.slice(1).map(row => {
    const rec = {};
    for (const [key, i] of Object.entries(idx)) rec[key] = i >= 0 ? String(row[i] ?? '').trim() : '';
    return rec;
  });
}

function parseCard(r, date, id) {
  const [typeEmoji, typeLabel] = splitEmoji(r.type);
  const [slotEmoji, slotLabel] = splitEmoji(r.slot);
  const times = [...r.exact.matchAll(/(\d{1,2}):(\d{2})/g)].map(m => Number(m[1]) * 60 + Number(m[2]));
  return {
    id, date, dateLabel: r.date, day: Number(r.day),
    slot: slotLabel.toLowerCase(), slotLabel, slotEmoji,
    exactTime: r.exact, start: times[0] ?? null, end: times[1] ?? null, approx: r.exact.includes('~'),
    activity: r.activity,
    location: dash(r.location), gettingThere: dash(r.gettingThere),
    typeEmoji: typeEmoji || '📍', typeLabel: typeLabel || 'Other', typeKey: (typeLabel || 'other').toLowerCase(),
    status: r.status, notes: r.notes,
    isOvernight: /^overnight/i.test(r.activity),
    leg: null, trains: [], seats: [],
  };
}

function parseLeg(r) {
  const numbers = r.number.split('/').map(s => s.trim()).filter(Boolean);
  const seats = [];
  // "Tsurugi 17 car 9 seats 2-D & 2-E" / "Car 8, seats 6-C & 6-D"
  const re = /(?:([A-Z][A-Za-z]+ \d+)\s+)?car\s+(\d+),?\s+seats?\s+(\d+-[A-Z](?:\s*&\s*\d+-[A-Z])*)/gi;
  for (const m of r.notes.matchAll(re)) {
    seats.push({ train: m[1] || (numbers.length === 1 ? numbers[0] : ''), car: m[2], seats: m[3].split('&').map(s => s.trim()) });
  }
  return { ...r, date: toISO(r.date), numbers, seats, departMin: firstTime(r.departs) };
}

// Pin each booked train/flight number to the first itinerary card that mentions it.
function attachLegs(cards, legs) {
  const used = new Set();
  for (const card of cards) {
    if (card.typeKey !== 'travel' || card.isOvernight) continue;
    const text = `${card.activity} ${card.location} ${card.gettingThere} ${card.notes}`.toLowerCase();
    for (const leg of legs.filter(l => l.date === card.date)) {
      for (const num of leg.numbers) {
        const key = `${leg.leg}|${num}`;
        if (used.has(key) || !text.includes(num.toLowerCase())) continue;
        used.add(key);
        card.leg = leg;
        card.trains.push(num);
        card.seats.push(...leg.seats.filter(s => !s.train || s.train.toLowerCase() === num.toLowerCase()));
      }
    }
  }
  // Second pass: a travel card whose time equals an unmatched leg's departure.
  for (const leg of legs) {
    if (leg.numbers.some(n => used.has(`${leg.leg}|${n}`)) || leg.departMin == null) continue;
    const card = cards.find(c => c.date === leg.date && c.typeKey === 'travel' && !c.leg && c.start === leg.departMin);
    if (card) { card.leg = leg; card.seats.push(...leg.seats); leg.numbers.forEach(n => used.add(`${leg.leg}|${n}`)); }
  }
}

// Every card gets a sortMin so "now" can be placed, even untimed ones.
function assignSortTimes(dayCards) {
  let floor = 0;
  for (const c of dayCards) {
    const guess = c.start ?? Math.max(floor, SLOT_DEFAULT_MIN[c.slot] ?? floor);
    c.sortMin = Math.max(guess, floor);
    floor = c.sortMin;
  }
}

function parseDecision(r) {
  const cleaned = r.options.split(' — ')[0].replace(/,\s*not both.*$/i, '');
  let options = cleaned.split(/\s+\/\s+/);
  if (options.length < 2) options = cleaned.split(/\s+OR\s+/i);
  const dateMatch = r.topic.match(/(\d{1,2})\s+(oct|sep|nov)/i);
  const dayMatch = r.topic.match(/\bday\s+(\d+)\b/i);
  return {
    ...r, id: hash(r.topic),
    options: options.map(o => o.trim()).filter(Boolean),
    date: dateMatch ? `${CONFIG.TRIP_YEAR}-${String(MONTHS[dateMatch[2].toLowerCase()]).padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : null,
    day: dayMatch ? Number(dayMatch[1]) : null,
  };
}

// "Wed 7 Oct" or "2026-10-07" → "2026-10-07"
export function toISO(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m || !MONTHS[m[2].toLowerCase()]) return null;
  return `${CONFIG.TRIP_YEAR}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// "🍜 Food" → ["🍜", "Food"]
function splitEmoji(s = '') {
  const m = s.match(/^(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*)\s*(.*)$/u);
  return m ? [m[1], m[2].trim()] : ['', s.trim()];
}

const dash = s => (s === '—' || s === '-' ? '' : s);
const firstTime = s => { const m = s.match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

// Stable short id for sync keys (Firebase-safe characters only).
export function hash(s) {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0;
  return h.toString(36);
}
