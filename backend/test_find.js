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
    rows.forEach((row, i) => {
        row.forEach(cell => {
            if (cell.toLowerCase().includes('nakshatra')) {
                console.log(`Found in PROF. SOCIETIES row ${i + 1}: ${cell}`);
            }
        });
    });
}
run();
