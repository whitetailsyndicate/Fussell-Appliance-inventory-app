import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib.mjs';

const output = path.resolve(root, 'dist', 'pages');
if (path.dirname(output) !== path.join(root, 'dist')) throw new Error('Invalid Pages build directory.');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const version = process.env.INTAKE_VERSION || 'local';
if (!/^[A-Za-z0-9._-]{1,80}$/.test(version)) throw new Error('Invalid build version.');
let html = fs.readFileSync(path.join(root, 'src', 'Index.html'), 'utf8');
html = html.replace('<base target="_top">', '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Fussell Test">');
html = html.replace('<?= buildLabel ?>', `iPhone test · ${version.slice(0, 12)}`);
html = html.replace('<div class="card">', '<div class="alert"><strong>Test inventory on this device</strong><br>Photos are read in your browser. Review the numbers, save the test entry, then export it to Files. This test page does not write to the live Google Sheet.</div><div class="card">');
html = html.replaceAll('Save to inventory', 'Save test entry').replace('saved in inventory row', 'saved in test inventory row');
html = html.replace('</main>', '<div class="card" style="margin-top:18px"><p id="testCount" class="hint">Loading test inventory…</p><button class="secondary" onclick="exportTestInventory()">Export test inventory to file</button><p class="hint">The first scan loads the OCR engine. Use a normal Safari tab. Export entries before clearing website data.</p></div></main>');
html = html.replace('<script>', `<script src="vendor/tesseract.min.js?v=${version}"></script><script src="tag-parser.js?v=${version}"></script><script src="pages-adapter.js?v=${version}"></script><script>`);
fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, '.nojekyll'), '');
fs.copyFileSync(path.join(root, 'src', 'TagParser.gs'), path.join(output, 'tag-parser.js'));
fs.copyFileSync(path.join(root, 'web', 'pages-adapter.js'), path.join(output, 'pages-adapter.js'));
fs.copyFileSync(path.join(root, 'web', 'licenses', 'tessdata-LICENSE.txt'), path.join(output, 'tessdata-LICENSE.txt'));
const vendor = path.join(output, 'vendor');
fs.mkdirSync(path.join(vendor, 'core'), { recursive: true });
fs.mkdirSync(path.join(vendor, 'lang'), { recursive: true });
for (const name of ['tesseract.min.js', 'worker.min.js', 'tesseract.min.js.LICENSE.txt', 'worker.min.js.LICENSE.txt']) {
  fs.copyFileSync(path.join(root, 'node_modules', 'tesseract.js', 'dist', name), path.join(vendor, name));
}
const core = path.join(root, 'node_modules', 'tesseract.js-core');
for (const name of fs.readdirSync(core).filter(name => /\.(?:js|wasm)$/.test(name))) {
  fs.copyFileSync(path.join(core, name), path.join(vendor, 'core', name));
}
fs.copyFileSync(path.join(root, 'node_modules', '@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), path.join(vendor, 'lang', 'eng.traineddata.gz'));
for (const [module, filename] of [['tesseract.js', 'TESSERACT-LICENSE'], ['tesseract.js-core', 'CORE-LICENSE'], ['@tesseract.js-data/eng', 'LANGUAGE-LICENSE']]) {
  const source = path.join(root, 'node_modules', module, 'LICENSE');
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(vendor, filename));
}
console.log('Built iPhone camera/OCR test site in dist/pages.');
