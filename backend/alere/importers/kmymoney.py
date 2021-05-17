import datetime
import math
import sqlite3
import sys
from alere import models
from decimal import Decimal, ROUND_DOWN, ROUND_UP
from django.db import connection, transaction


def print_to_stderr(msg):
    sys.stderr.write(msg)

log_error = print_to_stderr
# meant to be overridden in tests


def __import_key_values(cur):
    closed = {}
    iban = {}
    forOpeningBalances = {}
    sources = {}
    securityId = {}

    ignored = {}

    cur.execute(
        """
        SELECT
            kmmKeyValuePairs.kvpId as id,
            kmmKeyValuePairs.kvpKey as key,
            kmmKeyValuePairs.kvpData as data
        FROM kmmKeyValuePairs
            LEFT JOIN kmmAccounts
            ON (kmmKeyValuePairs.kvpId=kmmAccounts.id)
        """
    )
    for (id, key, data) in cur:
        if key == 'mm-closed':
            closed[id] = data.lower() == 'yes'
        elif key == 'iban':
            iban[id] = data
        elif key == "OpeningBalanceAccount":
            forOpeningBalances[id] = data.lower() == 'yes'
        elif key in ('lastStatementBalance', 'lastNumberUsed'):
            # not needed
            pass
        elif key == 'priceMode':
            # Whether transactions are entered as price/share or
            # total amount. Not needed
            pass
        elif key == 'Imported':
            # not needed
            pass
        elif key in ('kmm-baseCurrency', 'kmm-id'):
            # file-level, default currency to use for new accounts
            pass
        elif key in (
                'reconciliationHistory',
                'Tax',

                # for OFX import:
                'StatementKey',
                'lastImportedTransactionDate',
            ):
            if key not in ignored:
                ignored[key] = True
                log_error(
                    'Ignored keyValue: account=%s  key=%s  value=%s'
                    ' (may have others with same key)\n' % (id, key, data))
        elif key == 'kmm-online-source':
            sources[id] = data
        elif key == 'kmm-security-id':
            securityId[id] = data
        elif data:
            log_error(
                'Unknown keyValue: id=%s  key=%s  value=%s\n' %
                (id, key, data))

    return closed, iban, forOpeningBalances, sources, securityId


def __import_institutions(cur):
    cur.execute("SELECT kmmInstitutions.* from kmmInstitutions")
    return {
        row['id']: models.Institutions.objects.create(
            name=row['name'],
            manager=row['manager'],
            routing_code=row['routingCode'],
            phone=row['telephone'],
            address=row['addressStreet'] + '\n'
               + row['addressZipcode'] + '\n'
               + row['addressCity'],
        )
        for row in cur
    }


def __import_price_sources(cur):
    sources = {}
    cur.execute("SELECT DISTINCT kmmPrices.priceSource FROM kmmPrices")
    for row in cur:
        try:
            sources[row['priceSource']] = models.PriceSources.objects.get(
                    name=row['priceSource'])
        except models.PriceSources.DoesNotExist:
            sources[row['priceSource']] = models.PriceSources.objects.create(
                    name=row['priceSource'])

    return sources


def __import_currencies(cur, commodities, sources, security_id):
    """
    Import all currencies used in the kmymoney file
    """
    cur.execute("SELECT kmmCurrencies.* FROM kmmCurrencies")
    for row in cur:
        if row['typeString'] != 'Currency':
            log_error(
                'Error: unexpected currency type: %s\n' % row['typeString'])
            continue

        qty_scale = int(row['smallestAccountFraction'])
        price_scale = int(row['smallestCashFraction'])

        try:
            old = models.Commodities.objects.get(iso_code=row['ISOcode'])
            commodities[row['ISOcode']] = old

            if (old.name != row['name']
                    or old.symbol_after != row['symbolString']
                    or old.qty_scale != qty_scale
                    or old.price_scale != price_scale
                ):
                log_error(
                    'Error: Currency %s already exists'
                    ' but has different properties\n' % row['ISOcode']
                )

        except models.Commodities.DoesNotExist:
            c = commodities[row['ISOcode']] = models.Commodities.objects.create(
                name=row['name'],
                symbol_before="",
                symbol_after=row['symbolString'],
                iso_code=row['ISOcode'],
                kind=models.CommodityKinds.CURRENCY,
                price_scale=price_scale,
                quote_source=(
                    models.PriceSources.get(sources[row['ISOcode']])
                    if row['ISOcode'] in sources
                    else None
                ),
                quote_symbol=(
                    models.PriceSources.get(security_id[row['ISOcode']])
                    if row['ISOcode'] in security_id
                    else None
                ),
            )
            c.qty_scale = qty_scale  # only used in this importer

        # ??? ignored: symbol1  = unicode code point for the symbol
        # ??? ignored: symbol2
        # ??? ignored: symbol3
        # ??? pricePrecision


