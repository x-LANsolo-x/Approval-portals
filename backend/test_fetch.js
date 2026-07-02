const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
async function run() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ',
        range: "'PROF. SOCIETIES'!A:Z"
    });
    console.log(res.data.values[0]);
}
run();
