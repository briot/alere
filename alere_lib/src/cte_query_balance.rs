use crate::commodity_kinds::CommodityKind;
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
              s.post_ts as min_ts,
              COALESCE(
                 LEAD(s.post_ts)
                    OVER (PARTITION BY s.account_id ORDER by s.post_ts),
                 {SQL_ARMAGEDDON}
                ) AS max_ts,
              CAST( sum(s.scaled_qty)
                 OVER (PARTITION BY s.account_id
                       ORDER BY s.post_ts
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
    let currency = CommodityKind::Currency as i32;

    format!(
        "
    {CTE_BALANCES_CURRENCY} AS (
        SELECT
           b.account_id,
           alr_commodities.id as currency_id,
           max(b.min_ts, p.min_ts) as min_ts,
           min(b.max_ts, p.max_ts) as max_ts,
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
           AND b.min_ts < p.max_ts
           AND p.min_ts < b.max_ts

           --  target commodities can only be currencies
           AND alr_commodities.kind = {currency}
    )"
    )
}
