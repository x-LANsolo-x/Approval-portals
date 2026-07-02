# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
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
        managed = False
        db_table = 'Clubs'


class Departments(models.Model):
    name = models.TextField(unique=True)
    login_id = models.TextField(blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    dept_id = models.TextField(blank=True, null=True)
    approved_budget = models.FloatField(blank=True, null=True)
    spent_budget = models.FloatField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'departments'


class ProfessionalSocieties(models.Model):
    prof_soc_id = models.TextField(blank=True, null=True)
    name = models.TextField(unique=True)
    login_id = models.TextField(blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    approved_budget = models.FloatField(blank=True, null=True)
    spent_budget = models.FloatField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'professional_societies'


class Communities(models.Model):
    comm_id = models.TextField(blank=True, null=True)
    name = models.TextField()
    login_id = models.TextField(blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    approved_budget = models.FloatField(blank=True, null=True)
    spent_budget = models.FloatField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'communities'


class Roles(models.Model):
    name = models.TextField()
    login_id = models.TextField(unique=True)
    password = models.TextField()
    role = models.TextField()

    class Meta:
        managed = False
        db_table = 'roles'
