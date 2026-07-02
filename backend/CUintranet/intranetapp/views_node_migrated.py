from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
import json
import datetime
import time
import threading
from .google_sheets_utils import get_sheet_data, get_sheet_data_raw, append_to_sheet, update_sheet_row

# Spreadsheet IDs (hardcoded for deployment)
SPREADSHEET_ID                  = '1TylYwnBjlXfno-SrFMt5fkfzl9Du24enN5yPjyD5hPM'
CALENDAR_SPREADSHEET_ID         = '1xcO6FLizc9TGLd2_ZckxTuInqrAPKyNQkjtJV8E-rpU'
PROPOSED_EVENTS_SPREADSHEET_ID  = '1L4YSq9py4dGrD4Y2j--tSdwXrfQkWPPDU1RA4JVrXz8'
CLUB_DETAILS_SPREADSHEET_ID     = '1aeAQIUELg4gr-fiGDA1xInxz_HDtdW4FrB464ESK8y8'


# ---------------------------------------------------------------------------
# Robust sheet cache: 5-min TTL, per-key coalescing, background warmer
# ---------------------------------------------------------------------------
class _SheetCache:
    """
    Thread-safe cache for Google Sheets data.
    - TTL = 300 s (5 min) — users rarely hit a cold load
    - Per-key in-flight Events: if 10 requests arrive simultaneously for the
      same cold key, only ONE fires the Sheets API call. The other 9 block
      (max 30 s) then get the result from cache — no stampede.
    - Background warmer: refreshes keys 30 s before they expire so the cache
      is almost always warm and no user request ever blocks on Sheets.
    """
    TTL = 300          # seconds to keep data
    REFRESH_BEFORE = 30  # refresh this many seconds before expiry

    def __init__(self):
        self._store = {}        # key -> (data, expiry)
        self._lock = threading.Lock()
        self._in_flight = {}    # key -> threading.Event (coalescing)
        self._warmer = threading.Thread(target=self._warm_loop, daemon=True)
        self._warmer.start()

    # ------------------------------------------------------------------
    def get(self, key):
        with self._lock:
            entry = self._store.get(key)
            if entry and time.monotonic() < entry[1]:
                return entry[0]
        return None

    def set(self, key, data):
        with self._lock:
            self._store[key] = (data, time.monotonic() + self.TTL)

    def invalidate(self, *keys):
        with self._lock:
            for k in keys:
                self._store.pop(k, None)

    def invalidate_prefix(self, prefix):
        with self._lock:
            for k in [k for k in self._store if k.startswith(prefix)]:
                del self._store[k]

    # ------------------------------------------------------------------
    def _fetch_and_store(self, spreadsheet_id, sheet_name):
        """Actually call the Sheets API and populate the cache."""
        key = f"{spreadsheet_id}::{sheet_name}"
        try:
            data = get_sheet_data_raw(spreadsheet_id, sheet_name)
            if data is not None:
                self.set(key, data)
            return data
        except Exception as e:
            print(f"[cache] Sheets fetch error for {key}: {e}")
            return None

    # ------------------------------------------------------------------
    def _warm_loop(self):
        """Background daemon: refresh all HOT_KEYS periodically to ensure 100% cache hits."""
        HOT_KEYS = [
            ('1xcO6FLizc9TGLd2_ZckxTuInqrAPKyNQkjtJV8E-rpU', 'Sheet1'),
            ('1UkeJL4ScT3ay9sfIFjCDjYd91RIKMter1YCbi3wVo-4', 'CLUB Calender '),
            ('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ', 'CLUBS'),
            ('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ', 'DEPT SOCIETIES'),
            ('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ', 'PROF. SOCIETIES'),
            ('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ', 'COMMUNITIES'),
            ('1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig', 'Club'),
            ('1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig', 'Dept Societies'),
            ('1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig', 'Proffessional Societies'),
            ('1TylYwnBjlXfno-SrFMt5fkfzl9Du24enN5yPjyD5hPM', 'Admin'),
            ('1TylYwnBjlXfno-SrFMt5fkfzl9Du24enN5yPjyD5hPM', 'CFC'),
            ('1TylYwnBjlXfno-SrFMt5fkfzl9Du24enN5yPjyD5hPM', 'Secretaries'),
            ('1TylYwnBjlXfno-SrFMt5fkfzl9Du24enN5yPjyD5hPM', 'General'),
            ('1L4YSq9py4dGrD4Y2j--tSdwXrfQkWPPDU1RA4JVrXz8', 'Sheet1'),
        ]
        
        # Initial warming of all hot keys
        time.sleep(2)
        print("[cache] Starting initial background prefetch of Google Sheets...")
        for sid, sname in HOT_KEYS:
            try:
                self._fetch_and_store(sid, sname)
                time.sleep(3.5)
            except Exception as e:
                print(f"[cache] Failed to prefetch {sid}::{sname}: {e}")
        print("[cache] Initial background prefetch completed! Cache is warm.")

        while True:
            time.sleep(120)
            for sid, sname in HOT_KEYS:
                try:
                    self._fetch_and_store(sid, sname)
                    time.sleep(3.5)
                except Exception as e:
                    print(f"[cache] Failed to refresh {sid}::{sname}: {e}")

_cache = _SheetCache()

_details_cache = {}
_DETAILS_CACHE_TTL = 30  # seconds

def _cached_details_view(path, fetch_fn):
    now = time.monotonic()
    cached = _details_cache.get(path)
    if cached and now < cached[1]:
        return cached[0]
    response = fetch_fn()
    _details_cache[path] = (response, time.monotonic() + _DETAILS_CACHE_TTL)
    return response

def clear_details_cache():
    _details_cache.clear()

def _cached_sheet(spreadsheet_id, sheet_name):
    """
    Get sheet data from cache, with request coalescing on cache miss.
    If two requests arrive at the same time for a cold key, only the first
    one hits the API; the second waits and then reads from cache.
    """
    key = f"{spreadsheet_id}::{sheet_name}"

    # 1. Fast path — already cached
    cached = _cache.get(key)
    if cached is not None:
        return cached

    # 2. Slow path — acquire or wait for an in-flight fetch
    with _cache._lock:
        event = _cache._in_flight.get(key)
        if event is None:
            # We are the designated fetcher
            event = threading.Event()
            _cache._in_flight[key] = event
            am_fetcher = True
        else:
            am_fetcher = False

    if am_fetcher:
        try:
            data = _cache._fetch_and_store(spreadsheet_id, sheet_name)
        finally:
            with _cache._lock:
                _cache._in_flight.pop(key, None)
            event.set()  # wake up any waiters
        return data
    else:
        # Wait for the fetcher (max 30 s to avoid hanging forever)
        event.wait(timeout=30)
        return _cache.get(key)  # may still be None if fetch failed



def dictfetchall(cursor):
    "Return all rows from a cursor as a dict"
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

@csrf_exempt
def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'message': 'CU Clubs Backend (Django Migrated) is running and ready to connect to Google Sheets.'
    })

@csrf_exempt
def debug_sheets(request):
    """Temporary debug endpoint — tests if Google Sheets credentials are working on Render."""
    import os
    import traceback
    result = {
        'GOOGLE_CREDENTIALS_JSON_set': bool(os.environ.get('GOOGLE_CREDENTIALS_JSON')),
        'credentials_file_exists': False,
        'sheets_test': None,
        'error': None,
    }
    try:
        creds_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'credentials.json'
        )
        result['credentials_file_exists'] = os.path.exists(creds_path)
    except Exception:
        pass
    try:
        from .google_sheets_utils import get_gspread_client
        client = get_gspread_client()
        # Try opening one known spreadsheet
        sh = client.open_by_key('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ')
        ws_names = [ws.title for ws in sh.worksheets()]
        result['sheets_test'] = f"OK — worksheets: {ws_names[:5]}"
    except Exception as e:
        result['error'] = traceback.format_exc()
    return JsonResponse(result)

# --- SQLite Endpoints ---

