from django.db import models    # type: ignore
import enum
from .funcs import extend_sqlite   # register extra sqlite functions


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


class Scenarios(AlereModel):
    """
    Some elements from the database (in particular transactions) might only be
    activated to simulate some scenario (retirement planning,...)
    """
    NO_SCENARIO = 0

    name = models.TextField()
    # The name of the scenario as should appear in the GUI

    description = models.TextField(null=True)
    # A more extensive description of the scenario

    class Meta:
        db_table = prefix + "scenarios"


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

    price_scale = models.IntegerField(default=100)
    # Scaling used in the Prices table.

    quote_source = models.ForeignKey(
        PriceSources, on_delete=models.CASCADE, null=True)
    quote_symbol = models.TextField(null=True)  # ??? ticker
    quote_currency = models.ForeignKey(
        "Commodities", on_delete=models.CASCADE, null=True)
    # For online quotes. The source refers to one of the plugins available in
    # ALERE, quote_symbol is the ticker, and quote_currency is the currency in
    # which we retrieve the data (fetching this is slow in Yahoo)

    class Meta:
        db_table = prefix + "commodities"

    def __str__(self):
        return (
            "Commodities(%s, iso_code=%s, kind=%s price_scale=%s)"
            % (self.name, self.iso_code, self.kind, self.price_scale)
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

    source = models.ForeignKey(PriceSources, on_delete=models.CASCADE)

    class Meta:
        db_table = prefix + "prices"

    def __str__(self):
        return "Price(origin=%s, target=%s, date=%s, price=%s)" % (
                self.origin_id, self.target_id, self.date, self.scaled_price)


class AccountKindCategory(models.IntegerChoices):
    EXPENSE = 0, "expense"
    INCOME = 1, "income"
    # Used for categories
    # It is possible for the amount of a transaction to be either positive or
    # negative. For instance, buying food is an expense, but if you get
    # reimbursed for one of your purchases, you would still store that
    # reimbursement as an EXPENSE, although with a positive value.

    EQUITY = 2, "equity (liquid)"
    LIABILITY = 4, "liability"
    # Used for user account. Indicates money owned or money due.

    ASSET = 3, "equity (illiquid)"
    # For accounts that are blocked until a certain date, or for real-estate
    # and other goods that take a long time to sell like a car, that you want
    # to track.


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
    # The name used for display purposes only

    name_when_positive = models.TextField()   # credit / increase / ...
    name_when_negative = models.TextField()   # debit  / decrease / ...

    ##########
    # Expenses and income
    ##########

    category = models.IntegerField(choices=AccountKindCategory.choices)

    is_work_income = models.BooleanField(default=False)
    # Whether this is an income category resulting from work activities, which
    # would disappear if you stopped working. This includes salary,
    # unemployment,...

    is_passive_income = models.BooleanField(default=False)
    # Whether this is an income category not resulting from work activities,
    # like dividends, rents,...

    is_unrealized = models.BooleanField(default=False)
    # Whether this is a potential income or expense, i.e. the amount might
    # change later. This includes stock price changes, real-estate until you
    # actually sell, and so on. This is the result of your assets' value
    # changing over time.
    # When this is False, some money was actually transferred from/to one of
    # your accounts.

    ##########
    # Networth
    ##########

    is_networth = models.BooleanField(default=False)
    # True for all accounts used to compute the networth.
    # It should be False for categories in general.

    ##########
    # Investments
    ##########

    is_trading = models.BooleanField(default=False)
    # Whether the account should be displayed in the Investment and Performance
    # views.

    is_stock = models.BooleanField(default=False)
    # An account used to trade one security

    ##########
    # Taxes
    ##########

    is_income_tax = models.BooleanField(default=False)
    # Whether this category is part of your income taxes. This is used in the
    # metrics view to compute the actual tax rate.
    # INCOME_TAX

    is_misc_tax = models.BooleanField(default=False)
    # Whether this should count as taxes, other than income taxes
    # MISC_TAX

    class Meta:
        db_table = prefix + "account_kinds"
        constraints = [
            models.CheckConstraint(
                check=models.Q(is_passive_income=False)
                | models.Q(category=AccountKindCategory.INCOME),
                name='passive_income_is_also_income',
            ),
            models.CheckConstraint(
                check=models.Q(is_work_income=False)
                | models.Q(category=AccountKindCategory.INCOME),
                name='work_income_is_also_income',
            ),
            models.CheckConstraint(
                check=~models.Q(category__in=(
                    AccountKindCategory.INCOME,
                    AccountKindCategory.EXPENSE))
                | models.Q(is_networth=False),
                name="income/expense is not networth"),
            models.CheckConstraint(
                check=models.Q(
                    (models.Q(is_work_income=True)   # e.g. for salary
                        & models.Q(is_passive_income=False))
                    |
                    (models.Q(is_work_income=False)  # e.g. for dividends
                        & models.Q(is_passive_income=True))
                    |
                    (models.Q(is_work_income=False)  # e.g. for gifts
                        & models.Q(is_passive_income=False))
                ),
                name='work_income_is_not_passive_income',
            ),
        ]


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

    check_number = models.TextField(null=True)

    scheduled = models.TextField(null=True)
    last_occurrence = models.DateTimeField(null=True)
    # The recurrence rule. See python dateutil.rrule module, or RFC-5545
    #  iCalendar RFC <https://tools.ietf.org/html/rfc5545>
    #
    # A scheduled transaction has not occurred yet, and is actually a template
    # for future transactions. It describes how it will be recurring (or not).
    # When an instance of a recurring transaction is validated by the user, a
    # separate transaction is created for it.
    #
    # This could be the empty string, in which case this is a scheduled,
    # non-recurring event.
    #
    # The start date for this transaction is given by timestamp. If an
    # occurrence has already occurred, we save the date of the last occurrence,
    # so that we can later easily compute the single next occurrence (e.g. in
    # the ledger).
    #
    # The string is a list of semi-colon separated parameters:
    #   - freq=<val>    YEARLY|MONTHLY|WEEKLY|DAILY|HOURLY|MINUTELY|SECONDLY
    #     How often can events occur (once a year for YEARLY, once a month for
    #     MONTHLY and so on).
    #
    #   - interval=<integer_or_list>
    #     The interval between each freq iteration. For example, when using
    #     YEARLY, an interval of 2 means once every two years, but with HOURLY,
    #     it means once every two hours.
    #
    #   - wkst=<integer>   (monday=1, tuesday=2,...)
    #     Specify the first day of the week.
    #     This will affect recurrences based on weekly periods.
    #
    #   - until=<date>
    #   - count=<integer>
    #     Only one of these two fields can be specified.
    #     until is the last valid date (included).
    #
    #   - bysetpos=<integer_or_list>
    #     Each given integer will specify an occurrence number, corresponding
    #     to the nth occurrence of the rule inside the frequency period. For
    #     example, a set_pos of -1 if combined with a MONTHLY frequency, and a
    #     week_day of (MO, TU, WE, TH, FR), will result in the last work day of
    #     every month.
    #
    #   - bymonth=<integer_or_list>
    #     The list of months to apply the recurrence to.
    #
    #   - bymonthday=<integer_or_list>
    #     The exact day(s) of the month to apply the recurrence to.
    #
    #   - year_day=<integer_or_list>
    #     The exact day(s) of the year this recurrence applies to.
    #
    #   - easter=<integer_or_list>
    #     Each integer will define an offset from the Easter Sunday. Passing
    #     the offset 0 to byeaster will yield the Easter Sunday itself. This is
    #     an extension to the RFC specification.
    #
    #   - byweekno=<integer_or_list>
    #     The week numbers to apply the recurrence to. Week numbers have the
    #     meaning described in ISO8601, that is, the first week of the year is
    #     that containing at least four days of the new year.
    #
    #   - byweekday=<integer_or_list>
    #     a combination of the MO, TU,... constants.
    #     It’s also possible to use an argument n for the weekday instances,
    #     which will mean the nth occurrence of this weekday in the period. For
    #     example, with MONTHLY, or with YEARLY and BYMONTH, using FR(+1) in
    #     byweekday will specify the first friday of the month where the
    #     recurrence happens. Notice that in the RFC documentation, this is
    #     specified as BYDAY, but was renamed to avoid the ambiguity of that
    #     keyword.
    #
    #   - byhour
    #   - byminute
    #   - bysecond
    #     irrelevant, we only use dates

    scenario = models.ForeignKey(
        Scenarios, on_delete=models.CASCADE, related_name='transactions')
    # The scenario this transaction is active in. All past transactions
    # reconciled from bank acccounts will in general have a null scenario,
    # indicating they should always be taken into account. But it is possible
    # to add hypothetical transactions by setting scenario to a non-null value.

    # ??? bankId: likely used by kmymoney when importing OFX

    class Meta:
        db_table = prefix + "transactions"


class ReconcileKinds(models.TextChoices):
    NEW = 'n', 'New transaction'
    CLEARED = 'C', 'Cleared'
    RECONCILED = 'R', 'Reconciled'


class Payees(AlereModel):
    """
    """
    name = models.TextField()

    # ??? reference
    # ??? email
    # ??? addressStreet
    # ??? addressCity
    # ??? addressZipcode
    # ??? addressState
    # ??? telephone
    # ??? notes
    # ??? defaultAccountId
    # ??? matchDate
    # ??? matchIgnoreCase
    # ??? matchKeys

    class Meta:
        db_table = prefix + "payees"


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
    account = models.ForeignKey(
        Accounts, on_delete=models.CASCADE, related_name='splits',
    )

    payee = models.ForeignKey(
        Payees, on_delete=models.CASCADE, null=True, related_name='splits')

    scaled_qty = models.IntegerField()
    # The amount of the transaction, as seen on the bank statement.
    # This is given in the account.commodity, scaled by account.commodity_scu.
    #
    # This could be a number of shares when the account is a Stock account,
    # for instance, or a number of EUR for a checking account.

    scaled_value = models.IntegerField()
    value_commodity = models.ForeignKey(Commodities, on_delete=models.CASCADE)
    # The amount of the transaction as original made.
    # Scaled by  value_commodity.price_scale
    # This is potentially given in another currency or commodity.
    # The goal is to support multiple currencies transactions.
    # Here are various ways this value can be used:
    #
    # * a 1000 EUR transaction for an account in EUR. In this case, value is
    #   useless and does not provide any additional information.
    #       qty   = 1000 EUR  (scaled)
    #       value = 1000 EUR
    #
    # * an ATM operation of 100 USD for the same account in EUR while abroad.
    #   Exchange rate at the time: 0.85 EUR = 1 USD
    #       qty   = 85 EUR  (as shown on your bank statement)
    #       value = 100 USD (the amount you actually withdrew)
    #   So value is used to show you exactly the amount you manipulated. The
    #   exchange rate can be computed from qty and value.
    #
    # * Buying 10 shares for AAPL at 120 USD. There are several splits here,
    #   one where we increase the number of shares in the STOCK account:
    #       qty   = 10 AAPL
    #       value = 1200 USD
    #   The money came from an investment account in EUR, which has its own
    #   split for the same transaction:
    #       qty   = 1020 EUR
    #       value = 1200 USD

    reconcile = models.CharField(
        max_length=1,
        choices=ReconcileKinds.choices,
        default=ReconcileKinds.NEW
    )
    reconcile_date = models.DateTimeField(null=True)

    post_date = models.DateTimeField()
    # When has the split impacted the account.
    # For instance, a transfer done on 2020-01-01 between accountA and accountB
    # could have:
    #   transaction timestamp:  2020-01-01
    #   post_date for accountA: 2020-01-01  (-x EUR)
    #   post_date for accountB: 2020-01-03  (+x EUR)
    #        (took a few days to be credited)
    #
    # kmymoney and gnucash seem to have the same flexibility in their database,
    # but not take advantage of it in the user interface.

    # ??? action     (kmymoney uses this for ADD,BUY,...)
    #     we can likely represent those by having qty be null for some of the
    #     splits: if for the stock account, we had a dividend; if null for
    #     currency ('EUR'), this is adding or removing stocks.
    #     Reinvested dividends are harder to track though.

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
        Transactions, on_delete=models.DO_NOTHING, related_name='+',
    )
    account = models.ForeignKey(
        Accounts, on_delete=models.DO_NOTHING, related_name='+',
    )
    payee = models.ForeignKey(
        Payees, on_delete=models.DO_NOTHING, null=True, related_name='+')
    scaled_qty = models.IntegerField()
    reconcile = models.CharField(
        max_length=1,
        choices=ReconcileKinds.choices,
        default=ReconcileKinds.NEW
    )
    reconcile_date = models.DateTimeField(null=True)
    post_date = models.DateTimeField()
    value_commodity = models.ForeignKey(
        Commodities, on_delete=models.DO_NOTHING, related_name='+')

    value = models.FloatField()
    # The value of the split given in value_currency, unscaled

    computed_price = models.FloatField()
    # The price of one share at the time of the transaction, in currency

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
    account = models.ForeignKey(
        Accounts, on_delete=models.DO_NOTHING, related_name='balance')

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

    scenario = models.ForeignKey(
        Scenarios, on_delete=models.DO_NOTHING, related_name='+')
    # The balances are computed include all transactions from this scenario
    # (in addition to all transactions not part of a scenario).

    include_scheduled = models.BooleanField()
    # If true, scheduled transactions (and all their occurrences) are taken
    # into account to compute the balances.

    class Meta:
        managed = False
        db_table = prefix + "balances"

    def __eq__(self, right):
        return (
            self.account_id == right.account_id
            and self.commodity_id == right.commodity_id
            and self.mindate == right.mindate
            and self.maxdate == right.maxdate
            and self.balance == right.balance
            and self.scenario_id == right.scenario_id
            and self.include_scheduled == right.include_scheduled
        )

    def __str__(self):
        return (
            f"Balance(account={self.account_id},"
            f" commodity={self.commodity_id},"
            f" balance={self.balance},"
            f" dates=[{self.mindate}, {self.maxdate}),"
            f" scenario={self.scenario_id},"
            f" scheduled={self.include_scheduled})"
        )


