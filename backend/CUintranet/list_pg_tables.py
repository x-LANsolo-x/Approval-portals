import os
import sys
import django
from django.db import connection

sys.path.append('/home/nocturn/OAA/OAA Portals Vercel/Event approvals/backend/CUintranet')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = cursor.fetchall()
    for table in tables:
        print(table[0])
