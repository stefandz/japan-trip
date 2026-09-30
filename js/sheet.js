// Fetches the raw tabs from the Google Sheet as { tabName: string[][] }.
import { CONFIG } from '../config.js';

export const TABS = ['Overview', 'Itinerary', 'Accommodation', 'Travel', 'Eki Stamps', 'Countdown', 'Open Decisions'];

const CACHE_KEY = 'jt.sheetCache.v1';

export async function fetchTabs() {
  // ?data=<url> loads a batchGet-shaped JSON file instead (handy for testing offline).
  const override = new URLSearchParams(location.search).get('data');
  let tabs;
  if (override) tabs = fromBatchGet(await getJSON(override));
  else if (CONFIG.SHEETS_API_KEY) tabs = await viaSheetsApi();
  else tabs = await viaGviz();
  const fetchedAt = new Date().toISOString();
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ tabs, fetchedAt })); } catch {}
  return { tabs, fetchedAt, fromCache: false };
}

export function cachedTabs() {
  try {
    const hit = JSON.parse(localStorage.getItem(CACHE_KEY));
    return hit ? { ...hit, fromCache: true } : null;
  } catch { return null; }
}

async function viaSheetsApi() {
  const params = TABS.map(t => 'ranges=' + encodeURIComponent(`'${t}'`)).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values:batchGet?${params}&key=${CONFIG.SHEETS_API_KEY}`;
  return fromBatchGet(await getJSON(url));
}

function fromBatchGet(json) {
  const out = {};
  for (const vr of json.valueRanges || []) {
    // range comes back as "'Eki Stamps'!A1:F17" or "Travel!A1:J12"
    const name = vr.range.split('!')[0].replace(/^'|'$/g, '');
    out[name] = vr.values || [];
  }
  return out;
}

async function viaGviz() {
  const entries = await Promise.all(TABS.map(async t => {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(t)}`;
    const notShared = `Can't read the Sheet — is it shared as "anyone with the link can view"?`;
    // An unshared Sheet redirects to a Google login page, which the browser blocks outright.
    const res = await fetch(url).catch(() => { throw new Error(navigator.onLine === false ? 'Offline' : notShared); });
    if (!res.ok) throw new Error(`${notShared} (${res.status})`);
    return [t, parseCSV(await res.text())];
  }));
  return Object.fromEntries(entries);
}

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Couldn't load the plan (${res.status})`);
  return res.json();
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
