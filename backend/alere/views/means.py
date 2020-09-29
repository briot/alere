from .json import JSONView
from .kmm import kmm, do_query
from .kmymoney import ACCOUNT_TYPE

class Point:
    def __init__(self, date, value, average):
        self.date = date
        self.value = value
        self.average = average

    def to_json(self):
        return {
            "date": self.date,
            "value": self.value,
            "average": self.average,
        }


class MeanView(JSONView):

    def get_json(self, params):
        expenses = self.as_bool(params, 'expenses')
        maxdate = params['maxdate']
        mindate = params['mindate']
        prior = int(params.get('prior', 6))
        after = int(params.get('after', 6))

        query = f"""
           SELECT q.date,
               q.value,
               AVG(q.value) OVER (ORDER BY q.date ROWS
                                  BETWEEN {prior} PRECEDING
                                  AND {after} FOLLOWING) as avg
           FROM (SELECT strftime('%Y-%m', s.postDate) as date,
                   sum(s.valueFormatted) as value
                 FROM kmmSplits s JOIN kmmAccounts a ON (s.accountId=a.id)
                 WHERE a.accountType=:accountType
                   AND s.postDate >= :mindate
                   AND s.postDate <= :maxdate
                 GROUP BY date) q
        """

        return [
            Point(row.date,
                  (row.value if expenses else -row.value),
                  (row.avg if expenses else -row.avg),
                  )
            for row in do_query(query, {
                'accountType': (
                    ACCOUNT_TYPE.EXPENSE
                    if expenses
                    else ACCOUNT_TYPE.INCOME
                ),
                'mindate': mindate,
                'maxdate': maxdate,
            })
        ]
