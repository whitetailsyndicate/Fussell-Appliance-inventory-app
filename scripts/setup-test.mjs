import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { args, root, local, googleId, writeJson, runClasp, runNode } from './lib.mjs';

const options = args();
const filename = path.join(local, 'test.json');
const existing = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')) : {};
const input = createInterface({ input: stdin, output: stdout });
const spreadsheetId = googleId(options.spreadsheet || existing.spreadsheetId ||
  await input.question('Paste the TEST inventory spreadsheet URL or ID: '), 'Test spreadsheet');
const photoFolderId = googleId(options.folder || existing.photoFolderId ||
  await input.question('Test photo folder URL or ID (Enter to create automatically): '), 'Test photo folder', true);
input.close();
fs.mkdirSync(local, { recursive: true });
const auth = path.join(local, '.clasprc.json');
if (!fs.existsSync(auth)) {
  console.log('Sign in with the Google account that owns the TEST spreadsheet.');
  runClasp(['login']);
}
let scriptId = options.script || existing.scriptId;
if (!scriptId) {
  const bootstrap = path.join(local, 'bootstrap-test');
  fs.mkdirSync(bootstrap, { recursive: true });
  if (!fs.existsSync(path.join(bootstrap, '.clasp.json'))) {
    runClasp(['create-script', '--type', 'webapp', '--title', 'Fussell Intake - iPhone Test', '--rootDir', 'app'], { cwd: bootstrap });
  }
  scriptId = JSON.parse(fs.readFileSync(path.join(bootstrap, '.clasp.json'), 'utf8')).scriptId;
}
writeJson(filename, { ...existing, spreadsheetId, photoFolderId, scriptId, environment: 'test', access: 'MYSELF' });
runNode(path.join(root, 'scripts', 'deploy.mjs'), ['--config', filename]);
