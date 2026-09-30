// Google Apps Script: lets the app read the plan while the Sheet stays private.
// It runs as you, so only people with the deployment URL *and* the token get the data.
// Both live in the encrypted secrets.json. Setup steps: README → "Let the app read the Sheet".

const TOKEN = 'PASTE_SHEET_SCRIPT_TOKEN_HERE';   // same value as SHEET_SCRIPT_TOKEN in secrets.json

function doGet(e) {
  if (!TOKEN || TOKEN.startsWith('PASTE') || e.parameter.token !== TOKEN) return json({ error: 'forbidden' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wanted = (e.parameter.tabs || '').split(',').filter(String);
  const tabs = {};
  for (const name of wanted) {
    const sheet = ss.getSheetByName(name);
    // Display values = what you see in the Sheet (dates as "Wed 7 Oct", etc.), same as the old CSV route.
    if (sheet) tabs[name] = sheet.getDataRange().getDisplayValues();
  }
  return json({ tabs });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
