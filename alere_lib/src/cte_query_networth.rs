use crate::dates::CTE_DATES;
use crate::models::CommodityId;

pub const CTE_QUERY_NETWORTH: &str = "cte_qn";

/// Create a query that returns the networth as computed for a set of
/// dates. These dates must be found in the "dates(date)" table, which
/// typically will be provided as a common table expression.
///
/// requires dates()
///
/// :param max_scheduled_occurrences:
///     if 0, ignore all scheduled transactions.
///     if 1, only look at the next occurrence of them.

pub fn cte_query_networth(currency: CommodityId) -> String {
    format!(
        "
       {CTE_QUERY_NETWORTH} AS (  \
       SELECT   \
          {CTE_DATES}.date, \
          SUM(b.scaled_balance * b.computed_price / b.commodity_scu) AS value  \
       FROM {CTE_DATES}, \
          alr_balances_currency b, \
          alr_accounts \
          JOIN alr_account_kinds k ON (alr_accounts.kind_id=k.id) \
       WHERE \
          --  sqlite compares date as strings, so we need to add
          --  the time. Otherwise, 2020-11-30 is less than
          --  2020-11-30 00:00:00 and we do not get transactions
          --  on the last day of the month
          b.min_ts <= {CTE_DATES}.date \
          AND {CTE_DATES}.date < b.max_ts \
          AND b.currency_id = {currency} \
          AND b.account_id = alr_accounts.id  \
          AND k.is_networth  \
       GROUP BY {CTE_DATES}.date \
    )"
    )
}
