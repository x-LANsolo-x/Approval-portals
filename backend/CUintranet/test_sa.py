import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()
from intranetapp.views_node_migrated import superadmin_stats, superadmin_events
from django.test import RequestFactory
import json

factory = RequestFactory()
request = factory.get('/api/superadmin/stats')
response = superadmin_stats(request)
print("Stats response status:", response.status_code)
if response.status_code == 200:
    print(response.content[:200])
else:
    print(response.content)

request2 = factory.get('/api/superadmin/events')
response2 = superadmin_events(request2)
print("Events response status:", response2.status_code)
