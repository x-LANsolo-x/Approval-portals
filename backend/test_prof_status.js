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
    let eventNameIdx = 4;
    let statusIdx = 14;
    
    let anyFound = false;
    for (let i = 2; i < rows.length; i++) {
        if (rows[i][statusIdx]) {
            console.log(`Event: ${rows[i][eventNameIdx]} | Status: ${rows[i][statusIdx]}`);
            anyFound = true;
        }
    }
    if (!anyFound) console.log("No statuses found in column O!");
}
run();
