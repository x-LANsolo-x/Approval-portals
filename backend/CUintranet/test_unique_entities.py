import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()

from intranetapp.google_sheets_utils import get_sheet_data_raw

old_rows = get_sheet_data_raw('1UkeJL4ScT3ay9sfIFjCDjYd91RIKMter1YCbi3wVo-4', 'CLUB Calender ')
entities = set()
for r in old_rows[2:]:
    if len(r) > 1:
        entities.add(r[1].strip())
print("Unique entities in old sheet:")
for e in sorted(entities):
    print(e)
