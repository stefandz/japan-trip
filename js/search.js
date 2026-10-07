// "Is it in the plan?" search on the Trip tab: the itinerary first, then the Sheet's other lists.
import { esc } from './util.js';

// "Sensoji" finds "Sensō-ji": accents, hyphens and apostrophes don't count.
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-'’]/g, '');

export function searchPlan(trip, query, notes = {}) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length || terms.join('').length < 2) return '';
  const hit = (...fields) => { const text = norm(fields.join(' ')); return terms.every(t => text.includes(t)); };
  const dayOf = c => trip.days.find(d => d.date === c.date);

  // A card that is the thing itself, versus one that only brings it up ("…Akihabara only if time allows").
  const cards = trip.cards.filter(c => hit(c.activity, c.location, c.leg?.number));
  const asides = trip.cards.filter(c => !cards.includes(c) && hit(c.activity, c.location, c.gettingThere, c.notes));
  const days = trip.days.filter(d => hit(d.headline, d.dayNotes) && ![...cards, ...asides].some(c => c.date === d.date));
  const cardRow = (c, notes) => row(c.activity, [`Day ${dayOf(c).day}`, dayOf(c).label, c.exactTime || c.slotLabel, c.location], c.status, notes, `#/day/${dayOf(c).day}/${c.id}`);
  const groups = [
    ['In the itinerary', cards.map(c => cardRow(c, c.notes))],
    ['Mentioned in the itinerary', [
      ...asides.map(c => cardRow(c, [c.gettingThere, c.notes].filter(f => terms.some(t => norm(f).includes(t))).join('. '))),
      ...days.map(d => row(d.headline, [`Day ${d.day}`, d.label, d.base], '', d.dayNotes, `#/day/${d.day}`)),
    ]],
    ['Our notes', trip.days.filter(d => hit(notes[d.date]?.text))
      .map(d => row(`Day ${d.day} · ${d.label}`, [d.base], '', notes[d.date].text, `#/day/${d.day}`))],
    ['Activities list', trip.activities.filter(a => hit(a.activity, a.city, a.category, a.notes))
      .map(a => row(a.activity, [a.city, a.day, a.category], a.status, a.notes))],
    ['Food list', trip.foodPlan.filter(f => hit(f.name, f.city, f.dietary, f.notes))
      .map(f => row(f.name, [f.city, f.day], f.status, [f.dietary, f.notes].filter(Boolean).join('. ')))],
    ['Stays', trip.stays.filter(s => hit(s.name, s.city, s.notes))
      .map(s => row(s.name, [s.city, `${s.checkIn} → ${s.checkOut}`], s.status, s.notes, '#/taxi'))],
    ['Stamps', trip.stamps.filter(s => hit(s.station, s.line, s.design, s.where))
      .map(s => row(s.station, [s.day, s.line], '', s.where, '#/stamps'))],
    ['Gifts', trip.gifts.filter(g => hit(g.for, g.gift, g.where, g.notes))
      .map(g => row(g.gift, [`For ${g.for}`], g.status, g.where, '#/gifts'))],
    ['Prep & decisions', [
      ...trip.countdown.filter(t => hit(t.task, t.notes)).map(t => row(t.task, [t.category, t.due], t.status, t.notes, '#/prep')),
      ...trip.decisions.filter(d => hit(d.topic, d.question, d.options.join(' '), d.leaning)).map(d => row(d.topic, ['Open decision'], '', d.question, '#/prep')),
    ]],
  ].filter(([, rows]) => rows.length);

  const inPlan = groups[0]?.[0] === 'In the itinerary';
  const verdict = !groups.length ? `Nothing in the plan matches “${esc(query.trim())}”.`
    : inPlan ? `✅ In the itinerary: ${groups[0][1].length} match${groups[0][1].length === 1 ? '' : 'es'}.`
    : 'Not an itinerary item of its own. It comes up here:';
  return `<p class="verdict ${inPlan ? 'yes' : ''}">${verdict}</p>
    ${groups.map(([title, rows]) => `<h2 class="section">${title} <span class="muted">· ${rows.length}</span></h2>${rows.join('')}`).join('')}`;
}

function row(title, meta, status, notes, href) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="hit"${href ? ` href="${href}"` : ''}>
    <b>${esc(title)}${status ? ` <span class="pill status-${esc(status.toLowerCase().replace(/\s+/g, '-'))}">${esc(status)}</span>` : ''}</b>
    <small>${esc(meta.filter(Boolean).join(' · '))}</small>
    ${notes ? `<span class="note">${esc(notes)}</span>` : ''}
  </${tag}>`;
}
