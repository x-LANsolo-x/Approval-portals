from django.db import models

class Clubs(models.Model):
    registration_code = models.TextField(blank=True, null=True)
    registration_name = models.TextField(blank=True, null=True)
    faculty_champion = models.TextField(blank=True, null=True)
    employee_id = models.TextField(blank=True, null=True)
    contact_number = models.TextField(blank=True, null=True)
    email_id = models.TextField(blank=True, null=True)
    cluster_department = models.TextField(blank=True, null=True)
    secretary = models.TextField(blank=True, null=True)
    sec_uid = models.TextField(blank=True, null=True)
    secretary_email = models.TextField(blank=True, null=True)
    secretary_contact = models.TextField(blank=True, null=True)
    jt_secretary = models.TextField(blank=True, null=True)
    jt_sec_uid = models.TextField(blank=True, null=True)
    jt_sec_email = models.TextField(blank=True, null=True)
    jt_sec_contact = models.TextField(blank=True, null=True)
    login_id = models.TextField(blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    approved_budget = models.FloatField(blank=True, null=True)
    spent_budget = models.FloatField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'clubs'

class Departments(models.Model):
    name = models.TextField(unique=True)
    login_id = models.TextField(blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    dept_id = models.TextField(blank=True, null=True)
    approved_budget = models.FloatField(blank=True, null=True)
    spent_budget = models.FloatField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'departments'

class ProfessionalSocieties(models.Model):
    prof_soc_id = models.TextField(blank=True, null=True)
    name = models.TextField(unique=True)
    login_id = models.TextField(blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    approved_budget = models.FloatField(blank=True, null=True)
    spent_budget = models.FloatField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'professional_societies'

class Communities(models.Model):
    comm_id = models.TextField(blank=True, null=True)
    name = models.TextField()
    login_id = models.TextField(blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    approved_budget = models.FloatField(blank=True, null=True)
    spent_budget = models.FloatField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'communities'

class LegacyRoles(models.Model):
    name = models.TextField()
    login_id = models.TextField(unique=True)
    password = models.TextField()
    role = models.TextField()

    class Meta:
        managed = True
        db_table = 'roles'

def validate_image_file_extension(value):
    pass

def validate_file_extension(value):
    pass



def validate_file_size(value):
    pass

def validate_pdf_size(value):
    pass


def generate_random_password():
    return ""


def default_expiration_time():
    return None

def default_ist_time():
    return None

def get_current_session():
    return None
