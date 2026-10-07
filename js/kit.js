// The 🧰 Kit tab: phrases, yen, taxi card, SOS, spend log, food list, gifts, how-to. Plus the day journal.
// Views take a ctx from app.js: { trip, state, sync, where, today }.
import { CONFIG } from '../config.js';
import { PHRASES, SOS_NUMBERS, FOOD, HOWTO, CITIES, cityFor } from './content.js';
import { rate } from './live.js';
import { hash } from './parse.js';
import { esc, progress, shortDate, inkAnim } from './util.js';

export const KIT_ROUTES = ['kit', 'phrases', 'yen', 'taxi', 'sos', 'spend', 'food', 'gifts', 'howto'];

const yen = n => '¥' + Math.round(n).toLocaleString('en-GB');
const gbp = n => '£' + (n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString('en-GB'));
const toGbp = y => y / rate().jpyPerGbp;
const back = `<a class="back" href="#/kit">‹ Kit</a>`;

// ----- hub -----

export function viewKit(ctx) {
  const spent = Object.values(ctx.state.spend).reduce((t, e) => t + e.yen, 0);
  const food = foodItems(ctx.state);
  const gifts = ctx.trip?.gifts || [];
  const tiles = [
    ['phrases', '🗣️', 'Phrases', `${PHRASES.length} to show or say`],
    ['yen', '💴', 'Yen', `£1 = ¥${rate().jpyPerGbp.toFixed(1)}`],
    ['taxi', '🚕', 'Taxi card', 'Hotel address in Japanese'],
    ['sos', '🆘', 'SOS', '110 · 119 · embassy'],
    ['spend', '🧾', 'Spend', spent ? `${yen(spent)} so far` : 'Log what you spend'],
    ['food', '🍡', 'Food list', `${food.filter(f => ctx.state.food[f.id]).length} / ${food.length} eaten`],
    ['gifts', '🎁', 'Gifts', gifts.length ? `${gifts.filter(g => giftGot(g, ctx.state)).length} / ${gifts.length} bought` : 'Presents to bring home'],
    ['howto', '📖', 'How-to', 'Onsen, IC cards, manners…'],
  ];
  return `<header class="page"><h1>Kit</h1><p class="muted">Everything here works offline.</p></header>
    <div class="tiles">${tiles.map(([r, e, t, s]) => `<a class="tile" href="#/${r}"><span>${e}</span><b>${t}</b><small>${esc(s)}</small></a>`).join('')}</div>`;
}

// ----- phrases -----

let phraseQuery = '';

export function viewPhrases() {
  return `${back}<header class="page"><h1>Phrases</h1><p class="muted">Tap one to show it full screen.</p></header>
    <input id="ph-q" class="field" type="search" placeholder="Search in English, e.g. toilet" value="${esc(phraseQuery)}" autocomplete="off">
    <div id="ph-list">${phraseList()}</div>`;
}

function phraseList() {
  const q = phraseQuery.trim().toLowerCase();
  const hits = PHRASES.map((p, i) => [p, i]).filter(([p]) => !q || p.some(x => x.toLowerCase().includes(q)));
  if (!hits.length) return `<div class="empty small">Nothing for “${esc(q)}”. Try another word.</div>`;
  let cat = null, html = '';
  for (const [[c, en, ja, ro], i] of hits) {
    if (c !== cat) { html += `<h2 class="section">${esc(c)}</h2>`; cat = c; }
    html += `<button class="phrase" data-action="show-phrase" data-i="${i}"><b>${esc(en)}</b><span class="ja">${esc(ja)}</span><small>${esc(ro)}</small></button>`;
  }
  return html;
}

// ----- yen -----

