import fs from 'node:fs';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { root } from './lib.mjs';
import { runNode } from './lib.mjs';
import { build } from './build.mjs';

// A public package always uses empty IDs, never local deployment configuration.
build();
runNode(path.join(root, 'scripts', 'build-pages.mjs'));
const files = {};
for (const name of ['README.md', 'CONTRIBUTING.md', 'package.json', 'package-lock.json', 'config.example.json', '.gitignore', '.gitattributes', '.editorconfig']) {
  files[name] = new Uint8Array(fs.readFileSync(path.join(root, name)));
}
for (const name of fs.readdirSync(path.join(root, '.github', 'workflows'))) {
  files[`.github/workflows/${name}`] = new Uint8Array(fs.readFileSync(path.join(root, '.github', 'workflows', name)));
}
function addDirectory(directory) {
  for (const name of fs.readdirSync(path.join(root, directory))) {
    const relative = `${directory}/${name}`;
    if (fs.statSync(path.join(root, relative)).isDirectory()) addDirectory(relative);
    else files[relative] = new Uint8Array(fs.readFileSync(path.join(root, relative)));
  }
}
for (const directory of ['src', 'web', 'scripts', 'tests', 'docs']) addDirectory(directory);
function addPages(directory, relative = 'iphone-test') {
  for (const name of fs.readdirSync(directory)) {
    const source = path.join(directory, name);
    const target = `${relative}/${name}`;
    if (fs.statSync(source).isDirectory()) addPages(source, target);
    else files[target] = new Uint8Array(fs.readFileSync(source));
  }
}
addPages(path.join(root, 'dist', 'pages'));
files['START-HERE.txt'] = strToU8('Fussell iPhone test package\n\nOpen https://whitetailsyndicate.github.io/Fussell-Appliance-inventory-app/ in iPhone Safari.\nUse test ID FA-000003. Take both photos, review model and serial, save a test entry, and export it to Files.\nThe Pages version reads photos in the browser and saves test data on the device.\n\nRead docs/IPHONE-TESTING.md and docs/PIPELINE.md.\niphone-test/ contains the built static site; it needs an HTTPS host for phone use.\n\nOptional Google Sheets deployment from a computer with Node.js 22+:\n  npm ci --ignore-scripts\n  npm run setup:test\nRequires one-time Google Apps Script authorization.\nFuture Google updates:\n  npm run deploy -- --config .local/test.json\n\nNo Google credentials or real inventory data are included in this package.\n');
const output = path.join(root, 'artifacts', 'Fussell-iPhone-Test.zip');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, zipSync(files));
console.log('Created artifacts/Fussell-iPhone-Test.zip.');
