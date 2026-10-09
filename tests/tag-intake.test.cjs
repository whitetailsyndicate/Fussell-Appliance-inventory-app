const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const backend = fs.readFileSync(path.join(__dirname, '../src/TagParser.gs'), 'utf8') + '\n' +
  fs.readFileSync(path.join(__dirname, '../src/Code.gs'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../src/Index.html'), 'utf8');
const model = 'DV56H9100EG/A2';
const serial = '0BH95AEG900840J';
const photo = { mime: 'image/jpeg', base64: 'YWJj' };
function server(services = {}) {
  const context = vm.createContext(services);
  vm.runInContext(backend, context);
  return context;
}

test('web-app inventory access opens the configured sheet without an active workbook', () => {
  let opened;
  const sheet = { getRange: () => ({ getDisplayValue: () => 'Inventory ID' }) };
  const api = server({
    INTAKE_CONFIG: { spreadsheetId: 'TEST-SHEET-ID', environment: 'test' },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => { throw new Error('Web apps have no active sheet.'); },
      openById: id => { opened = id; return { getSheetByName: () => sheet }; }
    }
  });
  assert.equal(api.entrySheet_(), sheet);
  assert.equal(opened, 'TEST-SHEET-ID');
});

for (const label of ['SERIAL', 'SERIAL NO.', 'SERIAL NUMBER', 'SERIAL #', 'S/N', 'S / N', 'SN', 'S.N.', 'SER. NO.']) {
  test(`extracts serial with ${label} label`, () => {
    assert.equal(server().tagNumber_(`${label}: ${serial}`, 'serial'), serial);
  });
}

test('extracts model codes and serials on separate OCR lines', () => {
  const api = server();
  const raw = `Samsung clothes dryer\nMODEL CODE:\n${model}\nS/N:\n${serial}`;
  assert.equal(api.tagNumber_(raw, 'model'), model);
  assert.equal(api.tagNumber_(raw, 'serial'), serial);
});

test('joins spaces inside numbers and stops at the next label', () => {
  const api = server();
  const raw = 'Model No: DV56H9100EG /A2 Serial No: 0BH9 5AEG 900840J';
  assert.equal(api.tagNumber_(raw, 'model'), model);
  assert.equal(api.tagNumber_(raw, 'serial'), serial);
});

test('handles lowercase, nonbreaking spaces, hyphens, and numeric serials', () => {
  const api = server();
  assert.equal(api.tagNumber_('s/n:\u00a0ab12\u2013345678', 'serial'), 'AB12-345678');
  assert.equal(api.tagNumber_('SN: 00123456', 'serial'), '00123456');
});

test('does not fill serial with a model or unrelated tag text', () => {
  const api = server();
  for (const raw of [`SERIAL:\nMODEL: ${model}`, 'SERIAL NUMBER NOT AVAILABLE', '120 VOLTS 60 HZ', 'SN: 123']) {
    assert.equal(api.tagNumber_(raw, 'serial'), '');
  }
});

test('readTag returns extracted numbers and removes the temporary OCR document', () => {
  let trashed = false;
  const raw = `SAMSUNG CLOTHES DRYER\nMODEL CODE: ${model}\nS/N: ${serial}`;
  const api = server({
    Utilities: { base64Decode: x => x, newBlob: x => x },
    Drive: { Files: { create: (metadata, blob, options) => {
      assert.equal(options.ocrLanguage, 'en');
      return { id: 'ocr-doc' };
    } } },
    DocumentApp: { openById: () => ({ getBody: () => ({ getText: () => raw }) }) },
    DriveApp: { getFileById: () => ({ setTrashed: value => { trashed = value; } }) }
  });
  const result = api.readTag(photo);
  assert.equal(result.model, model);
  assert.equal(result.serial, serial);
  assert.equal(result.brand, 'Samsung');
  assert.equal(result.type, 'Dryer');
  assert.equal(result.raw, raw);
  assert.equal(trashed, true);
});

function browser(result, failure) {
  const elements = new Map();
  const encodings = [];
  const get = id => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        value: '', textContent: '', files: [photo], disabled: false,
        classList: { add: x => classes.add(x), remove: x => classes.delete(x),
          contains: x => classes.has(x), toggle: () => {} },
        addEventListener: function (event, callback) { this[event] = callback; }
      });
    }
    return elements.get(id);
  };
  const run = {
    calls: 0,
    withSuccessHandler(fn) { this.success = fn; return this; },
    withFailureHandler(fn) { this.failure = fn; return this; },
    readTag() { this.calls++; failure ? this.failure(failure) : this.success(result); },
    getExisting(id) { this.success({ id, row: 5 }); },
    submitIntake(data) { this.saved = data; this.success({ id: data.id, row: 5 }); }
  };
  const context = vm.createContext({
    document: {
      getElementById: get,
      createElement: () => ({ getContext: () => ({ drawImage() {} }),
        toDataURL: (mime, quality) => { encodings.push({ mime, quality }); return 'data:image/jpeg;base64,YWJj'; } })
    },
    createImageBitmap: async () => ({ width: 4000, height: 3000, close() {} }),
    google: { script: { run } }
  });
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { context, get, run, encodings };
}

