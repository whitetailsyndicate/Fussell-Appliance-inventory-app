# Fussell appliance intake

An iPhone-friendly appliance inventory form powered by Google Apps Script,
Google Sheets, and Google Drive. Staff look up a preassigned inventory ID,
photograph the appliance and its identification tag, review OCR suggestions,
and save intake details to the existing inventory row.

## Repository layout

```text
src/
  Code.gs          Apps Script backend: lookup, OCR, validation, and saving
  Index.html       Mobile form and browser-side photo processing
docs/
  SETUP.md         Google Apps Script deployment and staff setup
CONTRIBUTING.md    Development workflow and manual verification
```

## Run and deploy

Follow [the setup guide](docs/SETUP.md). Copy `src/Code.gs` into the spreadsheet's
bound Apps Script project and `src/Index.html` into its HTML file named `Index`.
Enable the Advanced Drive service (v3), authorize the project, and deploy it as
a web app with access restricted to authorized staff.

The application runs in Google's Apps Script environment. There is no local
web server, package installation, build step, or automated deployment configured.
Opening the HTML directly does not provide the `google.script.run` backend.
The Google Sheet, Drive photos, and original Excel workbook are external to this
repository.

## How it works

- `doGet()` serves the form. Browser calls use `google.script.run` to invoke
  `getExisting()`, `readTag()`, and `submitIntake()`.
- Inventory IDs must match `FA-` followed by six digits and already exist in
  column A of the `Inventory Entry` sheet. The header row is row 4.
- Photos are resized in the browser to a maximum dimension of 1,800 pixels and
  encoded as JPEG. Tag OCR creates a temporary Google Doc and trashes it after
  reading the text.
- Intake saves photos into the `Fussell Inventory Photos` Drive folder and
  writes staff-entry fields to columns C-J. It sets column B's date only when
  empty, and stores photo links and the intake time in columns S-U.
  Columns K-R are not written by the intake code.
- Replacing a row with an existing appliance type requires explicit confirmation.

OCR results require staff review. The app requires an internet connection.
For changes and verification, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Version control

Use `main` as the baseline branch and a separate branch for each fix:

```powershell
git switch -c fix/short-description
git status
git diff
```

Review and commit changes before updating the deployed Apps Script project.
This repository does not configure a remote or publish the application.