def __import_securities(
        cur, commodities, sources, security_id, price_sources):
    """
    Import securities used in the kmymoney file
    """
    cur.execute("SELECT kmmSecurities.* FROM kmmSecurities")
    for row in cur:
        kind = (
            models.CommodityKinds.STOCK
            if row['typeString'] == 'Stock'
            else models.CommodityKinds.MUTUAL_FUND
            if row['typeString'] == 'Mutual Fund'
            else models.CommodityKinds.BOND
        )
        price_scale = math.pow(10, int(row['pricePrecision']))
        qty_scale = int(row['smallestAccountFraction'])

        try:
            old = models.Commodities.objects.get(name=row['name'])
            commodities[row['id']] = old

            if old.name != row['name']:
                log_error(
                    'Error: Security %s (%s) already exists'
                    ' but has different name: %s\n' % (
                        row['id'], row['name'], old.name))
            elif old.symbol_after != row['symbol']:
                log_error(
                    'Error: Security %s (%s) already exists'
                    ' but has different symbol: %s\n' % (
                        row['id'], row['name'], old.symbol_after))
            elif old.kind != kind:
                log_error(
                    'Error: Security %s (%s) already exists'
                    ' but has different kind: %s != %s\n' % (
                        row['id'], row['name'], old.kind, kind))
            elif old.qty_scale != qty_scale:
                log_error(
                    'Error: Security %s (%s) already exists'
                    ' but has different qty_scale: %s != %s\n' % (
                        row['id'], row['name'], old.qty_scale, qty_scale))
            elif old.price_scale != price_scale:
                log_error(
                    'Error: Security %s (%s) already exists'
                    ' but has different price_scale: %s != %s\n' % (
                        row['id'], row['name'], old.price_scale, price_scale))

        except models.Commodities.DoesNotExist:
            c = commodities[row['id']] = models.Commodities.objects.create(
                name=row['name'],
                symbol_before="",
                symbol_after=security_id.get(row['id'], row['symbol']),
                kind=kind,
                price_scale=price_scale,
                quote_source=price_sources.get(sources.get(row['id']), None),
                quote_symbol=row['symbol'],   # ticker
            )
            c.qty_scale = qty_scale

            # ??? ignored: pricePrecision
            # ??? ignored: tradingMarket
            # ??? ignored: tradingCurrency
            # ??? ignored: roundingMethod


def __import_account_types(cur):
    flag = {}
    for f in models.AccountFlags:
        try:
            flag[f] = models.AccountKinds.objects.get(flag=f)
        except models.AccountKinds.DoesNotExist:
            flag[f] = None

    mapped = {
        "Asset": flag[models.AccountFlags.ASSET],
        "Liability": flag[models.AccountFlags.LIABILITY],
        "Expense": flag[models.AccountFlags.EXPENSE],
        "Income": flag[models.AccountFlags.MISC_INCOME],
        "Equity": flag[models.AccountFlags.EQUITY],
        "Investment": flag[models.AccountFlags.BANK],
        "Stock": flag[models.AccountFlags.STOCK],
        "Checking": flag[models.AccountFlags.BANK],
        "Savings": flag[models.AccountFlags.BANK],
    }

    cur.execute(
        """
        SELECT distinct kmmAccounts.accountTypeString
        FROM kmmAccounts
        """
    )
    return {
        row['accountTypeString']: mapped[row['accountTypeString']]
        for row in cur
    }


