# Fussell iPhone inventory intake

The original `.xlsm` file contains Excel macros. Keep that file as the backup. The phone form writes to a **Google Sheets copy** with the same four tabs and 500 preassigned IDs.

## Connect the form

1. Open the Google Sheets copy of the workbook. Confirm that `Inventory Entry` has its column headings on row 4 and `FA-000003` on row 7.
2. In the Sheet, choose **Extensions → Apps Script**. Add the contents of [`src/Code.gs`](../src/Code.gs) and an HTML file named `Index` containing [`src/Index.html`](../src/Index.html).
3. In the Apps Script editor, choose **Services (+) → Drive API** and use v3. The tag reader uses Google's document OCR to suggest model and serial numbers.
4. Run `testSetup` once in the editor, then grant the requested Sheets, Drive, and Docs permissions. It should return the current row for `FA-000003`. Keep access restricted to the staff accounts that need intake.
5. Choose **Deploy → New deployment → Web app**. Set it to execute as the owner and restrict who can access it to your staff. Copy the web app URL. On each iPhone, open the URL in Safari and use **Share → Add to Home Screen**.

Staff enter or scan an FA ID, take an appliance photo and a close tag photo, tap **Read tag photo**, check the suggested fields against the photo, choose location and condition, and save. A saved row stores photo links in new columns S and T and the intake time in U. The existing margin and KORONA formulas are left alone.

`FA-000003` currently says Washer in the original workbook. The photos show a Samsung dryer, model `DV56H9100EG/A2`, serial `0BH95AEG900840J`. When entering it, staff must explicitly confirm replacement of the existing appliance details. The form never silently overwrites a populated ID.

Google's OCR can misread `0/O`, `1/I`, or `5/S`; staff must check the numbers before saving. A blurry tag may need a second photo. The form needs an internet connection and will not work offline.
