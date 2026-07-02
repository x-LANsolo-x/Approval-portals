import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cuintranet.settings')
django.setup()
from intranetapp.views_node_migrated import events
from django.http import HttpRequest
import json

req = HttpRequest()
req.GET = {'club': 'ASTRONOMY CLUB', 'role': 'Club'}
res = events(req)
print(res.content)
