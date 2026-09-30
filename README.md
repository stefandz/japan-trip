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
| 🧰 **Kit** | 🗣️ Phrases (search in English, tap for full screen), 💴 Yen converter + reference table, 🚕 Taxi card (hotel in Japanese, full screen), 🆘 SOS numbers + your insurance/medical notes, 🧾 Spend log (shared, ¥ and £), 🍡 Food list (shared, add your own), 📖 How-to cards. |

The Trip tab opens with a route map: each base city in order, trains between them (listed under the map), day trips like Miyajima and Himeji, and a pulsing dot where you are. A compact copy sits on Now, and each day's view highlights that day's move. It's drawn from a built-in simplified coastline (`js/map-data.js`, Natural Earth, public domain), so it works offline. Map positions for cities and day-trip spots are in `js/content.js`.

Also: each day shows its forecast (Trip list, day header, Now), and the evening before a wet or windy day Now shows a warning. Each day view has a shared journal (mood + a line or two), which appears on the おかえり screen afterwards.

### Where things come from

| Feature | Source | Why |
|---|---|---|
| Phrases, how-to, SOS numbers, food starter list | Built in (`js/content.js`) | The Japanese needs to be right, and it has to work with no data at all. |
| Taxi card | Sheet: optional **Name (JP)**, **Address (JP)**, **Phone** columns on Accommodation | Copy them from each booking confirmation. Without them the card shows the English name + a map link. |
| Insurance, medical notes, contacts | `EMERGENCY` in `secrets.json` (encrypted) | Personal. Kept out of the link-shared Sheet. |
| Spend, food ticks & additions, journal | Shared state (Firebase, or this phone) | Added on the go, from either phone. |
| Exchange rate, weather | frankfurter.dev, open-meteo.com (no keys) | Cached. Offline shows the last copy. |

### Offline

The app shell, fonts and Firebase SDK are cached by the service worker. The Sheet, rate and forecasts are cached in localStorage, and so is shared state. Changes made offline go into an outbox that's replayed to Firebase when you're back online, even if the app was closed in between. Prep shows how many changes are waiting. Only map links and live data need a connection.

Travel cards pull the booking from the **Travel** tab. They match on the train/flight number showing up in the itinerary row, or on departure time if not. Car, seats and ref get pulled out of the Notes text. Split legs like "Tsurugi 17 / Thunderbird 18" show the right seats on each train's card.

## Setup

### 0. The lock
The site is public, but the Sheet ID and sync config aren't in it. They live in `secrets.json` (gitignored), which `tools/seal.py` encrypts into `secrets.enc.js` (AES-GCM, with a PBKDF2 key made from a passphrase). Without the passphrase, the public files don't show where the plan or the marks live.

```
pip install cryptography        # once
python3 tools/seal.py --site https://stefandz.github.io/japan-trip/
```

Commit `secrets.enc.js`. The script prints a setup link ending `#key=<passphrase>`. Send it privately; opening it unlocks that browser for good. Anyone can also type the passphrase on the lock screen. Re-running `seal.py` with a new passphrase locks every phone out until it's entered again. On iPhone, a Home Screen app keeps storage apart from Safari, so it may ask once more after installing.

`EMERGENCY.people` in `secrets.json` is a list, one entry per person: `name`, `insurance` (`name`, `policy`, `phone`), `medical` (`en` + `ja`, shown full screen on the SOS page) and `contacts`. Blank fields and `(example)` lines are skipped.

`ANNIVERSARY` (`{"date": "MM-DD", "since": YYYY, "names": "…"}`) themes that day: the Now screen, a ♥ in the day strip and Trip list, a banner on the day, a note the evening before, and a countdown line before the trip.

This is only as strong as the passphrase. Anyone who has the Sheet link itself can still read it.

### 1. Let the app read the Sheet
The Sheet stays **private**. A small Apps Script reads it as you, and only answers requests that carry a secret token.

1. In the Sheet: **Extensions → Apps Script**. Replace the editor contents with `tools/sheet-proxy.gs`.
2. Set `TOKEN` in the script to the `SHEET_SCRIPT_TOKEN` value from `secrets.json`. Save.
3. **Deploy → New deployment** → type **Web app**. Execute as **Me**, Who has access **Anyone**. Deploy, and allow the permissions it asks for.
4. Copy the **Web app URL** (ends in `/exec`) into `secrets.json` → `SHEET_SCRIPT_URL`, then re-run `tools/seal.py`.

"Anyone" only means the URL doesn't need a Google login. Without the token it returns nothing. If you edit the script later, use **Deploy → Manage deployments → edit → New version** so the URL stays the same.

Other ways in, if you ever need them: a link-shared Sheet works with no script (public gviz CSV), or with `SHEETS_API_KEY` set.

### 2. Two-phone sync (Firebase)
Until this is set up, done/skip/stamps/decisions are saved **on each phone separately**.

1. [console.firebase.google.com](https://console.firebase.google.com) → new project → **Realtime Database** → create (europe-west1 is fine).
2. Project settings → Your apps → add a **Web app**, and copy the config into `secrets.json` → `FIREBASE`.
3. Change `TRIP_DOC_ID` in `secrets.json` to something unguessable, then re-run `tools/seal.py`.
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
