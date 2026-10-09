# Development workflow

## Making changes

1. Start a branch from `main`, for example `fix/inventory-validation`.
2. Edit the backend in `src/Code.gs` or the form in `src/Index.html`.
3. Review `git diff`, run `git diff --check`, `npm run check`, and `npm test` before committing.
4. Verify behavior in a bound Apps Script project using a separate test spreadsheet
   and non-production photos. Follow [the setup guide](docs/SETUP.md).
5. Commit the fix with a message describing the behavior changed. Update the
   deployment after verification when ready to release.

Keep Apps Script's file names `Code`, `TagParser`, `Config`, and `Index` when copying from `src/`.
With Node.js installed, run the regression tests using:

```powershell
npm ci --ignore-scripts
npm test
```

Tests cover parsing, form filling, OCR errors, simulated Google inventory writes,
and Pages device storage. They run the real browser OCR engine against a
generated tag image. They do not verify an actual iPhone or a live Google
deployment. See [the pipeline guide](docs/PIPELINE.md) for CI and publishing.

## Manual verification

Choose checks relevant to the change:

- Run `testSetup()` and confirm that it returns the expected inventory row.
- Look up an unused ID, an occupied ID, an invalid ID, and an ID missing from
  the test sheet.
- Take or choose a clear tag photo and confirm that both fields fill automatically.
  Retry using **Read tag photo** and review the OCR text if a field is missing. Check
  the error or manual-entry behavior for a poorly recognized tag.
- Save both photos and complete appliance details into an unused test row.
  Confirm the field values, photo links, and intake timestamp.
- Attempt to replace an occupied row without confirmation, then with confirmation.
- Check that columns K-R remain intact and an existing date in B is preserved.
- Exercise the changed flow in iPhone Safari, including camera capture and
  visible progress/error messages.

Record relevant results with the change. Live Google services cannot be verified
by opening `Index.html` locally.

## Local data and credentials

Keep workbook copies, inventory exports, appliance photos, OAuth tokens, and
local environment files outside version control. `.gitignore` excludes common
data files and local tooling credentials. Review newly staged files with
`git diff --cached --stat` before committing.

If Git needs an author identity, configure it for this repository using your
own name and email:

```powershell
git config user.name "Your Name"
git config user.email "your-email@example.com"
```
