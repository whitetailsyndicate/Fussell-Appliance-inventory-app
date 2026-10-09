# Test on an iPhone

Open the [iPhone test app](https://whitetailsyndicate.github.io/Fussell-Appliance-inventory-app/)
in Safari. This GitHub Pages version reads photos on the device and saves a
separate test inventory in browser storage. It does not connect to the live
Google Sheet. The public site contains no real inventory or Google credentials.

1. Enter `FA-000003` and tap **Find ID**. Test IDs run from `FA-000001` to `FA-000500`.
2. Take a full appliance photo, then a close, well-lit model/serial tag photo.
3. Wait for the tag to be read. The first scan loads the OCR engine and English
   language data. The photo itself stays in the browser.
4. Confirm the model and serial boxes fill correctly. Check every character,
   especially `0/O` and `1/I`. Use **Read tag photo** to retry, or expand
   **Text read from tag photo** to see the recognized text.
5. Choose appliance, brand, location, condition, and testing information.
   Tap **Save test entry**.
6. Tap **Export test inventory to file**. Save the downloaded JSON in Files.
   It preserves model and serial as text and includes both photos.

Use **Share → Add to Home Screen** to create a test app shortcut. Export saved
entries before clearing website data or switching devices. Keep an internet
connection for loading the app and OCR resources; offline use is not promised.

## Speak a model or serial number

Tap **Speak model number** below the model box and allow microphone access.
Speak each letter and digit separately. Say “slash” for `/` in a model suffix,
“dash” for a hyphen, and “zero” for 0. For example, “D V five six H nine one
zero zero E G slash A two” fills `DV56H9100EG/A2` into the model box. Review
every character before saving. The serial box is unchanged by model dictation.

Tap **Speak serial number** below the serial box and allow microphone access.
Speak each letter and digit separately, such as “A B zero zero one two dash C
nine.” The result replaces the serial box with `AB0012-C9`. Check it against
the tag and correct mistakes before saving. Tap **Stop listening** to finish
early. Nothing is saved automatically.

If browser speech recognition is unavailable or fails, the app focuses the
selected model or serial box. Tap that box, then tap the microphone on the iPhone keyboard. If that
microphone is missing, enable **Settings → General → Keyboard → Enable
Dictation**. Keyboard dictation enters text directly, so check spacing and
characters before saving. See [Apple's Dictation guide](https://support.apple.com/guide/iphone/dictate-text-iph2c0651d2/ios).
Browser voice support varies and may require an internet connection; see
[SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## After an update

Refresh the same URL. The build label below the title identifies the published
commit. Existing saved test entries remain in browser storage. Use another ID
or explicitly confirm replacement when reusing an occupied test ID.

The Pages workflow checks the code and runs all regression tests before it
publishes. Its source branches are `main` and `fix/tag-serial-extraction` while
the initial work is under review. After merging, remove the temporary branch
from `.github/workflows/pages.yml` and publish future tests from `main`.

## Google Sheets test version

The ZIP also includes tools for an owner-only Apps Script test deployment.
This tests Google's OCR and real spreadsheet writes, which differ from the
browser OCR used on Pages. A deploying Google account must authorize it first.

From a computer with Node.js 22 or newer, extract `Fussell-iPhone-Test.zip`:

```powershell
npm ci --ignore-scripts
npm run setup:test
```

Enable the [Apps Script API](https://script.google.com/home/usersettings) for
that account. When prompted, supply a copy of the inventory workbook and a
separate test photo folder. The command opens Google sign-in, creates a test
project, runs checks, uploads the app, and prints its test URL. It records the
IDs in `.local/test.json` so later releases keep the same URL. Sign in to that
URL on the iPhone with the deploying Google account and grant the app's Sheets,
Drive, and Docs permissions on first use.

For manual installation, copy all three `.gs` files and `Index.html` from
`src/` into Apps Script, set the test spreadsheet ID in `Config.gs`, and copy
`appsscript.json` into the project manifest. Deploy as yourself with access
restricted to yourself. Run `testSetup()` and verify a test intake row.

The package contains source and setup tools, not a native `.ipa` file.
See [the pipeline guide](PIPELINE.md) for repeat releases and rollback.
