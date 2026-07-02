import os

with open('legacy_models.py', 'r') as f:
    content = f.read()

# Replace managed = False with managed = True
content = content.replace('managed = False', 'managed = True')

# Remove the Django auto-generated header comments
content = "\n".join([line for line in content.split('\n') if not line.startswith('#')])

with open('intranetapp/models.py', 'a') as f:
    f.write('\n\n# --- LEGACY TABLES FOR RAW SQL QUERIES ---\n')
    f.write(content)

print("Appended legacy models to models.py")
