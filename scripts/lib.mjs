import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const local = path.join(root, '.local');
export function args() {
  const result = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    if (!process.argv[i].startsWith('--') || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) {
      throw new Error('Arguments must be --name value pairs.');
    }
    result[process.argv[i].slice(2)] = process.argv[i + 1];
  }
  return result;
}
export function readConfig(filename) {
  if (process.env.APPS_SCRIPT_CONFIG) return JSON.parse(process.env.APPS_SCRIPT_CONFIG);
  return filename ? JSON.parse(fs.readFileSync(path.resolve(root, filename), 'utf8').replace(/^\uFEFF/, '')) : {};
}
export function googleId(value, label, optional = false) {
  const text = String(value || '').trim();
  if (!text && optional) return '';
  const id = text.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] || text.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1] || text;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error(`${label} must be a Google file ID or URL.`);
  return id;
}
export function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
}
export function runNode(filename, extra = []) {
  const result = spawnSync(process.execPath, [filename, ...extra], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed: ${path.basename(filename)}`);
}
export function runTests() {
  const files = fs.readdirSync(path.join(root, 'tests')).filter(x => x.endsWith('.test.cjs'))
    .map(x => path.join(root, 'tests', x));
  const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Tests failed; deployment stopped.');
}
export function runClasp(command, { cwd = root, capture = false, project } = {}) {
  fs.mkdirSync(local, { recursive: true });
  const dependency = path.join(root, 'node_modules', '@google', 'clasp');
  const metadata = JSON.parse(fs.readFileSync(path.join(dependency, 'package.json'), 'utf8'));
  const cli = path.join(dependency, typeof metadata.bin === 'string' ? metadata.bin : metadata.bin.clasp);
  const authFile = path.join(local, '.clasprc.json');
  const result = spawnSync(process.execPath, [...(project ? [ '--project', project ] : []), ...command], {
    cwd, encoding: 'utf8', stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    env: { ...process.env, clasp_config_auth: authFile }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error('Apps Script command failed. Check Google authorization and Apps Script API settings.');
  }
  return result.stdout || '';
}
