import datetime
import math
import sqlite3
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
                print('Ignored keyValue: account=%s  key=%s  value=%s (may have others with same key)' %
                        (id, key, data))
        elif key == 'kmm-online-source':
            sources[id] = data
        elif key == 'kmm-security-id':
            securityId[id] = data
        elif data:
            print('Unknown keyValue: id=%s  key=%s  value=%s' %
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
            print('Error: unexpected currency type: %s' % row['typeString'])
            continue

        qty_scale = int(row['smallestAccountFraction'])
        price_scale = int(row['smallestCashFraction'])

        try:
            old = models.Commodities.objects.get(symbol=row['symbolString'])
            commodities[row['ISOcode']] = old

            if (old.name != row['name']
                    or old.symbol != row['symbolString']
                    or old.qty_scale != qty_scale
                    or old.price_scale != price_scale
                ):
                print(
                    'Error: Currency %s already exists'
                    ' but has different properties' % row['ISOcode']
                )

        except models.Commodities.DoesNotExist:
            commodities[row['ISOcode']] = models.Commodities.objects.create(
                name=row['name'],
                symbol=row['symbolString'],
                iso_code=row['ISOcode'],
                prefixed=False,
                kind=models.CommodityKinds.CURRENCY,
                qty_scale=qty_scale,
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
            old = models.Commodities.objects.get(symbol=row['symbol'])
            commodities[row['id']] = old

            if old.name != row['name']:
                print(
                    'Error: Security %s (%s) already exists'
                    ' but has different name: %s' % (
                        row['id'], row['name'], old.name))
            elif old.symbol != row['symbol']:
                print(
                    'Error: Security %s (%s) already exists'
                    ' but has different symbol: %s' % (
                        row['id'], row['name'], old.symbol))
            elif old.kind != kind:
                print(
                    'Error: Security %s (%s) already exists'
                    ' but has different kind: %s != %s' % (
                        row['id'], row['name'], old.kind, kind))
            elif old.qty_scale != qty_scale:
                print(
                    'Error: Security %s (%s) already exists'
                    ' but has different qty_scale: %s != %s' % (
                        row['id'], row['name'], old.qty_scale, qty_scale))
            elif old.price_scale != price_scale:
                print(
                    'Error: Security %s (%s) already exists'
                    ' but has different price_scale: %s != %s' % (
                        row['id'], row['name'], old.price_scale, price_scale))

        except models.Commodities.DoesNotExist:
            commodities[row['id']] = models.Commodities.objects.create(
                name=row['name'],
                symbol=security_id.get(row['id'], row['symbol']),
                prefixed=False,
                kind=kind,
                qty_scale=int(row['smallestAccountFraction']),
                price_scale=price_scale,
                quote_source=price_sources.get(sources.get(row['id']), None),
                quote_symbol=row['symbol'],   # ticker
            )
            # ??? ignored: pricePrecision
            # ??? ignored: tradingMarket
            # ??? ignored: tradingCurrency
            # ??? ignored: roundingMethod


def __import_account_types(cur):
    flag = {}
    for f in models.AccountFlags:
        flag[f] = models.AccountKinds.objects.get(flag=f)

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
    return int(int(num) * (scale / int(den)))


def __import_prices(cur, commodities, price_sources):
    cur.execute(
        """
        SELECT kmmPrices.* FROM kmmPrices
        """
    )
    for row in cur:
        models.Prices.objects.create(
            origin=commodities[row['fromId']],
            target=commodities[row['toId']],
            date=__time(row['priceDate']),
            scaled_price=__scaled_price(
                row['price'],
                scale=commodities.get(row['fromId']).price_scale,
            ),
            source=price_sources[row['priceSource']],
        )


def __import_transactions(cur, accounts, commodities):
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
        currency = commodities[row['transCurrency']]
        reconcile = (
            models.ReconcileKinds.NEW
            if row['reconcileFlag'] == '0'
            else models.ReconcileKinds.CLEARED
            if row['reconcileFlag'] == '1'
            else models.ReconcileKinds.RECONCILED
        )
        shares = __scaled_price(row['shares'], scale=acc.commodity_scu)

        if row['price'] is None:
            # for non-stock account. In kmymoney, foreign currencies are not
            # supported in transactions.
            price = currency.price_scale
        else:
            # for a stock account
            price = __scaled_price(row['price'], scale=currency.price_scale)

        s = models.Splits.objects.create(
            transaction=trans,
            account=acc,
            currency=currency,
            scaled_price=price,
            scaled_qty=shares,
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
                    opening_date=__time(row['openingDate']),
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
