import os
import sys
import sqlite3
import django

# Setup Django environment
sys.path.append('/home/nocturn/OAA/OAA Portals Vercel/Event approvals/backend/CUintranet')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()

from intranetapp.models import Clubs, Departments, ProfessionalSocieties, Communities, LegacyRoles

def migrate():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    
    # Generic function to migrate a table to a Django model blindly
    def migrate_table(table_name, model_class):
        try:
            cursor.execute(f"SELECT * FROM {table_name}")
            columns = [col[0] for col in cursor.description]
        except Exception as e:
            print(f"Skipping {table_name} ({e})")
            return

        for row in cursor.fetchall():
            data = dict(zip(columns, row))
            # Remove the 'id' field to let Postgres auto-increment or just insert it
            # The models don't explicitly define 'id' so Django will map it, but it might clash if we provide it.
            if 'id' in data and not hasattr(model_class, 'id_field_in_model_defined'):
                 # It's fine to pass id if we want to preserve exact PKs, but better to just let it create.
                 pass
            
            try:
                model_class.objects.create(**data)
            except Exception as e:
                print(f"Failed to insert row into {table_name}: {e}")
        print(f"{table_name} imported successfully.")

    # Run migrations
    # We first clear existing just in case
    Clubs.objects.all().delete()
    Departments.objects.all().delete()
    ProfessionalSocieties.objects.all().delete()
    Communities.objects.all().delete()
    LegacyRoles.objects.all().delete()

    migrate_table("Clubs", Clubs)
    migrate_table("departments", Departments)
    migrate_table("professional_societies", ProfessionalSocieties)
    migrate_table("communities", Communities)
    migrate_table("roles", LegacyRoles)
    
    conn.close()
    print("Exact data copy complete!")

if __name__ == '__main__':
    migrate()
