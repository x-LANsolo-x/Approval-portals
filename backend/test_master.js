const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
async function run() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const sheetRes = await sheets.spreadsheets.values.get({
        spreadsheetId: '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ',
        range: `PROF. SOCIETIES!A:Z`
    });
    const rows = sheetRes.data.values;
    const headers = rows[1];
    let eventNameIdx = headers.findIndex(h => h && h.trim().toLowerCase() === 'event name');
    let statusIdx = headers.findIndex(h => h && (h.trim().toLowerCase() === 'status' || h.trim().toLowerCase() === 'status of activity/event'));
    console.log("headers length:", headers.length);
    console.log("headers:", headers);
    console.log("eventNameIdx:", eventNameIdx, "statusIdx:", statusIdx);
}
run();
