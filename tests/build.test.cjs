const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const root = path.join(__dirname, '..');

test('Google test builds require a target and reject public access', async () => {
  const { build } = await import('../scripts/build.mjs');
  assert.throws(() => build({}, { requireTarget: true }), /Spreadsheet/);
  assert.throws(() => build({ environment: 'test', access: 'DOMAIN' }), /restricted to its owner/);
  assert.throws(() => build({ access: 'ANYONE' }), /MYSELF or DOMAIN/);
  const spreadsheetId = 'test_spreadsheet_1234567890123456';
  const result = build({ spreadsheetId, environment: 'test' }, { requireTarget: true });
  assert.match(fs.readFileSync(path.join(result.destination, 'Config.gs'), 'utf8'), /test_spreadsheet_1234567890123456/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.destination, 'appsscript.json'))).webapp.access, 'MYSELF');
});

test('Pages build includes local OCR resources and removes Apps Script template markers', () => {
  const result = spawnSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = path.join(root, 'dist/pages');
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.equal(html.includes('<?'), false);
  assert.match(html, /name="viewport"/);
  assert.match(html, /Save test entry/);
  assert.match(html, /does not write to the live Google Sheet/);
  for (const resource of ['pages-adapter.js', 'tag-parser.js', 'vendor/worker.min.js', 'vendor/tesseract.min.js', 'vendor/lang/eng.traineddata.gz', 'vendor/core/tesseract-core-lstm.wasm.js']) {
    assert.equal(fs.existsSync(path.join(output, resource)), true, resource);
  }
});
