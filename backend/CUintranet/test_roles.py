import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT * FROM roles")
    print(cursor.fetchall())
