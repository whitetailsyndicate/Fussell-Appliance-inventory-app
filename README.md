# Fussell appliance intake

An iPhone-friendly appliance intake form with automatic model/serial tag
reading, photo capture, inventory ID lookup, and explicit replacement checks.

Open the [iPhone test app](https://whitetailsyndicate.github.io/Fussell-Appliance-inventory-app/)
in Safari. Start with ID FA-000003, take both photos, review the recognized
numbers, and save a test entry. Export test inventory to Files on the phone.
The Pages version stores test entries on the device and uses browser OCR.
It does not write to the live Google inventory.

The Google Apps Script version uses Google's OCR and writes to Google Sheets
and Drive. It requires a configured Google account and separate deployment.

## Testing and updates

- [iPhone testing and package setup](docs/IPHONE-TESTING.md)
- [Release pipeline and rollback](docs/PIPELINE.md)
- [Apps Script setup](docs/SETUP.md)
- [Development checks](CONTRIBUTING.md)

```powershell
npm ci --ignore-scripts
npm run check
npm test
npm run build:pages
npm run package
```

Node.js 22 or newer is required for the tooling. GitHub Actions runs checks,
builds a ZIP, and publishes the phone test after verified pushes. Google test
and production releases use separate configuration and encrypted deployment
credentials, set up once using the included scripts.

## Repository layout

```text
src/                Apps Script backend, shared tag parser, form, config, manifest
web/                Browser OCR and device-storage adapter for the Pages test
scripts/            Checks, builds, packaging, Google setup, deployment, CI setup
tests/              Regression tests and a generated, non-private tag fixture
docs/               Phone testing, setup, and pipeline guides
.github/workflows/  Check/package, Pages publishing, and optional Google release
```

## Google inventory contract

IDs match FA- followed by six digits and must exist in column A of Inventory
Entry, whose headers are on row 4. Intake writes staff fields to C-J, sets B's
date if empty, and adds photo URLs and intake time in S-U. It leaves K-R untouched.
Photos are stored in the configured Drive folder.

Google deployments open their sheet by ID and display environment and build
labels. Test configurations should reference an inventory copy and their own
photo folder. Staff review OCR suggestions before saving. Internet access is
required for the hosted application.
