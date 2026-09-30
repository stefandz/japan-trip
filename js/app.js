import { CONFIG } from '../config.js';
import { fetchTabs, cachedTabs } from './sheet.js';
import { parseTrip, hash } from './parse.js';
import { createSync } from './sync.js';
import { nowInstant, wallClock, fmtMinutes, daysBetween } from './time.js';
import { earlyStart, icsHref } from './ics.js';
import { unlock } from './unlock.js';
import { esc, progress, shortDate } from './util.js';
import { refreshRate, refreshWeather, weather, wxEmoji } from './live.js';
import { cityFor } from './content.js';
import * as kit from './kit.js';
import { tripMap } from './map.js';

const app = document.getElementById('app');
const nav = document.getElementById('tabs');

let trip = null;          // parsed model
let meta = {};            // { fetchedAt, fromCache, error }
let sync = null;
let syncState = { marks: {}, stamps: {}, choices: {} };

// ---------- boot ----------

async function boot() {
  Object.assign(CONFIG, await unlock(app));
  const cached = cachedTabs();
  if (cached) useTabs(cached);
  sync = await createSync(s => { syncState = s; render(); });
  meta.syncError = sync.error;
  syncState = sync.state;
  render();
  refresh();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  window.addEventListener('hashchange', () => render({ fresh: true }));
  setInterval(() => { if (route().name === 'now') render(); }, 60000);
  window.addEventListener('online', () => refresh(true));
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
}

let lastFetch = 0;
async function refresh(force = false) {
  if (!force && Date.now() - lastFetch < 30000) return;
  lastFetch = Date.now();
  const before = JSON.stringify([lastTabsJSON, meta.error, meta.parseError]);
  meta.loading = true;
  // Rate and weather are nice-to-haves: refresh quietly, keep the cached copy on failure.
  Promise.allSettled([refreshRate(), refreshWeather()]).then(rs => { if (rs.some(r => r.value)) render(); });
  try {
    useTabs(await fetchTabs());
    meta.error = null;
  } catch (err) {
    console.error(err);
    meta.error = err.message;
  }
  meta.loading = false;
  // Don't yank the view around (e.g. mid-swipe) when the Sheet hasn't actually changed.
  if (JSON.stringify([lastTabsJSON, meta.error, meta.parseError]) !== before || route().name === 'prep') render();
}

let lastTabsJSON = null;

function useTabs({ tabs, fetchedAt, fromCache }) {
  meta = { ...meta, fetchedAt, fromCache };
  const json = JSON.stringify(tabs);
  if (json === lastTabsJSON) return;
  try {
    trip = parseTrip(tabs);
    lastTabsJSON = json;
    meta.parseError = null;
  } catch (err) {
    meta.parseError = err.message;
  }
}

// ---------- routing ----------

