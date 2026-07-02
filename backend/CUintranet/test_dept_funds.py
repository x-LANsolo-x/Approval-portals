import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()

from intranetapp.google_sheets_utils import get_sheet_data_raw

new_rows = get_sheet_data_raw('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ', 'DEPT SOCIETIES')
headers = new_rows[0]
for idx, h in enumerate(headers):
    if 'fund' in h.lower() or 'source' in h.lower() or 'budget' in h.lower():
        print(f"Col {idx}: {h}")