export function viewYen() {
  const r = rate();
  const amounts = [100, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 50000];
  const off = Math.round(Math.abs(200 / r.jpyPerGbp - 1) * 100);
  return `${back}<header class="page"><h1>Yen</h1>
      <p class="muted">£1 = ¥${r.jpyPerGbp.toFixed(2)} · ${r.date ? `rate from ${shortDate(r.date)}` : 'approximate — connect once to get today’s rate'}</p></header>
    <div class="convert">
      <label><span>¥</span><input id="cv-jpy" class="field" inputmode="decimal" placeholder="1,000"></label>
      <div class="swap">⇅</div>
      <label><span>£</span><input id="cv-gbp" class="field" inputmode="decimal" placeholder="${(1000 / r.jpyPerGbp).toFixed(2)}"></label>
    </div>
    <p class="tip">🧠 In your head: <b>drop two zeros and halve</b>. ¥3,000 → 30 → £15. That's about ${off}% ${200 > r.jpyPerGbp ? 'under' : 'over'}.</p>
    <table class="rates">${amounts.map(a => `<tr><td>${yen(a)}</td><td>${gbp(a / r.jpyPerGbp)}</td></tr>`).join('')}</table>
    <p class="tip">🧾 Tax-free starts at ${yen(5000)} (${gbp(5000 / r.jpyPerGbp)}) in one shop on one day.</p>`;
}

function convert(from) {
  const r = rate().jpyPerGbp;
  const src = document.getElementById(from === 'jpy' ? 'cv-jpy' : 'cv-gbp');
  const dst = document.getElementById(from === 'jpy' ? 'cv-gbp' : 'cv-jpy');
  const n = parseFloat(src.value.replace(/[,\s¥£]/g, ''));
  dst.value = isNaN(n) ? '' : from === 'jpy' ? (n / r).toFixed(2) : Math.round(n * r).toLocaleString('en-GB');
}

// ----- taxi -----

