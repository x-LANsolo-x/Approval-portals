const { google } = require('googleapis');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Use the existing credentials file
const KEYFILEPATH = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES
});

async function reset() {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        console.log("Clearing Archive Sheets...");
        await sheets.spreadsheets.values.clear({
            spreadsheetId: '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig',
            range: "'Dept Societies'!A2:ZZ"
        });
        await sheets.spreadsheets.values.clear({
            spreadsheetId: '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig',
            range: "'Club'!A2:ZZ"
        });
        await sheets.spreadsheets.values.clear({
            spreadsheetId: '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig',
            range: "'Proffessional Societies'!A2:ZZ"
        });
        console.log("Archive sheets cleared.");

        console.log("Clearing Master Sheet Statuses...");
        const masterId = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ';
        
        // DEPT SOCIETIES: Clear K, L, M from row 2 downwards
        await sheets.spreadsheets.values.clear({
            spreadsheetId: masterId,
            range: "'DEPT SOCIETIES'!K2:M"
        });

        // CLUBS: Clear I through T from row 3 downwards
        await sheets.spreadsheets.values.clear({
            spreadsheetId: masterId,
            range: "'CLUBS'!I3:T"
        });

        // PROF. SOCIETIES: Clear I through V from row 3 downwards
        await sheets.spreadsheets.values.clear({
            spreadsheetId: masterId,
            range: "'PROF. SOCIETIES'!I3:V"
        });
        console.log("Master sheet statuses cleared.");

        console.log("Resetting Budgets in Database...");
        const dbPath = path.join(__dirname, 'CUintranet', 'db.sqlite3');
        const db = new sqlite3.Database(dbPath);

        db.serialize(() => {
            db.run("UPDATE departments SET approved_budget = NULL, spent_budget = 0");
            db.run("UPDATE Clubs SET approved_budget = NULL, spent_budget = 0");
            db.run("UPDATE professional_societies SET approved_budget = NULL, spent_budget = 0");
            db.run("DELETE FROM EventPublications");
            console.log("Database budgets and event publications reset.");
        });

        db.close();

    } catch (err) {
        console.error("Error resetting:", err);
    }
}

reset();
