// Shared runtime state (done/skip marks, eki stamps, resolved decisions).
// Firebase Realtime Database when configured; otherwise this device only.
import { CONFIG } from '../config.js';

const LOCAL_KEY = 'jt.syncState.v1';
const FIREBASE_VERSION = '10.12.2';

export async function createSync(onChange) {
  let state = load();
  const emit = () => { save(state); onChange(state); };

  if (!CONFIG.FIREBASE) {
    window.addEventListener('storage', e => { if (e.key === LOCAL_KEY) { state = load(); onChange(state); } });
    return {
      mode: 'local', state,
      set(path, value) { state = setPath(state, path, value); emit(); },
    };
  }

  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [{ initializeApp }, db] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-database.js`),
  ]);
  const app = initializeApp(CONFIG.FIREBASE);
  const database = db.getDatabase(app);
  const root = db.ref(database, `trips/${CONFIG.TRIP_DOC_ID}`);
  const api = { mode: 'firebase', state, online: false };

  db.onValue(root, snap => { state = normalise(snap.val()); api.state = state; emit(); });
  db.onValue(db.ref(database, '.info/connected'), snap => { api.online = !!snap.val(); onChange(state); });

  api.set = (path, value) => {
    state = setPath(state, path, value); api.state = state; emit();   // optimistic
    db.set(db.ref(database, `trips/${CONFIG.TRIP_DOC_ID}/${path}`), value ?? null);
  };
  return api;
}

function normalise(v) {
  return { marks: {}, stamps: {}, choices: {}, ...(v || {}) };
}

function load() {
  try { return normalise(JSON.parse(localStorage.getItem(LOCAL_KEY))); } catch { return normalise(); }
}

function save(state) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch {}
}

function setPath(state, path, value) {
  const [group, key] = path.split('/');
  const next = { ...state, [group]: { ...state[group] } };
  if (value == null) delete next[group][key]; else next[group][key] = value;
  return next;
}