export function viewTaxi(ctx) {
  const tonight = ctx.where.day?.stay || ctx.trip.stays[0];
  const others = ctx.trip.stays.filter(s => s !== tonight);
  const missing = ctx.trip.stays.some(s => !s.addressJa);
  return `${back}<header class="page"><h1>Taxi card</h1><p class="muted">Show the driver. Tap for full screen.</p></header>
    ${tonight ? taxiCard(tonight, true) : ''}
    ${missing ? `<p class="tip">✍️ Some hotels have no Japanese address yet. Add <b>Name (JP)</b> and <b>Address (JP)</b> columns (and <b>Phone</b> if you like) to the Sheet's Accommodation tab, copied from each booking confirmation or Google Maps.</p>` : ''}
    <h2 class="section">Other stays</h2>
    ${others.map(s => taxiCard(s, false)).join('')}`;
}

function taxiCard(s, big) {
  const q = encodeURIComponent(`${s.name}, ${s.city}, Japan`);
  return `<article class="taxi ${big ? 'big' : ''}">
    <div class="kicker">${big ? 'Tonight · ' : ''}${esc(s.city)} · ${shortDate(s.checkIn)}–${shortDate(s.checkOut)}</div>
    <div class="ja">${esc(s.nameJa || s.name)}</div>
    ${s.addressJa ? `<div class="addr">${esc(s.addressJa)}</div>` : ''}
    ${s.nameJa ? `<div class="muted">${esc(s.name)}</div>` : ''}
    <div class="actions">
      <button class="chip" data-action="show-taxi" data-checkin="${esc(s.checkIn)}">🚕 Show driver</button>
      ${s.phone ? `<a class="chip nav" href="tel:${esc(s.phone.replace(/\s/g, ''))}">📞 Call</a>` : ''}
      <a class="chip nav" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${q}">🗺️ Map</a>
    </div>
  </article>`;
}

// ----- SOS -----

export function viewSos(ctx) {
  const people = emergencyPeople();
  const tonight = ctx.where.day?.stay;
  const help = PHRASES.map((p, i) => [p, i]).filter(([p]) => p[0] === 'Help');
  return `${back}<header class="page"><h1>SOS</h1><p class="muted">Tap a number to call.</p></header>
    <div class="sos">${SOS_NUMBERS.map(n => `<a class="sosrow" href="tel:${n.tel.replace(/-/g, '')}">
      <b>${esc(n.tel)}</b><span>${esc(n.label)}</span><small>${esc(n.note)}</small></a>`).join('')}</div>
    ${people.map(personBlock).join('')}
    ${!people.length ? `<p class="tip">🔒 Each person's insurance, medical notes and contacts can go in <code>EMERGENCY.people</code> in the encrypted secrets.json.</p>` : ''}
    ${tonight ? `<a class="btn wide ghost" href="#/taxi">🏨 Tonight: ${esc(tonight.nameJa || tonight.name)} →</a>` : ''}
    <h2 class="section">Say it</h2>
    ${help.map(([[, en, ja, ro], i]) => `<button class="phrase" data-action="show-phrase" data-i="${i}"><b>${esc(en)}</b><span class="ja">${esc(ja)}</span><small>${esc(ro)}</small></button>`).join('')}`;
}

// EMERGENCY.people: [{ name, insurance: { name, policy, phone }, medical: [{ en, ja }], contacts: [{ name, phone }] }].
// Blank fields and "(example)" lines are skipped, so a half-filled template is harmless.
function emergencyPeople() {
  return (CONFIG.EMERGENCY?.people || []).map(p => ({
    name: p.name || '',
    insurance: p.insurance?.name || p.insurance?.policy ? p.insurance : null,
    medical: (p.medical || []).filter(m => m.en && !m.en.startsWith('(example)')),
    contacts: (p.contacts || []).filter(c => c.name && c.phone),
  })).filter(p => p.insurance || p.medical.length || p.contacts.length);
}

const tel = n => `tel:${esc(n.replace(/[\s-]/g, ''))}`;

function personBlock(p, pi) {
  return `<section class="person">
    <h2 class="section">${esc(p.name || `Person ${pi + 1}`)}</h2>
    ${p.insurance ? `<div class="task"><span class="cat">Travel insurance</span><b>${esc(p.insurance.name)}</b>
      ${p.insurance.policy ? `<div>Policy <b class="mono">${esc(p.insurance.policy)}</b></div>` : ''}
      ${p.insurance.phone ? `<a href="${tel(p.insurance.phone)}">📞 ${esc(p.insurance.phone)}</a>` : ''}</div>` : ''}
    ${p.medical.map((m, i) => `<button class="phrase" data-action="show-medical" data-p="${pi}" data-i="${i}">
      <b>🩺 ${esc(m.en)}</b><span class="ja">${esc(m.ja || '')}</span></button>`).join('')}
    ${p.contacts.map(c => `<a class="task contact" href="${tel(c.phone)}"><span class="cat">Contact</span><b>${esc(c.name)}</b>${esc(c.phone)}</a>`).join('')}
  </section>`;
}

// ----- spend -----

const CATS = { food: '🍜', transport: '🚃', shopping: '🛍️', sights: '⛩️', stay: '🏨', other: '✨' };
let spendCat = 'food';

export function viewSpend(ctx) {
  const entries = Object.entries(ctx.state.spend).map(([id, e]) => ({ id, ...e })).sort((a, b) => b.at < a.at ? -1 : 1);
  const total = entries.reduce((t, e) => t + e.yen, 0);
  const todays = entries.filter(e => e.date === ctx.today).reduce((t, e) => t + e.yen, 0);
  const byCat = Object.keys(CATS).map(c => [c, entries.filter(e => e.cat === c).reduce((t, e) => t + e.yen, 0)]).filter(([, v]) => v);
  const byDate = Map.groupBy ? Map.groupBy(entries, e => e.date) : entries.reduce((m, e) => m.set(e.date, [...(m.get(e.date) || []), e]), new Map());
  return `${back}<header class="page"><h1>Spend</h1>
      <div class="stats two"><div><b>${yen(todays)}</b><span>today · ${gbp(toGbp(todays))}</span></div>
      <div><b>${yen(total)}</b><span>trip · ${gbp(toGbp(total))}</span></div></div></header>
    <form class="spendform" data-form="spend">
      <input id="sp-amt" class="field" inputmode="numeric" placeholder="¥ amount" required autocomplete="off">
      <input id="sp-what" class="field" placeholder="What for? (optional)" autocomplete="off">
      <div class="opts">${Object.entries(CATS).map(([c, e]) => `<button type="button" class="chip ${c === spendCat ? 'on' : ''}" data-action="spcat" data-val="${c}">${e} ${c}</button>`).join('')}</div>
      <button class="btn wide">Add</button>
    </form>
    ${byCat.length ? `<h2 class="section">By type</h2><div class="bars">${byCat.map(([c, v]) => `
      <div><span>${CATS[c]} ${c}</span><i style="width:${Math.round(v / total * 100)}%"></i><b>${yen(v)}</b></div>`).join('')}</div>` : ''}
    ${[...byDate].map(([date, list]) => `<h2 class="section">${shortDate(date)} <span class="muted">· ${yen(list.reduce((t, e) => t + e.yen, 0))}</span></h2>
      <ul class="tasks">${list.map(e => `<li class="task spend"><span>${CATS[e.cat] || '✨'}</span><b>${esc(e.what || e.cat)}</b>
        <span class="amt">${yen(e.yen)}<small>${gbp(toGbp(e.yen))}</small></span>
        <button class="x" data-action="spend-del" data-id="${e.id}" aria-label="Delete">×</button></li>`).join('')}</ul>`).join('')}
    ${entries.length ? '' : '<div class="empty small">Nothing logged yet.</div>'}`;
}

// ----- food -----

function foodItems(state) {
  return [
    ...FOOD.map(([name, where]) => ({ id: hash(name), name, where })),
    ...Object.entries(state.foodCustom).map(([id, name]) => ({ id, name, where: 'Added by you', custom: true })),
  ];
}

export function viewFood(ctx) {
  const items = foodItems(ctx.state);
  const eaten = items.filter(f => ctx.state.food[f.id]);
  const row = f => `<li><button class="fooditem ${ctx.state.food[f.id] ? 'got' : ''}" data-action="food" data-id="${f.id}">
      <span class="seal"${ctx.state.food[f.id] ? inkAnim(ctx.state.food[f.id]) : ''}>${ctx.state.food[f.id] ? '済' : ''}</span><b>${esc(f.name)}</b><small>${esc(f.where)}</small></button>
      ${f.custom ? `<button class="x" data-action="food-del" data-id="${f.id}" aria-label="Remove">×</button>` : ''}</li>`;
  return `${back}<header class="page"><h1>Food list</h1><p class="muted">${eaten.length} of ${items.length} eaten</p>${progress(eaten.length, items.length)}</header>
    <form class="addrow" data-form="food"><input id="food-new" class="field" placeholder="Add something to try" autocomplete="off" required><button class="btn">Add</button></form>
    <ul class="foodlist">${items.filter(f => !ctx.state.food[f.id]).map(row).join('')}</ul>
    ${eaten.length ? `<h2 class="section">Eaten</h2><ul class="foodlist">${eaten.map(row).join('')}</ul>` : ''}`;
}

// ----- gifts (ideas live in the Sheet's Gifts tab; ticks sync like stamps) -----

const giftGot = (g, state) => g.sheetBought || !!state.gifts[g.id];
const URL_RE = /https?:\/\/[^\s)]+/g;
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

export function viewGifts(ctx) {
  const gifts = ctx.trip.gifts;
  if (!gifts.length) return `${back}<header class="page"><h1>Gifts</h1></header>
    <div class="empty small">🎁 Nothing on the list yet. Add rows to the Sheet's <b>Gifts</b> tab (For, Gift, Where to look, Budget, Status, Notes).</div>`;
  const got = gifts.filter(g => giftGot(g, ctx.state)).length;
  const people = [...new Set(gifts.map(g => g.for || 'Anyone'))];
  const row = g => {
    const have = giftGot(g, ctx.state);
    // Links can't sit inside the tick button, so they come out of the text and go underneath as chips.
    const links = `${g.where || ''} ${g.notes || ''}`.match(URL_RE) || [];
    const text = s => (s || '').replace(URL_RE, '').replace(/\s+/g, ' ').trim();
    const bits = [text(g.where) && `🔎 ${text(g.where)}`, g.budget && `💴 ${g.budget}`, text(g.notes)].filter(Boolean).map(esc).join(' · ');
    return `<li><button class="fooditem ${have ? 'got' : ''}" data-action="gift" data-id="${g.id}">
      <span class="seal"${have && ctx.state.gifts[g.id] ? inkAnim(ctx.state.gifts[g.id]) : ''}>${have ? '済' : ''}</span>
      <b>${esc(g.gift)}</b>${bits ? `<small>${bits}</small>` : ''}</button>
      ${links.length ? `<div class="giftlinks">${links.map(u => `<a class="chip nav" target="_blank" rel="noopener" href="${esc(u)}">🔗 ${esc(host(u))}</a>`).join('')}</div>` : ''}</li>`;
  };
  return `${back}<header class="page"><h1>Gifts</h1><p class="muted">${got} of ${gifts.length} bought</p>${progress(got, gifts.length)}</header>
    ${people.map(p => {
      const list = gifts.filter(g => (g.for || 'Anyone') === p);
      const n = list.filter(g => giftGot(g, ctx.state)).length;
      return `<h2 class="section">${esc(p)} <span class="muted">· ${n} / ${list.length}</span></h2>
        <ul class="foodlist">${list.map(row).join('')}</ul>`;
    }).join('')}
    <p class="tip">✍️ Add ideas in the Sheet's <b>Gifts</b> tab. Ticks here sync to both phones; writing <b>Bought</b> in its Status column also ticks one off.</p>`;
}

