// Small live extras (exchange rate, weather), cached in localStorage so they work offline.
import { CITIES } from './content.js';

const RATE_KEY = 'jt.rate.v1';
const WX_KEY = 'jt.weather.v1';
const FALLBACK_RATE = 205;   // ¥ per £, only used until the first successful fetch

export function rate() {
  const hit = read(RATE_KEY);
  return hit || { jpyPerGbp: FALLBACK_RATE, date: null, fetchedAt: null };
}

export async function refreshRate() {
  if (fresh(read(RATE_KEY), 6)) return false;
  const res = await fetch('https://api.frankfurter.dev/v1/latest?base=GBP&symbols=JPY');
  if (!res.ok) throw new Error(`Rate ${res.status}`);
  const json = await res.json();
  write(RATE_KEY, { jpyPerGbp: json.rates.JPY, date: json.date, fetchedAt: new Date().toISOString() });
  return true;
}

// { city: { 'YYYY-MM-DD': { code, max, min, rain, gust } } }. Old days are kept, so past forecasts survive.
export function weather() {
  return read(WX_KEY) || { fetchedAt: null, byCity: {} };
}

export async function refreshWeather() {
  const cache = weather();
  if (fresh(cache, 2)) return false;
  const names = Object.keys(CITIES);
  const q = new URLSearchParams({
    latitude: names.map(n => CITIES[n].lat).join(','),
    longitude: names.map(n => CITIES[n].lon).join(','),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max',
    timezone: 'Asia/Tokyo', forecast_days: 16,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
  if (!res.ok) throw new Error(`Weather ${res.status}`);
  const json = await res.json();
  (Array.isArray(json) ? json : [json]).forEach((loc, i) => {
    const d = loc.daily, city = (cache.byCity[names[i]] ||= {});
    d.time.forEach((date, j) => {
      if (d.weather_code[j] == null) return;
      city[date] = {
        code: d.weather_code[j], max: Math.round(d.temperature_2m_max[j]), min: Math.round(d.temperature_2m_min[j]),
        rain: d.precipitation_probability_max[j], gust: Math.round(d.wind_gusts_10m_max[j]),
      };
    });
  });
  cache.fetchedAt = new Date().toISOString();
  write(WX_KEY, cache);
  return true;
}

export function wxEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67 || (code >= 80 && code <= 82)) return '🌧️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}

const fresh = (hit, hours) => hit?.fetchedAt && Date.now() - Date.parse(hit.fetchedAt) < hours * 3600e3;
function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }
