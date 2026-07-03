import os
import django
import pandas as pd

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()

from django.apps import apps
from django.db import connection

# We will export tables from 'intranetapp' specifically, or all if preferred.
# Let's export models from 'intranetapp'
app_models = apps.get_app_config('intranetapp').get_models()

excel_file = "database_export.xlsx"

with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
    for model in app_models:
        table_name = model._meta.db_table
        # Some table names might be too long for Excel sheet names (max 31 chars)
        sheet_name = model.__name__[:31]
        
        # Read the table into a pandas DataFrame using Django's connection
        query = f"SELECT * FROM {table_name}"
        try:
            df = pd.read_sql(query, connection)
            # Write the dataframe to a sheet
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            print(f"Exported {model.__name__} (Table: {table_name}) with {len(df)} rows.")
        except Exception as e:
            print(f"Failed to export {model.__name__}: {e}")

print(f"Export complete. File saved as {excel_file}")
