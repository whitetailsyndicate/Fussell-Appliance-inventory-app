/** Fussell phone intake. Bind this project to a Google Sheets copy of the inventory workbook. */
const ENTRY_SHEET = 'Inventory Entry';
const HEADER_ROW = 4;
const PHOTO_FOLDER_NAME = 'Fussell Inventory Photos';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Fussell Appliance Intake')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function testSetup() { return getExisting('FA-000003'); }

function getExisting(id) {
  const sheet = entrySheet_();
  const row = findRow_(sheet, cleanId_(id));
  if (!row) throw new Error('Inventory ID is not in the sheet. Check the sticker.');
  const v = sheet.getRange(row, 1, 1, 18).getDisplayValues()[0];
  return { row, id: v[0], location: v[2], bin: v[3], type: v[4], brand: v[5],
    model: v[6], serial: v[7], condition: v[8], status: v[9] };
}

function readTag(photo) {
  checkPhoto_(photo);
  // Enable the Advanced Drive service (v3) in Apps Script before first use.
  const blob = Utilities.newBlob(Utilities.base64Decode(photo.base64), photo.mime,
    'tag-' + Date.now() + '.jpg');
  const doc = Drive.Files.create({name: 'Temporary Fussell tag OCR',
    mimeType: 'application/vnd.google-apps.document'}, blob, {fields: 'id'});
  try {
    const raw = DocumentApp.openById(doc.id).getBody().getText();
    const upper = raw.toUpperCase().replace(/[\u00a0]/g, ' ');
    const model = first_(upper, /MODEL\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-/]{5,})/);
    const serial = first_(upper, /SERIAL\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-]{7,})/);
    const type = /CLOTHES\s+DRYER|\bDRYER\b/.test(upper) ? 'Dryer' :
      /\bWASHER\b/.test(upper) ? 'Washer' :
      /\bREFRIGERATOR\b/.test(upper) ? 'Refrigerator' : '';
    const brand = /SAMSUNG/.test(upper) ? 'Samsung' :
      /FRIGIDAIRE/.test(upper) ? 'Frigidaire' :
      /WHIRLPOOL/.test(upper) ? 'Whirlpool' :
      /LG ELECTRONICS|\bLG\b/.test(upper) ? 'LG' : '';
    return {type, brand, model, serial, raw};
  } finally {
    DriveApp.getFileById(doc.id).setTrashed(true);
  }
}

function submitIntake(data) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const sheet = entrySheet_();
    const id = cleanId_(data.id);
    const row = findRow_(sheet, id);
    if (!row) throw new Error('Inventory ID is not in the sheet. Check the sticker.');
    const existing = sheet.getRange(row, 1, 1, 18).getDisplayValues()[0];
    if (existing[4] && !data.confirmReplace)
      throw new Error(id + ' already has an appliance. Review the existing row and confirm replacement.');
    if (!data.type || !data.brand || !data.model || !data.serial)
      throw new Error('Confirm type, brand, model, and serial before saving.');
    checkPhoto_(data.front);
    checkPhoto_(data.tag);
    const folder = photoFolder_();
    const front = savePhoto_(folder, id + '-front', data.front);
    const tag = savePhoto_(folder, id + '-tag', data.tag);
    const now = new Date();
    if (!sheet.getRange(HEADER_ROW, 19).getDisplayValue())
      sheet.getRange(HEADER_ROW, 19, 1, 3).setValues([['Appliance Photo', 'Model / Serial Photo', 'Intake Time']]);
    if (!existing[1]) sheet.getRange(row, 2).setValue(now).setNumberFormat('mm/dd/yyyy');
    // Write only staff-entry columns. Existing margin and KORONA formulas stay intact.
    sheet.getRange(row, 3, 1, 8).setValues([[
      data.location || existing[2], data.bin || existing[3], data.type.trim(),
      data.brand.trim(), data.model.trim().toUpperCase(), data.serial.trim().toUpperCase(),
      data.condition || existing[8], data.status || existing[9]
    ]]);
    sheet.getRange(row, 19, 1, 3).setValues([[front.getUrl(), tag.getUrl(), now]]);
    sheet.getRange(row, 21).setNumberFormat('mm/dd/yyyy hh:mm');
    return {id, row, frontUrl: front.getUrl(), tagUrl: tag.getUrl()};
  } finally { lock.releaseLock(); }
}

function entrySheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ENTRY_SHEET);
  if (!sheet || sheet.getRange(HEADER_ROW, 1).getDisplayValue() !== 'Inventory ID')
    throw new Error('Expected Inventory Entry with headers on row 4.');
  return sheet;
}
function cleanId_(id) {
  const v = String(id || '').trim().toUpperCase();
  if (!/^FA-\d{6}$/.test(v)) throw new Error('Use an ID like FA-000003.');
  return v;
}
function findRow_(sheet, id) {
  const values = sheet.getRange(HEADER_ROW + 1, 1, sheet.getLastRow() - HEADER_ROW, 1).getDisplayValues();
  const index = values.findIndex(v => v[0].trim().toUpperCase() === id);
  return index < 0 ? null : HEADER_ROW + 1 + index;
}
function first_(text, regex) { const m = text.match(regex); return m ? m[1].replace(/[^A-Z0-9\-/]/g, '') : ''; }
function checkPhoto_(p) {
  if (!p || !/^image\/(jpeg|png)$/.test(p.mime) || !/^[A-Za-z0-9+/=]+$/.test(p.base64 || ''))
    throw new Error('Take a JPG or PNG photo.');
  if (p.base64.length > 8 * 1024 * 1024) throw new Error('Photo is too large. Retake at a smaller size.');
}
function photoFolder_() {
  const iter = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  return iter.hasNext() ? iter.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
}
function savePhoto_(folder, name, p) {
  return folder.createFile(Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime, name + '.jpg'));
}
