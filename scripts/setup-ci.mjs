import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { args, root, local, readConfig, googleId } from './lib.mjs';

const options = args();
const environment = options.environment || 'test';
if (!['test', 'production'].includes(environment)) throw new Error('Environment must be test or production.');
const config = readConfig(options.config || `.local/${environment}.json`);
if (config.environment !== environment) throw new Error('Target configuration must match the GitHub environment.');
googleId(config.scriptId, 'Apps Script');
googleId(config.deploymentId, 'Existing deployment');
googleId(config.spreadsheetId, 'Inventory spreadsheet');
const authFile = path.join(local, '.clasprc.json');
if (!fs.existsSync(authFile)) throw new Error('Authorize Google and create the first deployment locally before setting up CI.');
const repo = options.repo || 'whitetailsyndicate/Fussell-Appliance-inventory-app';
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Repository must be owner/name.');
function gh(command, input) {
  const result = spawnSync(process.env.GH_CLI || 'gh', command, {
    cwd: root, input, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit']
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('GitHub setup failed. Run gh auth login and check repository access.');
}
gh(['api', '--method', 'PUT', `repos/${repo}/environments/${environment}`, '--silent']);
// Credentials go through stdin to GitHub's encrypted secrets API, never a command argument.
gh(['secret', 'set', 'CLASPRC_JSON', '--repo', repo, '--env', environment], fs.readFileSync(authFile, 'utf8'));
gh(['secret', 'set', 'APPS_SCRIPT_CONFIG', '--repo', repo, '--env', environment], JSON.stringify(config));
if (environment === 'test' && options['auto-deploy'] === 'true') {
  gh(['variable', 'set', 'TEST_AUTODEPLOY', '--repo', repo, '--body', 'true']);
}
console.log(`Configured encrypted deployment secrets for ${environment}. Credentials were not printed or committed.`);
