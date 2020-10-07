from django.db import models
import enum

prefix = "alr_"    # prefix for all table names


class AlereModel(models.Model):
    """
    Base class for all models
    """

    class Meta:
        abstract = True


class CommodityKinds(models.TextChoices):
    CURRENCY = 'C', 'Currency'
    STOCK = 'S', 'Stock'
    MUTUAL_FUND = 'M', 'Mutual Fund'
    BOND = 'B', 'Bond'


class PriceSources(AlereModel):
    """
    All known source of prices
    """

    name = models.TextField()

    class Meta:
        db_table = prefix + "price_sources"


class Commodities(AlereModel):
    """
    Currencies, securities, and any tangible asset accounted for in accounts.
    """
    name = models.TextField()
    # The name as displayed in selection boxes in the GUI. For instance, it
    # could be "EUR" (iso code for currencies), "Apple Inc.",...

    symbol = models.TextField()
    # The symbol to display the commodity. For instance, it could be
    # the EURO sign, or "AAPL".

    iso_code = models.TextField(null=True)
    # for currencies

    prefixed = models.BooleanField(default=False)
    # Set to True if the symbol should be displayed before the value, False
    # to display after. For instance  "$ 100" uses prefixed=True, whereas
    # "100 AAPL" uses prefixed=False

    kind = models.CharField(
        max_length=1,
        choices=CommodityKinds.choices,
        )
    # What kind of commodity this is

    qty_scale = models.IntegerField(default=100)
    # The smallest unit users can buy or sell. For instance, 100 => 0.01 units.
    # All quantities expressed in the commodity should be divided by this
    # qty_scale to get the actual number.
    #
    # When you buy 0.23 shares of AAPL at 120 USD, and assuming the qty_scale
    # for AAPL is set to 100, information in the split is stored as:
    #     split1: account AAPL,       qty = 23  (commodity is AAPL)
    #     split2: account investment, qty=12000 (commodity is USD)

    price_scale = models.IntegerField(default=100)
    # Scaling used in the Prices table. The accounts themselves potentially
    # use a different commodity_scu

    quote_source = models.ForeignKey(
        PriceSources, on_delete=models.CASCADE, null=True)
    quote_symbol = models.TextField(null=True)
    # For online quotes. The source refers to one of the plugins available in
    # ALERE, quote_symbol is the ticker

    class Meta:
        db_table = prefix + "commodities"


class Prices(AlereModel):
    """
    Conversions between various commodities. Typically this includes historical
    prices of securities in currencies, or exchange rates between currencies.
    """

    origin = models.ForeignKey(
        Commodities, on_delete=models.CASCADE,
        related_name='prices',
    )
    target = models.ForeignKey(
        Commodities, on_delete=models.CASCADE,
        related_name='+',
    )
    date = models.DateTimeField()

    scaled_price = models.IntegerField()
    # Price of 1 from_id in to_id currency.
    # This is scaled by from_id's price_scale

    source  = models.ForeignKey(PriceSources, on_delete=models.CASCADE)

    class Meta:
        db_table = prefix + "prices"


class AccountKinds(AlereModel):
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

    class Meta:
        db_table = prefix + "account_kinds"


class Institutions(AlereModel):
    """
    A bank, broker,... managing accounts
    """
    name = models.TextField()
    manager = models.TextField(null=True)
    address = models.TextField(null=True)
    phone = models.TextField(null=True)
    routing_code = models.TextField(null=True)

    class Meta:
        db_table = prefix + "institutions"


