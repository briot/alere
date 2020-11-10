# Generated by Django 3.0.7 on 2020-10-15 20:10

from django.db import migrations
from alere import models


m = [
    (150, models.AccountFlags.UNREALIZED_GAINS),   # plus-value potentielle
    (10,  models.AccountFlags.PASSIVE_INCOME),     # alloc familiales
    (9,   models.AccountFlags.PASSIVE_INCOME),     # dividendes
    (170, models.AccountFlags.MISC_INCOME),        # heritage
    (154, models.AccountFlags.PASSIVE_INCOME),     # interets
    (7,   models.AccountFlags.WORK_INCOME),        # salaire Manu
    (8,   models.AccountFlags.WORK_INCOME),        # salaire Marie
    (63,  models.AccountFlags.WORK_INCOME),        # chomage
    (163, models.AccountFlags.INCOME_TAX),         # URSAFF
    (25,  models.AccountFlags.INCOME_TAX),         # impots revenu
    (22,  models.AccountFlags.MISC_TAX),           # impots
    (23,  models.AccountFlags.MISC_TAX),           # taxe fonciere
    (24,  models.AccountFlags.MISC_TAX),           # taxe habitation
    (156, models.AccountFlags.MISC_TAX),           # CSG
    (160, models.AccountFlags.INVESTMENT),         # assurance-vie Anaelle
    (125, models.AccountFlags.INVESTMENT),         # assurance-vie Manu Bourso
    (128, models.AccountFlags.INVESTMENT),         # solesio
    (127, models.AccountFlags.EQUITY),             # reconciliation

]

for i, f in m:
    a = models.Accounts.objects.get(id=i)
    a.kind_id = f
    a.save()

inst = models.Institutions.objects.get(name="Boursorama")
inst.icon = "/boursorama.svg";
inst.save()

inst = models.Institutions.objects.get(name="Banque Postale")
inst.icon = "/banque-postale.svg";
inst.save()

inst = models.Institutions.objects.get(name="Societe Generale")
inst.icon = "/societe-generale.png";
inst.save()
