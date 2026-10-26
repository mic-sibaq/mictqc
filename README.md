# MIC Thahfeezul Quran College — Hifz Competition Website

Mobile-first registration website for the All Kerala & Karnataka Hifz Competition. Includes category forms, private Google Drive uploads, Google Sheets storage, a password-protected admin page, CSV export, and printable/downloadable application.

## Before launch

**Date warning:** The supplied competition date is **13 October 2026**, which is in the past as of 26 October 2026. Confirm the intended date before opening registrations.

Replace these placeholders:
- Campus logo in the animated circle (currently “MIC” text).
- `assets/payment-qr.png` with the official payment QR.
- WhatsApp links in `index.html` under `CONFIG.whatsapp`.
- Contact information, venue, reporting time, deadline and final Niyamavali.
- Confirm whether collecting Aadhaar is necessary and legally appropriate. Prefer masked Aadhaar or an alternative accepted proof where possible.

## 1. Prepare Google Sheets

1. Create a Google Spreadsheet.
2. Name the first tab exactly `Registrations`.
3. Put these headings in row 1, in this exact order:

`Registration ID | Submitted At | Category | Name | College | DOB | Age | DOB File ID | DOB File URL | Payment File ID | Payment File URL | Payment Status | Application Status`

4. Copy the spreadsheet ID from its URL: the text between `/d/` and `/edit`.

## 2. Prepare private Google Drive uploads

1. Create a dedicated Google Drive folder for competition documents.
2. Keep the folder restricted; do not enable “Anyone with the link”.
3. Copy the folder ID from the folder URL.
4. Create a Google Cloud project and enable **Google Sheets API** and **Google Drive API**.
5. Create a service account and a JSON key. Keep the private key secret.
6. Share the spreadsheet with the service account email as Editor.
7. The server-side service account creates files in the Drive folder using its configured folder access. If needed, share the folder with the service account email as Editor.
8. Set `ADMIN_EMAIL` to the organizer's Google account. The code attempts to share each uploaded file with that email as Viewer for review.

Never put service-account keys or the admin password in `index.html`, `admin.html`, GitHub commits, or any `NEXT_PUBLIC_` variable.

## 3. Deploy to Vercel

1. Extract this ZIP.
2. Put your real logo and payment QR in `assets/` (the payment QR filename must be `payment-qr.png`; the current page displays a placeholder until you add it).
3. In `index.html`, replace `CONFIG.whatsapp.A` and `CONFIG.whatsapp.B` with the respective official `https://chat.whatsapp.com/...` links.
4. Add the folder to a GitHub repository and import it into Vercel, or deploy it using the Vercel CLI.
5. In Vercel → Project → Settings → Environment Variables, add:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `ADMIN_PASSWORD` (use a long random password, at least 16 characters)
   - `ADMIN_EMAIL`
6. For `GOOGLE_PRIVATE_KEY`, paste the private key from the service-account JSON. If the dashboard requires escaped newlines, use `\n` between key lines. Do not share it in chat.
7. Redeploy after adding environment variables.
8. Open `https://YOUR-DOMAIN.vercel.app/` for the public site and `https://YOUR-DOMAIN.vercel.app/admin.html` for the admin dashboard.

## 4. Test before announcing

- Submit a test registration with dummy documents and a test payment screenshot.
- Confirm a row appears in the sheet and the two files appear in the private Drive folder.
- Sign into `/admin.html`, confirm the records appear, update a payment status, and test CSV export.
- Test on Android/iPhone widths.
- Remove test registrations and test files before launch.
- Confirm the Google Sheet and Drive folder are not public.
- Test upload limits and category age checks.

## Important technical notes

- The website sends each file as base64 to a Vercel function. Files are limited to 2 MB each to stay within serverless request limits.
- Admin password authentication is a simple starter implementation. For a high-stakes public event, use a proper identity provider (such as Google OAuth) and add rate limiting, bot protection, audit logs, and a retention/deletion policy before production.
- Payment is **not automatically verified**. The admin manually changes status to Verified or Rejected.
- The WhatsApp links are category-specific but currently placeholders.
- The application download is a printable HTML file; participants can open it and use Print → Save as PDF. For a formal PDF, replace this with a server-generated PDF workflow.
- This starter does not automatically send WhatsApp messages or email confirmations.
- Collect only necessary participant data, particularly because many participants are children. Obtain appropriate parent/guardian consent and restrict organizer access.
mictcq
