use chrono::{Utc, DateTime };
use diesel::sql_types::{Integer, Float, Bool};
use rust_decimal::prelude::*;    //  to_f32
use rust_decimal::Decimal;
use std::collections::HashMap;
use super::scenarios::{NO_SCENARIO, Scenario};
use super::dates::{DateSet, DateValues, CTE_DATES};

type Currency = u16;
type AccountId = i32;    //  Diesel does not provide Integer->u32 conversion


type MaxScheduledOccurrences = Option<u16>;
fn get_max_occurrences(max: MaxScheduledOccurrences) -> u16 {
    max.unwrap_or(2000)
}

#[derive(Clone, Debug)]
pub struct PerAccount {
    account_id: AccountId,
    shares: Vec<Decimal>,   // one entry per date index
    price: Vec<Decimal>,    // one entry per date index
}

#[derive(Debug, QueryableByName)]
struct NetworthRow {

    #[sql_type = "Integer"]
    idx: i32,

    #[sql_type = "Integer"]
    account: AccountId,

    #[sql_type = "Float"]
    shares: f32,

    #[sql_type = "Float"]
    computed_price: f32,
}


const CTE_SPLITS: &str = "cte_splits";
const CTE_BALANCES: &str = "cte_bl";
const CTE_BALANCES_CURRENCY: &str = "cte_bl_cur";
const CTE_SPLITS_WITH_VALUE: &str = "cte_splits_value";
const SQL_ARMAGEDDON: &str = "'2999-12-31'";


/// A common table expression that returns all splits to consider in the
/// given time range, including the recurrences of scheduled transactions.

