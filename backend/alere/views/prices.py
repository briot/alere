from .json import JSONView
import alere


class PriceHistory(JSONView):

    def get_json(self, params, accountId):
        currency = self.as_commodity_id(params, 'currency')

        query = alere.models.Prices.objects \
            .select_related('origin') \
            .filter(target_id=currency,
                    origin__accounts=accountId)

        return [
           {
               "date": row.date.strftime('%Y-%m-%d'),
               "price": row.scaled_price / row.origin.price_scale,
           }
           for row in query
        ]