// ----- how-to -----

export function viewHowto() {
  return `${back}<header class="page"><h1>How-to</h1></header>
    ${HOWTO.map(([e, title, points]) => `<details class="howto"><summary><span>${e}</span>${esc(title)}</summary>
      <ul>${points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>`).join('')}`;
}

// ----- day notes (on each day view, before, during and after the trip) -----

export function notesBlock(day, state) {
  const n = state.notes[day.date] || {};
  return `<section class="daynotes">
    <h2 class="section">Notes <span class="muted">· shared between both phones</span></h2>
    <textarea id="nt-${day.date}" class="field" data-note="${day.date}" rows="4" placeholder="Reminders, ideas, things to ask…">${esc(n.text || '')}</textarea>
  </section>`;
}

// ----- journal (lives on each day view) -----

const MOODS = ['😫', '😐', '🙂', '😄', '🤩'];

export function journalBlock(day, state) {
  const j = state.journal[day.date] || {};
  return `<section class="journal">
    <h2 class="section">Journal</h2>
    <div class="opts">${MOODS.map(m => `<button class="chip mood ${j.mood === m ? 'on' : ''}" data-action="mood" data-date="${day.date}" data-val="${m}">${m}</button>`).join('')}</div>
    <textarea id="jr-${day.date}" class="field" data-journal="${day.date}" rows="3" placeholder="A line or two about the day…">${esc(j.text || '')}</textarea>
  </section>`;
}

// ----- full-screen "show" mode -----

let wakeLock = null;

function showBig({ big, mid, small }) {
  const el = document.createElement('div');
  // Short phrases fill the screen; long notes (e.g. medical history) get readable text that scrolls.
  const len = (big || '').length;
  el.className = `showbig ${len > 120 ? 'long' : len > 30 ? 'medium' : ''}`;
  el.innerHTML = `<div class="sb-big" lang="ja">${esc(big)}</div>${mid ? `<div class="sb-mid" lang="ja">${esc(mid)}</div>` : ''}
    ${small ? `<div class="sb-small">${esc(small)}</div>` : ''}<div class="sb-close">Tap to close</div>`;
  present(el);
}

// A booking's QR on plain white (so it scans in dark mode too), with its codes underneath.
function showQR(leg, i) {
  const el = document.createElement('div');
  el.className = 'showbig qr';
  el.innerHTML = `<div class="sb-small">${esc(leg.number || leg.leg)}${leg.qrs.length > 1 ? ` · ${i + 1} of ${leg.qrs.length}` : ''}</div>
    <img src="${esc(leg.qrs[i])}" alt="QR code">
    ${leg.collection ? `<div class="sb-code"><small>Collection code</small>${esc(leg.collection)}</div>` : ''}
    ${leg.confirmation ? `<div class="sb-small">Ref ${esc(leg.confirmation)}</div>` : ''}<div class="sb-close">Tap to close</div>`;
  present(el);
}

function present(el) {
  el.addEventListener('click', () => { el.remove(); wakeLock?.release().catch(() => {}); wakeLock = null; });
  document.body.append(el);
  navigator.wakeLock?.request('screen').then(l => { wakeLock = l; }).catch(() => {});
}

// ----- events (called from app.js) -----

export function kitClick(action, btn, ctx) {
  const { id, val } = btn.dataset;
  if (action === 'show-phrase') {
    const [, en, ja, ro] = PHRASES[btn.dataset.i];
    showBig({ big: ja, mid: ro, small: en });
  } else if (action === 'show-medical') {
    const p = emergencyPeople()[btn.dataset.p], m = p.medical[btn.dataset.i];
    showBig({ big: m.ja || m.en, mid: p.name, small: m.en });
  } else if (action === 'show-taxi') {
    const s = ctx.trip.stays.find(x => x.checkIn === btn.dataset.checkin);
    const city = CITIES[cityFor(s.city)]?.ja || s.city;
    showBig({ big: s.nameJa || s.name, mid: s.addressJa || city, small: 'この住所までお願いします' });
  } else if (action === 'show-qr') {
    showQR(ctx.trip.legs[btn.dataset.leg], Number(btn.dataset.i));
  } else if (action === 'spcat') {
    spendCat = val;
    btn.parentElement.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === btn));
  } else if (action === 'spend-del') {
    const e = ctx.state.spend[id];
    if (confirm(`Delete ${yen(e.yen)}${e.what ? ` (${e.what})` : ''}?`)) ctx.sync.set(`spend/${id}`, null);
  } else if (action === 'food') {
    ctx.sync.set(`food/${id}`, ctx.state.food[id] ? null : new Date().toISOString());
  } else if (action === 'gift') {
    const g = ctx.trip.gifts.find(x => x.id === id);
    if (g.sheetBought) return true;   // ticked in the Sheet; untick it there
    ctx.sync.set(`gifts/${id}`, ctx.state.gifts[id] ? null : new Date().toISOString());
  } else if (action === 'food-del') {
    if (confirm('Remove this from the list?')) { ctx.sync.set(`foodCustom/${id}`, null); ctx.sync.set(`food/${id}`, null); }
  } else if (action === 'mood') {
    const j = ctx.state.journal[btn.dataset.date] || {};
    ctx.sync.set(`journal/${btn.dataset.date}`, { ...j, mood: j.mood === val ? null : val, at: new Date().toISOString() });
  } else return false;
  return true;
}