class Accounts(AlereModel):
    """
    Used for bank accounts, categories, ...
    """

    kind = models.ForeignKey(AccountKinds, on_delete=models.CASCADE)

    institution = models.ForeignKey(
        Institutions, null=True, on_delete=models.CASCADE)

    name = models.TextField()
    # Short name, as displayed to users

    description = models.TextField(null=True)
    # Free-form field for users

    iban = models.TextField(null=True)
    # Should really be only for IBAN numbers, used for transfers for instance

    number = models.TextField(null=True)
    # any code used by the bank to identify the account

    parent = models.ForeignKey(
        'self', null=True, related_name='subaccounts',
        on_delete=models.CASCADE,
    )
    closed = models.BooleanField(default=False)

    commodity = models.ForeignKey(Commodities, on_delete=models.CASCADE)
    # What is the unit for prices ? This will most often be a currency like
    # "EUR", but for stock accounts it would be the name of the stock like
    # "AAPL". An account has all its operations written in that currency. It is
    # possible that you paid something abroad in a different currency, but the
    # bank has then done a conversion and ultimately invoiced you in EUR.

    commodity_scu = models.IntegerField()
    # The Smallest Currency Unit for the commodity, in this account.
    # This is provided as a scaling factor: 100 => 0.01 precision.
    # In general, it is equal to the commodity's qty_scale. But some brokers
    # sometimes use a different factor here.
    #
    # For instance, a EUR checking account will typically have two decimal
    # digits precision, so the commodity_scu is "100".
    # But a broker like Kraken, when trading Bitcoin, uses 0.0001 precision
    # or less, so the commodity_scu is set to 10000

    last_reconciled = models.DateTimeField(null=True)
    # When has the user last reconciled this account with the bank statements

    # ??? opening_date
    # ??? interest_rate  (though this should be date-dependent)
    # ??? last_modified  (for account data themselves)
    # ??? hidden         (in gnucash, is this similar to closed)

    # ??? placeholder    (in gnucash)
    # When an account is a place holder, it is made read-only in the GUI and
    # doesn't accept transactions.

    # ??? book
    # if we want to store multiple books (for multiple users, or for separate
    # entities), an account should be associated with a specific user (then
    # all transactions in that account are also for the same user)

    class Meta:
        db_table = prefix + "accounts"


class Transactions(AlereModel):
    """
    A transaction is made of one or more splits, the sum of which is zero
    (we take from one or more accounts and give to one or more accounts).
    """

    timestamp = models.DateTimeField()
    # When was the operation performed by the user. It might be some days
    # before the corresponding splits are effective on their respective
    # accounts.

    memo = models.TextField()

    payee = models.TextField(null=True)
    # kmymoney has this in the Split, which means different splits of a given
    # transaction can have a different payee. The GUI doesn't seem to support
    # that though.

    check_number = models.TextField()

    # is_scheduled = models.Boolean()   # kmyMoney has txType = ('N', 'S')
    # ??? better stored in a separate table, which can include recurrence
    # information for instance

    # ??? bankId: likely used by kmymoney when importing OFX

    class Meta:
        db_table = prefix + "transactions"


class ReconcileKinds(models.TextChoices):
    NEW = 'n', 'New transaction'
    CLEARED = 'C', 'Cleared'
    RECONCILED = 'R', 'Reconciled'


class Splits(AlereModel):
    """
    Parts of a transaction.
    The sum of qty for all splits in a transaction must be 0.

    For instance: withdraw 100 USD abroad, equivalent to 85 EUR, with 0.1 EUR
    as a fee.
      checking account: commodify=EUR
      split1:  accountid=checking account
               value= -100  USD
               qty=  -85.1
      split2:  accountid=expense:cash
               value= +85   EUR
               qty= +85
      split3:  accountid=expense:fees
               value= +0.1 EUR
               qty= +0.1
    """

    transaction = models.ForeignKey(
        Transactions, on_delete=models.CASCADE, related_name='splits',
    )
    account     = models.ForeignKey(
        Accounts, on_delete=models.CASCADE, related_name='splits',
    )
    # ??? Those two fields are the primary key, or do we need a splitId

    currency = models.ForeignKey(Commodities, on_delete=models.CASCADE)
    scaled_price = models.IntegerField()
    # The value of the split expressed in currency, scaled by
    # currency's price_scale.
    #
    # For a Stock BUY or SELL, we would have 'currency' equal to 'EUR' for
    # instance, and scaled_price is the actual price we paid per stock.
    #
    # For a transaction in a foreign currency, currency would be that foreign
    # currency ('GBP' for instance) and scaled_price would be the conversion
    # rate "how many GBP per EUR" at the time of the transaction.
    #
    # For a transaction in the accounts currency, currency is set to the
    # account's commodity, and scaled_price is 1 (modulo the scale).
    #
    # With these definition, the total amount of money spent in currency is
    # always   scaled_price * scaled_qty
    # The total increase or decrease of the account's commodity is
    # always   scaled_qty

    scaled_qty = models.IntegerField()
    # The amount is in account's commodity, scaled by account's commodity_scu
    # This could be a number of shares when the account is a Stock account,
    # for instance.

    reconcile = models.CharField(
        max_length=1,
        choices=ReconcileKinds.choices,
        default=ReconcileKinds.NEW
    )
    reconcile_date = models.DateTimeField(null=True)
    # Reconciliation state

    post_date   = models.DateTimeField()
    # When has the split impacted the account.
    # For instance, a transfer done on 2020-01-01 between accountA and accountB
    # could have:
    #   transaction timestamp:  2020-01-01
    #   post_date for accountA: 2020-01-01  (-x EUR)
    #   post_date for accountB: 2020-01-03  (+x EUR)
    #        (took a few days to be credited)
    #
    # kmymoney and gnucash seem to only store the timestamp at the transaction
    # level

    # ??? action     (kmymoney uses this for ADD,BUY,...)
    #     we can likely represent those by having qty be null for some of the
    #     splits: if for the stock account, we had a dividend; if null for
    #     currency ('EUR'), this is adding or removing stocks.

    class Meta:
        db_table = prefix + "splits"


