# Japan Trip Companion 🗾

A static, mobile-first PWA for the 7–21 Oct 2026 trip. It reads the **Japan Trip Plan** Google Sheet live every time it opens. The Sheet stays the only place the plan gets edited. The build brief (`Japan_App_Brief.md`) is kept locally, not in this repo.

No build step and no dependencies: plain HTML/CSS/ES modules.

## Screens

| Tab | What |
|---|---|
| ⏱ **Now** | Before the trip: countdown + remaining prep. During: the current card, what's next (with "in 40m"), tonight's hotel, and a heads-up the evening before an early start. After: おかえり stats. |
| 🗾 **Trip** | All days: base, headline, intensity 🔥, where you're sleeping. |
| Day view | Day strip (sticky), swipeable card deck, a timeline to jump around, the overnight banner, and open decisions for that day. ⏱ Now button to jump back. |
| 🔴 **Stamps** | Eki stamp book. Tap to collect. |
| 🎒 **Prep** | Countdown tasks with live days-left, open decisions (tap to resolve), stays, and sync/data status. |

Travel cards pull the booking from the **Travel** tab. They match on the train/flight number showing up in the itinerary row, or on departure time if not. Car, seats and ref get pulled out of the Notes text. Split legs like "Tsurugi 17 / Thunderbird 18" show the right seats on each train's card.

## Setup

### 1. Let the app read the Sheet
Share the Sheet as **Anyone with the link → Viewer**. That alone is enough: with no API key the app uses the public gviz CSV endpoint.

Optional, and what the brief suggests: create a Google Cloud API key, restrict it to the **Google Sheets API** and your hosting domain (HTTP referrer), and put it in `config.js` → `SHEETS_API_KEY`. The app then uses `spreadsheets.values.batchGet`.

### 2. Two-phone sync (Firebase)
Until this is set up, done/skip/stamps/decisions are saved **on each phone separately**.

1. [console.firebase.google.com](https://console.firebase.google.com) → new project → **Realtime Database** → create (europe-west1 is fine).
2. Project settings → Your apps → add a **Web app**, and copy the config into `config.js` → `FIREBASE`.
3. Change `TRIP_DOC_ID` to something unguessable.
4. Database → Rules, scoped to just that document:
   ```json
   { "rules": { "trips": { "YOUR_TRIP_DOC_ID": { ".read": true, ".write": true } } } }
   ```

### 3. Host it
Any static host works. GitHub Pages: push this folder and enable Pages. It must be HTTPS for the service worker (offline + installable). On each iPhone: open it in Safari → Share → **Add to Home Screen**.

## Testing / time travel

- `?now=2026-10-10T11:00`: pretend it's that **JST** wall-clock time. Works on the live site too: `https://…/?now=2026-10-13T11:00#/now`.
- `?data=some.json`: load a `batchGet`-shaped JSON instead of the Sheet.
- Local: `python3 -m http.server` and open `http://localhost:8000`.

## Things worth knowing

- **Time zone:** "now" is always computed in JST (Day 0 in London time), whatever the phone is set to. See `TIMEZONE_BY_DAY` in `config.js`.
- **Column headers matter.** The parser finds columns by header text (`COLS` in `js/parse.js`). Reordering is fine. If you rename a header, update `COLS`; the app will show which header it couldn't find.
- **Marks are keyed on date + activity text.** Renaming an activity in the Sheet orphans its done/skip mark. Moving it or editing its time doesn't.
- **Untimed cards** are placed using their slot (morning 08:00, afternoon 13:00, evening 18:00) and never before the card above them.
- **Early starts:** any day whose first timed card is before 07:00 gets a wake-by banner and a `+ Alarm` .ics download (the alarm goes off 45 min before). iOS doesn't let web pages set Clock alarms.
- **Citymapper** only shows in Tokyo/Kyoto/Osaka. Its web link takes an address, not coordinates. Tap-test it once before relying on it.
- Stamps marked "Got it"/"Done" in the Sheet's Status column count as collected too.
- Offline: the app shell is cached by the service worker, and the last good copy of the Sheet is kept in localStorage. If the fetch fails, a banner says how old the data is.
