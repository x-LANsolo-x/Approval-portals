import os
import sys
import sqlite3
import django

# Setup Django environment
sys.path.append('/home/nocturn/OAA/OAA Portals Vercel/Event approvals/backend/CUintranet')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()

from intranetapp.models import (
    Entity_Type, EntityRegistration, user_table, Roles, Dept, 
    Gender, Session, CurrentSession, Designation, Title
)

def get_or_create_defaults():
    # Setup Entity Types
    entity_types = {}
    for name in ["Clubs", "Departments", "Professional Societies", "Communities"]:
        et, _ = Entity_Type.objects.get_or_create(
            entity_name=name,
            defaults={"entity_short": name[:3].upper()}
        )
        entity_types[name] = et
        
    # Default Gender
    gender, _ = Gender.objects.get_or_create(gender_name="Other")
    
    # Default Dept
    dept, _ = Dept.objects.get_or_create(dept_name="Default Dept")
    
    # Default Session
    session, _ = Session.objects.get_or_create(
        start_year="2024", end_year="2025", 
        start_month="Jul", end_month="Jun"
    )
    # Ensure current session exists
    if not CurrentSession.objects.exists():
        CurrentSession.objects.create(session_code=session)
        
    # Default Designation and Title (required by user_table)
    desig, _ = Designation.objects.get_or_create(desig_name="Student")
    title, _ = Title.objects.get_or_create(title_name="Mr.")
    
    return entity_types, gender, dept, session, desig, title

def migrate():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    
    entity_types, gender, default_dept, default_session, desig, title = get_or_create_defaults()
    
    # Roles map
    role_map = {}
    cursor.execute("SELECT id, name, login_id, password, role FROM roles")
    for row in cursor.fetchall():
        r_name = row[1]
        role_obj, _ = Roles.objects.get_or_create(role_name=r_name)
        role_map[r_name] = role_obj
        
        user_table.objects.get_or_create(
            user_email=row[2],
            defaults={
                "username": row[2],
                "user_name": r_name,
                "password": row[3],
                "user_role": role_obj,
                "gender": gender,
                "dept_id": default_dept,
                "session_code": default_session
            }
        )
    print("Roles imported.")

    # Generic function to migrate entity
    def migrate_entity(table_name, entity_type_name):
        try:
            cursor.execute(f"SELECT * FROM {table_name}")
            columns = [col[0] for col in cursor.description]
        except Exception as e:
            print(f"Skipping {table_name} ({e})")
            return

        for row in cursor.fetchall():
            data = dict(zip(columns, row))
            
            # Map common fields based on what exists
            reg_code = data.get("registration_code", data.get("id", ""))
            reg_name = data.get("registration_name", data.get("name", ""))
            login_id = data.get("login_id", f"{reg_code}@example.com" if reg_code else "")
            password = data.get("password", "")
            
            if not login_id:
                continue

            # Check if user already exists
            user, created = user_table.objects.get_or_create(
                user_email=login_id,
                defaults={
                    "username": login_id,
                    "user_name": reg_name or "Unknown",
                    "password": password,
                    "gender": gender,
                    "dept_id": default_dept,
                    "session_code": default_session
                }
            )

            # Create EntityRegistration
            # We map as many fields as we can find in the legacy schema
            sec_email = data.get("secretary_email", "")
            jsec_email = data.get("jt_sec_email", "")
            fac_email = data.get("email_id", "")
            
            EntityRegistration.objects.get_or_create(
                registeration_code=reg_code,
                defaults={
                    "registeration_name": reg_name,
                    "entity": entity_types[entity_type_name],
                    "department": default_dept,
                    "faculty_advisory_name": data.get("faculty_champion", ""),
                    "faculty_advisory_email": fac_email if fac_email else login_id,
                    "faculty_advisory_dept": default_dept,
                    "faculty_co_advisory_dept": default_dept,
                    "Secretary_name": data.get("secretary", ""),
                    "Secretary_email": sec_email if sec_email else login_id,
                    "Secretary_dept": default_dept,
                    "Joint_Secretary_name": data.get("jt_secretary", ""),
                    "Joint_Secretary_email": jsec_email,
                    "Joint_Secretary_dept": default_dept,
                    "session_code": default_session
                }
            )
        print(f"{table_name} imported as {entity_type_name}.")

    # Run migrations
    migrate_entity("Clubs", "Clubs")
    migrate_entity("departments", "Departments")
    migrate_entity("professional_societies", "Professional Societies")
    migrate_entity("communities", "Communities")
    
    conn.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate()
