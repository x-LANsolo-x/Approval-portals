import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()
from intranetapp.google_sheets_utils import get_sheet_data_raw

role = 'Club'
club = 'astronomy club'

is_department = (role == 'Department')
is_professional = (role == 'Professional Society')

sheet_range = 'PROF. SOCIETIES' if is_professional else ('DEPT SOCIETIES' if is_department else 'CLUBS')

old_rows = get_sheet_data_raw('1UkeJL4ScT3ay9sfIFjCDjYd91RIKMter1YCbi3wVo-4', 'CLUB Calender ')
new_rows = get_sheet_data_raw('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ', sheet_range)

print(f"old_rows len: {len(old_rows) if old_rows else 0}")
print(f"new_rows len: {len(new_rows) if new_rows else 0}")

old_events = []
old_headers = old_rows[1]
for row in old_rows[2:]:
    obj = {}
    for i, header in enumerate(old_headers):
        obj[header.strip()] = row[i] if i < len(row) else ''
    old_events.append(obj)

new_headers = new_rows[1] if new_rows and len(new_rows) > 1 else []
print(f"new_headers len: {len(new_headers)}")

new_events = []
for row in new_rows[2:]:
    obj = {}
    for i, header in enumerate(new_headers):
        obj[header.strip()] = row[i].strip() if i < len(row) and row[i] else ''
    new_events.append(obj)
print(f"new_events len: {len(new_events)}")

merged_events = []
override_keys = [
    'club name', 'club name ', 'department name', 'event name', 
    'event/activity type', 'type of activity', 
    'proposed date', 'proposed budget', 'status of activity/event',
    'status', 'status of activity/event ', 'collected by', 'cuims activity id '
]

for idx, old_e in enumerate(old_events):
    sr_no = old_e.get('SR No')
    new_e = next((e for e in new_events if e.get('SR No') == sr_no), None)
    if not new_e and idx < len(new_events):
        new_e = new_events[idx]
    if not new_e:
        new_e = {}
        
    for new_key, new_val in new_e.items():
        normalized_new_key = new_key.strip().lower()
        if normalized_new_key in override_keys:
            old_key_match = next((k for k in old_e.keys() if k.strip().lower() == normalized_new_key), None)
            if old_key_match:
                old_e[old_key_match] = new_val
            else:
                old_e[new_key.strip()] = new_val
    merged_events.append(old_e)

def has_event_name(e):
    for k in e.keys():
        if k.lower().strip() == 'event name' and e[k].strip() != '':
            return True
    return False

merged_events = [e for e in merged_events if has_event_name(e)]
print(f"merged_events len after has_event_name: {len(merged_events)}")

events_list = merged_events
events_list = [e for e in events_list if has_event_name(e)]

filtered_events = []
for e in events_list:
    club_keys = [k for k in e.keys() if k.lower().strip() in ['club name', 'entity name', 'department', 'department name']]
    match = False
    for k in club_keys:
        raw_club = e.get(k, '').lower().strip()
        if raw_club and (raw_club == club or raw_club in club or club in raw_club):
            match = True
            break
    if match:
        filtered_events.append(e)

print(f"filtered_events len: {len(filtered_events)}")
