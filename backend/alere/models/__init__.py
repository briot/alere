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
    USER = 1
    YAHOO = 2
    TRANSACTION = 3

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

    symbol_before = models.TextField()
    symbol_after = models.TextField()
    # The symbol to display the commodity. For instance, it could be
    # the EURO sign, or "AAPL".

    iso_code = models.TextField(null=True)
    # for currencies

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
    #
    # The accounts themselves potentially use a different commodity_scu

    price_scale = models.IntegerField(default=100)
    # Scaling used in the Prices table.

    quote_source = models.ForeignKey(
        PriceSources, on_delete=models.CASCADE, null=True)
    quote_symbol = models.TextField(null=True)  # ??? ticker
    # For online quotes. The source refers to one of the plugins available in
    # ALERE, quote_symbol is the ticker

    class Meta:
        db_table = prefix + "commodities"

    def __str__(self):
        return (
            "Commodities(%s, iso_code=%s, kind=%s qty_scale=%s price_scale=%s)"
            % (self.name, self.iso_code, self.kind, self.qty_scale,
                self.price_scale)
        )


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
    # This is scaled by origin's price_scale

    source  = models.ForeignKey(PriceSources, on_delete=models.CASCADE)

    class Meta:
        db_table = prefix + "prices"

    def __str__(self):
        return "Price(origin=%s, target=%s, date=%s, price=%s)" % (
                self.origin_id, self.target_id, self.date, self.scaled_price)


#######################
# WARNING: changing these flags require recreating the alr_accounts_security
# view
#######################

class AccountFlags(models.TextChoices):
    PASSIVE_INCOME = 'IP'
    WORK_INCOME = 'IW'
    MISC_INCOME = 'IM'
    UNREALIZED_GAINS = 'IU'
    # These flags are used for accounts that represent income (i.e. not actual
    # bank accounts but categories).
    # * Passive income includes dividends, rents, ...)
    # * Unrealized gains is the result of your assets' value changing other
    #   time, like stock prices, real-estate,...
    # * Work income includes result of work (salary, unemployment,...)
    #   that would disappear if you stopped working.

    EXPENSE = 'EX'
    # It is possible for the amount of a transaction to be either positive or
    # negative. For instance, buying food is an expense, but if you get
    # reimbursed for one of your purchases, you would still store that
    # reimbursement as an EXPENSE, although with a positive value.

    INCOME_TAX = 'TI'
    MISC_TAX = 'TM'
    # Used for accounts that represent taxes

    LIABILITY = 'L'
    # Anything owed by the user (credit card, loan,...)

    STOCK = 'S'
    # An account used to trade one security

    ASSET = 'A'
    # A non-monetary asset (real-estate, car,...) that you want to track

    BANK = 'B'
    # A bank account (saving, checking,...)

    INVESTMENT = 'I'
    # An investment account. These will in general be used to trade stocks,
    # though occasionally it can be used for other accounts that you want to
    # see in the investments page.

    EQUITY = 'EQ'
    # Money used to initialized the database. This will typically contain
    # opening balances for accounts opened before you started using this
    # software. Should also be used for reconciliation, when you do not know
    # where the money came from.

    @classmethod
    def expenses(klass):
        return (
            klass.EXPENSE,
            klass.INCOME_TAX,
            klass.MISC_TAX,
        )

    @classmethod
    def income_tax(klass):
        return (
            klass.INCOME_TAX,
        )

    @classmethod
    def trading(klass):
        return (
            klass.INVESTMENT,
            klass.STOCK,
        )

    @classmethod
    def misc_tax(klass):
        return (
            klass.MISC_TAX,
        )

    @classmethod
    def work_income(klass):
        return (klass.WORK_INCOME, )

    @classmethod
    def passive_income(klass):
        return (
            klass.PASSIVE_INCOME,
        )

    @classmethod
    def all_income(klass):
        return (
            klass.PASSIVE_INCOME,
            klass.WORK_INCOME,
            klass.MISC_INCOME,
            klass.UNREALIZED_GAINS,
        )

    @classmethod
    def unrealized_income(klass):
        return (
            klass.UNREALIZED_GAINS,
        )

    @classmethod
    def realized_income(klass):
        return (
            klass.PASSIVE_INCOME,
            klass.WORK_INCOME,
            klass.MISC_INCOME,
        )

    @classmethod
    def actual_income(klass):
        """All but unrealized gains"""
        return (
            klass.PASSIVE_INCOME,
            klass.WORK_INCOME,
            klass.MISC_INCOME,
        )

    @classmethod
    def networth(klass):
        """All accounts used to compute networth"""
        return (
            klass.BANK,
            klass.ASSET,
            klass.STOCK,
            klass.INVESTMENT,
            klass.LIABILITY,
        )

    @classmethod
    def invested(klass):
        """
        All accounts used to compute invested amount (for stocks and
        investment accounts)
        """
        return (
            klass.BANK,
            klass.ASSET,
            klass.STOCK,
            klass.INVESTMENT,
            klass.LIABILITY,
            klass.EQUITY,
        )

    @classmethod
    def liquid(klass):
        """All accounts that can easily be converted to currency"""
        return (
            klass.BANK,
            klass.STOCK,
            klass.INVESTMENT,
            klass.LIABILITY,
        )

