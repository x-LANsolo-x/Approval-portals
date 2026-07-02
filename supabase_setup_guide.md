# Detailed Guide: Migrating Django from SQLite to Supabase (PostgreSQL)

To make your project live, we first need to transition your local `db.sqlite3` database to a cloud-hosted PostgreSQL database. **Supabase** is an excellent, free choice for this.

Follow these steps carefully:

## Step 1: Create Your Supabase Project
1. Go to [Supabase](https://supabase.com/) and sign up with your GitHub account.
2. Once logged in, click **"New Project"**.
3. Select an organization (your name) and give your project a name (e.g., `Event-Approvals-DB`).
4. Generate a secure **Database Password**. **Save this password somewhere safe!** You will need it in Step 2.
5. Choose a region closest to your future deployment server (e.g., US East, Asia South) and click **"Create New Project"**.
6. Wait a few minutes for the database to finish provisioning.

## Step 2: Get Your Connection String
1. In your Supabase dashboard, go to the **Settings** (the gear icon at the bottom left).
2. Click on **Database** under the Configuration section.
3. Scroll down to the **Connection String** section.
4. Select the **URI** tab (not Node.js or Python, just URI).
5. Copy the connection string. It will look something like this:
   `postgresql://postgres.xxxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
6. Replace `[YOUR-PASSWORD]` in that string with the password you created in Step 1.

## Step 3: Install Required Packages in Django
We need to tell Django how to talk to PostgreSQL. Run these commands in your terminal, making sure you are inside your backend directory (`/home/nocturn/OAA/OAA Portals Vercel/Event approvals/backend/CUintranet`) and your virtual environment (`myenv`) is activated:

```bash
# Install the PostgreSQL database adapter for Python
pip install psycopg2-binary

# Install a helper package to easily parse the Supabase connection string
pip install dj-database-url

# Update your requirements.txt
pip freeze > requirements.txt
```

## Step 4: Update Your Django `settings.py`
We need to modify your `settings.py` to use the new Supabase database instead of SQLite.

1. Open `/home/nocturn/OAA/OAA Portals Vercel/Event approvals/backend/CUintranet/cuintranet/settings.py`.
2. Add `import dj_database_url` at the top of the file (near `import os`).
3. Scroll down to the `DATABASES` section (around line 91). Replace the existing `DATABASES` block with this code:

```python
import dj_database_url
from decouple import config # (Optional: if you want to use python-decouple for env vars)

# Replace this string with your actual Supabase Connection String (from Step 2)
# In production, you should load this from an Environment Variable (.env file)
SUPABASE_DB_URL = "postgresql://postgres.xxxxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# If SUPABASE_DB_URL is available, use it. Otherwise, fall back to local SQLite.
DATABASES = {
    'default': dj_database_url.config(
        default=SUPABASE_DB_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
}
```

## Step 5: Migrate Your Database
Now that Django is connected to Supabase, we need to build the database tables in Supabase. Run these commands in your terminal:

```bash
python manage.py makemigrations
python manage.py migrate
```
*If this works without errors, congratulations! Your Django backend is now successfully using your live Supabase database.*

## Step 6: Create a Superuser (Optional but Recommended)
Since this is a brand-new database, your previous admin accounts in SQLite won't be here. Create a new one:

```bash
python manage.py createsuperuser
```

---
**Next Steps:** Once your database is working, the next phase is to deploy the actual Django server code to Render or Railway. Let me know when you have finished these Supabase steps!