function route() {
  const [name = 'now', a, b] = location.hash.replace(/^#\/?/, '').split('/');
  return { name, a, b };
}

// ---------- "now" detection ----------

function whereAreWe() {
  const instant = nowInstant();
  const days = trip.days;
  const first = days[0], last = days[days.length - 1];
  if (wallClock(instant, first.tz).date < first.date) return { phase: 'before', instant };
  if (wallClock(instant, last.tz).date > last.date) return { phase: 'after', instant };

  const day = [...days].reverse().find(d => wallClock(instant, d.tz).date >= d.date) || first;
  const { minutes } = wallClock(instant, day.tz);
  const cards = day.cards;
  let i = -1;
  cards.forEach((c, idx) => { if (c.sortMin <= minutes) i = idx; });
  const current = i >= 0 ? cards[i] : null;
  const next = cards.slice(i + 1).find(c => !syncState.marks[c.id]) || null;
  const nextDay = days[days.indexOf(day) + 1] || null;
  return { phase: 'during', instant, day, minutes, current, next, nextDay };
}

// ---------- rendering ----------

let lastViewKey = null;

function render({ fresh = false } = {}) {
  const r = route();
  const tab = r.name === 'day' ? 'days' : kit.KIT_ROUTES.includes(r.name) ? 'kit' : r.name;
  nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));

  if (!trip && !['kit', 'phrases', 'yen', 'sos', 'howto'].includes(r.name)) {
    app.innerHTML = meta.parseError || meta.error
      ? `<div class="empty"><div class="big">🙈</div><p>${esc(meta.parseError || meta.error)}</p>
         <button class="btn" data-action="refresh">Try again</button></div>`
      : `<div class="empty"><div class="big spin">🗾</div><p>Loading the plan…</p></div>`;
    return;
  }

  // Re-renders of the same view (sync updates, refetches) keep scroll position; new views start fresh.
  const viewKey = `${r.name}/${r.a || ''}`;
  if (viewKey !== lastViewKey) fresh = true;
  lastViewKey = viewKey;
  const keep = fresh ? null : snapshotScroll();
  const c = ctx();
  const views = {
    now: viewNow, days: viewDays, day: viewDay, stamps: viewStamps, prep: viewPrep,
    kit: () => kit.viewKit(c), phrases: kit.viewPhrases, yen: kit.viewYen, taxi: () => kit.viewTaxi(c),
    sos: () => kit.viewSos(c), spend: () => kit.viewSpend(c), food: () => kit.viewFood(c), howto: kit.viewHowto,
  };
  const fields = fresh ? null : snapshotFields();
  app.innerHTML = banner() + (views[r.name] || viewNow)(r);
  if (fields) restoreFields(fields);
  if (keep) restoreScroll(keep);
  else {
    window.scrollTo(0, 0);
    if (r.name === 'day') focusCard(r.b || todaysCardId(r.a), false);
  }
  if (r.name === 'day') watchCarousel();
}

function ctx() {
  const where = trip ? whereAreWe() : {};
  const today = where.day?.date || wallClock(nowInstant(), 'Asia/Tokyo').date;
  return { trip, state: syncState, sync, where, today };
}

// Opening today's day view without a card lands on the current one.
function todaysCardId(dayNum) {
  const w = whereAreWe();
  if (w.phase !== 'during' || String(w.day.day) !== dayNum) return null;
  return (w.current || w.next)?.id;
}

function banner() {
  const bits = [];
  if (meta.parseError) bits.push(`⚠️ ${esc(meta.parseError)} — showing the last good copy.`);
  else if (meta.error) bits.push(`📴 Couldn't reach the Sheet (${esc(meta.error)}). ${meta.fetchedAt ? `Showing the copy from ${ago(meta.fetchedAt)}.` : 'No saved copy on this phone yet.'}`);
  if (meta.syncError) bits.push(`🔌 ${esc(meta.syncError)}`);
  return bits.map(b => `<div class="notice">${b}</div>`).join('');
}

// ----- Now -----

