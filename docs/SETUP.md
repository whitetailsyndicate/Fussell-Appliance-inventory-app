# Fussell iPhone inventory intake

The original `.xlsm` file contains Excel macros. Keep that file as the backup. The phone form writes to a **Google Sheets copy** with the same four tabs and 500 preassigned IDs.

## Connect the form

1. Open the Google Sheets copy of the workbook. Confirm that `Inventory Entry` has its column headings on row 4 and `FA-000003` on row 7.
2. In the Sheet, choose **Extensions → Apps Script**. Add the contents of [`src/Code.gs`](../src/Code.gs) and an HTML file named `Index` containing [`src/Index.html`](../src/Index.html).
3. In the Apps Script editor, choose **Services (+) → Drive API** and use v3. The tag reader uses Google's document OCR to suggest model and serial numbers.
4. Run `testSetup` once in the editor, then grant the requested Sheets, Drive, and Docs permissions. It should return the current row for `FA-000003`. Keep access restricted to the staff accounts that need intake.
5. Choose **Deploy → New deployment → Web app**. Set it to execute as the owner and restrict who can access it to your staff. Copy the web app URL. On each iPhone, open the URL in Safari and use **Share → Add to Home Screen**.

Staff enter an FA ID, tap **Find ID**, and take an appliance photo and a close tag photo. Choosing the tag photo automatically reads it and fills the model and serial boxes when recognized. Staff check the suggested fields against the photo, choose location and condition, and tap **Save to inventory**. Use **Read tag photo** to retry; expand **Text read from tag photo** if a field is missing. Manual entry remains available if OCR fails. A saved row stores photo links in new columns S and T and the intake time in U. The existing margin and KORONA formulas are left alone.

## Update an existing deployment

1. Replace the contents of the Apps Script `Code` and `Index` files with the updated files in `src/` and save the project.
2. Choose **Deploy → Manage deployments**, select the existing web app, and click the edit pencil.
3. Choose **New version** and click **Deploy**. Updating the existing deployment keeps the same web app URL.
4. Reload the app on the iPhone. Take a tag photo, confirm both numbers fill in, review them, then save to a test inventory row.

Pushing to GitHub does not update the live Apps Script deployment automatically.

`FA-000003` currently says Washer in the original workbook. The photos show a Samsung dryer, model `DV56H9100EG/A2`, serial `0BH95AEG900840J`. When entering it, staff must explicitly confirm replacement of the existing appliance details. The form never silently overwrites a populated ID.

Google's OCR can misread `0/O`, `1/I`, or `5/S`; staff must check the numbers before saving. A blurry tag may need a second photo. The form needs an internet connection and will not work offline.
