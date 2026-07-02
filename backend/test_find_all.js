const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
async function run() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    for (const sheet of ['CLUBS', 'DEPT SOCIETIES', 'PROF. SOCIETIES']) {
        const sheetRes = await sheets.spreadsheets.values.get({
            spreadsheetId: '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ',
            range: `${sheet}!A:Z`
        });
        const rows = sheetRes.data.values;
        const headerRowIdx = (sheet === 'CLUBS' || sheet === 'PROF. SOCIETIES') ? 1 : 0;
        const headers = rows[headerRowIdx];
        let eventNameIdx = headers.findIndex(h => h && h.trim().toLowerCase() === 'event name');
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
            if (rows[i] && rows[i][eventNameIdx]) {
                const en = rows[i][eventNameIdx].trim().toLowerCase();
                if (en.includes('cloudscape') || en.includes('cybershield')) {
                    console.log(`Found in ${sheet} at row ${i+1}: ${rows[i][eventNameIdx]}`);
                }
            }
        }
    }
}
run();