function viewNow() {
  const w = whereAreWe();
  if (w.phase === 'before') return viewBefore(w);
  if (w.phase === 'after') return viewAfter();

  const { day, current, next, nextDay, minutes } = w;
  const done = day.cards.filter(c => syncState.marks[c.id]).length;
  const tomorrowEarly = nextDay && earlyStart(nextDay);
  const lateEnough = minutes >= 15 * 60;

  const celebrate = isAnniv(day);
  return `
    <header class="hero ${celebrate ? 'anniv' : ''}">
      ${celebrate ? `<div class="hearts" aria-hidden="true">♥ ♥ ♥</div>
        <div class="kicker">${esc(anniv().names)} · ${plural(annivYears(day), 'year')} since we met</div>
        <h1>Happy anniversary</h1>
        <div class="muted">Day ${day.day} · ${esc(day.label)} · ${esc(day.base)}</div>`
      : `<div class="kicker">Day ${day.day} · ${esc(day.label)}</div>
      <h1>${esc(day.base || 'Today')}</h1>`}
      <div class="clock">${fmtMinutes(minutes)} <small>${day.tz === 'Asia/Tokyo' ? 'JST' : 'UK'}</small>${wxChip(day)}</div>
      ${progress(done, day.cards.length)}
    </header>
    <nav class="quick">
      <a class="chip" href="#/taxi">🚕 Taxi card</a><a class="chip" href="#/phrases">🗣️ Phrases</a>
      <a class="chip" href="#/yen">💴 Yen</a><a class="chip" href="#/spend">🧾 Spend</a><a class="chip" href="#/sos">🆘 SOS</a>
    </nav>
    ${tomorrowEarly && lateEnough ? earlyBanner(nextDay, tomorrowEarly, 'Tomorrow') : ''}
    ${nextDay && lateEnough ? wxWarning(nextDay) : ''}
    ${isAnniv(nextDay) && lateEnough ? `<aside class="anniv-banner"><div class="big">♥</div><div><b>Tomorrow: our anniversary</b>
      <div>${plural(annivYears(nextDay), 'year')} of ${esc(anniv().names)}</div></div></aside>` : ''}
    ${current ? `<h2 class="section">Now</h2>${card(current, day, { hero: true })}` : ''}
    ${next ? `<h2 class="section">Up next ${next.start != null ? `<span class="muted">· ${fmtMinutes(next.start)}${countdownTo(next.start - minutes)}</span>` : ''}</h2>${card(next, day)}` : `<div class="empty small">🎉 Nothing left on today's list.</div>`}
    <a class="btn wide ghost" href="#/day/${day.day}/${(current || next || day.cards[0])?.id || ''}">See all of Day ${day.day} →</a>
    ${overnight(day)}
    <a class="mapcard" href="#/days">${tripMap(trip, { today: day, variant: 'compact' })}</a>
  `;
}

function viewBefore(w) {
  const first = trip.days[0];
  const today = wallClock(w.instant, first.tz).date;
  const n = daysBetween(today, first.date);
  const todo = trip.countdown.filter(t => !t.done).sort((a, b) => (a.dueISO || '9') < (b.dueISO || '9') ? -1 : 1);
  return `
    <header class="hero countdown">
      <div class="kicker">${esc(first.label)} → ${esc(trip.days[trip.days.length - 1].label)}</div>
      <div class="giant">${n}</div>
      <h1>${n === 1 ? 'sleep' : 'sleeps'} till Japan</h1>
      ${annivDay() ? `<p class="anniv-line">…and ${plural(daysBetween(today, annivDay().date), 'sleep')} till our anniversary ♥</p>` : ''}
      <div class="train" aria-hidden="true">🚅💨</div>
    </header>
    ${earlyStart(first) ? earlyBanner(first, earlyStart(first), 'Departure day') : ''}
    <h2 class="section">Still to do <span class="muted">· ${todo.length}</span></h2>
    ${todo.length ? `<ul class="tasks">${todo.slice(0, 6).map(t => taskRow(t, today)).join('')}</ul>` : '<div class="empty small">✅ All admin done!</div>'}
    ${todo.length > 6 ? `<a class="btn wide ghost" href="#/prep">All ${todo.length} tasks →</a>` : ''}
    <h2 class="section">First up</h2>
    ${first.cards[0] ? card(first.cards[0], first) : ''}
    <h2 class="section">The route</h2>
    <a class="mapcard" href="#/days">${tripMap(trip, { variant: 'compact' })}</a>
    <a class="btn wide ghost" href="#/days">Browse all ${trip.days.length} days →</a>
  `;
}

function viewAfter() {
  const all = trip.cards.filter(c => !c.isOvernight);
  const done = all.filter(c => syncState.marks[c.id] === 'done').length;
  const stamps = trip.stamps.filter(s => stampGot(s)).length;
  return `
    <header class="hero countdown">
      <div class="giant">おかえり</div>
      <h1>Welcome home</h1>
    </header>
    <div class="stats">
      <div><b>${trip.days.length}</b><span>days</span></div>
      <div><b>${done}</b><span>things done</span></div>
      <div><b>${stamps}</b><span>eki stamps</span></div>
      <div><b>${trip.legs.length}</b><span>trains &amp; flights</span></div>
    </div>
    ${journalList()}
    <a class="btn wide ghost" href="#/days">Relive it day by day →</a>
  `;
}

function journalList() {
  const days = trip.days.filter(d => syncState.journal[d.date]);
  if (!days.length) return '';
  return `<h2 class="section">Journal</h2><ul class="tasks">${days.map(d => {
    const j = syncState.journal[d.date];
    return `<li class="task"><span class="cat">Day ${d.day} · ${esc(d.base)}</span><b>${j.mood || ''} ${esc(j.text || '')}</b></li>`;
  }).join('')}</ul>`;
}

// ----- Trip overview -----

function viewDays() {
  const w = whereAreWe();
  return `
    <header class="page"><h1>The trip</h1><p class="muted">${trip.days.length} days · tap one to dive in</p></header>
    ${tripMap(trip, { today: w.phase === 'during' ? w.day : null })}
    <ol class="daylist">
      ${trip.days.map(d => {
        const done = d.cards.filter(c => syncState.marks[c.id]).length;
        const isToday = w.phase === 'during' && w.day === d;
        return `<li><a href="#/day/${d.day}" class="dayrow ${isToday ? 'today' : ''} ${done && done === d.cards.length ? 'complete' : ''}">
          <div class="daynum"><small>Day</small>${d.day}</div>
          <div class="daybody">
            <div class="dayhead"><b>${esc(d.base)}</b> <span class="muted">${esc(d.label)}</span>${isToday ? ' <span class="pill now">today</span>' : ''}${isAnniv(d) ? ' <span class="pill anniv">♥ anniversary</span>' : ''}</div>
            <div class="headline">${esc(d.headline)}</div>
            <div class="daymeta">${intensity(d.intensity)}${wxChip(d)}${syncState.journal[d.date]?.mood ? `<span>${syncState.journal[d.date].mood}</span>` : ''}<span>🛏️ ${esc(d.stay?.name || d.overnightText || '—')}</span></div>
          </div></a></li>`;
      }).join('')}
    </ol>`;
}

// ----- Day -----

function viewDay(r) {
  const day = trip.days.find(d => String(d.day) === r.a) || trip.days[0];
  const w = whereAreWe();
  const early = earlyStart(day);
  return `
    ${dayStrip(day, w)}
    <header class="page day">
      <div class="kicker">Day ${day.day} · ${esc(day.label)}</div>
      <h1>${esc(day.base)}</h1>
      <div class="daymeta">${intensity(day.intensity)}${wxChip(day, true)}${day.dayNotes ? `<span>${esc(day.dayNotes)}</span>` : ''}</div>
    </header>
    ${annivBanner(day)}
    ${early ? earlyBanner(day, early, 'Early start') : ''}
    ${day.decisions.map(decision).join('')}
    <div class="deckbar">
      <button class="icon" data-action="step" data-dir="-1" aria-label="Previous">‹</button>
      <span id="deckpos">1 / ${day.cards.length}</span>
      <button class="icon" data-action="step" data-dir="1" aria-label="Next">›</button>
    </div>
    <div class="carousel" id="deck">
      ${day.cards.map(c => `<div class="slide" data-id="${c.id}">${card(c, day)}</div>`).join('')}
    </div>
    <ol class="timeline">
      ${day.cards.map(c => `<li><button data-action="goto" data-id="${c.id}" class="${markClass(c)}" data-tl="${c.id}">
        <span class="t">${c.start != null ? fmtMinutes(c.start) : c.slotEmoji}</span>
        <span class="e">${c.typeEmoji}</span><span class="a">${esc(c.activity)}</span>
        ${syncState.marks[c.id] === 'done' ? '<span class="tick">済</span>' : ''}</button></li>`).join('')}
    </ol>
    ${overnight(day)}
    ${tripMap(trip, { today: w.phase === 'during' ? w.day : null, focus: day, variant: 'day' })}
    ${w.phase !== 'before' ? kit.journalBlock(day, syncState) : ''}
    ${w.phase === 'during' ? `<div class="fab-space"></div><a class="fab" href="#/now" aria-label="Jump to now">⏱ Now</a>` : ''}
  `;
}

function dayStrip(active, w) {
  return `<nav class="strip" id="strip">${trip.days.map(d => {
    const today = w.phase === 'during' && w.day === d;
    const complete = d.cards.length && d.cards.every(c => syncState.marks[c.id]);
    return `<a href="#/day/${d.day}" class="${d === active ? 'on' : ''} ${today ? 'today' : ''} ${complete ? 'complete' : ''} ${isAnniv(d) ? 'anniv' : ''}">
      <small>${esc(d.label.split(' ')[0] || '')}</small><b>${d.day}</b></a>`;
  }).join('')}</nav>`;
}

// ----- Card -----

function card(c, day, { hero = false } = {}) {
  const mark = syncState.marks[c.id];
  const hue = typeHue(c.typeKey);
  const nav = navLinks(c, day);
  return `
  <article class="card ${hero ? 'hero-card' : ''} ${mark || ''} ${c.leg ? 'travel' : ''}" style="--h:${hue}">
    ${mark === 'done' ? '<div class="hanko" aria-label="Done">済</div>' : ''}
    <div class="cardtop">
      <span class="type">${c.typeEmoji} ${esc(c.typeLabel)}</span>
      <span class="when">${c.slotEmoji} ${esc(c.exactTime || c.slotLabel)}</span>
      ${c.status ? `<span class="pill status-${esc(c.status.toLowerCase().replace(/\s+/g, '-'))}">${esc(c.status)}</span>` : ''}
    </div>
    <h3>${esc(c.activity)}</h3>
    ${c.leg ? ticket(c) : ''}
    ${c.location ? `<p class="line">📍 ${esc(c.location)}</p>` : ''}
    ${c.gettingThere ? `<p class="line">🧭 ${esc(c.gettingThere)}</p>` : ''}
    ${c.notes ? `<p class="notes">${linkify(c.notes)}</p>` : ''}
    <div class="actions">
      ${nav}
      <span class="spacer"></span>
      <button class="chip ${mark === 'skipped' ? 'on' : ''}" data-action="mark" data-id="${c.id}" data-val="skipped">Skip</button>
      <button class="chip done ${mark === 'done' ? 'on' : ''}" data-action="mark" data-id="${c.id}" data-val="done">✓ Done</button>
    </div>
  </article>`;
}

function ticket(c) {
  const leg = c.leg;
  const seats = c.seats.length ? c.seats : leg.seats;
  // A leg can be several trains ("Tsurugi 17 / Thunderbird 18"); show the one this card is about.
  const partial = c.trains.length && c.trains.length < leg.numbers.length;
  return `<div class="ticket">
    <div class="tk-row">
      <div class="tk-num">${esc(partial ? c.trains.join(' / ') : leg.number)}</div>
      <div class="tk-mode">${esc(leg.mode)}</div>
    </div>
    <div class="tk-times"><b>${esc(leg.departs)}</b><span>→</span><b>${esc(leg.arrives)}</b>${partial ? '<small class="muted">whole journey</small>' : ''}</div>
    ${seats.map(s => `<div class="tk-seat">${s.train && seats.length > 1 ? `<small>${esc(s.train)}</small>` : ''}
      <span>Car <b>${esc(s.car)}</b></span><span>Seats <b>${s.seats.map(esc).join(' &amp; ')}</b></span></div>`).join('')}
    ${leg.confirmation ? `<button class="tk-conf" data-action="copy" data-text="${esc(leg.confirmation)}">Ref <b>${esc(leg.confirmation)}</b> <small>tap to copy</small></button>` : ''}
  </div>`;
}

function navLinks(c, day) {
  if (!c.location || c.isOvernight) return '';
  const dest = c.location.split('→').pop().trim();
  const inJapan = day.tz === 'Asia/Tokyo';
  const q = encodeURIComponent(inJapan && !/japan/i.test(dest) ? `${dest}, Japan` : dest);
  let html = `<a class="chip nav" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit">🗺️ Navigate</a>`;
  if (inJapan && CONFIG.CITYMAPPER_CITIES.some(city => (day.base || '').includes(city))) {
    html += `<a class="chip nav" target="_blank" rel="noopener" href="https://citymapper.com/directions?endaddress=${q}&endname=${encodeURIComponent(dest)}">🟢 Citymapper</a>`;
  }
  return html;
}

