use crate::cte_list_splits::CTE_SPLITS;
use crate::dates::SQL_ARMAGEDDON;

pub const CTE_BALANCES: &str = "cte_bl";
pub const CTE_BALANCES_CURRENCY: &str = "cte_bl_cur";

/// Compute the balance of accounts for all time ranges.
///
/// The result is a set of tuple
///    (account_id, shares, [min_date, max_date))
/// that covers all time and all accounts.
///
/// Requires cte_list_splits

pub fn cte_balances() -> String {
    format!(
        "
        {CTE_BALANCES} AS (
           SELECT
              a.id AS account_id,
              a.commodity_id,
              s.post_date as mindate,
              COALESCE(
                 LEAD(s.post_date)
                    OVER (PARTITION BY s.account_id ORDER by s.post_date),
                 {SQL_ARMAGEDDON}
                ) AS maxdate,
              CAST( sum(s.scaled_qty)
                 OVER (PARTITION BY s.account_id
                       ORDER BY s.post_date
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 AS FLOAT
                ) / a.commodity_scu AS shares
           FROM
              {CTE_SPLITS} s
              JOIN alr_accounts a ON (s.account_id = a.id)
        )
    "
    )
}

/// Similar to cte_balances, but also combines with the prices history to
/// compute the money value of those shares. This might result in more
/// time intervals.
/// Requires cte_balances

pub fn cte_balances_currency() -> String {
    format!(
        "
    {CTE_BALANCES_CURRENCY} AS (
        SELECT
           b.account_id,
           alr_commodities.id as currency_id,
           max(b.mindate, p.mindate) as mindate,
           min(b.maxdate, p.maxdate) as maxdate,
           CAST(b.shares * p.scaled_price AS FLOAT)
              / source.price_scale as balance,
           b.shares,
           CAST(p.scaled_price AS FLOAT) / source.price_scale
              as computed_price
        FROM
           {CTE_BALANCES} b,
           alr_price_history_with_turnkey p,
           alr_commodities,
           alr_commodities source
        WHERE
           --  price from: the account's commodity
           source.id = b.commodity_id
           AND b.commodity_id=p.origin_id

           --  price target: the user's requested currency
           AND p.target_id=alr_commodities.id

           --  intervals intersect
           AND b.mindate < p.maxdate
           AND p.mindate < b.maxdate

           --  target commodities can only be currencies
           AND alr_commodities.kind = 'C'
    )"
    )
}
