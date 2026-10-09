import fs from 'node:fs';
import path from 'node:path';
import { args, root, local, readConfig, googleId, writeJson, runClasp, runTests, runNode } from './lib.mjs';
import { build } from './build.mjs';

const options = args();
const config = readConfig(options.config);
const scriptId = googleId(config.scriptId, 'Apps Script project');
const environment = config.environment || 'test';
if (!['test', 'production'].includes(environment)) throw new Error('Invalid deployment environment.');
if (process.env.EXPECTED_ENVIRONMENT && process.env.EXPECTED_ENVIRONMENT !== environment) {
  throw new Error('Configuration does not match the selected release environment.');
}
if (process.env.GITHUB_ACTIONS && (!process.env.CLASPRC_JSON || !process.env.APPS_SCRIPT_CONFIG)) {
  throw new Error('Configure CLASPRC_JSON and APPS_SCRIPT_CONFIG in this GitHub environment first.');
}
if (process.env.GITHUB_ACTIONS && !config.deploymentId) {
  throw new Error('Create the first deployment locally, then save its deploymentId in APPS_SCRIPT_CONFIG to keep a stable URL.');
}
const project = path.join(local, `.clasp-${environment}.json`);
if (process.env.CLASPRC_JSON) writeJson(path.join(local, '.clasprc.json'), JSON.parse(process.env.CLASPRC_JSON));
if (!fs.existsSync(path.join(local, '.clasprc.json'))) throw new Error('Run npm run setup:test to authorize Google first.');
let description;
if (options.version) {
  if (!/^\d+$/.test(options.version) || !config.deploymentId) throw new Error('Rollback needs an existing deployment and a numeric version.');
  writeJson(project, { scriptId, rootDir: path.join(root, 'dist', 'app') });
  description = `Rollback ${environment} to version ${options.version}`;
} else {
  runNode(path.join(root, 'scripts', 'check.mjs'));
  runTests();
  const built = build(config, { requireTarget: true });
  writeJson(project, { scriptId, rootDir: built.destination });
  runClasp(['push', '--force'], { project });
  description = `${environment} ${built.config.version}`;
}
const command = ['--json', 'create-deployment', '--description', description];
if (config.deploymentId) command.push('--deploymentId', googleId(config.deploymentId, 'Deployment'));
if (options.version) command.push('--versionNumber', options.version);
const raw = runClasp(command, { project, capture: true });
const result = JSON.parse(raw);
const deploymentId = result.deploymentId || result.result?.deploymentId;
if (!deploymentId) throw new Error('Deployment response did not include a deployment ID.');
const url = `https://script.google.com/macros/s/${deploymentId}/exec`;
if (options.config && !process.env.APPS_SCRIPT_CONFIG) {
  writeJson(path.resolve(root, options.config), { ...config, deploymentId });
}
writeJson(path.join(local, `${environment}-deployment.json`), { deploymentId, version: result.versionNumber, url });
console.log(`\n${environment === 'test' ? 'iPhone TEST' : 'Production'} URL: ${url}`);
console.log('Open in Safari using the deploying Google account; choose Share > Add to Home Screen.');
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${description}\n\n[Open ${environment} app](${url})\n`);
