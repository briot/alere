# Generated by Django 3.0.7 on 2020-10-15 20:10

from django.db import migrations
from alere import models


m = [
    ( 7,   models.AccountFlags.WORK_INCOME),        # salaire Manu
    ( 8,   models.AccountFlags.WORK_INCOME),        # salaire Marie
    ( 9,   models.AccountFlags.PASSIVE_INCOME),     # dividendes
    ( 10,  models.AccountFlags.PASSIVE_INCOME),     # alloc familiales
    ( 22,  models.AccountFlags.MISC_TAX),           # impots
    ( 23,  models.AccountFlags.MISC_TAX),           # taxe fonciere
    ( 24,  models.AccountFlags.MISC_TAX),           # taxe habitation
    ( 25,  models.AccountFlags.INCOME_TAX),         # impots revenu
    ( 63,  models.AccountFlags.WORK_INCOME),        # chomage
    ( 99,  models.AccountFlags.INVESTMENT),         # habitation principale
    ( 124, models.AccountFlags.INVESTMENT),         # assurance-vie Manu Bourso
    ( 126, models.AccountFlags.EQUITY),             # reconciliation
    ( 127, models.AccountFlags.INVESTMENT),         # solesio
    ( 146, models.AccountFlags.UNREALIZED_GAINS),   # plus-value potentielle
    ( 150, models.AccountFlags.PASSIVE_INCOME),     # interets
    ( 152, models.AccountFlags.MISC_TAX),           # CSG
    ( 156, models.AccountFlags.INVESTMENT),         # assurance-vie Anaelle
    ( 159, models.AccountFlags.INCOME_TAX),         # URSAFF
    ( 166, models.AccountFlags.MISC_INCOME),        # heritage
    ( 179, models.AccountFlags.INVESTMENT),         # sequoia manu

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
