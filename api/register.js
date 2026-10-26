const { google } = require('googleapis');
const crypto = require('crypto');

const MAX_BYTES = 1 * 1024 * 1024;
const ALLOWED_PROOF = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const ALLOWED_PAYMENT = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Google service account is not configured.');
  return new google.auth.JWT({ email, key, scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]});
}
function validFile(f, allowed) {
  if (!f || !f.name || !f.type || !allowed.has(f.type) || typeof f.data !== 'string') return false;
  const bytes = Buffer.from(f.data, 'base64');
  return bytes.length > 0 && bytes.length <= MAX_BYTES;
}
async function uploadFile(drive, folderId, file, prefix, adminEmail) {
  const bytes = Buffer.from(file.data, 'base64');
  const ext = file.type === 'application/pdf' ? '.pdf' : file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg';
  const name = `${prefix}-${Date.now()}${ext}`;
  const created = await drive.files.create({
    requestBody: { name, mimeType: file.type, parents: [folderId] },
    media: { mimeType: file.type, body: require('stream').Readable.from(bytes) },
    fields: 'id,name,webViewLink'
  });
  // Keep files private by default. Optionally grant access to the named organizer only.
  if (adminEmail) {
    await drive.permissions.create({
      fileId: created.data.id,
      requestBody: { type: 'user', role: 'reader', emailAddress: adminEmail },
      sendNotificationEmail: false
    });
  }
  return { id: created.data.id, url: created.data.webViewLink || `https://drive.google.com/file/d/${created.data.id}/view` };
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  try {
    const { name, college, dob, age, category, proof, payment } = req.body || {};
    if (!['A','B'].includes(category) || !name || !college || !dob || !Number.isInteger(Number(age))) {
      return res.status(400).json({ ok: false, error: 'Please complete all required fields.' });
    }
    if (!validFile(proof, ALLOWED_PROOF) || !validFile(payment, ALLOWED_PAYMENT)) {
      return res.status(400).json({ ok: false, error: 'Invalid file type or size. Each file must be 1 MB or smaller.' });
    }
    const a = Number(age);
    if ((category === 'A' && (a < 9 || a > 11)) || (category === 'B' && (a < 12 || a > 13))) {
      return res.status(400).json({ ok: false, error: 'Age does not match the selected category.' });
    }
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
      return res.status(500).json({ ok: false, error: 'Google Sheets or Drive is not configured yet.' });
    }
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    const registrationId = 'MIC-' + category + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const [proofUpload, paymentUpload] = await Promise.all([
      uploadFile(drive, process.env.GOOGLE_DRIVE_FOLDER_ID, proof, `${registrationId}-DOB`, process.env.ADMIN_EMAIL),
      uploadFile(drive, process.env.GOOGLE_DRIVE_FOLDER_ID, payment, `${registrationId}-PAYMENT`, process.env.ADMIN_EMAIL)
    ]);
    const submittedAt = new Date().toISOString();
    const row = [
      registrationId, submittedAt, category, String(name).trim().slice(0,100),
      String(college).trim().slice(0,150), dob, a,
      proofUpload.id, proofUpload.url, paymentUpload.id, paymentUpload.url,
      'Pending', 'Received'
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Registrations!A:M',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });
    return res.status(200).json({ ok: true, registrationId, submittedAt });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ ok: false, error: 'Registration could not be saved. Please try again later or contact the organizer.' });
  }
};