// Shared runtime state (done/skip marks, eki stamps, resolved decisions, spend, food, journal).
// Firebase Realtime Database when configured; otherwise this device only.
// Writes go through an outbox kept in localStorage, so changes made offline (even if the
// app is closed before it reconnects) are replayed to Firebase the next time it can.
import { CONFIG } from '../config.js';

const LOCAL_KEY = 'jt.syncState.v1';
const OUTBOX_KEY = 'jt.outbox.v1';
const FIREBASE_VERSION = '10.12.2';

export async function createSync(onChange) {
  let state = load();
  let outbox = loadJSON(OUTBOX_KEY) || {};
  const emit = () => { save(LOCAL_KEY, state); onChange(state); };
  const queue = (path, value) => { outbox[path] = value ?? null; save(OUTBOX_KEY, outbox); };
  const dequeue = (path, value) => {
    if (path in outbox && JSON.stringify(outbox[path]) === JSON.stringify(value ?? null)) { delete outbox[path]; save(OUTBOX_KEY, outbox); onChange(state); }
  };

  const local = error => {
    window.addEventListener('storage', e => { if (e.key === LOCAL_KEY) { state = load(); onChange(state); } });
    return {
      mode: 'local', error, state,
      get pending() { return Object.keys(outbox).length; },
      set(path, value) {
        state = setPath(state, path, value); this.state = state; emit();
        if (CONFIG.FIREBASE) queue(path, value);   // Firebase couldn't load; sync it next time it does
      },
    };
  };
  if (!CONFIG.FIREBASE) return local(null);

  let db, database;
  try {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const [{ initializeApp }, dbMod] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-database.js`)]);
    db = dbMod;
    database = db.getDatabase(initializeApp(CONFIG.FIREBASE));
  } catch (err) {
    console.error(err);
    return local('Live sync unavailable — changes are saved on this phone and will sync later.');
  }

  const ref = path => db.ref(database, `trips/${CONFIG.TRIP_DOC_ID}${path ? '/' + path : ''}`);
  const push = (path, value) => db.set(ref(path), value ?? null).then(() => dequeue(path, value)).catch(console.error);
  const api = {
    mode: 'firebase', state, online: false,
    get pending() { return Object.keys(outbox).length; },
    set(path, value) {
      state = setPath(state, path, value); api.state = state; emit();   // optimistic
      queue(path, value);
      push(path, value);
    },
  };

  // Replay anything left over from last time before listening, so the first snapshot already includes it.
  for (const [path, value] of Object.entries(outbox)) { state = setPath(state, path, value); push(path, value); }
  api.state = state;
  db.onValue(ref(''), snap => { state = normalise(snap.val()); api.state = state; emit(); });
  db.onValue(db.ref(database, '.info/connected'), snap => { api.online = !!snap.val(); onChange(state); });
  return api;
}

function normalise(v) {
  return { marks: {}, stamps: {}, choices: {}, spend: {}, food: {}, foodCustom: {}, journal: {}, gifts: {}, ...(v || {}) };
}

const load = () => normalise(loadJSON(LOCAL_KEY));
function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

function setPath(state, path, value) {
  const [group, key] = path.split('/');
  const next = { ...state, [group]: { ...state[group] } };
  if (value == null) delete next[group][key]; else next[group][key] = value;
  return next;
}
