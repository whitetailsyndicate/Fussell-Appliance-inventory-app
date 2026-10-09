import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, args, readConfig, googleId } from './lib.mjs';

export function build(config = {}, { requireTarget = false } = {}) {
  const environment = config.environment || 'test';
  if (!['test', 'production'].includes(environment)) throw new Error('Environment must be test or production.');
  const access = config.access || 'MYSELF';
  if (!['MYSELF', 'DOMAIN'].includes(access)) throw new Error('Access must be MYSELF or DOMAIN.');
  if (environment === 'test' && access !== 'MYSELF') throw new Error('The iPhone test deployment is restricted to its owner.');
  const spreadsheetId = googleId(config.spreadsheetId, 'Spreadsheet', !requireTarget);
  const photoFolderId = googleId(config.photoFolderId, 'Photo folder', true);
  const version = process.env.INTAKE_VERSION || config.version || 'local';
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(version)) throw new Error('Build version must be a short label or commit SHA.');
  const destination = path.resolve(root, 'dist', 'app');
  // Only clear the fixed build directory inside this repository.
  if (path.dirname(destination) !== path.join(root, 'dist')) throw new Error('Invalid build directory.');
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  for (const name of ['Code.gs', 'TagParser.gs', 'Index.html', 'Config.gs', 'appsscript.json']) {
    fs.copyFileSync(path.join(root, 'src', name), path.join(destination, name));
  }
  fs.writeFileSync(path.join(destination, 'Config.gs'),
    'const INTAKE_CONFIG = Object.freeze(' + JSON.stringify({ spreadsheetId, photoFolderId, environment, version }, null, 2) + ');\n');
  const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'appsscript.json'), 'utf8'));
  manifest.webapp.access = access;
  fs.writeFileSync(path.join(destination, 'appsscript.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { destination, config: { ...config, spreadsheetId, photoFolderId, environment, version, access } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = build(readConfig(args().config));
  console.log(`Built ${result.config.environment} app (${result.config.version}) in dist/app.`);
}
