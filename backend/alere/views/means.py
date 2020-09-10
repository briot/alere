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
        expenses = params.get('expenses')[0] == "true"
        maxdate = params.get('maxdate')[0]
        mindate = params.get('mindate')[0]
        prior = params.get('prior')[0] or 6
        after = params.get('after')[0] or 6

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
                   AND date < strftime('%Y-%m', 'now')
                   AND s.postDate >= :mindate
                   AND s.postDate <= :maxdate
                 GROUP BY date) q;
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