class AccountKinds(AlereModel):
    """
    The high-level types of accounts.
    Only five of them: Assets, Liability, Equities, Revenues, Expenses

    Those are represented explicitly for internationalization purposes and
    to avoid hard-coding them.

    deltaAssets = deltaLiabilities  + deltaEquities + deltaRevenues
       - deltaExpenses
    """

    flag = models.TextField(
        primary_key=True,
        max_length=2,
        choices=AccountFlags.choices,
    )

    name = models.TextField()
    # The name used for display purposes only

    name_when_positive = models.TextField()   # credit / increase / ...
    name_when_negative = models.TextField()   # debit  / decrease / ...

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
    icon = models.TextField(null=True)

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

    commodity = models.ForeignKey(
        Commodities, on_delete=models.CASCADE, related_name='accounts')
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

    opening_date = models.DateField(null=True)
    # When was the account opened

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

    memo = models.TextField(null=True)

    payee = models.TextField(null=True)
    # kmymoney has this in the Split, which means different splits of a given
    # transaction can have a different payee. The GUI doesn't seem to support
    # that though.

    check_number = models.TextField(null=True)

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

    scaled_qty = models.IntegerField()
    # The amount is in account's commodity, scaled by account.commodity_scu
    # This could be a number of shares when the account is a Stock account,
    # for instance, or a number of EUR for a checking account.

    scaled_price = models.IntegerField(null=False)
    currency = models.ForeignKey(Commodities, on_delete=models.CASCADE)
    # The actual value of the split (as users would see it on their
    # bank accounts) expressed in currency is:
    #
    #                scaled_qty                      scaled_price
    #  value = ---------------------------- * -----------------------------
    #          accounts.commodity.qty_scale   accounts.commodity.price_scale
    #
    # For a Stock BUY or SELL, we would have 'currency' equal to 'EUR' for
    # instance, and scaled_price is the actual price we paid per stock.
    #
    # For a transaction in a foreign currency, currency would be that foreign
    # currency ('GBP' for instance) and scaled_price would be the conversion
    # rate "how many GBP per EUR" at the time of the transaction.
    #
    # For a transaction in the accounts currency, currency is set to the
    # account's commodity, and scaled_price is price_scale
    #
    # Note that this amount does not include any fees, for this you need to
    # look at the transaction itself and its other splits.

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

    def __str__(self):
        return "Splits(transaction=%s, account=%s, post_date=%s price=%s %s qty=%s)" % (
                self.transaction_id,
                self.account_id,
                self.post_date,
                self.currency_id,
                self.scaled_price,
                self.scaled_qty,
            )


class Splits_With_Value(AlereModel):
    """
    Similar to Splits, but includes the value (number of shares * price at
    the time).
    This is different from looking at other splits in the same transaction
    to find their impact on the user's assets (which might be in a different
    currency altogether.
    """

    # ??? fields from Splits
    transaction = models.ForeignKey(
        Transactions, on_delete=models.CASCADE, related_name='+',
    )
    account     = models.ForeignKey(
        Accounts, on_delete=models.CASCADE, related_name='+',
    )
    currency = models.ForeignKey(
        Commodities, on_delete=models.CASCADE, related_name='+')
    scaled_price = models.IntegerField()
    scaled_qty = models.IntegerField()
    reconcile = models.CharField(
        max_length=1,
        choices=ReconcileKinds.choices,
        default=ReconcileKinds.NEW
    )
    reconcile_date = models.DateTimeField(null=True)
    post_date   = models.DateTimeField()

    value_currency = models.ForeignKey(
        Commodities, on_delete=models.DO_NOTHING, related_name='+')
    value = models.FloatField()
    # The value of the split given in value_currency

    computed_price = models.FloatField()
    # The price of one share at the time of the transaction

    class Meta:
        managed = False
        db_table = prefix + "splits_with_value"


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


class Latest_Price(AlereModel):
    """
    For each commodity, the latest known price
    """
    origin = models.OneToOneField(
        Commodities, on_delete=models.DO_NOTHING,
        related_name='latest_price')
    target = models.ForeignKey(
        Commodities, on_delete=models.DO_NOTHING,
        related_name='+')
    date = models.DateTimeField()
    scaled_price = models.IntegerField()
    source  = models.ForeignKey(PriceSources, on_delete=models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = prefix + "latest_price"


class RoI(AlereModel):
    """
    Return-on-Investment at any point in time
    """
    commodity = models.ForeignKey(  # which stock are we talking about ?
        Commodities,
        on_delete=models.DO_NOTHING,
        related_name='+'
    )
    currency = models.ForeignKey(  # prices given in this currency
        Commodities,
        on_delete=models.DO_NOTHING,
        related_name='+'
    )
    mindate = models.DateTimeField()   # included in range
    maxdate = models.DateTimeField()   # not included in range
    balance = models.FloatField() # The current balance, in commodity
    computed_price = models.FloatField()
    realized_gain = models.FloatField() # Realized gains so far, unscaled
    invested = models.FloatField()      # Amount invested so far, unscaled
    shares = models.FloatField()  # Number of shares owned
    account = models.ForeignKey(
        Accounts, on_delete=models.DO_NOTHING, related_name='roi')
    roi = models.FloatField()           # Return on Investment so far, unscaled
    pl = models.FloatField()            # P&L so far, unscaled

    average_cost = models.FloatField()
    # average cost for one share, taking into account the amount invested and
    # the realized gains so far.

    weighted_average = models.FloatField()
    # average price we bought or sold shares

    class Meta:
        managed = False
        db_table = "alr_roi"

    def __str__(self):
        return "RoI([%s,%s), roi=%s)" % (self.mindate, self.maxdate, self.roi)
