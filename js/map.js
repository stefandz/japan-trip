// Low-detail route map: the base cities in order, the trains between them, day trips, and where we are now.
// Pure SVG from built-in coastline data, so it works offline.
import { LAND, project } from './map-data.js';
import { CITIES, PLACES, cityFor } from './content.js';
import { esc } from './util.js';

// Consecutive runs of days in the same base city.
function stops(trip) {
  const out = [];
  for (const day of trip.days) {
    const city = cityFor(day.base);
    if (!city) continue;
    const last = out[out.length - 1];
    if (last?.city === city) last.days.push(day);
    else out.push({ city, days: [day], ...CITIES[city] });
  }
  return out;
}

// Trains that moved us into a stop (legs dated on its first day).
function legsInto(trip, stop) {
  return trip.legs.filter(l => l.date === stop.days[0].date && !/flight/i.test(l.mode));
}

// The itinerary card for the move into a stop: the booked train's card, else that day's first travel card.
function moveCard(trip, stop) {
  const day = stop.days[0], legs = legsInto(trip, stop);
  return day.cards.find(c => legs.includes(c.leg)) || day.cards.find(c => c.typeKey === 'travel' && !c.isOvernight) || null;
}

function dayTrips(trip) {
  const seen = new Map();
  for (const day of trip.days) {
    for (const [name, p] of Object.entries(PLACES)) {
      if (!seen.has(name) && (day.headline || '').includes(name)) seen.set(name, { name, day, ...p, from: cityFor(day.base) });
    }
  }
  return [...seen.values()];
}

// variant: 'full' (Trip tab: train labels + legend), 'compact' (Now), 'day' (one day's move highlighted).
export function tripMap(trip, { today = null, focus = null, variant = 'full' } = {}) {
  const route = stops(trip);
  if (route.length < 2) return '';
  const trips = dayTrips(trip);
  const xy = p => project(p.lat, p.lon);
  const pts = [...route, ...trips].map(xy);

  // Fit the view to the stops, with room for labels.
  const pad = 70;
  let x0 = Math.min(...pts.map(p => p[0])) - pad, x1 = Math.max(...pts.map(p => p[0])) + pad;
  let y0 = Math.min(...pts.map(p => p[1])) - pad, y1 = Math.max(...pts.map(p => p[1])) + pad;
  const minH = (x1 - x0) * 0.52;   // don't get too letterboxed on a phone
  if (y1 - y0 < minH) { const grow = (minH - (y1 - y0)) / 2; y0 -= grow; y1 += grow; }
  const w = x1 - x0, h = y1 - y0, fs = w / 26;

  const currentCity = today && cityFor(today.base);
  const focusCity = focus && cityFor(focus.base);
  const reached = s => today ? s.days[0].date <= today.date : false;

  // Curved segments between consecutive stops.
  const segs = route.slice(1).map((to, i) => {
    const from = route[i];
    const [ax, ay] = xy(from), [bx, by] = xy(to);
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
    const cx = mx - dy * 0.18, cy = my + dx * 0.18;
    const done = today && to.days[0].date <= today.date;
    const isFocus = focus && to.days[0].date === focus.date;
    const trains = legsInto(trip, to).map(l => l.number).join(' → ');
    return { d: `M${ax} ${ay}Q${cx} ${cy} ${bx} ${by}`, done, isFocus, from: from.city, to: to.city, date: to.days[0], trains, card: moveCard(trip, to) };
  });

  const textAt = (x, y, side, r) => {
    const o = r + fs * 0.45;
    return { r: [x + o, y + fs * 0.35, 'start'], l: [x - o, y + fs * 0.35, 'end'], t: [x, y - o, 'middle'], b: [x, y + o + fs * 0.7, 'middle'] }[side || 'r'];
  };

  const tag = variant === 'compact' ? 'g' : 'a';   // compact maps sit inside a link already
  const href = day => tag === 'a' ? ` href="#/day/${day.day}"` : '';
  const seen = new Set();
  const markers = route.filter(s => !seen.has(s.city) && seen.add(s.city)).map(s => {
    const [x, y] = xy(s);
    const all = route.filter(r => r.city === s.city);
    const nights = all.reduce((t, r) => t + r.days.length, 0);
    const isNow = s.city === currentCity, isFocus = s.city === focusCity;
    const r = fs * (isNow || isFocus ? 0.55 : 0.4);
    const [tx, ty, anchor] = textAt(x, y, s.label, r);
    const cls = [isNow && 'now', isFocus && 'focus', all.some(reached) && 'reached'].filter(Boolean).join(' ');
    return `<${tag}${href(s.days[0])} class="stop ${cls}">
      ${isNow ? `<circle class="pulse" cx="${x}" cy="${y}" r="${r}"/>` : ''}
      <circle class="dot" cx="${x}" cy="${y}" r="${r}"/>
      <text x="${tx}" y="${ty}" text-anchor="${anchor}" font-size="${fs}">${esc(s.city)}${variant === 'full' ? `<tspan class="n" font-size="${fs * 0.75}"> ${nights}d</tspan>` : ''}</text></${tag}>`;
  }).join('');

  const spurs = trips.map(p => {
    const [x, y] = xy(p), base = p.from && CITIES[p.from];
    const [tx, ty, anchor] = textAt(x, y, p.label, fs * 0.28);
    const isFocus = focus?.date === p.day.date;
    return `<${tag}${href(p.day)} class="daytrip ${isFocus ? 'focus' : ''}">
      ${base ? `<line x1="${xy(base)[0]}" y1="${xy(base)[1]}" x2="${x}" y2="${y}"/>` : ''}
      <circle cx="${x}" cy="${y}" r="${fs * 0.28}"/>
      <text x="${tx}" y="${ty}" text-anchor="${anchor}" font-size="${fs * 0.8}">${esc(p.name)}</text></${tag}>`;
  }).join('');

  // Train names go under the map, not on it: they'd collide with the city labels.
  const legRow = s => `<li class="${s.done ? 'done' : ''}"><a href="#/day/${s.date.day}${s.card ? `/${s.card.id}` : ''}"><b>${esc(s.from)} → ${esc(s.to)}</b>
    <span>${s.trains ? `🚄 ${esc(s.trains)}` : '🚃 local train'}</span><small>${esc(s.date.label)}</small></a></li>`;
  const focusSeg = segs.find(s => s.isFocus);
  const below = variant === 'full' ? `<ol class="legs">${segs.map(legRow).join('')}</ol>`
    : variant === 'day' && focusSeg ? `<ol class="legs">${legRow(focusSeg)}</ol>` : '';

  return `<figure class="tripmap ${variant}">
    <svg viewBox="${x0} ${y0} ${w} ${h}" role="img" aria-label="Route map: ${esc(route.map(s => s.city).join(' → '))}">
      <rect class="sea" x="${x0}" y="${y0}" width="${w}" height="${h}"/>
      <path class="land" d="${LAND}"/>
      ${segs.map(s => `<path class="seg ${s.done ? 'done' : ''} ${s.isFocus ? 'focus' : ''}" d="${s.d}" stroke-width="${fs * 0.16}"/>`).join('')}
      ${spurs}${markers}
    </svg>
    ${variant === 'full' ? `<figcaption>Tap a city to jump to its days, or a train for its ticket.${today ? ' <span class="you">●</span> you are here' : ''}</figcaption>` : ''}
    ${below}
  </figure>`;
}
