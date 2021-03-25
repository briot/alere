import datetime
import math
import sqlite3
import sys
from alere import models
from django.db import connection, transaction


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
                sys.stderr.write(
                    'Ignored keyValue: account=%s  key=%s  value=%s (may have others with same key)\n' %
                        (id, key, data))
        elif key == 'kmm-online-source':
            sources[id] = data
        elif key == 'kmm-security-id':
            securityId[id] = data
        elif data:
            sys.stdedrr.write(
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
            sys.stderr.write(
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
                sys.stderr.write(
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
                sys.stderr.write(
                    'Error: Security %s (%s) already exists'
                    ' but has different name: %s\n' % (
                        row['id'], row['name'], old.name))
            elif old.symbol_after != row['symbol']:
                sys.stderr.write(
                    'Error: Security %s (%s) already exists'
                    ' but has different symbol: %s\n' % (
                        row['id'], row['name'], old.symbol_after))
            elif old.kind != kind:
                sys.stderr.write(
                    'Error: Security %s (%s) already exists'
                    ' but has different kind: %s != %s\n' % (
                        row['id'], row['name'], old.kind, kind))
            elif old.qty_scale != qty_scale:
                sys.stderr.write(
                    'Error: Security %s (%s) already exists'
                    ' but has different qty_scale: %s != %s\n' % (
                        row['id'], row['name'], old.qty_scale, qty_scale))
            elif old.price_scale != price_scale:
                sys.stderr.write(
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

def __scaled_price(text, scale: int):
    """
    Convert a price read from kmymoney into a scaled price, where scale
    is the currency's scale
    """
    if not text:
        return None

    num, den = text.split('/')

    # ??? There might be rounding errors if kmymoney used a denominator which
    # isn't a factor of scale.
    return int(int(num) * scale / int(den))


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
            sys.stderr.write('Ignore price for %s, security not found\n' % (
                row['fromId'], ))
            continue

        try:
            target = commodities[row['toId']]
        except KeyError:
            sys.stderr.write('Ignore price in %s, security not found\n' % (
                row['toId'], ))
            continue

        # kMyMoney sometimes has prices from Security->Currency which do not
        # really make sense and are wrongly rounded on import. For instance:
        #   fromId  toId     priceDate   price
        #   ------  -------  ----------  ---------
        #   EUR     E000041  2021-01-27  247/10000
        # would be imported as a scaled price of "2", instead of "2.47"
        # On import, try to preserve the maximum precision.

        n, d = row['price'].split('/')
        num = int(n)
        den = int(d)

        if num >= den:
            models.Prices.objects.create(
                origin=origin,
                target=target,
                date=__time(row['priceDate']),
                scaled_price=__scaled_price(
                    row['price'],
                    scale=origin.price_scale,
                ),
                source=price_sources[row['priceSource']],
            )
        else:
            models.Prices.objects.create(
                origin=target,
                target=origin,
                date=__time(row['priceDate']),
                scaled_price=__scaled_price(
                    f'{d}/{n}',
                    scale=target.price_scale,
                ),
                source=price_sources[row['priceSource']],
            )


def __import_transactions(cur, accounts, commodities):

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
           kmmSplits.*,
           kmmPayees.name as payee
        FROM kmmTransactions, kmmSplits
           LEFT JOIN kmmPayees ON (kmmSplits.payeeId=kmmPayees.id)
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
                payee=None,
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
        shares = __scaled_price(row['shares'], scale=acc.commodity_scu)

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
            price = __scaled_price(row['price'], scale=1e6)
            currency = trans_currency
            scaled_value = (
                shares * price * currency.price_scale
                / (1e6                   # scale for price
                   * acc.commodity_scu   # scale for shares
                )
            )

        # assert price is not None, "while processing %s" % dict(row)

        s = models.Splits.objects.create(
            transaction=trans,
            account=acc,
            scaled_qty=shares,
            scaled_value=scaled_value,
            value_commodity=currency,
            reconcile=reconcile,
            reconcile_date=__time(row['reconcileDate']),
            post_date=__time(row['postDate']),
        )

        # ??? Should lookup in Payee table
        if row['payee']:
            trans.payee = row['payee']
        trans.memo = trans.memo + (row['memo'] or "")
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
            __import_currencies(cur, commodities, sources, security_id)
            __import_securities(
                cur, commodities, sources, security_id, price_sources)

            accounts = {}
            parents = {}
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
            __import_transactions(cur, accounts, commodities)
