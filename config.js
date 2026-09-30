// Everything you need to edit to point the app at real data lives here.
export const CONFIG = {
  // SHEET_ID, SHEETS_API_KEY, FIREBASE and TRIP_DOC_ID are NOT here: they're
  // encrypted in secrets.enc.js and merged in once the phone is unlocked.
  // Edit secrets.json (gitignored) and run tools/seal.py. Shape:
  //   SHEET_ID:       the "Japan Trip Plan" Sheet, shared as "anyone with the link can view"
  //   SHEET_SCRIPT_URL / SHEET_SCRIPT_TOKEN: the Apps Script that reads the private Sheet (tools/sheet-proxy.gs)
  //   SHEETS_API_KEY: optional, link-shared Sheets only; '' falls back to the public gviz CSV endpoint
  //   FIREBASE:       optional Realtime Database web config; null = marks stay on each phone
  //   TRIP_DOC_ID:    shared document both phones read/write

  TRIP_YEAR: 2026,
  TRIP_START: '2026-10-07',
  TRIP_END: '2026-10-21',

  // "Now" is always computed in these zones, regardless of the phone's own setting.
  // Day 0 happens in London; everything after is in Japan.
  TIMEZONE_BY_DAY: { 0: 'Europe/London' },
  DEFAULT_TIMEZONE: 'Asia/Tokyo',

  // A day counts as an "early start" if its first timed card is before this.
  EARLY_START_BEFORE: '07:00',
  // Calendar alarm fires this many minutes before that first card.
  WAKE_LEAD_MINUTES: 45,

  // Cities where a Citymapper button is worth showing.
  CITYMAPPER_CITIES: ['Tokyo', 'Kyoto', 'Osaka'],
};
