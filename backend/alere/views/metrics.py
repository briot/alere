from .json import JSONView
from .kmm import kmm, do_query, fetchone

class Metric:
    def __init__(
            self,
            income: float,
            expenses: float,
            active: float,
            passive: float,
            liquid_assets: float,
            income_taxes: float,
            other_taxes: float,
            passive_income: float,
        ):
        self.income = income
        self.expenses = expenses
        self.active = active
        self.passive = passive
        self.passive_income = passive_income
        self.liquid_assets = liquid_assets
        self.income_taxes = income_taxes
        self.other_taxes = other_taxes

    def to_json(self):
        return {
            "income": self.income,
            "passive_income": self.passive_income,
            "expenses": self.expenses,
            "active": self.active,
            "passive": self.passive,
            "liquid_assets": self.liquid_assets,
            "income_taxes": self.income_taxes,
            "other_taxes": self.other_taxes,
        }


class MetricsView(JSONView):

    def get_json(self, params):
        maxdate = params.get('maxdate')[0]
        mindate = params.get('mindate')[0]
        currency = params.get('currency')[0]

        # ??? Should use currency

        # look for the sum of operations during the time period
        query = f"""
        SELECT
          -SUM({kmm._to_float('s.value')}) as value
        FROM kmmSplits s JOIN kmmAccounts a ON (s.accountId = a.id)
        WHERE s.postDate >= :mindate
          AND s.postDate <= :maxdate
          AND a.accountTypeString = :accountType
        """

        row = fetchone(query, {
            "mindate": mindate,
            "maxdate": maxdate,
            "accountType": 'Income',
        })
        income = row.value

        row = fetchone(query, {
            "mindate": mindate,
            "maxdate": maxdate,
            "accountType": 'Expense',
        })
        expense = row.value

        query = f"""
        SELECT
          SUM({kmm._to_float('s.value')}) as value
        FROM kmmSplits s JOIN kmmAccounts a ON (s.accountId = a.id)
        WHERE s.postDate >= :mindate
          AND s.postDate <= :maxdate
          AND s.accountId IN ('A000020',  --  Impots
                              'A000021',  --  Taxe fonciere
                              'A000022',  --  Taxe habitation
                              'A000263')  --  CSG
        """
        row = fetchone(query, {
            "mindate": mindate,
            "maxdate": maxdate,
        })
        other_taxes = row.value

        query = f"""
        SELECT
          SUM({kmm._to_float('s.value')}) as value
        FROM kmmSplits s JOIN kmmAccounts a ON (s.accountId = a.id)
        WHERE s.postDate >= :mindate
          AND s.postDate <= :maxdate
          AND s.accountId IN ('A000023')  --  Impots sur le revenu
        """
        row = fetchone(query, {
            "mindate": mindate,
            "maxdate": maxdate,
        })
        income_taxes = row.value

        query = f"""
        SELECT
          SUM({kmm._to_float('s.value')}) as value
        FROM kmmSplits s JOIN kmmAccounts a ON (s.accountId = a.id)
        WHERE s.postDate >= :mindate
          AND s.postDate <= :maxdate
          AND s.accountId IN ('A000002',   --  Salaire Manu
                              'A000003',   --  Salaire Marie
                              'A000083',   --  Chomage
                              'A000270')   --  URSAFF
        """
        row = fetchone(query, {
            "mindate": mindate,
            "maxdate": maxdate,
        })
        salaries = -row.value

        # look for the balance at the end of the time period. This requires
        # summing all splits from the beginning of times
        query = f"""
        WITH
          {kmm._price_history(currency)}
        SELECT
           SUM(
              a.shares
              *
              COALESCE(price_history.computedPrice,
                       CASE a.currencyId
                          WHEN "{currency}" THEN 1
                          ELSE NULL
                       END
              )
            ) as total
        FROM
           (SELECT
              kmmAccounts.id,
              kmmAccounts.currencyId,
              SUM({kmm._to_float('s.shares')}) shares
            FROM
               kmmSplits s
               JOIN kmmAccounts ON (s.accountId = kmmAccounts.id)
            WHERE s.postDate <= :maxdate
              AND kmmAccounts.accountTypeString
                IN (:account1, :account2, :account3, :account4, :account5)
            GROUP BY kmmAccounts.id, kmmAccounts.currencyId
           ) a

           LEFT JOIN kmmSecurities ON (kmmSecurities.id = a.currencyId)
           LEFT JOIN price_history ON
             (kmmSecurities.id = price_history.fromId
              AND :maxdate >= price_history.priceDate
              AND :maxdate < price_history.maxDate)
        """

        row = fetchone(query, {
            "maxdate": maxdate,
            "account1": "Asset",
            "account2": "Investment",
            "account3": "Stock",
            "account4": "Checking",
            "account5": "Savings",
        })
        active = row.total

#        row = fetchone(query, {
#            "maxdate": mindate,
#            "account1": "Asset",
#            "account2": "Investment",
#            "account3": "Stock",
#            "account4": "Checking",
#            "account5": "Savings",
#        })
#        active_at_start = row.total

        row = fetchone(query, {
            "maxdate": maxdate,
            "account1": "Liability",
            "account2": "",
            "account3": "",
            "account4": "",
            "account5": "",
        })
        passive = row.total

#        row = fetchone(query, {
#            "maxdate": mindate,
#            "account1": "Liability",
#            "account2": "",
#            "account3": "",
#            "account4": "",
#            "account5": "",
#        })
#        passive_at_start = row.total

        row = fetchone(query, {
            "maxdate": maxdate,
            "account1": "",
            "account2": "Investment",
            "account3": "Stock",
            "account4": "Checking",
            "account5": "Savings",
        })
        liquid_assets = row.total

        return Metric(
            income=income,
            passive_income=income - salaries,
            expenses=expense,
            active=active,
            passive=passive,
            liquid_assets=liquid_assets,
            income_taxes=income_taxes,
            other_taxes=other_taxes,
        )