function overnight(day) {
  const stay = day.stay;
  if (!stay && !day.overnightText) return '';
  const name = stay?.name || day.overnightText;
  const q = encodeURIComponent(`${name}, ${stay?.city || ''}, Japan`);
  const tag = day.checkIn ? 'Check in tonight' : 'Tonight';
  return `<aside class="overnight">
    <div class="moon">🌙</div>
    <div><div class="kicker">${tag}</div><b>${esc(name)}</b>
      ${stay ? `<div class="muted">${esc(stay.city)} · night ${daysBetween(stay.checkIn, day.date) + 1} of ${stay.nights ?? '?'}</div>` : ''}
      ${stay?.confirmation ? `<div class="muted">Ref ${esc(stay.confirmation)}</div>` : ''}
    </div>
    ${stay ? `<span class="chips"><a class="chip" href="#/taxi" aria-label="Taxi card">🚕</a><a class="chip nav" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${q}">🗺️</a></span>` : ''}
  </aside>`;
}

function earlyBanner(day, early, label) {
  return `<aside class="early">
    <div class="big">⏰</div>
    <div><b>${label}: wake by ${early.wakeLabel}</b>
      <div class="muted">${esc(early.card.activity)} at ${esc(early.card.exactTime.replace('~', ''))}</div></div>
    <a class="chip" href="${icsHref(day, early)}" download="wake-${day.date}.ics">+ Alarm</a>
  </aside>`;
}

function decision(d) {
  const chosen = syncState.choices[d.id];
  return `<section class="decision ${chosen ? 'resolved' : ''}">
    <div class="kicker">${chosen ? '✅ Decided' : '🤔 Open decision'} · ${esc(d.topic)}</div>
    ${chosen ? `<b>${esc(chosen)}</b>` : `<p>${esc(d.question)}</p>`}
    <div class="opts">
      ${d.options.map(o => `<button class="chip ${chosen === o ? 'on' : ''}" data-action="choose" data-id="${d.id}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}
    </div>
    ${d.leaning && !chosen ? `<div class="muted">Leaning: ${esc(d.leaning)}</div>` : ''}
  </section>`;
}

// ----- Stamps -----

function viewStamps() {
  const got = trip.stamps.filter(stampGot).length;
  return `
    <header class="page"><h1>Eki stamps</h1>
      <p class="muted">${got} of ${trip.stamps.length} collected</p>${progress(got, trip.stamps.length)}</header>
    <div class="stampbook">
      ${trip.stamps.map(s => {
        const have = stampGot(s);
        return `<button class="stamp ${have ? 'got' : ''} ${s.confirmed ? '' : 'maybe'}" data-action="stamp" data-id="${s.id}">
          <div class="ink"><span>${esc(initials(s.station))}</span><small>${esc(s.station)}</small></div>
          <div class="info"><b>${esc(s.station)}</b>
            <div class="muted">${esc(s.day)}</div>
            <p>${esc(s.design)}</p>
            <p class="where">🔎 ${esc(s.where)}</p></div>
        </button>`;
      }).join('')}
    </div>`;
}

const stampGot = s => s.sheetCollected || !!syncState.stamps[s.id];
const initials = name => name.replace(/\b(station|airport)\b/gi, '').trim().slice(0, 2);

// ----- Prep -----

function viewPrep() {
  const w = whereAreWe();
  const today = wallClock(w.instant, 'Europe/London').date;
  const todo = trip.countdown.filter(t => !t.done);
  const done = trip.countdown.filter(t => t.done);
  const open = trip.decisions;
  return `
    <header class="page"><h1>Prep</h1><p class="muted">${todo.length} to do · ${done.length} done</p>
      ${progress(done.length, trip.countdown.length)}</header>
    <ul class="tasks">${todo.sort((a, b) => (a.dueISO || '9') < (b.dueISO || '9') ? -1 : 1).map(t => taskRow(t, today)).join('')}</ul>
    ${open.length ? `<h2 class="section">Decisions</h2>${open.map(decision).join('')}` : ''}
    <h2 class="section">Stays</h2>
    <ul class="stays">${trip.stays.map(s => `<li><b>${esc(s.city)}</b> <span class="muted">${shortDate(s.checkIn)} → ${shortDate(s.checkOut)} · ${s.nights ?? '?'}n</span><div>${esc(s.name)}</div></li>`).join('')}</ul>
    <details class="done-tasks"><summary>${done.length} done</summary><ul class="tasks">${done.map(t => taskRow(t, today)).join('')}</ul></details>
    <section class="about">
      <div>📄 Plan from Google Sheet · ${meta.fetchedAt ? `updated ${ago(meta.fetchedAt)}` : 'not loaded'} ${meta.loading ? '· refreshing…' : ''}</div>
      <div>${sync?.mode === 'firebase' ? `🔗 Live sync ${sync.online ? 'connected' : 'offline — will catch up'}` : CONFIG.FIREBASE ? '🔌 Live sync not loaded — changes kept on this phone' : '📱 Marks saved on this phone only (Firebase not set up)'}${sync?.pending ? ` · ${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting to sync` : ''}</div>
      <div>🌦️ Weather ${weather().fetchedAt ? `updated ${ago(weather().fetchedAt)}` : 'not loaded yet'}</div>
      <button class="btn ghost" data-action="refresh">↻ Reload plan</button>
    </section>`;
}

function taskRow(t, today = wallClock(nowInstant(), 'Europe/London').date) {
  const left = t.dueISO ? daysBetween(today, t.dueISO) : null;
  const urgency = left == null ? '' : left < 0 ? 'overdue' : left <= 3 ? 'soon' : '';
  return `<li class="task ${t.done ? 'done' : ''} ${urgency}">
    <span class="cat">${esc(t.category)}</span>
    <b>${esc(t.task)}</b>
    ${t.dueISO ? `<span class="due">${esc(t.due)}${left != null && !t.done ? ` · ${left < 0 ? `${-left}d overdue` : left === 0 ? 'today' : `${left}d`}` : ''}</span>` : ''}
    ${t.notes ? `<div class="muted">${esc(t.notes)}</div>` : ''}
  </li>`;
}

// ---------- small helpers ----------

// Anniversary (from the encrypted secrets: { date: 'MM-DD', since: YYYY, names }).
const anniv = () => CONFIG.ANNIVERSARY;
const isAnniv = day => !!anniv() && day?.date?.slice(5) === anniv().date;
const annivDay = () => trip.days.find(isAnniv) || null;
const annivYears = day => Number(day.date.slice(0, 4)) - anniv().since;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function annivBanner(day) {
  if (!isAnniv(day)) return '';
  return `<aside class="anniv-banner"><div class="big">♥</div>
    <div><b>${esc(anniv().names)}</b><div>${plural(annivYears(day), 'year')} since we met</div></div></aside>`;
}

// Forecast for a day's base city (open-meteo covers ~16 days ahead; past days keep their last forecast).
function wxFor(day) {
  const city = cityFor(day.base) || cityFor(day.stay?.city) || cityFor(day.overnightText);
  return city ? { city, ...weather().byCity[city]?.[day.date] } : null;
}

function wxChip(day, long = false) {
  const w = wxFor(day);
  if (w?.code == null) return '';
  const rain = w.rain >= 30 ? ` · ☔ ${w.rain}%` : '';
  const gust = long && w.gust >= 40 ? ` · 💨 ${w.gust} km/h` : '';
  return `<span class="wx">${wxEmoji(w.code)} ${w.max}°/${w.min}°${rain}${gust}</span>`;
}

function wxWarning(day) {
  const w = wxFor(day);
  if (w?.code == null) return '';
  const bits = [];
  if (w.rain >= 70) bits.push(`${w.rain}% chance of rain — take umbrellas`);
  if (w.gust >= 60) bits.push(`gusts up to ${w.gust} km/h — check trains are running`);
  if (!bits.length) return '';
  return `<aside class="early"><div class="big">${w.gust >= 60 ? '🌀' : '☔'}</div>
    <div><b>Tomorrow in ${esc(w.city)}</b><div class="muted">${bits.join('; ')}</div></div></aside>`;
}

function intensity(n) {
  if (!n) return '';
  return `<span class="intensity" title="Intensity ${n}/5">${'🔥'.repeat(n)}<span class="dim">${'🔥'.repeat(5 - n)}</span></span>`;
}

const markClass = c => syncState.marks[c.id] || '';
const typeHue = key => ({ travel: 215, food: 18, 'free time': 150, sight: 280, nightlife: 320, experience: 45 }[key] ?? parseInt(hash(key), 36) % 360);
const countdownTo = m => m > 0 ? ` · in ${m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`}` : '';

function ago(iso) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function linkify(s) {
  return esc(s).replace(/https?:\/\/[^\s)]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
}

// ---------- carousel ----------

function focusCard(id, smooth = true) {
  const deck = document.getElementById('deck');
  if (!deck) return;
  const el = (id && deck.querySelector(`[data-id="${id}"]`)) || deck.firstElementChild;
  if (el) deck.scrollTo({ left: el.offsetLeft - deck.firstElementChild.offsetLeft, behavior: smooth ? 'smooth' : 'instant' });
  const strip = document.getElementById('strip');
  strip?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

let currentSlideId = null;

function watchCarousel() {
  const deck = document.getElementById('deck');
  if (!deck) return;
  const slides = [...deck.children];
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const i = slides.indexOf(e.target);
      currentSlideId = e.target.dataset.id;
      document.getElementById('deckpos').textContent = `${i + 1} / ${slides.length}`;
      document.querySelectorAll('[data-tl]').forEach(b => b.classList.toggle('current', b.dataset.tl === e.target.dataset.id));
      const r = route();
      history.replaceState(null, '', `#/day/${r.a}/${e.target.dataset.id}`);
    }
  }, { root: deck, threshold: 0.6 });
  slides.forEach(s => io.observe(s));
}

