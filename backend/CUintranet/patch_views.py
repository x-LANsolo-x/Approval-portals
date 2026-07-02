import sys

patch_code = """
        # 2. Update specific fields in the original sheet
        try:
            club_sheet_id = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ'
            source_sheet_name = 'CLUBS'
            if dest_sheet == 'Dept Societies':
                source_sheet_name = 'DEPT SOCIETIES'
            elif dest_sheet == 'Proffessional Societies':
                source_sheet_name = 'PROF. SOCIETIES'
                
            club_rows = get_sheet_data_raw(club_sheet_id, source_sheet_name)
            
            event_name_idx = 3 if source_sheet_name == 'CLUBS' else (4 if source_sheet_name == 'PROF. SOCIETIES' else 6)
            start_row = 2 if source_sheet_name == 'CLUBS' else 1
            target_event_name = data.get('entryEventName', '').strip().lower()
            target_row_idx = -1
            
            for i in range(start_row, len(club_rows)):
                if len(club_rows[i]) > event_name_idx and club_rows[i][event_name_idx].strip().lower() == target_event_name:
                    target_row_idx = i
                    break
                    
            if target_row_idx != -1:
                guest_info = f"{data.get('entryGuestName', '')} [{data.get('entryGuestAffil', '')}]" if data.get('entryGuestAffil') else data.get('entryGuestName', '')
                
                if dest_sheet == 'Dept Societies':
                    update_values = [
                        data.get('entryDescription', ''),               # K
                        guest_info,                                     # L
                        data.get('entryVenue', ''),                     # M
                        data.get('entryBudgRequired', ''),              # N
                        data.get('entryParticipantsCount', ''),         # O
                        data.get('entrySection', ''),                   # P
                        data.get('entryOutcome', ''),                   # Q
                        data.get('entryReceivedDate', ''),              # R
                        'Form Submitted',                               # S
                        data.get('entryCoordName', 'System'),           # T
                        data.get('entryActivityId', '')                 # U
                    ]
                    update_sheet_row(club_sheet_id, source_sheet_name, target_row_idx, update_values, start_col_index=10) # K is 10
                elif dest_sheet == 'Proffessional Societies':
                    update_values = [
                        guest_info,                                     # I
                        data.get('entryVenue', ''),                     # J
                        data.get('entryBudgRequired', ''),              # K
                        data.get('entryParticipantsCount', ''),         # L
                        data.get('entrySection', ''),                   # M
                        data.get('entryOutcome', ''),                   # N
                        'Form Submitted',                               # O
                        data.get('entryCoordName', 'System'),           # P
                        data.get('entryActivityId', '')                 # Q
                    ]
                    update_sheet_row(club_sheet_id, source_sheet_name, target_row_idx, update_values, start_col_index=8) # I is 8
                else:
                    update_values = [
                        data.get('entryDateTime', ''),                  # I
                        data.get('entryDescription', ''),               # J
                        guest_info,                                     # K
                        data.get('entryVenue', ''),                     # L
                        data.get('entryBudgRequired', ''),              # M
                        data.get('entryParticipantsCount', ''),         # N
                        data.get('entrySection', ''),                   # O
                        data.get('entryOutcome', ''),                   # P
                        data.get('entryReceivedDate', ''),              # Q
                        'Form Submitted',                               # R
                        data.get('entryCoordName', 'System'),           # S
                        data.get('entryActivityId', '')                 # T
                    ]
                    update_sheet_row(club_sheet_id, source_sheet_name, target_row_idx, update_values, start_col_index=8) # I is 8
        except Exception as update_error:
            print('Failed to update specific fields:', update_error)
"""
with open('/home/nocturn/OAA/live-intranet/live-intranet-38/backend/CUintranet/intranetapp/views_node_migrated.py', 'r') as f:
    content = f.read()

target = "        append_to_sheet('1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig', dest_sheet, values)"
if target in content:
    new_content = content.replace(target, target + "\n" + patch_code)
    with open('/home/nocturn/OAA/live-intranet/live-intranet-38/backend/CUintranet/intranetapp/views_node_migrated.py', 'w') as f:
        f.write(new_content)
    print("Patched successfully!")
else:
    print("Target not found!")
