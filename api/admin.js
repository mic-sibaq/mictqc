const { google } = require('googleapis');
function authClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Google service account is not configured.');
  return new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}
function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const supplied = req.headers['x-admin-password'] || '';
  return expected.length >= 16 && supplied.length === expected.length &&
    require('crypto').timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized. Check the admin password configuration.' });
  try {
    const sheets = google.sheets({ version: 'v4', auth: authClient() });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) throw new Error('Google Sheet is not configured.');
    const action = req.query.action || 'list';
    if (action === 'list' && req.method === 'GET') {
      const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Registrations!A:M' });
      const values = result.data.values || [];
      const rows = values.slice(1).map(r => ({
        registrationId: r[0] || '', submittedAt: r[1] || '', category: r[2] || '',
        name: r[3] || '', college: r[4] || '', dob: r[5] || '', age: r[6] || '',
        proofFileId: r[7] || '', proofUrl: r[8] || '', paymentFileId: r[9] || '',
        paymentUrl: r[10] || '', paymentStatus: r[11] || 'Pending', applicationStatus: r[12] || 'Received'
      })).reverse();
      return res.status(200).json({ ok: true, rows });
    }
    if (action === 'update' && req.method === 'POST') {
      const { registrationId, paymentStatus } = req.body || {};
      if (!registrationId || !['Pending','Verified','Rejected'].includes(paymentStatus)) {
        return res.status(400).json({ ok: false, error: 'Invalid registration ID or status.' });
      }
      const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Registrations!A:M' });
      const values = result.data.values || [];
      const idx = values.findIndex((r, i) => i > 0 && r[0] === registrationId);
      if (idx < 1) return res.status(404).json({ ok: false, error: 'Registration not found.' });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId, range: `Registrations!L${idx + 1}`,
        valueInputOption: 'RAW', requestBody: { values: [[paymentStatus]] }
      });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: 'Unsupported action.' });
  } catch (err) {
    console.error('Admin error:', err.message);
    return res.status(500).json({ ok: false, error: 'Admin request failed. Check the Google Sheets setup.' });
  }
};