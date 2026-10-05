// Google Apps Script: lets the app read the plan while the Sheet stays private.
// It runs as you, so only people with the deployment URL *and* the token get the data.
// Both live in the encrypted secrets.json. Setup steps: README → "Let the app read the Sheet".

const TOKEN = 'PASTE_SHEET_SCRIPT_TOKEN_HERE';   // same value as SHEET_SCRIPT_TOKEN in secrets.json

// Columns with these headers hold pictures (ticket QR codes). They're sent inlined, so the app has them offline.
const IMAGE_HEADERS = ['qr'];

function doGet(e) {
  if (!TOKEN || TOKEN.startsWith('PASTE') || e.parameter.token !== TOKEN) return json({ error: 'forbidden' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wanted = (e.parameter.tabs || '').split(',').filter(String);
  const tabs = {};
  for (const name of wanted) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) continue;
    const range = sheet.getDataRange();
    // Display values = what you see in the Sheet (dates as "Wed 7 Oct", etc.), same as the old CSV route.
    tabs[name] = range.getDisplayValues();
    inlineImages(tabs[name], range);
  }
  return json({ tabs });
}

// An image column cell can be an image placed in the cell (Insert → Image → In cell),
// or one or more Google Drive links. Each becomes a data: URL; several are separated by newlines.
function inlineImages(rows, range) {
  const header = (rows[0] || []).map(h => String(h).trim().toLowerCase());
  let raw = null;
  header.forEach((h, col) => {
    if (IMAGE_HEADERS.indexOf(h) < 0) return;
    raw = raw || range.getValues();
    for (let r = 1; r < rows.length; r++) {
      const value = raw[r][col];
      if (value && typeof value.getContentUrl === 'function') rows[r][col] = attempt(() => cellImage(value));
      else rows[r][col] = String(rows[r][col]).split(/\s+/).filter(String).map(part => {
        const id = driveId(part);
        return id ? attempt(() => driveImage(id)) : part;
      }).join('\n');
    }
  });
}

function cellImage(image) {
  return dataUrl(UrlFetchApp.fetch(image.getContentUrl()).getBlob());
}

function driveImage(id) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('img:' + id);
  if (hit) return hit;
  const url = dataUrl(DriveApp.getFileById(id).getBlob());
  try { cache.put('img:' + id, url, 21600); } catch (err) {}   // over 100 KB: just not cached
  return url;
}

function driveId(text) {
  const m = String(text).match(/(?:drive|docs)\.google\.com\/.*?(?:\/d\/|[?&]id=)([\w-]{20,})/);
  return m ? m[1] : null;
}

function dataUrl(blob) {
  const type = blob.getContentType();
  if (!/^image\//.test(type)) throw new Error('not an image');
  return 'data:' + type + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

// A picture that can't be read turns into a short note the app shows on the ticket.
function attempt(fn) {
  try { return fn(); } catch (err) { return '(QR image unreadable: ' + String(err.message || err).replace(/https?:\S+/g, '').replace(/\s+/g, ' ').slice(0, 80) + ')'; }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