def __time(val):
    return (
        datetime.datetime.fromisoformat(val).astimezone(datetime.timezone.utc)
        if val
        else None
    )

def scaled_price(text, scale: int, inverse_scale: int =0):
    """
    Convert a price read from kmymoney into a scaled price, where scale
    is the currency's scale.
    There might be rounding errors because we want to represent things as
    integers, with a fixed scaling factor (??? should we change that), so
    we try to find the best representation, possibly storing the inverse of
    the number.
    For instance, with a scale of 100 (so two digits precision):

        EUR->E000041    price=247/10000  = 0.0247

        Round down  | Round up    | Inverse, round down | Inverse round up |
        ------------+-------------+---------------------+------------------+
          2/100     |    3/100    | 4048 / 100          | 4049 / 100       |
          0.02      |    0.03     | 0,02470355731       | 0,02469745616    |
          -23.5%    |    +17.66%  |   +0.0144%          |  -0.0103%  <==== |

    But
        price = 24712/10000 = 2.4712
        Round down  | Round up    | Inverse, round down | Inverse round up |
        ------------+-------------+---------------------+------------------+
        247/100     | 248/100     | 40/100              | 41/100           |
         2.47       |   2.48      |   2.5               |  2,4390243902    |
        -0.048% <== |  +0.35%     |  +1.152%            | -1.3119%         |

    And
        USD->EUR   price = 1051/1250 = 0.8408
        Round down  | Round up    | Inverse, round down | Inverse round up |
        ------------+-------------+---------------------+------------------+
          84/100    | 85/100      | 118/100             | 119/100          |
          0.84      | 0.85        | 0,8474576271        | 0,8403361345     |
          -0.0952%  | +1.082%     | +0.785%             | -0.0552% <===    |

    :param inverse_scale:
       if 0, do not consider the inverse
    """
    if not text:
        return None, False

    num, den = text.split('/')

    d = Decimal(num) / Decimal(den)  # the reference number from kMyMoney

    if d.is_zero():
        return 0, False

    # Direct import, shall we round up or down ?

    d1 = d.quantize(Decimal(1) / scale, rounding=ROUND_DOWN)
    err1 = Decimal('Inf') if d1.is_zero() else ((d / d1 - 1) * 100)

    d2 = d.quantize(Decimal(1) / scale, rounding=ROUND_UP)
    err2 = Decimal('Inf') if d2.is_zero() else ((1 - d / d2) * 100)

    if err2 < err1:
        d1 = d2
        err1 = err2

    if inverse_scale != 0:
        # Import as reverse, shall we round up or down ?
        d3 = (1 / d).quantize(Decimal(1) / inverse_scale, rounding=ROUND_DOWN)
        err3 = Decimal('Inf') if d3.is_zero() else ((1 - d * d3) * 100)

        d4 = (1 / d).quantize(Decimal(1) / inverse_scale, rounding=ROUND_UP)
        err4 = Decimal('Inf') if d4.is_zero() else ((d * d4 - 1) * 100)

        if err4 < err3:
            d3 = d4
            err3 = err4

        # which import, after all ?
        if err3 < err1:
            if err3 > 0.1:
                log_error(
                    'WARNING: price %s (%s) imported with'
                    ' rounding error %+.4f%%\n' % (text, d, err3))
            return int((d3 * inverse_scale).to_integral_value()), True

    if err1 > 0.1:
        log_error(
            'WARNING: price %s (%s) imported with'
            ' rounding error %+.4f%%\n' % (text, d, err1))
    return int((d1 * scale).to_integral_value()), False


