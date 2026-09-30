// Passphrase lock. The Sheet ID and sync config live in secrets.enc.js,
// AES-GCM encrypted with a key derived from a passphrase only we know
// (see tools/seal.py). Each phone unlocks once, by typing the passphrase or
// opening a setup link ending in #key=<passphrase>, and keeps the derived key.
import { SEALED } from '../secrets.enc.js';

const KEY_STORE = 'jt.key.v1';
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const unb64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));

export async function unlock(app) {
  // Setup link: #key=… (fragments never reach the server). Scrub it from the URL straight away.
  const fromLink = location.hash.match(/^#key=(.+)$/);
  if (fromLink) history.replaceState(null, '', location.pathname + location.search + '#/now');

  const stored = loadStoredKey();
  if (stored) {
    const secrets = await open(await importRaw(stored)).catch(() => null);
    if (secrets) return secrets;
    forget();   // secrets were re-sealed with a new passphrase
  }
  if (fromLink) {
    const secrets = await tryPassphrase(decodeURIComponent(fromLink[1]));
    if (secrets) return secrets;
  }
  return prompt(app, !!(stored || fromLink));
}

export function forget() {
  try { localStorage.removeItem(KEY_STORE); } catch {}
}

function prompt(app, failedAlready) {
  document.body.classList.add('locked');
  app.innerHTML = `
    <form class="lock empty">
      <div class="big">🔒</div>
      <p>This is our trip. Enter the passphrase to open it on this phone.</p>
      <input type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" placeholder="Passphrase" required>
      <button class="btn wide">Unlock</button>
      <p class="lock-err">${failedAlready ? 'That key didn’t work — try the passphrase.' : ''}</p>
    </form>`;
  const form = app.querySelector('form');
  const input = form.querySelector('input');
  const err = form.querySelector('.lock-err');
  input.focus();
  return new Promise(resolve => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = 'Checking…';
      const secrets = await tryPassphrase(input.value);
      if (!secrets) { err.textContent = 'Wrong passphrase.'; input.select(); return; }
      document.body.classList.remove('locked');
      app.innerHTML = '<div class="empty"><div class="big spin">🗾</div><p>Loading the plan…</p></div>';
      resolve(secrets);
    });
  });
}

async function tryPassphrase(passphrase) {
  const key = await derive(passphrase);
  const secrets = await open(key).catch(() => null);
  if (secrets) {
    try { localStorage.setItem(KEY_STORE, unb64(await crypto.subtle.exportKey('raw', key))); } catch {}
  }
  return secrets;
}

async function derive(passphrase) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.trim()), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64(SEALED.salt), iterations: SEALED.iterations },
    material, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}

const importRaw = raw => crypto.subtle.importKey('raw', b64(raw), 'AES-GCM', true, ['decrypt']);

async function open(key) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(SEALED.iv) }, key, b64(SEALED.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

function loadStoredKey() {
  try { return localStorage.getItem(KEY_STORE); } catch { return null; }
}
