const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
async function run() {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        
        const values = [[
            'GUEST NAME [AFFILIATION/DESIGNATION]',
            'VENUE',
            'BUDGET USED',
            'PARTICIPANTS',
            'SECTIONS [If required ] ',
            'OUTCOME OF ACTIVITY',
            'STATUS OF ACTIVITY/EVENT'
        ]];

        await sheets.spreadsheets.values.update({
            spreadsheetId: '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ',
            range: "'PROF. SOCIETIES'!I2:O2",
            valueInputOption: 'USER_ENTERED',
            requestBody: { values }
        });
        console.log("Headers added successfully!");
    } catch (e) {
        console.error(e);
    }
}
run();