@csrf_exempt
def club_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip()
        password = data.get('password')
        
        if not email or not password:
            return JsonResponse({'error': 'Missing email or password'}, status=400)
            
        with connection.cursor() as cursor:
            # 1. Check Clubs
            cursor.execute("SELECT registration_name FROM Clubs WHERE login_id = %s AND password = %s", [email, password])
            row = cursor.fetchone()
            if row:
                return JsonResponse({
                    'success': True,
                    'message': 'Login successful',
                    'role_name': 'Club',
                    'department_name': row[0],
                    'name': row[0]
                })
            
            # 2. Check departments
            cursor.execute("SELECT name FROM departments WHERE login_id = %s AND password = %s", [email, password])
            row = cursor.fetchone()
            if row:
                return JsonResponse({
                    'success': True,
                    'message': 'Login successful',
                    'role_name': 'Department',
                    'department_name': row[0],
                    'name': row[0]
                })
                
            # 3. Check professional_societies
            cursor.execute("SELECT name, prof_soc_id FROM professional_societies WHERE login_id = %s AND password = %s", [email, password])
            row = cursor.fetchone()
            if row:
                return JsonResponse({
                    'success': True,
                    'message': 'Login successful',
                    'role_name': 'Professional Society',
                    'department_name': row[0],
                    'name': row[0],
                    'registration_code': row[1]
                })
                
            # 4. Check communities
            cursor.execute("SELECT name, comm_id FROM communities WHERE login_id = %s AND password = %s", [email, password])
            row = cursor.fetchone()
            if row:
                return JsonResponse({
                    'success': True,
                    'message': 'Login successful',
                    'role_name': 'Community',
                    'department_name': row[0],
                    'name': row[0],
                    'registration_code': row[1]
                })

            # 5. Check roles
            cursor.execute("SELECT name, role FROM roles WHERE login_id = %s AND password = %s", [email, password])
            row = cursor.fetchone()
            if row:
                return JsonResponse({
                    'success': True,
                    'message': 'Login successful',
                    'role_name': row[1],
                    'department_name': row[0],
                    'name': row[0]
                })
                
        return JsonResponse({'success': False, 'message': 'Invalid email or password'}, status=401)
    except Exception as e:
        return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)

