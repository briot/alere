from django.db import models

class AlereModel(models.Model):
    """
    Base class for all models
    """

    class Meta:
        abstract = True


class AccountKind(AlereModel):
    """
    The high-level types of accounts.
    Only five of them: Assets, Liability, Equities, Revenues, Expenses

    Those are represented explicitly for internationalization purposes and
    to avoid hard-coding them.

    deltaAssets = deltaLiabilities  + deltaEquities + deltaRevenues
       - deltaExpenses
    """

    name = models.TextField()
    name_for_positive = models.TextField()   # credit / increase / ...
    name_for_negative = models.TextField()   # debit  / decrease / ...


class Account(AlereModel):
    """
    Used for bank accounts, categories, ...
    """

    # ??? use UUID for primary key

    kind = models.ForeignKey(AccountKind, on_delete=models.CASCADE)
    name = models.TextField()
    parent = models.ForeignKey(Account, null=True)
    currency = models.ForeignKey(Currency, on_delete=models.CASCADE)


class Transaction(AlereModel):
    """
    A transaction is made of one or more splits, the sum of which is zero
    (we take from one or more accounts and give to one or more accounts).
    """

    # CREATE TABLE kmmTransactions (id varchar(32) NOT NULL, txType char(1), postDate timestamp, memo mediumtext, entryDate timestamp, currencyId char(3), bankId mediumtext, PRIMARY KEY (id));

    # ??? use UUID for primary key
    # ??? How to handle multiple currencies within the same transaction

    timestamp = models.DateTimeField()
    # When was the operation performed
    # ??? Could be computed as min(split.valuedate) maybe ?

    description = models.TextField()

    currency = models.ForeignKey(Currency, on_delete=models.CASCADE)

class Split(AlereModel):

    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    accountid   = models.ForeignKey(Account, on_delete=models.CASCADE)

    amount      = models.Float() # ??? possible rounding errors

    quantity     = models.Float()
    # The amount is in accounts's currency. But if accountid is in a
    # different currency, the quantity stores the ratio between the two
    # currencies (exchange rate from accounts's currency to transaction's
    # currency)
    # For instance: withdraw 100 USD abroad, equivalent to 85 EUR, with 5 EUR
    # as a fee.
    #   split1:   checking account  -100 USD
    #      entered as amount=-100, quantity=85/100
    #   split2:   expense:cash      + 80 EUR
    #   split3:   expense:fees      +  5 EUR
    # How can we verify the sum for the transaction is 0 ? We have check the
    # exchange rate on that date, or perhaps mark the transaction has having
    # a non-null sum.
    # or perhaps use multi-value

    reconcile   = models.Character()
    reconcile_date = models.DateTimeField()
    # Reconciliation state

    valuedate   = models.DateTimeField()
    # When has the split impacted the account.
    # For instance, a transfer done on 2020-01-01 between accountA and accountB
    # would have:
    #   timestamp:  2020-01-01
    #   valuedate for accountA: 2020-01-01
    #   valuedate for accountB: 2020-01-03  (took a few dates to be credited)