def __import_prices(cur, commodities, price_sources):
    cur.execute(
        """
        SELECT kmmPrices.* FROM kmmPrices
        """
    )
    for row in cur:
        try:
            origin = commodities[row['fromId']]
        except KeyError:
            log_error('Ignore price for %s, security not found\n' % (
                row['fromId'], ))
            continue

        try:
            target = commodities[row['toId']]
        except KeyError:
            log_error('Ignore price in %s, security not found\n' % (
                row['toId'], ))
            continue

        # kMyMoney sometimes has prices from Security->Currency which do not
        # really make sense and are wrongly rounded on import. For instance:
        #   fromId  toId     priceDate   price
        #   ------  -------  ----------  ---------
        #   EUR     E000041  2021-01-27  247/10000
        # would be imported as a scaled price of "2" (when scale is 100),
        #    0.02 differs by -19% of the original !
        # instead of "2.47". On import, try to preserve the maximum precision.
        # If instead we store 10000/247=40.4858299 as 40.48 for the reverse
        # operation, we get better results
        #    1/40.48 = 0,02470355731  differs by 0.014% of the original
        #
        # With different numbers, the result is not as good though. For
        # instance:
        #    USD    EUR   1051/1250             (i.e. 0.8408)
        # where price_scale is 100 for both currencies (in kMyMoney,
        # smallCashFraction is 100).
        #    we could either store 84/100   (differs by -0.1% of the original)
        #    or store the reverse 1250/1051=1.189343  as 1.18
        #       (1 / 1.18 = 0.847457, which differs by 0.8% of the original)

        approx, inverse = scaled_price(
            row['price'],
            scale=int(origin.price_scale),
            inverse_scale=int(target.price_scale))

        if inverse:
            models.Prices.objects.create(
                origin=target,
                target=origin,
                date=__time(row['priceDate']),
                scaled_price=approx,
                source=price_sources[row['priceSource']],
            )
        else:
            models.Prices.objects.create(
                origin=origin,
                target=target,
                date=__time(row['priceDate']),
                scaled_price=approx,
                source=price_sources[row['priceSource']],
            )


def __import_payees(cur, payees):

    cur.execute("""SELECT kmmPayees.* FROM kmmPayees""")
    for row in cur:
        payees[row['id']] = models.Payees.objects.create(
            name=row['name'],
        )


