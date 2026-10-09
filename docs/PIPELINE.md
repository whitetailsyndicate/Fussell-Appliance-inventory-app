# Changes, phone tests, and releases

The repository is the source of truth. The pipeline has two release targets:
a public GitHub Pages phone test with local data, and an optional Apps Script
deployment that writes to a configured Google Sheet.

## Routine workflow

1. Create a branch, make the change, and run `npm run check` and `npm test`.
2. Push and open a pull request. **Check and package iPhone test app** repeats
   the checks and produces a downloadable `Fussell-iPhone-Test.zip` artifact.
3. Merge a verified change into `main`. **Publish iPhone test** builds and
   publishes the Pages app at its existing URL. Refresh it on the phone and
   verify the commit label.
4. Test the camera, model/serial suggestions, replacement confirmation, and
   exported test file on an actual iPhone.
5. If Google deployment is configured, release to the separate test project,
   check Google's OCR and spreadsheet writes, then release to production.

While the initial pull request is open, Pages also publishes
`fix/tag-serial-extraction`, matching the initial Pages test branch. Remove
that temporary branch from the workflow after merge. Both branches target the
same URL; the visible build label identifies the current published commit.

## Local commands

```powershell
npm ci --ignore-scripts
npm run check
npm test
npm run build:pages
npm run package
```

Built Pages files are in `dist/pages/`. The ZIP is in `artifacts/` and contains
source, tests, scripts, workflows, and guides. It uses an explicit file list
and blank Google IDs, excluding inventory, photos, local settings, credentials,
and `node_modules/`.

## Optional Google deployment

Complete `npm run setup:test` as described in [iPhone testing](IPHONE-TESTING.md).
The first deployment creates an immutable Apps Script version and records its
deployment ID. Subsequent releases update that deployment to keep its URL.

```powershell
npm run deploy -- --config .local/test.json
```

New releases check syntax, test, build the environment-specific configuration,
push to the configured project, and create a deployed version. Avoid parallel
edits in Apps Script; the next push replaces its files. The web app opens its
spreadsheet by ID rather than relying on an active sheet.

For production, copy `config.example.json` to `.local/production.json`. Set
`environment` to `production` and supply a different script ID, inventory
spreadsheet ID, photo folder ID, and existing deployment ID. Access defaults
to `MYSELF`; `DOMAIN` supports an authorized Google Workspace staff domain.
The build does not support anonymous/public inventory access.

## Enable GitHub deployment once

Install GitHub CLI and run `gh auth login`. After the first local Google test
deployment, run:

```powershell
npm run setup:ci -- --environment test --auto-deploy true
```

This creates GitHub's `test` environment and transfers the Google deployment
credentials and target settings into encrypted `CLASPRC_JSON` and
`APPS_SCRIPT_CONFIG` secrets. The refresh token can manage Apps Script projects
in the authorized account. It is not committed or printed. Run this command
when you want GitHub Actions to deploy using that account. The repository
variable `TEST_AUTODEPLOY=true` then updates the Google test URL on `main` pushes.

Configure a distinct production target before running:

```powershell
npm run setup:ci -- --environment production
```

Under **Settings → Environments → production**, require a reviewer and allow
only `main`. Then use **Actions → Deploy Apps Script → Run workflow → production**.
Production always requires manual workflow selection and is limited to `main`
in the workflow. Each run's summary links to the deployed app. PR checks do
not receive Google deployment credentials.

## Roll back

Restore an earlier immutable Apps Script version without repushing current files:

```powershell
npm run deploy -- --config .local/test.json --version 3
```

Or enter that version in **Deploy Apps Script → Run workflow**. The deployment
ID and URL stay the same. For Pages, revert the change in Git and push; the
checked build is published again.

Reference: [Google clasp](https://github.com/google/clasp) and
[GitHub Pages Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
