const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { IDBFactory } = require('fake-indexeddb');
const { createWorker, PSM } = require('tesseract.js');
const parser = fs.readFileSync(path.join(__dirname, '../src/TagParser.gs'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, '../web/pages-adapter.js'), 'utf8');

function device() {
  const elements = new Map();
  const context = vm.createContext({
    indexedDB: new IDBFactory(), URL, Blob, setTimeout, console, structuredClone,
    document: { baseURI: 'https://example.test/app/', getElementById: id => {
      if (!elements.has(id)) elements.set(id, { textContent: '' });
      return elements.get(id);
    } }
  });
  context.window = context;
  vm.runInContext(parser, context);
  vm.runInContext(adapter, context);
  const call = (method, ...values) => new Promise((resolve, reject) => {
    context.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...values);
  });
  return { context, call, elements };
}
const record = {
  id: 'FA-000003', type: 'Dryer', brand: 'Samsung', model: 'DV56H9100EG/A2', serial: '0BH95AEG900840J',
  front: { mime: 'image/jpeg', base64: 'YWJj' }, tag: { mime: 'image/jpeg', base64: 'YWJj' }
};

test('Pages test persists model, serial, and both photos on the device', async () => {
  const ui = device();
  assert.equal((await ui.call('getExisting', record.id)).type, undefined);
  await ui.call('submitIntake', record);
  const saved = await ui.call('getExisting', record.id);
  assert.equal(saved.serial, record.serial);
  assert.equal(saved.model, record.model);
  assert.match(ui.elements.get('testCount').textContent, /1 test entries/);
  await assert.rejects(ui.call('submitIntake', { ...record, serial: 'DIFFERENT123' }), /confirm replacement/);
  assert.equal((await ui.call('getExisting', record.id)).serial, record.serial);
  await ui.call('submitIntake', { ...record, confirmReplace: true, serial: 'DIFFERENT123' });
  assert.equal((await ui.call('getExisting', record.id)).serial, 'DIFFERENT123');
  const db = await new Promise((resolve, reject) => {
    const request = ui.context.indexedDB.open('fussell-iphone-test', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
  const stored = await new Promise(resolve => {
    const request = db.transaction('intake').objectStore('intake').get(record.id);
    request.onsuccess = () => resolve(request.result);
  });
  assert.equal(stored.front.base64, record.front.base64);
  assert.equal(stored.tag.base64, record.tag.base64);
});

test('Pages test rejects missing serials and out-of-range IDs', async () => {
  const ui = device();
  await assert.rejects(ui.call('submitIntake', { ...record, serial: '' }), /Confirm type/);
  await assert.rejects(ui.call('getExisting', 'FA-000501'), /through FA-000500/);
});

test('local OCR recognizes an actual synthetic tag image and fills both numbers', { timeout: 60000 }, async () => {
  const worker = await createWorker('eng', 1, {
    langPath: path.join(__dirname, '../node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
    cacheMethod: 'none'
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(path.join(__dirname, 'fixtures/synthetic-tag.png'));
    const context = vm.createContext({});
    vm.runInContext(parser, context);
    const result = context.parseTagText_(data.text);
    assert.equal(result.model, record.model, data.text);
    assert.equal(result.serial, record.serial, data.text);
  } finally {
    await worker.terminate();
  }
});