export function kitInput(e) {
  if (e.target.id === 'ph-q') {
    phraseQuery = e.target.value;
    document.getElementById('ph-list').innerHTML = phraseList();
  } else if (e.target.id === 'cv-jpy') convert('jpy');
  else if (e.target.id === 'cv-gbp') convert('gbp');
}

export function kitChange(e, ctx) {
  const noteDate = e.target.dataset.note;
  if (noteDate) {
    const text = e.target.value.trim();
    if ((ctx.state.notes[noteDate]?.text || '') !== text) ctx.sync.set(`notes/${noteDate}`, text ? { text, at: new Date().toISOString() } : null);
    return;
  }
  const date = e.target.dataset.journal;
  if (!date) return;
  const j = ctx.state.journal[date] || {};
  if ((j.text || '') === e.target.value.trim()) return;
  ctx.sync.set(`journal/${date}`, { ...j, text: e.target.value.trim(), at: new Date().toISOString() });
}

export function kitSubmit(e, ctx) {
  const form = e.target.dataset.form;
  if (!form) return;
  e.preventDefault();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  if (form === 'spend') {
    const amt = document.getElementById('sp-amt'), what = document.getElementById('sp-what');
    const n = Math.round(parseFloat(amt.value.replace(/[,\s¥]/g, '')));
    if (!(n > 0)) return;
    const entry = { yen: n, what: what.value.trim(), cat: spendCat, date: ctx.today, at: new Date().toISOString() };
    amt.value = what.value = '';   // clear before the re-render so the field restore doesn't bring it back
    ctx.sync.set(`spend/${id}`, entry);
  } else if (form === 'food') {
    const input = document.getElementById('food-new');
    const name = input.value.trim();
    input.value = '';
    if (name) ctx.sync.set(`foodCustom/c${id}`, name);
  }
}