fn cte_list_splits(
    dates: &dyn DateSet,
    scenario: Scenario,
    max_scheduled_occurrences: MaxScheduledOccurrences,
) -> String {
    let dates_start = dates.get_start();
    let dates_end = dates.get_end();
    let maxo = get_max_occurrences(max_scheduled_occurrences);

    let non_recurring_splits = format!("
        SELECT
           t.id as transaction_id,
           1 as occurrence,
           s.id as split_id,
           t.timestamp,
           t.timestamp AS initial_timestamp,
           t.scheduled,
           t.scenario_id,
           t.check_number,
           t.memo,
           s.account_id,
           s.scaled_qty,
           s.scaled_value,
           s.value_commodity_id,
           s.reconcile,
           s.payee_id,
           s.post_date
        FROM alr_transactions t
           JOIN alr_splits s ON (s.transaction_id = t.id)
        WHERE t.scheduled IS NULL
            AND (t.scenario_id = {NO_SCENARIO}
                 OR t.scenario_id = {scenario})
            AND post_date >= '{dates_start}'
            AND post_date <= '{dates_end}'
    ");

    if maxo > 0 {
        // overrides the post_date for the splits associated with a
        // recurring transaction
        return format!("recurring_splits_and_transaction AS (
            SELECT
               t.id as transaction_id,
               1 as occurrence,
               s.id as split_id,
               alr_next_event(t.scheduled, t.timestamp, t.last_occurrence)
                  AS timestamp,
               t.timestamp AS initial_timestamp,
               t.scheduled,
               t.scenario_id,
               t.check_number,
               t.memo,
               s.account_id,
               s.scaled_qty,
               s.scaled_value,
               s.value_commodity_id,
               s.reconcile,
               s.payee_id,
               alr_next_event(
                   t.scheduled, t.timestamp, t.last_occurrence) as post_date
            FROM alr_transactions t
               JOIN alr_splits s ON (s.transaction_id = t.id)
            WHERE t.scheduled IS NOT NULL
               AND (t.scenario_id = {NO_SCENARIO}
                    OR t.scenario_id = {scenario})

            UNION SELECT
               s.transaction_id,
               s.occurrence + 1,
               s.split_id,
               alr_next_event(s.scheduled, s.initial_timestamp, s.post_date),
               s.initial_timestamp,
               s.scheduled,
               s.scenario_id,
               s.check_number,
               s.memo,
               s.account_id,
               s.scaled_qty,
               s.scaled_value,
               s.value_commodity_id,
               s.reconcile,
               s.payee_id,
               alr_next_event(s.scheduled, s.initial_timestamp, s.post_date)
            FROM recurring_splits_and_transaction s
            WHERE s.post_date IS NOT NULL
              AND s.post_date <= '{dates_end}'
              AND s.occurrence < {maxo}
        ), {CTE_SPLITS} AS (
           SELECT * FROM recurring_splits_and_transaction
              WHERE post_date IS NOT NULL
                --  The last computed occurrence might be later than expected
                --  date
                AND post_date <= '{dates_end}'
                AND post_date >= '{dates_start}'
           UNION {non_recurring_splits}
        )")
    } else {
        return format!("{CTE_SPLITS} AS ({non_recurring_splits})")
    }
}


/// Returns all splits and their associated value, scaled as needed.
/// Requires cte_list_splits

fn cte_splits_with_values() -> String {
    format!("
        {CTE_SPLITS_WITH_VALUE} AS (
           SELECT
              s.*,
              CAST(s.scaled_value AS FLOAT) / c.price_scale AS value,
              CAST(s.scaled_value * alr_accounts.commodity_scu AS FLOAT)
                 / (s.scaled_qty * c.price_scale)
                 AS computed_price
           FROM
              {CTE_SPLITS} s
              JOIN alr_accounts ON (s.account_id = alr_accounts.id)
              JOIN alr_commodities c ON (s.value_commodity_id=c.id)
        )
    ")
}


/// Compute the balance of accounts for all time ranges.
///
/// The result is a set of tuple
///    (account_id, shares, [min_date, max_date))
/// that covers all time and all accounts.
///
/// Requires cte_list_splits

fn cte_balances() -> String {
    format!("
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
    ")
}

/// Similar to cte_balances, but also combines with the prices history to
/// compute the money value of those shares. This might result in more
/// time intervals.
/// Requires cte_balances

fn cte_balances_currency() -> String {
    format!("
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
    )")
}


/// Compute the networth as of certain dates.
/// The number of "shares" as returned might actually be monetary value, when
/// the account's commodity is a currency (in which case, the price will
/// be the exchange rate between that currency and currency_id).

pub fn networth(
    dates: &dyn DateSet,
    currency: u16,
    scenario: Scenario,
    max_scheduled_occurrences: MaxScheduledOccurrences,
) -> Vec<PerAccount> {
    let list_splits = cte_list_splits(
        &dates.unbounded_start(),
        scenario,
        max_scheduled_occurrences,
    );
    let balances = cte_balances();
    let balances_cur = cte_balances_currency();
    let dates_cte = dates.cte();
    let query = format!("
       WITH RECURSIVE
          {list_splits},
          {balances},
          {balances_cur},
          {dates_cte}
       SELECT
          {CTE_DATES}.idx AS idx,
          b.account_id    AS account,
          b.shares,
          b.computed_price
       FROM {CTE_BALANCES_CURRENCY} b
          JOIN alr_accounts a ON (b.account_id = a.id)
          JOIN alr_account_kinds k ON (a.kind_id = k.id),
          {CTE_DATES}
       WHERE
          b.currency_id = {currency}
          AND b.mindate <= {CTE_DATES}.date
          AND {CTE_DATES}.date < b.maxdate
          AND k.is_networth
    ");

    let result = super::connections::execute_and_log::<NetworthRow>(&query);
    match result {
        Ok(rows) => {
            let mut per_account: HashMap<AccountId, PerAccount> =
                HashMap::new();
            for row in rows.iter() {
                let e = per_account.entry(row.account).or_insert(PerAccount {
                    account_id: row.account,
                    shares: vec![Decimal::ZERO; 3],  // ???
                    price: vec![Decimal::ZERO; 3],
                });
                e.shares[row.idx as usize - 1] = Decimal::new(
                    (row.shares * 100.0) as i64,
                    2);
                e.price[row.idx as usize - 1] = Decimal::new(
                    (row.computed_price * 100.0) as i64,
                    2);
            }
            per_account.values().cloned().collect()
        },
        Err(e)  => {
            print!("In networth: {:?}\n", e);
            vec![]
        }
    }

}


#[derive(Debug, QueryableByName)]
struct SplitsPerAccount {

    #[sql_type = "Integer"]
    account_id: AccountId,

    #[sql_type = "Float"]
    value: f32,
}


/// For each account, computes the total of splits that apply to it in the
/// given time range.

fn sum_splits_per_account(
    dates: &dyn DateSet,
    currency: u16,
    scenario: Scenario,
    max_scheduled_occurrences: MaxScheduledOccurrences,
) -> HashMap<AccountId, f32> {

    let list_splits = cte_list_splits(
        dates,
        scenario,
        max_scheduled_occurrences,
    );
    let with_values = cte_splits_with_values();
    let query = format!("
        WITH RECURSIVE {list_splits}, \
          {with_values} \
        SELECT s.account_id, SUM(s.value) AS value \
        FROM {CTE_SPLITS_WITH_VALUE} s \
        WHERE s.value_commodity_id = {currency} \
        GROUP BY s.account_id
        "
    );
    let rows = super::connections::execute_and_log::<SplitsPerAccount>(
        &query
    );
    match rows {
        Ok(r) => {
            let mut res: HashMap<AccountId, f32> = HashMap::new();
            for row in r.iter() {
                res.insert(
                    row.account_id,
                    row.value,
                );
            }
            res
        },
        Err(e) => {
            print!("In sum_splits_per_account: {:?}\n", e);
            HashMap::new()
        }
    }
}

/// Compute the total networth

fn sum_networth<F>(
    all_networth: &Vec<PerAccount>,
    filter: F,   // receives an account id
    idx: usize,
) -> Decimal
   where F: Fn(&AccountId) -> bool
{
    let mut result = Decimal::ZERO;
    for nw in all_networth {
        if filter(&nw.account_id) {
            result += nw.shares[idx] * nw.price[idx];
        }
    }
    result
}

/// Sum splits

fn sum_splits<F>(
    all_splits: &HashMap<AccountId, f32>,
    filter: F,   // receives an account id
) -> f32
   where F: Fn(&AccountId) -> bool
{
    let mut result: f32 = 0.0;
    for (account_id, value) in all_splits {
        if filter(&account_id) {
            result += value;
        }
    }
    result
}

#[derive(QueryableByName, Debug)]
struct AccountIsNWRow {
    #[sql_type = "Integer"]
    account_id: AccountId,

    #[sql_type = "Bool"]
    is_networth: bool,

    #[sql_type = "Bool"]
    is_liquid: bool,

    #[sql_type = "Bool"]
    realized_income: bool,

    #[sql_type = "Bool"]
    is_passive_income: bool,

    #[sql_type = "Bool"]
    is_work_income: bool,

    #[sql_type = "Bool"]
    is_expense: bool,

    #[sql_type = "Bool"]
    is_misc_tax: bool,

    #[sql_type = "Bool"]
    is_income_tax: bool,
}


#[derive(serde::Serialize)]
pub struct Networth {
   income: f32,
   passive_income: f32,
   work_income: f32,
   expenses: f32,
   income_taxes: f32,
   other_taxes: f32,
   networth: f32,
   networth_start: f32,
   liquid_assets: f32,
   liquid_assets_at_start: f32,
}

#[tauri::command]
pub fn compute_networth(
   mindate: DateTime<Utc>,
   maxdate: DateTime<Utc>,
   currency: Currency,
) -> Networth {

    let dates = DateValues::new(Some(vec![mindate.date(), maxdate.date()]));
    let all_networth = networth(
        &dates,
        currency,
        super::scenarios::NO_SCENARIO,
        Some(0),   // max_scheduled_occurrences
    );

    let mut accounts: HashMap<AccountId, AccountIsNWRow> = HashMap::new();
    let equity = super::accounts::AccountKindCategory::EQUITY as u32;
    let income = super::accounts::AccountKindCategory::INCOME as u32;
    let expense = super::accounts::AccountKindCategory::EXPENSE as u32;

    let account_rows = super::connections::execute_and_log::<AccountIsNWRow>(
        &format!("SELECT a.id AS account_id, \
            k.is_networth, \
            k.category = {equity} AND k.is_networth AS is_liquid, \
            k.category = {income} AND not k.is_unrealized AS realized_income, \
            k.is_passive_income, \
            k.is_work_income, \
            k.category = {expense} AS is_expense, \
            k.is_misc_tax, \
            k.is_income_tax \
         FROM alr_accounts a JOIN alr_account_kinds k \
         ON (a.kind_id=k.id)"
        )
    );
    match account_rows {
        Ok(acc) => {
            for a in acc {
                accounts.insert(a.account_id, a);
            }
        },
        Err(e) => {
            print!("metrics: error processing query {:?}\n", e);
        },
    };

    let networth_at_start = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_networth).unwrap_or(false),
        0   //  index
    );
    let networth_at_end = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_networth).unwrap_or(false),
        1   //  index
    );
    let liquid_assets_at_start = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_liquid).unwrap_or(false),
        0   //  index
    );
    let liquid_assets_at_end = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_liquid).unwrap_or(false),
        1   //  index
    );

    let over_period = sum_splits_per_account(
        &dates,
        currency,
        super::scenarios::NO_SCENARIO,
        Some(0),   // max_scheduled_occurrences
    );

    let income = -sum_splits(
        &over_period,
        |a| accounts.get(a).map(|ac| ac.realized_income).unwrap_or(false),
    );
    let passive_income = -sum_splits(
        &over_period,
        |a| accounts.get(a).map(|ac| ac.is_passive_income).unwrap_or(false),
    );
    let work_income = -sum_splits(
        &over_period,
        |a| accounts.get(a).map(|ac| ac.is_work_income).unwrap_or(false),
    );
    let expense = sum_splits(
        &over_period,
        |a| accounts.get(a).map(|ac| ac.is_expense).unwrap_or(false),
    );
    let other_taxes = sum_splits(
        &over_period,
        |a| accounts.get(a).map(|ac| ac.is_misc_tax).unwrap_or(false),
    );
    let income_taxes = sum_splits(
        &over_period,
        |a| accounts.get(a).map(|ac| ac.is_income_tax).unwrap_or(false),
    );

    Networth{
        income: income,
        passive_income: passive_income,
        work_income: work_income,
        expenses: expense,
        income_taxes: income_taxes,
        other_taxes: other_taxes,
        networth: networth_at_end.to_f32().unwrap(),
        networth_start: networth_at_start.to_f32().unwrap(),
        liquid_assets: liquid_assets_at_end.to_f32().unwrap(),
        liquid_assets_at_start: liquid_assets_at_start.to_f32().unwrap(),
    }
}
