import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'yaml';
import { root } from './lib.mjs';

for (const filename of fs.readdirSync(path.join(root, 'src')).filter(x => x.endsWith('.gs'))) {
  new vm.Script(fs.readFileSync(path.join(root, 'src', filename), 'utf8'), { filename });
}
const html = fs.readFileSync(path.join(root, 'src', 'Index.html'), 'utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1], { filename: 'Index.html' });
new vm.Script(fs.readFileSync(path.join(root, 'web', 'pages-adapter.js'), 'utf8'), { filename: 'pages-adapter.js' });
for (const name of fs.readdirSync(path.join(root, '.github', 'workflows'))) {
  const workflow = parse(fs.readFileSync(path.join(root, '.github', 'workflows', name), 'utf8'), { uniqueKeys: true });
  if (!workflow.on || !workflow.jobs) throw new Error(`Incomplete workflow: ${name}`);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'appsscript.json'), 'utf8'));
if (manifest.webapp.access !== 'MYSELF' || manifest.webapp.executeAs !== 'USER_DEPLOYING') {
  throw new Error('The source manifest must default to an owner-only test app.');
}
if (!manifest.dependencies.enabledAdvancedServices.some(x => x.serviceId === 'drive' && x.version === 'v3')) {
  throw new Error('Drive OCR service is missing.');
}
console.log('Apps Script syntax, browser syntax, and manifest checks passed.');
