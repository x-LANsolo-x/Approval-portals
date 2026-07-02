import os
import json
import gspread
from google.oauth2.service_account import Credentials

# Backend dir for credentials.json
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SPREADSHEET_ID = '1TylYwnBjlXfno-SrFMt5fkfzl9Du24enN5yPjyD5hPM'
CALENDAR_SPREADSHEET_ID = '1xcO6FLizc9TGLd2_ZckxTuInqrAPKyNQkjtJV8E-rpU'
PROPOSED_EVENTS_SPREADSHEET_ID = '1L4YSq9py4dGrD4Y2j--tSdwXrfQkWPPDU1RA4JVrXz8'

def get_gspread_client():
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]

    # 1. Try environment variable first (used on Render / cloud deployments)
    #    Set GOOGLE_CREDENTIALS_JSON to the full contents of credentials.json
    creds_json_str = os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if creds_json_str:
        creds_info = json.loads(creds_json_str)
        credentials = Credentials.from_service_account_info(creds_info, scopes=scopes)
    else:
        # 2. Fall back to local file (local development)
        credentials_path = os.path.join(backend_dir, 'credentials.json')
        credentials = Credentials.from_service_account_file(credentials_path, scopes=scopes)

    client = gspread.authorize(credentials)
    return client

def get_sheet_data(spreadsheet_id, sheet_name):
    try:
        client = get_gspread_client()
        sheet = client.open_by_key(spreadsheet_id).worksheet(sheet_name)
        return sheet.get_all_records()
    except Exception as e:
        print(f"Error fetching sheet {sheet_name} from {spreadsheet_id}: {e}")
        return []

def get_sheet_data_raw(spreadsheet_id, sheet_name):
    try:
        client = get_gspread_client()
        sheet = client.open_by_key(spreadsheet_id).worksheet(sheet_name)
        return sheet.get_all_values()
    except Exception as e:
        print(f"Error fetching sheet {sheet_name} from {spreadsheet_id}: {e}")
        return []

def append_to_sheet(spreadsheet_id, sheet_name, row_data):
    try:
        client = get_gspread_client()
        sheet = client.open_by_key(spreadsheet_id).worksheet(sheet_name)
        sheet.append_row(row_data)
        return True
    except Exception as e:
        print(f"Error appending to sheet {sheet_name}: {e}")
        return False

def update_sheet_row(spreadsheet_id, sheet_name, row_index, row_data, start_col_index=0):
    try:
        client = get_gspread_client()
        sheet = client.open_by_key(spreadsheet_id).worksheet(sheet_name)
        
        # row_index from get_all_values() is 0-indexed. gspread range is 1-indexed.
        actual_row = row_index + 1
        
        start_col = chr(ord('A') + start_col_index)
        end_col = chr(ord('A') + start_col_index + len(row_data) - 1)
        cell_range = f'{start_col}{actual_row}:{end_col}{actual_row}'
        sheet.update(range_name=cell_range, values=[row_data])
        return True
    except Exception as e:
        print(f"Error updating sheet {sheet_name} at row {row_index}: {e}")
        return False
