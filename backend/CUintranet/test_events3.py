import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()
from intranetapp.google_sheets_utils import get_sheet_data_raw

old_rows = get_sheet_data_raw('1UkeJL4ScT3ay9sfIFjCDjYd91RIKMter1YCbi3wVo-4', 'CLUB Calender ')
print(f"Old rows len: {len(old_rows)}")

old_headers = old_rows[1]
old_events = []
for row in old_rows[2:]:
    obj = {}
    for i, header in enumerate(old_headers):
        obj[header.strip()] = row[i] if i < len(row) else ''
    old_events.append(obj)
print(f"Old events len: {len(old_events)}")

# Find ASTRONOMY CLUB in old events
astro = [e for e in old_events if 'ASTRONOMY' in e.get('Club Name', '').upper()]
print(f"Astro events in old_events: {len(astro)}")

def has_event_name(e):
    for k in e.keys():
        if k.lower().strip() == 'event name' and e[k].strip() != '':
            return True
    return False

astro_valid = [e for e in astro if has_event_name(e)]
print(f"Astro valid events: {len(astro_valid)}")

# Let's see what has_event_name returned for astro
for e in astro:
    print(f"Keys: {list(e.keys())}")
    print(f"Event name: '{e.get('Event Name')}'")