test('taking a tag photo automatically fills model and serial boxes', async () => {
  const ui = browser({ model, serial, raw: `MODEL: ${model}\nS/N: ${serial}` });
  ui.get('tag').change();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.run.calls, 1);
  assert.equal(ui.get('model').value, model);
  assert.equal(ui.get('serial').value, serial);
  assert.equal(ui.encodings[0].quality, 0.95);
  assert.equal(ui.get('read').disabled, false);
  assert.match(ui.get('message').textContent, /tap Save to inventory/);
});

test('missing serial clears an old suggestion and shows the OCR text', async () => {
  const ui = browser({ model, serial: '', raw: 'MODEL: ' + model });
  ui.get('serial').value = 'PREVIOUS-SERIAL';
  await ui.context.readTag();
  assert.equal(ui.get('serial').value, '');
  assert.equal(ui.get('model').value, model);
  assert.equal(ui.get('ocrDetails').classList.contains('hidden'), false);
  assert.match(ui.get('message').textContent, /Could not identify serial/);
});

test('saving the autofilled form sends model and serial to the backend', async () => {
  const ui = browser({ model, serial, brand: 'Samsung', type: 'Dryer', raw: 'tag text' });
  ui.get('id').value = 'FA-000003';
  ui.context.lookup();
  await ui.context.readTag();
  await ui.context.save();
  assert.equal(ui.run.saved.model, model);
  assert.equal(ui.run.saved.serial, serial);
  assert.equal(ui.run.saved.front.mime, 'image/jpeg');
  assert.equal(ui.run.saved.tag.mime, 'image/jpeg');
  assert.match(ui.get('message').textContent, /FA-000003 saved in inventory row 5/);
});

test('OCR service errors leave manual entry and saving available', async () => {
  const ui = browser(null, new Error('Drive service unavailable.'));
  await ui.context.readTag();
  assert.match(ui.get('message').textContent, /enter the model and serial manually/);
  assert.equal(ui.get('save').disabled, false);
  assert.match(html, /<div id="fields">/);
});

test('submitIntake writes model to G and serial to H using a web-app-safe lock', () => {
  const writes = [];
  let locked = false, flushed = false, released = false;
  const values = ['FA-000003', '10/09/2026', 'Ball', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
  const range = (row, col, rows, cols) => ({
    getDisplayValues: () => [row === 5 && cols === 1 ? [values[0]] : values],
    getDisplayValue: () => row === 4 && col === 1 ? 'Inventory ID' : '',
    setValues: data => { writes.push({ row, col, data: JSON.parse(JSON.stringify(data)) }); return range(row, col, rows, cols); },
    setValue: value => { writes.push({ row, col, data: [[value]] }); return range(row, col, rows, cols); },
    setNumberFormat: () => range(row, col, rows, cols)
  });
  const sheet = { getRange: range, getLastRow: () => 5 };
  const folder = { createFile: () => ({ getUrl: () => 'https://example.test/photo' }) };
  const api = server({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }), flush: () => { flushed = true; } },
    LockService: { getDocumentLock: () => null, getScriptLock: () => ({
      waitLock: () => { locked = true; }, releaseLock: () => { released = true; }
    }) },
    Utilities: { base64Decode: x => x, newBlob: x => x },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => folder }) }
  });
  api.submitIntake({ id: values[0], type: 'Dryer', brand: 'Samsung', model, serial, front: photo, tag: photo });
  const intake = writes.find(x => x.col === 3);
  assert.equal(intake.data[0][4], model);
  assert.equal(intake.data[0][5], serial);
  assert.equal(writes.some(x => x.col >= 11 && x.col <= 18), false);
  assert.equal(locked && flushed && released, true);
});