def __import_transactions(cur, accounts, commodities, payees):

    # Example of multi-currency transaction:
    #   kmmTransactions:
    #   *  id=1   currencyId=USD
    #   kmmSplits:
    #   *  transactionId=1  account=brokerage(currency=EUR)
    #      value=-1592.12 (expressed in kmmTransactions.currencyId USD)
    #      shares=-1315.76 (expressions in split.account.currency EUR)
    #      price= N/A
    #   * transactionId=1   account=stock(currency=STOCK)
    #      value=1592.12 (in kmmTransactions.currencyId USD)
    #      shares=32     (in STOCK)
    #      price=48.85   (in USD)

    cur.execute("""
        SELECT
           kmmTransactions.txType as transTxType,
           kmmTransactions.postDate as transPostDate,
           kmmTransactions.memo as transMemo,
           kmmTransactions.currencyId as transCurrency,
           kmmSplits.*
        FROM kmmTransactions, kmmSplits
        WHERE kmmTransactions.id=kmmSplits.transactionId
        ORDER BY transactionId
        """
    )
    trans = None
    prev_trans_id = None

    for row in cur:
        trans_id = row['transactionId']
        if trans_id != prev_trans_id:
            if trans:
                trans.save()

            trans = models.Transactions.objects.create(
                timestamp=__time(row['transPostDate']),
                memo=row['transMemo'] or "",
                check_number="",
            )
            prev_trans_id = trans_id

        acc = accounts[row['accountId']]
        trans_currency = commodities[row['transCurrency']]
        reconcile = (
            models.ReconcileKinds.NEW
            if row['reconcileFlag'] == '0'
            else models.ReconcileKinds.CLEARED
            if row['reconcileFlag'] == '1'
            else models.ReconcileKinds.RECONCILED
        )

        shares, _ = scaled_price(
            row['shares'], scale=acc.commodity_scu, inverse_scale=0)

        if row['action'] in ('Dividend', 'Add') or row['price'] is None:
            # kmymoney sets "1.00" for the price, which does not reflect the
            # current price of the share at the time, so better have nothing.
            #
            # In kmymoney, foreign currencies are not supported in
            # transactions.
            currency = acc.commodity
            scaled_value = shares
        else:
            # for a stock account
            S = 1_000_000

            price, _ = scaled_price(
                row['price'], scale=S, inverse_scale=0)
            currency = trans_currency
            scaled_value = (
                shares * price * currency.price_scale
                / (S                     # scale for price
                   * acc.commodity_scu   # scale for shares
                )
            )

        # assert price is not None, "while processing %s" % dict(row)

        s = models.Splits.objects.create(
            transaction=trans,
            payee=(
               None if acc.kind.flag in models.AccountFlags.networth()
               else payees[row['payeeId']] if row['payeeId']
               else None
            ),
            account=acc,
            scaled_qty=shares,
            scaled_value=scaled_value,
            value_commodity=currency,
            reconcile=reconcile,
            reconcile_date=__time(row['reconcileDate']),
            post_date=__time(row['postDate']),
        )

        trans.memo = "\n".join([
            f
            for f in [
                trans.memo,
                row['memo'],
                ('Add Shares' if shares >= 0 else 'Remove Shares')
                    if row['action'] == 'Add' else None,
                ('Buy Shares' if shares >= 0 else 'Sell Shares')
                    if row['action'] == 'Buy' else None,
                'Dividends' if row['action'] == 'Dividend' else None,
                'Reinvested dividend' if row['action'] == 'Reinvest' else None,
            ]
            if f
        ])

        trans.check_number = trans.check_number + (row['checkNumber'] or "")

    if trans:
        trans.save()

    # transaction.entryDate:  not needed
    # ??? transaction.bankId: ???
    # ??? transaction.txType: Normal or Scheduled
    # ??? splits.txType:  Normal or Scheduled
    # ??? splits.action
    # not needed:  splits.value = shares*price
    # ??? splits.costCenterId
    # ??? splits.bankId
    # ??? splits.price


def import_kmymoney(filename):
    with transaction.atomic():
        with sqlite3.connect(filename) as conn:
            conn.row_factory = sqlite3.Row

            cur = conn.cursor()

            (closed, iban, forOpeningBalances, sources, security_id) = \
                    __import_key_values(cur)
            account_types = __import_account_types(cur)
            inst = __import_institutions(cur)
            price_sources = __import_price_sources(cur)

            commodities = {}
            payees = {}
            accounts = {}
            parents = {}

            __import_currencies(cur, commodities, sources, security_id)
            __import_securities(
                cur, commodities, sources, security_id, price_sources)
            __import_payees(cur, payees)

            cur.execute(
                """
                SELECT kmmAccounts.*
                FROM kmmAccounts
                """
            )
            for row in cur:
                accounts[row['id']] = models.Accounts.objects.create(
                    kind=account_types[row['accountTypeString']],
                    name=row['accountName'],
                    institution=inst.get(row['institutionId']),
                    description=row['description'],
                    iban=iban.get(row['id'], None),
                    number=row['accountNumber'],
                    parent=None,
                    closed=closed.get(row['id'], False),
                    commodity=commodities[row['currencyId']],
                    commodity_scu=commodities[row['currencyId']].qty_scale,
                    last_reconciled=__time(row['lastReconciled']),
                    opening_date=(
                        None
                        if row['openingDate'] == '1900-01-01'
                        else __time(row['openingDate'])
                    ),
                )
                parents[row['id']] = row['parentId']

                # ??? ignored: lastModified
                # ??? ignored: opening_date
                # ??? ignored: isStockAccount
                # not needed: balance + balanceFormatted
                # not needed: transactionCount

            for child, parent in parents.items():
                if parent:
                    accounts[child].parent = accounts[parent]
                    accounts[child].save()

            __import_prices(cur, commodities, price_sources)
            __import_transactions(cur, accounts, commodities, payees)
