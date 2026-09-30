// Everything you need to edit to point the app at real data lives here.
export const CONFIG = {
  // The "Japan Trip Plan" Google Sheet. Share it as "anyone with the link can view".
  SHEET_ID: '1XR6_hU27-w2tCDTQFXbN4pmR7wllrdoQMMEXP3U4lYU',

  // Google Cloud API key restricted to the Sheets API + your hosting domain.
  // Leave empty to fall back to the public gviz CSV endpoint (no key needed,
  // but still requires link-sharing).
  SHEETS_API_KEY: '',

  // Firebase Realtime Database config (Project settings → Your apps → Web app).
  // Leave null to keep done/skip/stamp marks on this device only.
  FIREBASE: null,
  // FIREBASE: {
  //   apiKey: '...',
  //   authDomain: 'your-project.firebaseapp.com',
  //   databaseURL: 'https://your-project-default-rtdb.europe-west1.firebasedatabase.app',
  //   projectId: 'your-project',
  // },

  // Shared document both phones read/write. Make it hard to guess.
  TRIP_DOC_ID: 'japan-2026-change-me',

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
