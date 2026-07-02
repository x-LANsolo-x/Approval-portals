const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
async function run() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig',
        range: "'Proffessional Societies'!A1:Z1"
    });
    console.log(res.data.values);
}
run();