class Price_History(AlereModel):
    """
    Similar to Prices, but provides a range of dates [mindate, maxdate) during
    which the price is valid.
    This view is created manually in the database via migrations
    """
    origin = models.ForeignKey(
        Commodities, on_delete=models.DO_NOTHING, related_name='price_history')
    target = models.ForeignKey(
        Commodities, on_delete=models.DO_NOTHING, related_name='+')
    scaled_price = models.IntegerField()  # by origin's price_scale
    mindate = models.DateTimeField()   # included in range
    maxdate = models.DateTimeField()   # not included in range
    source  = models.ForeignKey(PriceSources, on_delete=models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = prefix + "price_history"


class Balances(AlereModel):
    """
    A view that provides the balance for all accounts at any point in time.
    To get the balance (number of shares for a stock account, or money for
    a saving account for instance) at a given date, you would do:

        SELECT * from alr_balances
        WHERE account_id= :account_id
         AND  mindate <= :date
         AND  :date < maxdate
    """
    id = models.BigIntegerField(primary_key=True)
    account = models.ForeignKey(Accounts,
        on_delete=models.DO_NOTHING,
        related_name='balance')

    commodity = models.ForeignKey(
        Commodities,
        on_delete=models.DO_NOTHING,
        related_name='+'
    )
    # what commodity the balance is using

    mindate = models.DateTimeField()   # included in range
    maxdate = models.DateTimeField()   # not included in range

    balance = models.FloatField()
    # The current balance, in commodity
    # BEWARE: This value has been scaled and the float value might have
    # a slight loss of precision. It is appropriate for display, but not to do
    # further computations.

    class Meta:
        managed = False
        db_table = prefix + "balances"

    def __str__(self):
        return (
            "Balance(account=%s, commodity=%s,"
            " balance=%s, dates=[%s, %s))"
        ) % (
            self.account_id,
            self.commodity_id,
            self.balance,
            self.mindate,
            self.maxdate)

class Balances_Currency(AlereModel):
    """
    Similar to balances, but instead of giving the balance as shares for
    stock accounts, it computes their monetary value by using the historical
    price of the stock at that time.
    """

    account = models.ForeignKey(
        Accounts, on_delete=models.DO_NOTHING, related_name='balance_currency')

    commodity = models.ForeignKey(
        Commodities,
        on_delete=models.DO_NOTHING,
        related_name='+'
    )

    balance = models.FloatField()
    # The current balance, in commodity

    shares = models.FloatField()
    # The current balance, in account's commodity

    computed_price = models.FloatField()
    # computed price per share

    mindate = models.DateTimeField()   # included in range
    maxdate = models.DateTimeField()   # not included in range

    class Meta:
        managed = False
        db_table = prefix + "balances_currency"

    def __str__(self):
        return (
            "Balance_Currency(account=%s, commodity=%s,"
            " balance=%s, dates=[%s, %s))"
        ) % (
            self.account_id,
            self.commodity_id,
            self.balance,
            self.mindate,
            self.maxdate)
