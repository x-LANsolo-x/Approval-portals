import sys

patch_code = """
def approval_forms(request):
    try:
        club_name = request.GET.get('clubName', '')
        
        archive_id = '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig'
        all_forms = []
        
        for sheet_name in ['Club', 'Dept Societies', 'Proffessional Societies']:
            try:
                rows = get_sheet_data_raw(archive_id, sheet_name)
                if not rows or len(rows) < 2: continue
                
                headers = rows[0]
                for i in range(1, len(rows)):
                    row = rows[i]
                    obj = {'_source': sheet_name}
                    for j, header in enumerate(headers):
                        clean_header = header.strip()
                        obj[clean_header] = row[j] if j < len(row) else ''
                    all_forms.append(obj)
            except Exception as e:
                print(f"Error fetching sheet {sheet_name}: {e}")
                
        # Fetch statuses from Master Tracker
        status_map = {}
        try:
            master_id = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ'
            for ms in ['CLUBS', 'DEPT SOCIETIES', 'PROF. SOCIETIES']:
                m_rows = get_sheet_data_raw(master_id, ms)
                if not m_rows or len(m_rows) < 2: continue
                
                header_row_idx = 1 if ms in ['CLUBS', 'PROF. SOCIETIES'] else 0
                if len(m_rows) <= header_row_idx: continue
                m_headers = m_rows[header_row_idx]
                
                event_name_idx = -1
                status_idx = -1
                for i, h in enumerate(m_headers):
                    if not h: continue
                    hl = h.strip().lower()
                    if hl == 'event name': event_name_idx = i
                    if hl in ['status', 'status of activity/event']: status_idx = i
                    
                if event_name_idx != -1 and status_idx != -1:
                    for i in range(header_row_idx + 1, len(m_rows)):
                        row = m_rows[i]
                        evt_name = row[event_name_idx].strip().lower() if len(row) > event_name_idx and row[event_name_idx] else None
                        stat = row[status_idx].strip() if len(row) > status_idx and row[status_idx] else 'Pending'
                        if evt_name:
                            status_map[evt_name] = stat
        except Exception as e:
            print(f"Error fetching master statuses: {e}")
            
        for f in all_forms:
            e_name = f.get('Event Name', '').strip().lower()
            f['_currentStatus'] = status_map.get(e_name, 'Pending')
            
        all_forms.reverse()
        
        if club_name:
            filtered = []
            for f in all_forms:
                c_name = f.get('Entity Name', f.get('Club Name', f.get('Department', ''))).lower()
                if club_name.lower() in c_name or c_name in club_name.lower():
                    filtered.append(f)
            all_forms = filtered
            
        return JsonResponse({'forms': all_forms})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
"""

with open('/home/nocturn/OAA/live-intranet/live-intranet-38/backend/CUintranet/intranetapp/views_node_migrated.py', 'r') as f:
    content = f.read()

import re

# find the approval_forms definition
pattern = re.compile(r'def approval_forms\(request\):.*?(?=\n@|\ndef approval_forms_submit)', re.DOTALL)
match = pattern.search(content)

if match:
    new_content = content[:match.start()] + patch_code.strip() + "\n\n" + content[match.end():]
    with open('/home/nocturn/OAA/live-intranet/live-intranet-38/backend/CUintranet/intranetapp/views_node_migrated.py', 'w') as f:
        f.write(new_content)
    print("Patched successfully!")
else:
    print("Target not found!")