class Balances_Currency(AlereModel):
    """
    Similar to balances, but instead of giving the balance as shares for
    stock accounts, it computes their monetary value by using the historical
    price of the stock at that time.
    """

    account = models.ForeignKey(
        Accounts, on_delete=models.DO_NOTHING, related_name='balance_currency')

    currency = models.ForeignKey(  # in what currency are the prices given ?
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

    scenario = models.ForeignKey(
        Scenarios, on_delete=models.DO_NOTHING, related_name='+')
    # The balances are computed include all transactions from this scenario
    # (in addition to all transactions not part of a scenario).

    include_scheduled = models.BooleanField()
    # If true, scheduled transactions (and all their occurrences) are taken
    # into account to compute the balances.

    class Meta:
        managed = False
        db_table = prefix + "balances_currency"

    def __str__(self):
        return (
            f"Balance_Currency(account={self.account_id},"
            f" currency={self.currency_id},"
            f" balance={self.balance},"
            f" dates=[{self.mindate}, {self.maxdate}),"
            f" scenario={self.scenario_id}"
            f" scheduled={self.include_scheduled})"
        )


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


class Future_Transactions(AlereModel):
    transaction_id = models.ForeignKey(
        Transactions, on_delete=models.DO_NOTHING)
    nextdate = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "alr_future_transactions"

    def __repr__(self):
        return "Future(%s, %s)" % (self.name, self.nextdate)