def clubs_credentials(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT registration_name, login_id, password FROM Clubs")
        return JsonResponse(dictfetchall(cursor), safe=False)

def all_credentials(request):
    query = """
        SELECT registration_name as name, login_id, password, 'Club' as type FROM Clubs
        UNION ALL
        SELECT name, login_id, password, 'Department' as type FROM departments
        UNION ALL
        SELECT name, login_id, password, 'Professional Society' as type FROM professional_societies
        UNION ALL
        SELECT name, login_id, password, 'Community' as type FROM communities
    """
    with connection.cursor() as cursor:
        cursor.execute(query)
        return JsonResponse(dictfetchall(cursor), safe=False)

def club_details(request):
    def _fetch():
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM Clubs")
            rows = dictfetchall(cursor)
            
            details = []
            for row in rows:
                cluster = row.get('cluster', '') or ''
                dept = row.get('department', '')
                cluster_dept = f"{cluster} - {dept}" if dept else cluster
                
                details.append({
                    'Registration Code': row.get('registration_code', ''),
                    'Registration Name': row.get('registration_name', ''),
                    'Club Name': row.get('registration_name', ''),
                    'Faculty Champion': row.get('faculty_champion', ''),
                    'Employee ID': row.get('employee_id', ''),
                    'Contact Number': row.get('contact_number', ''),
                    'Email ID': row.get('email_id', ''),
                    'Cluster / Department': cluster_dept,
                    'Secretary': row.get('secretary', ''),
                    'Sec. UID': row.get('sec_uid', ''),
                    'Secretary Email': row.get('secretary_email', ''),
                    'Secretary Contact': row.get('secretary_contact', ''),
                    'Jt. SECRETARY': row.get('jt_secretary', ''),
                    'Jt. SEC. UID': row.get('jt_sec_uid', ''),
                    'Jt. SEC EMAIL': row.get('jt_sec_email', ''),
                    'Jt. SEC CONTACT': row.get('jt_sec_contact', ''),
                    'approved_budget': row.get('approved_budget'),
                    'spent_budget': row.get('spent_budget', 0.0)
                })
        return JsonResponse({'details': details})
    return _cached_details_view('club_details', _fetch)

def department_details(request):
    def _fetch():
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM departments")
            rows = dictfetchall(cursor)
            
            # Prefetch entity registrations to optimize/match
            try:
                cursor.execute("SELECT * FROM intranetapp_entityregistration")
                reg_rows = dictfetchall(cursor)
            except Exception as e:
                print(f"[department_details] Warning querying intranetapp_entityregistration: {e}")
                reg_rows = []
            
            # Prefetch dept mapping
            try:
                cursor.execute("SELECT * FROM intranetapp_dept")
                dept_rows = dictfetchall(cursor)
                dept_map = {d['dept_id']: d['dept_name'] for d in dept_rows}
            except Exception as e:
                print(f"[department_details] Warning querying intranetapp_dept: {e}")
                dept_rows = []
                dept_map = {}
            
            details = []
            for row in rows:
                name = row.get('name', '') or ''
                dept_id = row.get('dept_id', '') or ''
                
                # Find matching entity registration
                matched_reg = None
                
                # First try: match via intranetapp_dept and department_id
                matched_dept_id = None
                for d_id, d_name in dept_map.items():
                    n1 = name.lower().replace('-', '').replace(' ', '')
                    n2 = d_name.lower().replace('-', '').replace(' ', '')
                    if n1 == n2 or n1 in n2 or n2 in n1:
                        matched_dept_id = d_id
                        break
                
                if matched_dept_id is not None:
                    matched_reg = next((r for r in reg_rows if r.get('department_id') == matched_dept_id), None)
                
                # Second try: fallback to name keyword match in registeration_name
                if not matched_reg:
                    n_clean = name.lower().replace('-', '').replace(' ', '')
                    for r in reg_rows:
                        r_name = (r.get('registeration_name') or '').lower().replace('_', '').replace(' ', '')
                        if n_clean in r_name or r_name in n_clean:
                            matched_reg = r
                            break
                
                cluster = row.get('cluster', '') or ''
                cluster_dept = f"{cluster} - {name}" if name else cluster
                
                if matched_reg:
                    details.append({
                        'Registration Code': dept_id or matched_reg.get('registeration_code', ''),
                        'Registration Name': name or matched_reg.get('registeration_name', ''),
                        'Department Name': name,
                        'Club Name': name,
                        'Faculty Champion': matched_reg.get('faculty_advisory_name', '') or '',
                        'Employee ID': matched_reg.get('faculty_advisory_empcode', '') or '',
                        'Contact Number': matched_reg.get('faculty_advisory_mobile', '') or '',
                        'Email ID': matched_reg.get('faculty_advisory_email', '') or '',
                        'Cluster / Department': cluster_dept,
                        'Secretary': matched_reg.get('Secretary_name', '') or '',
                        'Sec. UID': matched_reg.get('Secretary_uid', '') or '',
                        'Secretary Email': matched_reg.get('Secretary_email', '') or '',
                        'Secretary Contact': matched_reg.get('Secretary_mobile', '') or '',
                        'Jt. SECRETARY': matched_reg.get('Joint_Secretary_name', '') or '',
                        'Jt. SEC. UID': matched_reg.get('Joint_Secretary_uid', '') or '',
                        'Jt. SEC EMAIL': matched_reg.get('Joint_Secretary_email', '') or '',
                        'Jt. SEC CONTACT': matched_reg.get('Joint_Secretary_mobile', '') or '',
                        'approved_budget': row.get('approved_budget'),
                        'spent_budget': row.get('spent_budget', 0.0)
                    })
                else:
                    details.append({
                        'Registration Code': dept_id,
                        'Registration Name': name,
                        'Department Name': name,
                        'Club Name': name,
                        'Faculty Champion': '',
                        'Employee ID': '',
                        'Contact Number': '',
                        'Email ID': '',
                        'Cluster / Department': cluster_dept,
                        'Secretary': '', 'Sec. UID': '', 'Secretary Email': '', 'Secretary Contact': '',
                        'Jt. SECRETARY': '', 'Jt. SEC. UID': '', 'Jt. SEC EMAIL': '', 'Jt. SEC CONTACT': '',
                        'approved_budget': row.get('approved_budget'),
                        'spent_budget': row.get('spent_budget', 0.0)
                    })
            return JsonResponse({'details': details})
    return _cached_details_view('department_details', _fetch)

def professional_details(request):
    def _fetch():
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM professional_societies")
            rows = dictfetchall(cursor)
            
            # Prefetch entity registrations
            try:
                cursor.execute("SELECT * FROM intranetapp_entityregistration")
                reg_rows = dictfetchall(cursor)
            except Exception as e:
                print(f"[professional_details] Warning querying intranetapp_entityregistration: {e}")
                reg_rows = []
            
            import re
            def clean_words(text):
                text = text.lower().replace('_', ' ').replace('-', ' ').replace('(', ' ').replace(')', ' ')
                words = re.findall(r'\b\w+\b', text)
                ignore = {'professional', 'society', 'student', 'chapter', 'university', 'chandigarh', 'cu', 'of', 'for', 'in', 'and', 'engg', 'association', 'computing', 'machinery'}
                return set(w for w in words if w not in ignore)
                
            details = []
            for row in rows:
                name = row.get('name', '') or ''
                prof_soc_id = row.get('prof_soc_id', '') or ''
                
                # Find matching entity registration
                matched_reg = None
                soc_words = clean_words(name)
                for r in reg_rows:
                    r_name = r.get('registeration_name') or ''
                    reg_words = clean_words(r_name)
                    if soc_words.intersection(reg_words):
                        matched_reg = r
                        break
                        
                if matched_reg:
                    details.append({
                        'Registration Code': prof_soc_id or matched_reg.get('registeration_code', ''),
                        'Registration Name': name or matched_reg.get('registeration_name', ''),
                        'Society Name': name,
                        'Club Name': name,
                        'Faculty Champion': matched_reg.get('faculty_advisory_name', '') or '',
                        'Employee ID': matched_reg.get('faculty_advisory_empcode', '') or '',
                        'Contact Number': matched_reg.get('faculty_advisory_mobile', '') or '',
                        'Email ID': matched_reg.get('faculty_advisory_email', '') or '',
                        'Cluster / Department': row.get('department_mapped', '') or '',
                        'Secretary': matched_reg.get('Secretary_name', '') or '',
                        'Sec. UID': matched_reg.get('Secretary_uid', '') or '',
                        'Secretary Email': matched_reg.get('Secretary_email', '') or '',
                        'Secretary Contact': matched_reg.get('Secretary_mobile', '') or '',
                        'Jt. SECRETARY': matched_reg.get('Joint_Secretary_name', '') or '',
                        'Jt. SEC. UID': matched_reg.get('Joint_Secretary_uid', '') or '',
                        'Jt. SEC EMAIL': matched_reg.get('Joint_Secretary_email', '') or '',
                        'Jt. SEC CONTACT': matched_reg.get('Joint_Secretary_mobile', '') or '',
                        'approved_budget': row.get('approved_budget'),
                        'spent_budget': row.get('spent_budget', 0.0)
                    })
                else:
                    details.append({
                        'Registration Code': prof_soc_id,
                        'Registration Name': name,
                        'Society Name': name,
                        'Club Name': name,
                        'Faculty Champion': '',
                        'Employee ID': '',
                        'Contact Number': '',
                        'Email ID': '',
                        'Cluster / Department': row.get('department_mapped', '') or '',
                        'Secretary': '', 'Sec. UID': '', 'Secretary Email': '', 'Secretary Contact': '',
                        'Jt. SECRETARY': '', 'Jt. SEC. UID': '', 'Jt. SEC EMAIL': '', 'Jt. SEC CONTACT': '',
                        'approved_budget': row.get('approved_budget'),
                        'spent_budget': row.get('spent_budget', 0.0)
                    })
            return JsonResponse({'details': details})
    return _cached_details_view('professional_details', _fetch)

def community_details(request):
    def _fetch():
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM communities")
            rows = dictfetchall(cursor)

            details = []
            for row in rows:
                name = row.get('name', '') or ''
                comm_id = row.get('comm_id', '') or ''
                details.append({
                    'Registration Code': comm_id,
                    'Registration Name': name,
                    'Community Name': name,
                    'Club Name': name,
                    'Faculty Champion': '',
                    'Employee ID': '',
                    'Contact Number': '',
                    'Email ID': '',
                    'Cluster / Department': '',
                    'Secretary': '', 'Sec. UID': '', 'Secretary Email': '', 'Secretary Contact': '',
                    'Jt. SECRETARY': '', 'Jt. SEC. UID': '', 'Jt. SEC EMAIL': '', 'Jt. SEC CONTACT': '',
                    'approved_budget': row.get('approved_budget'),
                    'spent_budget': row.get('spent_budget', 0.0)
                })
            return JsonResponse({'details': details})
    return _cached_details_view('community_details', _fetch)

@csrf_exempt
def update_budget(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        registration_code = data.get('registration_code')
        approved_budget = data.get('approved_budget')
        required_budget = data.get('required_budget')
        
        if not registration_code:
            return JsonResponse({'error': 'Registration code required'}, status=400)
            
        table_name = 'Clubs'
        id_field = 'registration_code'
        if registration_code.startswith('CU2026/DEPT/'):
            table_name = 'departments'
            id_field = 'dept_id'
        elif registration_code.startswith('CU2026/PROF/'):
            table_name = 'professional_societies'
            id_field = 'prof_soc_id'
        elif registration_code.startswith('CU2026/COMM/'):
            table_name = 'communities'
            id_field = 'comm_id'
            
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT approved_budget, spent_budget FROM {table_name} WHERE {id_field} = %s", [registration_code])
            row = cursor.fetchone()
            if not row:
                return JsonResponse({'error': 'Club/Department not found'}, status=404)
                
            current_approved = row[0]
            new_approved_budget = current_approved
            if (current_approved is None or current_approved == '') and approved_budget is not None:
                try:
                    new_approved_budget = float(approved_budget)
                except ValueError:
                    new_approved_budget = None
                    
            additional_spent = 0.0
            if required_budget:
                import re
                match = re.search(r'\d+', str(required_budget))
                if match:
                    additional_spent = float(match.group())
                    
            cursor.execute(f"""
                UPDATE {table_name} 
                SET approved_budget = %s, spent_budget = COALESCE(spent_budget, 0) + %s 
                WHERE {id_field} = %s
            """, [new_approved_budget, additional_spent, registration_code])
            
        return JsonResponse({'success': True, 'message': 'Budget updated successfully in local database'})
    except Exception as e:
        return JsonResponse({'error': f'Failed to update budget: {str(e)}'}, status=500)

@csrf_exempt
def event_publication(request, login_id=None):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO EventPublications 
                    (login_id, event_name, status, publish_date)
                    VALUES (%s, %s, %s, %s)
                """, [
                    data.get('login_id'),
                    data.get('event_name'),
                    data.get('status', 'Pending'),
                    data.get('publish_date')
                ])
            return JsonResponse({'success': True, 'message': 'Publication stored'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    elif request.method == 'GET':
        if not login_id:
            return JsonResponse({'error': 'login_id required'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM EventPublications WHERE login_id = %s", [login_id])
            rows = dictfetchall(cursor)
        return JsonResponse({'publications': rows})
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# --- Google Sheets Endpoints ---

def data_sheet(request, sheet_name):
    rows = _cached_sheet(SPREADSHEET_ID, sheet_name)
    if not rows or len(rows) == 0:
        return JsonResponse({'message': 'No data found in this sheet.'}, status=404)
        
    headers = rows[0]
    data = []
    for row in rows[1:]:
        obj = {}
        for i, header in enumerate(headers):
            obj[header] = row[i] if i < len(row) else ''
        data.append(obj)
        
    return JsonResponse({'data': data})

@csrf_exempt
def proposed_events(request, row_index=None):
    if request.method == 'GET':
        rows = _cached_sheet(PROPOSED_EVENTS_SPREADSHEET_ID, 'Sheet1')
        if not rows or len(rows) < 2:
            return JsonResponse({'events': []})
            
        headers = rows[0]
        events = []
        for row in rows[1:]:
            obj = {}
            for i, header in enumerate(headers):
                clean_header = header.strip()
                obj[clean_header] = row[i] if i < len(row) else ''
            events.append(obj)
            
        return JsonResponse({'events': events})
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            row_data = [
                data.get('srNo', ''),
                data.get('cluster', ''),
                data.get('institute', ''),
                data.get('department', ''),
                data.get('entityType', ''),
                data.get('entityName', ''),
                data.get('eventName', ''),
                data.get('proposedDate', ''),
                data.get('levelOfEvent', ''),
                data.get('typeOfEvent', ''),
                data.get('guestName', ''),
                data.get('affiliation', ''),
                data.get('venue', ''),
                data.get('budgetUsed', ''),
                data.get('participants', ''),
                data.get('receivedOn', ''),
                data.get('collectedBy', ''),
                data.get('outcome', ''),
                data.get('description', '')
            ]
            append_to_sheet(PROPOSED_EVENTS_SPREADSHEET_ID, 'Sheet1', row_data)
            return JsonResponse({'success': True, 'message': 'Proposed Event added successfully!'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
            
    elif request.method == 'PUT' and row_index is not None:
        try:
            data = json.loads(request.body)
            row_data = [
                data.get('srNo', ''),
                data.get('cluster', ''),
                data.get('institute', ''),
                data.get('department', ''),
                data.get('entityType', ''),
                data.get('entityName', ''),
                data.get('eventName', ''),
                data.get('proposedDate', ''),
                data.get('levelOfEvent', ''),
                data.get('typeOfEvent', ''),
                data.get('guestName', ''),
                data.get('affiliation', ''),
                data.get('venue', ''),
                data.get('budgetUsed', ''),
                data.get('participants', ''),
                data.get('receivedOn', ''),
                data.get('collectedBy', ''),
                data.get('outcome', ''),
                data.get('description', '')
            ]
            update_sheet_row(PROPOSED_EVENTS_SPREADSHEET_ID, 'Sheet1', row_index, row_data)
            return JsonResponse({'success': True, 'message': 'Proposed Event updated successfully!'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def events_propose(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            row_data = [
                '', # SR No
                data.get('clubName', ''),
                data.get('departmentName', ''),
                data.get('eventName', ''),
                data.get('activityType', ''),
                data.get('periodicity', ''),
                data.get('typeOfActivity', ''),
                data.get('descriptions', ''),
                data.get('proposedDate', ''),
                data.get('proposedBudget', ''),
                data.get('budgetInNumbers', ''),
                data.get('proposedVenue', ''),
                data.get('usp', ''),
                data.get('collaborationPartner', ''),
                data.get('internalCount', ''),
                data.get('externalCount', ''),
                data.get('industryAssociation', ''),
                data.get('expectedOutcome', ''),
                data.get('presentationLink', '')
            ]
            append_to_sheet(CALENDAR_SPREADSHEET_ID, 'Sheet1', row_data)
            return JsonResponse({'success': True, 'message': 'Event proposed successfully!'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

def get_key_value(d, key_name):
    clean_key = key_name.strip().lower()
    for k in d.keys():
        if k.strip().lower() == clean_key:
            return d[k]
    return ''

def extract_start_date(date_val):
    if not date_val:
        return ''
    date_val = str(date_val).strip()
    if ' to ' in date_val.lower():
        return date_val.lower().split(' to ')[0].strip()
    if '-' in date_val:
        if '/' in date_val:
            return date_val.split('-')[0].strip()
        parts = [p.strip() for p in date_val.split('-')]
        if len(parts) == 3:
            return date_val
        elif len(parts) > 3:
            return f"{parts[0]}-{parts[1]}-{parts[2]}"
    return date_val

def events(request):
    try:
        role = request.GET.get('role', '')
        club = request.GET.get('club', '').lower().strip()
        
        is_department = (role == 'Department')
        is_professional = (role == 'Professional Society')
        is_community = (role == 'Community')

        if is_community:
            sheet_range = 'COMMUNITIES'
        elif is_professional:
            sheet_range = 'PROF. SOCIETIES'
        elif is_department:
            sheet_range = 'DEPT SOCIETIES'
        else:
            sheet_range = 'CLUBS'

        old_rows = []
        if is_department:
            old_rows = _cached_sheet(CALENDAR_SPREADSHEET_ID, 'Sheet1')
        elif not is_professional and not is_community:
            old_rows = _cached_sheet('1UkeJL4ScT3ay9sfIFjCDjYd91RIKMter1YCbi3wVo-4', 'CLUB Calender ')

        old_club_rows = old_rows if (not is_department and not is_professional and not is_community) else _cached_sheet('1UkeJL4ScT3ay9sfIFjCDjYd91RIKMter1YCbi3wVo-4', 'CLUB Calender ')
        fund_source_lookup = {}
        if old_club_rows and len(old_club_rows) > 2:
            old_headers_lower = [h.strip().lower() for h in old_club_rows[1]]
            prop_budg_idx = -1
            evt_name_idx = -1
            for idx, h in enumerate(old_headers_lower):
                if h == 'proposed budget':
                    prop_budg_idx = idx
                elif h in ['event name', 'event name ']:
                    evt_name_idx = idx
            
            if prop_budg_idx != -1 and evt_name_idx != -1:
                for row in old_club_rows[2:]:
                    if len(row) > max(prop_budg_idx, evt_name_idx):
                        evt_name_val = row[evt_name_idx].strip().lower()
                        fund_val = row[prop_budg_idx].strip()
                        if evt_name_val and fund_val:
                            fund_source_lookup[evt_name_val] = fund_val

        new_rows = _cached_sheet('1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ', sheet_range)
        
        if not is_department and not is_professional and not is_community:
            # 1. Parse new_events from 1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ::CLUBS
            new_events = []
            if len(new_rows) > 1:
                headers = [h.strip() for h in new_rows[1]]
                last_seen_club = ''
                last_seen_dept = ''
                for row in new_rows[2:]:
                    # Skip empty rows or rows without event name
                    if len(row) <= 3 or not row[3].strip():
                        continue
                    
                    obj = {}
                    for idx, h in enumerate(headers):
                        val = row[idx].strip() if idx < len(row) else ''
                        obj[h] = val
                    
                    # Handle last seen values for Club Name and Department Name
                    c_name = get_key_value(obj, 'Club Name')
                    if c_name:
                        last_seen_club = c_name
                    else:
                        for k in obj.keys():
                            if k.strip().lower() == 'club name':
                                obj[k] = last_seen_club
                                
                    d_name = get_key_value(obj, 'Department Name')
                    if d_name:
                        last_seen_dept = d_name
                    else:
                        for k in obj.keys():
                            if k.strip().lower() == 'department name':
                                obj[k] = last_seen_dept

                    # Explicitly set normalized keys for frontend
                    obj['Club Name'] = get_key_value(obj, 'Club Name')
                    obj['Department Name'] = get_key_value(obj, 'Department Name')
                    obj['Event Name'] = get_key_value(obj, 'Event Name')
                    obj['Event/activity Type'] = get_key_value(obj, 'Event/activity Type')
                    obj['Periodicity'] = get_key_value(obj, 'Periodicity')
                    obj['Type of Activity'] = get_key_value(obj, 'Type of Activity')
                    obj['Proposed Budget'] = get_key_value(obj, 'Proposed Budget')
                    
                    prop_date = get_key_value(obj, 'Prposed Start Date') or get_key_value(obj, 'Proposed Start Date') or get_key_value(obj, 'Proposed Date')
                    prop_date = extract_start_date(prop_date)
                    obj['Proposed Date'] = prop_date
                    obj['Proposed Date '] = prop_date
                    obj['PROPOSED DATE'] = prop_date
                    
                    new_events.append(obj)

            # 2. Parse old_events from 1UkeJL4ScT3ay9sfIFjCDjYd91RIKMter1YCbi3wVo-4::CLUB Calender 
            old_events_map = {}
            if old_rows and len(old_rows) > 2:
                old_headers = [h.strip().lower() for h in old_rows[1]]
                for row in old_rows[2:]:
                    try:
                        evt_idx = old_headers.index('event name')
                        club_idx = old_headers.index('club name') if 'club name' in old_headers else -1
                        if len(row) > evt_idx and row[evt_idx].strip():
                            evt_name_norm = row[evt_idx].strip().lower()
                            club_name_norm = row[club_idx].strip().lower() if club_idx != -1 and len(row) > club_idx else ''
                            
                            detail_dict = {}
                            for idx, h in enumerate(old_headers):
                                val = row[idx].strip() if idx < len(row) else ''
                                detail_dict[h] = val
                            
                            old_events_map[(club_name_norm, evt_name_norm)] = detail_dict
                    except ValueError:
                        pass

            # 3. Merge details from old_events_map into new_events
            merged_events = []
            for ev in new_events:
                evt_name_norm = ev.get('Event Name', '').strip().lower()
                club_name_norm = ev.get('Club Name', '').strip().lower()
                
                detail = old_events_map.get((club_name_norm, evt_name_norm))
                if not detail:
                    for key_pair, val_dict in old_events_map.items():
                        if key_pair[1] == evt_name_norm:
                            detail = val_dict
                            break
                
                if detail:
                    ev['Descrptions'] = detail.get('descrptions') or detail.get('descrptions ') or detail.get('description') or ''
                    ev['Proposed Venue'] = detail.get('proposed venue') or detail.get('venue') or ''
                    ev['USP '] = detail.get('usp') or detail.get('usp ') or ''
                    ev['Proposed Collaboration Partner'] = detail.get('proposed collaboration partner') or detail.get('guest name [affiliation/designation]') or ''
                    ev['Internal'] = detail.get('internal') or detail.get('internal ') or ''
                    ev['External'] = detail.get('external') or detail.get('external ') or ''
                    ev['Industry Association / Sponsorship'] = detail.get('industry association / sponsorship') or ''
                    ev['Excepted Outcome'] = detail.get('excepted outcome') or detail.get('excepted outcome ') or ''
                    ev['Upload Presentation link '] = detail.get('upload presentation link') or detail.get('upload presentation link ') or ''
                    ev['Mention Proposed Budget [ in Numbers]'] = detail.get('mention proposed budget [ in numbers]') or detail.get('mention proposed budget [ in numbers] ') or detail.get('budget used') or ''
                else:
                    ev['Descrptions'] = ''
                    ev['Proposed Venue'] = ''
                    ev['USP '] = ''
                    ev['Proposed Collaboration Partner'] = ''
                    ev['Internal'] = ''
                    ev['External'] = ''
                    ev['Industry Association / Sponsorship'] = ''
                    ev['Excepted Outcome'] = ''
                    ev['Upload Presentation link '] = ''
                    ev['Mention Proposed Budget [ in Numbers]'] = ''
                    
                merged_events.append(ev)
            
            events_list = merged_events
            
        else:
            # Department / Professional Society / Community
            if not new_rows:
                return JsonResponse({'events': []})

            # Header row and data start differ per sheet layout
            if is_professional:
                # PROF. SOCIETIES: row 0 = headers, row 1+ = data
                header_row_idx = 0
                data_start_idx = 1
            else:
                # DEPT SOCIETIES: row 0 = headers, row 1+ = data
                header_row_idx = 0
                data_start_idx = 1

            if len(new_rows) <= header_row_idx:
                return JsonResponse({'events': []})

            new_headers = [h.strip() for h in new_rows[header_row_idx]]

            header_mapping = {
                # Shared
                'EVENT NAME': 'Event Name',
                'PROPOSED DATE': 'Proposed Date',
                'BUDGET USED': 'Mention Proposed Budget [ in Numbers]',
                'VENUE': 'Proposed Venue',
                'DEPARTMENT': 'Club Name',
                'ENTITY NAME': 'Entity Name',
                'OUTCOME OF ACTIVITY': 'Excepted Outcome',
                'DESCRIPTION': 'Descrptions',
                'PARTICIPANTS': 'Internal',
                'GUEST NAME [AFFILIATION/DESIGNATION]': 'Proposed Collaboration Partner',
                'STATUS OF ACTIVITY/EVENT': 'STATUS OF ACTIVITY/EVENT',
                'COLLECTED BY': 'Collected By',
                'CUIMS ACTIVITY ID ': 'CUIMS Activity ID',
                # DEPT SOCIETIES specific
                'TYPE OF EVENT/ACTIVITY': 'Type of Activity',
                'LEVEL OF EVENT/ACTIVITY': 'Event/activity Type',
                # PROF. SOCIETIES specific
                'LEVEL OF EVENT': 'Event/activity Type',
                'CATEGORY OF ACTIVITY': 'Type of Activity',
                'DESCRIPTION (MINIMUM IN 100 WORDS)': 'Descrptions',
                # COMMUNITIES specific
                'INSTITUTE': 'Institute',
                'CLUSTER': 'Cluster',
                'ENTITY TYPE': 'Entity/activity Type',
                'TYPE OF EVENT/ACTIVITY': 'Type of Activity',
                'LEVEL OF EVENT/ACTIVITY': 'Event/activity Type',
            }


            new_events = []
            last_seen_values = {}
            if len(new_rows) > data_start_idx:
                for row in new_rows[data_start_idx:]:
                    obj = {}
                    for i, header in enumerate(new_headers):
                        key = header.strip()
                        val = row[i].strip() if i < len(row) and row[i] else ''

                        lower_key = key.lower()
                        if lower_key in ['department', 'entity name', 'club name']:
                            if val:
                                last_seen_values[key] = val
                            elif key in last_seen_values:
                                val = last_seen_values[key]

                        mapped_key = header_mapping.get(key.upper())
                        if mapped_key:
                            if mapped_key == 'Proposed Date':
                                val = extract_start_date(val)
                            obj[mapped_key] = val
                        obj[key] = val
                    # Skip blank rows (no event name)
                    if obj.get('Event Name', '').strip():
                        new_events.append(obj)

            events_list = new_events


            # --- Merge DB event requests (Department only) ---
            if is_department:
                try:
                    with connection.cursor() as db_cur:
                        if club:
                            # Resolve dept_id from intranetapp_dept by matching department name
                            db_cur.execute("SELECT dept_id, dept_name FROM intranetapp_dept")
                            dept_map_rows = dictfetchall(db_cur)
                            matched_dept_id = None
                            for dm in dept_map_rows:
                                n1 = club.lower().replace('-', '').replace(' ', '')
                                n2 = (dm.get('dept_name') or '').lower().replace('-', '').replace(' ', '')
                                if n1 == n2 or n1 in n2 or n2 in n1:
                                    matched_dept_id = dm['dept_id']
                                    break

                            if matched_dept_id is not None:
                                db_cur.execute(
                                    "SELECT reg_id FROM intranetapp_entityregistration WHERE department_id = %s",
                                    [matched_dept_id]
                                )
                                reg_id_rows = db_cur.fetchall()
                                reg_ids = [r[0] for r in reg_id_rows]
                            else:
                                reg_ids = []

                            if reg_ids:
                                placeholders = ', '.join(['%s'] * len(reg_ids))
                                db_cur.execute(f"""
                                    SELECT er.er_id, er.event_name, er.status, er.start_date_proposed,
                                           er.start_date, er.budget, er.description, er.activity_type,
                                           er.organiser_guest_name,
                                           reg.registeration_name, reg.registeration_code
                                    FROM intranetapp_eventrequest er
                                    LEFT JOIN intranetapp_entityregistration reg ON er.reg_id_id = reg.reg_id
                                    WHERE er.reg_id_id IN ({placeholders})
                                """, reg_ids)
                                db_event_rows = dictfetchall(db_cur)
                            else:
                                db_event_rows = []
                        else:
                            # No club filter — return all dept-society events from DB
                            db_cur.execute("""
                                SELECT er.er_id, er.event_name, er.status, er.start_date_proposed,
                                       er.start_date, er.budget, er.description, er.activity_type,
                                       er.organiser_guest_name,
                                       reg.registeration_name, reg.registeration_code
                                FROM intranetapp_eventrequest er
                                LEFT JOIN intranetapp_entityregistration reg ON er.reg_id_id = reg.reg_id
                            """)
                            db_event_rows = dictfetchall(db_cur)

                    # Avoid duplicating events already present from the sheet (match by event name)
                    # Track all seen event names (sheet + db) to avoid duplicates
                    seen_event_names = {e.get('Event Name', '').strip().lower() for e in events_list}

                    for dbr in db_event_rows:
                        db_evt_name = (dbr.get('event_name') or '').strip()
                        if not db_evt_name or db_evt_name.lower() in seen_event_names:
                            continue  # already represented from sheet or prior DB row
                        seen_event_names.add(db_evt_name.lower())

                        proposed_date = str(
                            dbr.get('start_date_proposed') or dbr.get('start_date') or ''
                        )
                        db_status = dbr.get('status') or 'Pending'

                        events_list.append({
                            'Event Name': db_evt_name,
                            'Type of Activity': dbr.get('activity_type', '') or '',
                            'Event/activity Type': dbr.get('activity_type', '') or '',
                            'Proposed Date': proposed_date,
                            'Mention Proposed Budget [ in Numbers]': str(dbr.get('budget') or ''),
                            'Proposed Venue': '',
                            'Club Name': (club or dbr.get('registeration_name') or '').upper(),
                            'Entity Name': dbr.get('registeration_name', '') or '',
                            'Excepted Outcome': '',
                            'Descrptions': dbr.get('description', '') or '',
                            'Internal': '',
                            'External': '',
                            'Proposed Collaboration Partner': dbr.get('organiser_guest_name', '') or '',
                            'STATUS OF ACTIVITY/EVENT': db_status,
                            'Status': db_status,
                            'SR No': f"db-{dbr.get('er_id')}",
                            '_from_db': True
                        })
                except Exception as db_err:
                    print(f"[events] DB merge error: {db_err}")


        def has_event_name(e):
            for k in e.keys():
                if k.lower().strip() == 'event name' and e[k].strip() != '':
                    return True
            return False
            
        events_list = [e for e in events_list if has_event_name(e)]
        
        if club:
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
            events_list = filtered_events
        # Populate Source of Fund for all events before returning
        for e in events_list:
            evt_name = ''
            for k in e.keys():
                if k.lower().strip() == 'event name':
                    evt_name = e[k].strip().lower()
                    break
            existing_fund = ''
            for k in e.keys():
                if k.lower().strip() == 'source of fund':
                    existing_fund = e[k].strip()
                    break
            fund_source = fund_source_lookup.get(evt_name) or existing_fund or ''
            e['Source of Fund'] = fund_source
            e['Source of Fund '] = fund_source
            e['SOURCE OF FUND'] = fund_source
            
        return JsonResponse({'events': events_list})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def all_proposed_calendar(request):
    try:
        master_id = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ'
        clubs_rows = _cached_sheet(master_id, 'CLUBS')
        depts_rows = _cached_sheet(master_id, 'DEPT SOCIETIES')
        prof_rows  = _cached_sheet(master_id, 'PROF. SOCIETIES')
        comm_rows  = _cached_sheet(master_id, 'COMMUNITIES')

        all_events = []

        # ── CLUBS: row 0 = filler/title, row 1 = headers, rows 2+ = data ──
        if clubs_rows and len(clubs_rows) >= 3:
            headers = [h.strip() for h in clubs_rows[1]]
            last_seen = {}
            for row in clubs_rows[2:]:
                obj = {}
                for i, header in enumerate(headers):
                    val = row[i].strip() if i < len(row) and row[i] else ''
                    if header.lower() in ['club name', 'entity name', 'department']:
                        if val: last_seen[header] = val
                        elif header in last_seen: val = last_seen[header]
                    obj[header] = val
                obj['EntityType'] = 'Club'
                obj['STATUS OF ACTIVITY/EVENT'] = obj.get('STATUS OF ACTIVITY/EVENT', '')
                if obj.get('Event Name', '').strip():
                    all_events.append(obj)

        # ── Generic helper for DEPT, PROF, COMMUNITIES (all row-0 headers) ──
        def parse_sheet(rows, entity_type):
            if not rows or len(rows) < 2:
                return
            headers = [h.strip() for h in rows[0]]
            last_seen = {}
            # Normalised-key → canonical display key
            rename = {
                'EVENT NAME':                      'Event Name',
                'EVENT NAME ':                     'Event Name',
                'TYPE OF EVENT/ACTIVITY':          'Type of Activity',
                'LEVEL OF EVENT/ACTIVITY':         'Event/activity Type',
                'LEVEL OF EVENT':                  'Event/activity Type',
                'PROPOSED DATE':                   'Proposed Date',
                'BUDGET USED':                     'Mention Proposed Budget [ in Numbers]',
                'VENUE':                           'Proposed Venue',
                'DEPARTMENT':                      'Club Name',
                'STATUS OF ACTIVITY/EVENT':        'STATUS OF ACTIVITY/EVENT',
                'OUTCOME OF ACTIVITY':             'Briefly elaborate about the outcome of the event',
                'CATEGORY OF ACTIVITY':            'Type of Activity',
                'DESCRIPTION (MINIMUM IN 100 WORDS)': 'Descrptions',
            }
            for row in rows[1:]:
                obj = {}
                for i, header in enumerate(headers):
                    val = row[i].strip() if i < len(row) and row[i] else ''
                    key_up = header.upper()
                    if header.lower() in ['department', 'entity name', 'club name']:
                        if val: last_seen[header] = val
                        elif header in last_seen: val = last_seen[header]
                    canonical = rename.get(key_up)
                    if canonical:
                        obj[canonical] = val
                    obj[header] = val  # also keep raw key
                obj['EntityType'] = entity_type
                if obj.get('Event Name', '').strip():
                    all_events.append(obj)

        parse_sheet(depts_rows, 'Department')
        parse_sheet(prof_rows,  'Professional Society')
        parse_sheet(comm_rows,  'Community')

        return JsonResponse({'events': all_events})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def auth_signup(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        if not name or not email or not password:
            return JsonResponse({'error': 'Missing required fields'}, status=400)
            
        row_data = [name, email, password, 'Student']
        append_to_sheet(SPREADSHEET_ID, 'General', row_data)
        return JsonResponse({'success': True, 'message': 'Account created successfully', 'role': 'Student'})
    except Exception as e:
        return JsonResponse({'error': 'Signup failed.'}, status=500)

@csrf_exempt
def auth_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            return JsonResponse({'error': 'Missing email or password'}, status=400)
            
        sheet_names = ['Admin', 'CFC', 'Secretaries', 'General']
        for sheet in sheet_names:
            rows = _cached_sheet(SPREADSHEET_ID, sheet)
            if not rows or len(rows) == 0:
                continue
            for i in range(1, len(rows)):
                row = rows[i]
                if len(row) < 3: continue
                sheet_email = row[1]
                sheet_pass = row[2]
                sheet_role = row[3] if len(row) > 3 and row[3] else sheet
                sheet_club = row[4] if len(row) > 4 else ''
                
                if sheet_email == email and sheet_pass == password:
                    return JsonResponse({
                        'success': True,
                        'message': 'Login successful',
                        'role': sheet_role,
                        'name': row[0],
                        'clubName': sheet_club
                    })
        return JsonResponse({'success': False, 'message': 'Invalid email or password'}, status=401)
    except Exception as e:
        return JsonResponse({'error': 'Login failed'}, status=500)

def approval_forms(request):
    try:
        club_name = request.GET.get('clubName', '')
        
        archive_id = '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig'
        all_forms = []
        
        for sheet_name in ['Club', 'Dept Societies', 'Proffessional Societies', 'Communities']:
            try:
                rows = _cached_sheet(archive_id, sheet_name)
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
                m_rows = _cached_sheet(master_id, ms)
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

@csrf_exempt
def approval_forms_submit(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        values = [
            datetime.datetime.now().isoformat(),
            data.get('entryReceivedDate', ''),
            data.get('entryRegNum', ''),
            data.get('entryActivityId', ''),
            data.get('entryEntityType', ''),
            data.get('entryEntityName', ''),
            data.get('entryEventName', ''),
            data.get('entryEventType', ''),
            data.get('entryEventCategory', ''),
            data.get('entryOrganizedBy', ''),
            data.get('entryVenue', ''),
            data.get('entryDateTime', ''),
            data.get('entryTechSkill', ''),
            data.get('entryOtherSkill', ''),
            data.get('entrySdg', ''),
            data.get('entryUgc', ''),
            data.get('entryEventMode', ''),
            data.get('entryOutcome', ''),
            data.get('entryParticipantsCount', ''),
            data.get('entryDescription', ''),
            data.get('entryCoordName', ''),
            data.get('entryCoordEid', ''),
            data.get('entryCoordEmail', ''),
            data.get('entryCoordDesignation', ''),
            data.get('entryCoordContact', ''),
            'Yes' if data.get('entryPartInternal') else 'No',
            'Yes' if data.get('entryPartNational') else 'No',
            'Yes' if data.get('entryPartInterdept') else 'No',
            'Yes' if data.get('entryFundCentral') else 'No',
            'Yes' if data.get('entryFundDept') else 'No',
            data.get('entryGuestName', ''),
            data.get('entryGuestAffil', ''),
            data.get('entryGuestSubject', ''),
            data.get('entrySection', ''),
            data.get('entryBudgApproved', ''),
            data.get('entryBudgUsed', ''),
            data.get('entryBudgBalance', ''),
            data.get('entryBudgSponsor', ''),
            data.get('entryBudgRequired', '')
        ]

        # ── Route to correct archive sub-sheet ────────────────────────────
        entity_type = (data.get('entryEntityType', '')).lower()
        if 'department' in entity_type:
            dest_sheet = 'Dept Societies'
            master_sheet = 'DEPT SOCIETIES'
        elif 'professional' in entity_type:
            dest_sheet = 'Proffessional Societies'
            master_sheet = 'PROF. SOCIETIES'
        elif 'community' in entity_type or 'comm' in entity_type:
            dest_sheet = 'Communities'
            master_sheet = 'COMMUNITIES'
        else:
            dest_sheet = 'Club'
            master_sheet = 'CLUBS'

        # ── 1. Append full row to archive collection sheet ─────────────────
        append_to_sheet('1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig', dest_sheet, values)

        # ── 2. Update specific columns in the master tracker ──────────────
        try:
            club_sheet_id = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ'
            master_rows = _cached_sheet(club_sheet_id, master_sheet)

            sheet_meta = {
                'CLUBS':           {'hdr': 1, 'evt_col': 3},
                'DEPT SOCIETIES':  {'hdr': 0, 'evt_col': 6},
                'PROF. SOCIETIES': {'hdr': 0, 'evt_col': 4},
                'COMMUNITIES':     {'hdr': 0, 'evt_col': 6},
            }
            meta = sheet_meta[master_sheet]
            start_row = meta['hdr'] + 1
            event_name_idx = meta['evt_col']
            target_event_name = data.get('entryEventName', '').strip().lower()

            target_row_idx = -1
            for i in range(start_row, len(master_rows)):
                row_i = master_rows[i]
                if len(row_i) > event_name_idx and row_i[event_name_idx].strip().lower() == target_event_name:
                    target_row_idx = i
                    break

            if target_row_idx != -1:
                guest_info = (
                    f"{data.get('entryGuestName', '')} [{data.get('entryGuestAffil', '')}]"
                    if data.get('entryGuestAffil')
                    else data.get('entryGuestName', '')
                )
                budget_used = data.get('entryBudgUsed', '') or data.get('entryBudgRequired', '')

                if master_sheet == 'CLUBS':
                    # Cols J-R (0-indexed 9-17)
                    update_values = [
                        data.get('entryDescription', ''),   # J (9)
                        guest_info,                          # K (10)
                        data.get('entryVenue', ''),          # L (11)
                        data.get('entryBudgSponsor', ''),    # M (12) Source of Fund
                        budget_used,                         # N (13) BUDGET USED
                        data.get('entryParticipantsCount', ''),  # O (14)
                        data.get('entryOutcome', ''),        # P (15)
                        data.get('entrySection', ''),        # Q (16)
                        'Form Submitted',                    # R (17)
                    ]
                    update_sheet_row(club_sheet_id, master_sheet, target_row_idx, update_values, start_col_index=9)

                elif master_sheet == 'DEPT SOCIETIES':
                    # Cols K-R (0-indexed 10-17)
                    update_values = [
                        data.get('entryDescription', ''),   # K (10)
                        guest_info,                          # L (11)
                        data.get('entryVenue', ''),          # M (12)
                        budget_used,                         # N (13)
                        data.get('entryParticipantsCount', ''),  # O (14)
                        data.get('entrySection', ''),        # P (15)
                        data.get('entryOutcome', ''),        # Q (16)
                        'Form Submitted',                    # R (17)
                    ]
                    update_sheet_row(club_sheet_id, master_sheet, target_row_idx, update_values, start_col_index=10)

                elif master_sheet == 'PROF. SOCIETIES':
                    # Cols H-O (0-indexed 7-14)
                    update_values = [
                        data.get('entryDescription', ''),   # H (7)
                        guest_info,                          # I (8)
                        data.get('entryVenue', ''),          # J (9)
                        budget_used,                         # K (10)
                        data.get('entryParticipantsCount', ''),  # L (11)
                        data.get('entrySection', ''),        # M (12)
                        data.get('entryOutcome', ''),        # N (13)
                        'Form Submitted',                    # O (14)
                    ]
                    update_sheet_row(club_sheet_id, master_sheet, target_row_idx, update_values, start_col_index=7)

                elif master_sheet == 'COMMUNITIES':
                    # Cols K-R (0-indexed 10-17)
                    update_values = [
                        data.get('entryDescription', ''),   # K (10)
                        guest_info,                          # L (11)
                        data.get('entryVenue', ''),          # M (12)
                        budget_used,                         # N (13)
                        data.get('entryParticipantsCount', ''),  # O (14)
                        data.get('entrySection', ''),        # P (15)
                        data.get('entryOutcome', ''),        # Q (16)
                        'Form Submitted',                    # R (17)
                    ]
                    update_sheet_row(club_sheet_id, master_sheet, target_row_idx, update_values, start_col_index=10)

            else:
                print(f'[approval_forms_submit] Event "{target_event_name}" not found in {master_sheet}')

        except Exception as update_error:
            print('Failed to update master tracker:', update_error)

        # ── 3. Bust all relevant caches ────────────────────────────────────
        archive_id = '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig'
        master_id  = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ'
        _cache.invalidate(
            f"{archive_id}::Club",
            f"{archive_id}::Communities",
            f"{archive_id}::Dept Societies",
            f"{archive_id}::Proffessional Societies",
            f"{master_id}::CLUBS",
            f"{master_id}::DEPT SOCIETIES",
            f"{master_id}::PROF. SOCIETIES",
            f"{master_id}::COMMUNITIES",
        )

        return JsonResponse({'success': True, 'message': 'Response submitted successfully!'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def update_master_status(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        event_name = data.get('eventName')
        new_status = data.get('newStatus')
        if not event_name or not new_status:
            return JsonResponse({'error': 'Missing eventName or newStatus'}, status=400)

        master_id = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ'
        updated = False
        
        for sheet, hdr_row in [('CLUBS',1), ('DEPT SOCIETIES',0), ('PROF. SOCIETIES',0), ('COMMUNITIES',0)]:
            rows = _cached_sheet(master_id, sheet)
            if not rows or len(rows) < 2: continue
            
            header_row_idx = hdr_row
            headers = rows[header_row_idx]
            
            event_name_idx = -1
            status_idx = -1
            for i, h in enumerate(headers):
                if not h: continue
                hl = h.strip().lower()
                if hl == 'event name': event_name_idx = i
                if hl in ['status', 'status of activity/event']: status_idx = i
                
            if event_name_idx == -1 or status_idx == -1: continue
            
            target_event_name = event_name.strip().lower()
            start_row = header_row_idx + 1
            
            for i in range(start_row, len(rows)):
                if len(rows[i]) > event_name_idx and rows[i][event_name_idx].strip().lower() == target_event_name:
                    update_sheet_row(master_id, sheet, i, [new_status], start_col_index=status_idx)
                    updated = True
                    break
            if updated: break
            
        if updated:
            _cache.invalidate(
                f"{master_id}::CLUBS",
                f"{master_id}::DEPT SOCIETIES",
                f"{master_id}::PROF. SOCIETIES",
                f"{master_id}::COMMUNITIES",
            )
            return JsonResponse({'success': True, 'message': 'Status updated successfully'})
        else:
            return JsonResponse({'success': False, 'error': 'Event not found in master sheets'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def propose_new_event(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        values = [
            datetime.datetime.now().isoformat(),
            data.get('entryReceivedDate', ''),
            data.get('entryRegNum', ''),
            data.get('entryActivityId', ''),
            data.get('entryEntityType', ''),
            data.get('entryEntityName', ''),
            data.get('entryEventName', ''),
            data.get('entryEventType', ''),
            data.get('entryEventCategory', ''),
            data.get('entryOrganizedBy', ''),
            data.get('entryVenue', ''),
            data.get('entryDateTime', ''),
            data.get('entryTechSkill', ''),
            data.get('entryOtherSkill', ''),
            data.get('entrySdg', ''),
            data.get('entryUgc', ''),
            data.get('entryEventMode', ''),
            data.get('entryOutcome', ''),
            data.get('entryParticipantsCount', ''),
            data.get('entryDescription', ''),
            data.get('entryCoordName', ''),
            data.get('entryCoordEid', ''),
            data.get('entryCoordEmail', ''),
            data.get('entryCoordDesignation', ''),
            data.get('entryCoordContact', ''),
            'Yes' if data.get('entryPartInternal') else 'No',
            'Yes' if data.get('entryPartNational') else 'No',
            'Yes' if data.get('entryPartInterdept') else 'No',
            'Yes' if data.get('entryFundCentral') else 'No',
            'Yes' if data.get('entryFundDept') else 'No',
            data.get('entryGuestName', ''),
            data.get('entryGuestAffil', ''),
            data.get('entryGuestSubject', ''),
            data.get('entrySection', ''),
            data.get('entryBudgApproved', ''),
            data.get('entryBudgUsed', ''),
            data.get('entryBudgBalance', ''),
            data.get('entryBudgSponsor', ''),
            data.get('entryBudgRequired', '')
        ]

        entity_type = (data.get('entryEntityType', '')).lower()
        if 'department' in entity_type:
            dest_sheet = 'new dept'
        elif 'professional' in entity_type:
            dest_sheet = 'new prof'
        elif 'community' in entity_type or 'comm' in entity_type:
            dest_sheet = 'new comm'
        else:
            dest_sheet = 'New club'

        archive_id = '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig'
        append_to_sheet(archive_id, dest_sheet, values)

        _cache.invalidate(
            f"{archive_id}::New club",
            f"{archive_id}::new dept",
            f"{archive_id}::new prof",
            f"{archive_id}::new comm",
        )

        return JsonResponse({'success': True, 'message': 'New event proposed successfully!'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def cache_clear(request):
    """Clear all cached Google Sheets data so the next request pulls fresh data."""
    count = len(_cache._store)
    with _cache._lock:
        _cache._store.clear()
    return JsonResponse({'success': True, 'cleared': count, 'message': f'Cleared {count} cache entries.'})


# ---------------------------------------------------------------------------
# Past Events: events whose approval form has already been submitted
# ---------------------------------------------------------------------------
def past_events(request):
    """
    Returns all events from the archive sheet for a given entity/role.
    These are events for which the entity has already filled the approval form.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        role  = request.GET.get('role', '').strip()
        club  = request.GET.get('club', '').strip().lower()

        archive_id = '1_RE6n6V6yb2DL89HjkAACxgAkigMh1eJEAjGk3NI8Ig'

        role_lower = role.lower()
        if 'department' in role_lower:
            sheet_name = 'Dept Societies'
        elif 'professional' in role_lower:
            sheet_name = 'Proffessional Societies'
        elif 'community' in role_lower or 'comm' in role_lower:
            sheet_name = 'Communities'
        else:
            sheet_name = 'Club'

        rows = _cached_sheet(archive_id, sheet_name)
        if not rows or len(rows) < 2:
            return JsonResponse({'events': []})

        headers = rows[0]
        events = []
        for row in rows[1:]:
            obj = {}
            for i, h in enumerate(headers):
                obj[h.strip()] = row[i].strip() if i < len(row) else ''

            # Filter by entity name if provided
            entity_name = (
                obj.get('Entity Name') or
                obj.get('Club Name') or
                obj.get('entryEntityName') or ''
            ).lower().strip()

            if club and entity_name and entity_name != club:
                # Try partial match
                if club not in entity_name and entity_name not in club:
                    continue

            events.append(obj)

        return JsonResponse({'events': events, 'sheet': sheet_name})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_activity_id(request):
    """
    Updates the Activity ID column in the master tracker sheet for a given event.

    Column mapping (1-indexed → 0-indexed):
      CLUBS          → column U = 21 → index 20
      DEPT SOCIETIES → column U = 21 → index 20
      PROF.SOCIETIES → column Q = 17 → index 16
      COMMUNITIES    → column U = 21 → index 20
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data        = json.loads(request.body)
        event_name  = (data.get('eventName') or '').strip().lower()
        role        = (data.get('role') or '').strip().lower()
        activity_id = (data.get('activityId') or '').strip()

        if not event_name or not activity_id:
            return JsonResponse({'error': 'eventName and activityId are required'}, status=400)

        master_id = '1FYfZH967DNvITrjE_entuSmJarJvfAYJSsnxvpWqGyQ'

        # Determine sheet + target column index (0-based)
        if 'department' in role:
            sheet_name  = 'DEPT SOCIETIES'
            col_index   = 20   # column U
            header_row  = 0    # headers are in row 0
        elif 'professional' in role:
            sheet_name  = 'PROF. SOCIETIES'
            col_index   = 16   # column Q
            header_row  = 0
        elif 'community' in role or 'comm' in role:
            sheet_name  = 'COMMUNITIES'
            col_index   = 20   # column U
            header_row  = 0
        else:
            sheet_name  = 'CLUBS'
            col_index   = 20   # column U
            header_row  = 1    # CLUBS sheet has a title row at row 0, headers at row 1

        rows = get_sheet_data_raw(master_id, sheet_name)
        if not rows or len(rows) <= header_row:
            return JsonResponse({'error': f'Sheet {sheet_name} is empty or has no data'}, status=404)

        headers = rows[header_row]

        # Find the event name column index
        evt_col = -1
        for i, h in enumerate(headers):
            if h.strip().upper() in ['EVENT NAME', 'EVENT NAME ']:
                evt_col = i
                break

        if evt_col == -1:
            return JsonResponse({'error': 'Could not locate Event Name column'}, status=500)

        # Scan rows for the matching event (data starts after header_row)
        matched_row_idx = -1
        for r_idx in range(header_row + 1, len(rows)):
            row = rows[r_idx]
            cell_val = row[evt_col].strip().lower() if evt_col < len(row) else ''
            if cell_val == event_name:
                matched_row_idx = r_idx
                break

        if matched_row_idx == -1:
            return JsonResponse({'error': f'Event "{event_name}" not found in {sheet_name}'}, status=404)

        # Update the single cell using gspread
        from .google_sheets_utils import get_gspread_client
        client = get_gspread_client()
        ws = client.open_by_key(master_id).worksheet(sheet_name)

        # gspread uses 1-based row/col
        gs_row = matched_row_idx + 1
        gs_col = col_index + 1
        ws.update_cell(gs_row, gs_col, activity_id)

        # Invalidate cache for this sheet
        _cache.invalidate(f'{master_id}::{sheet_name}')

        return JsonResponse({
            'success': True,
            'message': f'Activity ID updated in {sheet_name} row {gs_row}, col {gs_col}',
            'activityId': activity_id
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