// Re-renders (sync updates from the other phone) mustn't eat what's being typed.
function snapshotFields() {
  const active = document.activeElement;
  return {
    values: [...app.querySelectorAll('input[id], textarea[id]')].map(el => [el.id, el.value]),
    focus: active?.id && app.contains(active) ? { id: active.id, start: active.selectionStart, end: active.selectionEnd } : null,
  };
}

function restoreFields({ values, focus }) {
  for (const [id, v] of values) {
    const el = document.getElementById(id);
    // Journal text is shared state: take the other phone's version unless it's the field being typed in.
    if (el && (!el.dataset.journal || focus?.id === id)) el.value = v;
  }
  const el = focus && document.getElementById(focus.id);
  if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(focus.start, focus.end); } catch {} }
}

function snapshotScroll() {
  return { y: window.scrollY, x: document.getElementById('deck')?.scrollLeft, sx: document.getElementById('strip')?.scrollLeft };
}

function restoreScroll({ y, x, sx }) {
  if (x != null && document.getElementById('deck')) document.getElementById('deck').scrollLeft = x;
  if (sx != null && document.getElementById('strip')) document.getElementById('strip').scrollLeft = sx;
  window.scrollTo(0, y);
}

// ---------- actions ----------

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, val } = btn.dataset;
  if (action === 'mark') {
    sync.set(`marks/${id}`, syncState.marks[id] === val ? null : val);
    if (val === 'done' && syncState.marks[id] === 'done') buzz();
  } else if (action === 'stamp') {
    const s = trip.stamps.find(x => x.id === id);
    if (s.sheetCollected) return;
    sync.set(`stamps/${id}`, syncState.stamps[id] ? null : new Date().toISOString());
    if (syncState.stamps[id]) buzz();
  } else if (action === 'choose') {
    sync.set(`choices/${id}`, syncState.choices[id] === val ? null : val);
  } else if (action === 'refresh') {
    refresh(true);
  } else if (action === 'goto') {
    focusCard(id);
    document.getElementById('deck').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (action === 'step') {
    const slides = [...document.getElementById('deck').children];
    const i = Math.max(0, slides.findIndex(el => el.dataset.id === currentSlideId));
    const target = slides[Math.min(slides.length - 1, Math.max(0, i + Number(btn.dataset.dir)))];
    focusCard(target.dataset.id);
  } else if (action === 'copy') {
    navigator.clipboard?.writeText(btn.dataset.text).then(() => toast('Copied'));
  } else if (kit.kitClick(action, btn, ctx())) {
    buzz();
  }
});

document.addEventListener('input', kit.kitInput);
document.addEventListener('change', e => kit.kitChange(e, ctx()));
document.addEventListener('submit', e => { if (app.contains(e.target) && sync) kit.kitSubmit(e, ctx()); });

function buzz() { navigator.vibrate?.(30); }

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.remove(), 1400);
}

boot();
