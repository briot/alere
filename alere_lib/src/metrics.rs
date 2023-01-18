use crate::cte_list_splits::{
    cte_list_splits, cte_splits_with_values, CTE_SPLITS_WITH_VALUE};
use crate::cte_query_balance::{
    cte_balances, cte_balances_currency, CTE_BALANCES_CURRENCY};
use crate::cte_query_networth::{cte_query_networth, CTE_QUERY_NETWORTH};
use crate::dates::{DateRange, DateSet, DateValues, GroupBy, CTE_DATES};
use crate::errors::Result;
use crate::models::{AccountId, CommodityId};
use crate::occurrences::Occurrences;
use crate::scenarios::{Scenario, NO_SCENARIO};
use crate::connections::SqliteConnect;
use crate::account_kinds::AccountKindCategory;
use chrono::{DateTime, NaiveDate, Utc};
use diesel::sql_types::{Bool, Date, Float, Integer};
use rust_decimal::prelude::*; //  to_f32
use rust_decimal::Decimal;
use serde::Serialize;
use std::collections::HashMap;
use log::info;

#[derive(Clone, Debug, Serialize)]
pub struct PerAccount {
    account_id: AccountId,
    shares: Vec<Decimal>, // one entry per date index
    price: Vec<Decimal>,  // one entry per date index
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

/// Compute the networth as of certain dates. The number of "shares" as returned
/// might actually be monetary value, when the account's commodity is a currency
/// (in which case, the price will be the exchange rate between that currency
/// and currency_id).

pub fn networth(
    connection: &SqliteConnect,
    dates: &dyn DateSet,
    currency: CommodityId,
    scenario: Scenario,
    max_scheduled_occurrences: &Occurrences,
) -> Result<Vec<PerAccount>> {
    let list_splits = cte_list_splits(
        &dates.unbounded_start(),
        scenario,
        max_scheduled_occurrences,
    );
    let balances = cte_balances();
    let balances_cur = cte_balances_currency();
    let dates_cte = dates.cte();
    let query = format!(
        "
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
    "
    );

    let rows = connection.exec::<NetworthRow>("networth", &query)?;
    let mut per_account: HashMap<AccountId, PerAccount> = HashMap::new();
    for row in rows.iter() {
        let e = per_account.entry(row.account).or_insert(PerAccount {
            account_id: row.account,
            shares: vec![Decimal::ZERO; 3], // ???
            price: vec![Decimal::ZERO; 3],
        });
        e.shares[row.idx as usize - 1] = Decimal::new((row.shares * 100.0) as i64, 2);
        e.price[row.idx as usize - 1] =
            Decimal::new((row.computed_price * 100.0) as i64, 2);
    }
    Ok(per_account.values().cloned().collect())
}

#[derive(QueryableByName, Serialize)]
pub struct NWPoint {
    #[sql_type = "Date"]
    pub date: NaiveDate,

    #[sql_type = "Float"]
    pub diff: f32,

    #[sql_type = "Float"]
    pub average: f32,

    #[sql_type = "Float"]
    pub value: f32,
}

/// Computes the networth at the end of each month.
/// The result also includes the mean of the networth computed on each
/// date, with a rolling window of `prior` months before and `after` months
/// after. It also includes the diff between the current row and the
/// previous one, and the mean of those diffs.

pub fn query_networth_history(
    connection: &SqliteConnect,
    dates: &dyn DateSet,
    currency: CommodityId,
    scenario: Scenario,
    max_scheduled_occurrences: &Occurrences,
    prior: u8, // number of rows preceding to compute rolling average
    after: u8, // number of rows following
) -> Result<Vec<NWPoint>> {
    let q_networth = cte_query_networth(currency);
    let list_splits = cte_list_splits(
        &dates.unbounded_start(), //  from the start to get balances right
        scenario,
        max_scheduled_occurrences,
    );
    let balances = cte_balances();
    let balances_currency = cte_balances_currency();
    let dates_cte = dates.cte();
    let query = format!(
        "
        WITH RECURSIVE {dates_cte}, \
           {list_splits}, \
           {balances}, \
           {balances_currency}, \
           {q_networth} \
        SELECT \
           tmp2.date, \
           COALESCE(tmp2.diff, 0.0) AS diff, \
           COALESCE(AVG(tmp2.diff) OVER \
               (ORDER BY tmp2.date \
                ROWS BETWEEN {prior} PRECEDING \
                AND {after} FOLLOWING), 0.0) AS average, \
           tmp2.value \
        FROM \
           (SELECT \
              tmp.date, \
              tmp.value - LAG(tmp.value) OVER (ORDER BY tmp.date) as diff, \
              tmp.value \
            FROM ({CTE_QUERY_NETWORTH}) tmp \
           ) tmp2 \
        "
    );

    connection.exec::<NWPoint>("networth_hist", &query)
       .map_err(|e| e.into())
}

pub fn networth_history(
    connection: SqliteConnect,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> Result<Vec<NWPoint>> {
    info!("networth_history {:?} {:?}", &mindate, &maxdate);

    let group_by: GroupBy = GroupBy::MONTHS;
    let include_scheduled: bool = false;
    let prior: u8 = 0;
    let after: u8 = 0;
    let dates = DateRange::new(
            Some(mindate.date_naive()),
            Some(maxdate.date_naive()),
            group_by)
        .extend(prior, after)
        .restrict_to_splits(
           &connection,
           NO_SCENARIO,
           &Occurrences::no_recurrence());
    let scenario = NO_SCENARIO;
    let occurrences = match include_scheduled {
        true => Occurrences::unlimited(),
        false => Occurrences::no_recurrence(),
    };

    query_networth_history(
        &connection, &dates, currency, scenario, &occurrences,
        prior, after)
}

/// For each date, compute the current price and number of shares for each
/// account.

pub fn balance(
    connection: SqliteConnect,
    dates: Vec<DateTime<Utc>>,
    currency: CommodityId,
) -> Result<Vec<PerAccount>> {
    info!("balance {:?} currency={}", &dates, currency);
    let d = &DateValues::new(
        Some(dates.iter().map(|d| d.date_naive()).collect())
    );
    networth(
        &connection,
        d, // ??? Can we pass directly an iterator instead
        currency,
        NO_SCENARIO,
        &Occurrences::no_recurrence(),
    )
}

#[derive(Debug, QueryableByName)]
pub struct SplitsPerAccount {
    #[sql_type = "Integer"]
    pub account_id: AccountId,

    #[sql_type = "Float"]
    pub value: f32,
}

/// For each account, computes the total of splits that apply to it in the
/// given time range.

pub fn sum_splits_per_account(
    connection: &SqliteConnect,
    dates: &dyn DateSet,
    currency: CommodityId,
    scenario: Scenario,
    max_scheduled_occurrences: &Occurrences,
) -> HashMap<AccountId, f32> {
    let list_splits = cte_list_splits(dates, scenario, max_scheduled_occurrences);
    let with_values = cte_splits_with_values();
    let query = format!(
        "
        WITH RECURSIVE {list_splits}, \
          {with_values} \
        SELECT s.account_id, SUM(s.value) AS value \
        FROM {CTE_SPLITS_WITH_VALUE} s \
        WHERE s.value_commodity_id = {currency} \
        GROUP BY s.account_id
        "
    );
    let rows = connection.exec::<SplitsPerAccount>("sum_splits", &query);
    let mut res: HashMap<AccountId, f32> = HashMap::new();
    if let Ok(r) = rows {
        for row in r.iter() {
            res.insert(row.account_id, row.value);
        }
    }
    res
}

/// Compute the total networth

fn sum_networth<F>(
    all_networth: &Vec<PerAccount>,
    filter: F, // receives an account id
    idx: usize,
) -> Decimal
where
    F: Fn(&AccountId) -> bool,
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
    filter: F, // receives an account id
) -> f32
where
    F: Fn(&AccountId) -> bool,
{
    let mut result: f32 = 0.0;
    for (account_id, value) in all_splits {
        if filter(account_id) {
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

pub fn metrics(
    connection: SqliteConnect,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
) -> Result<Networth> {
    info!("metrics {:?} {:?}", &mindate, &maxdate);
    let dates = DateValues::new(Some(vec![
        mindate.date_naive(),
        maxdate.date_naive()
    ]));
    let all_networth = networth(
        &connection,
        &dates,
        currency,
        NO_SCENARIO,
        &Occurrences::no_recurrence(),
    )?;

    let mut accounts: HashMap<AccountId, AccountIsNWRow> = HashMap::new();
    let equity = AccountKindCategory::EQUITY as u32;
    let income = AccountKindCategory::INCOME as u32;
    let expense = AccountKindCategory::EXPENSE as u32;

    let account_rows = connection.exec::<AccountIsNWRow>(
        "metrics",
        &format!(
            "SELECT a.id AS account_id, \
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
        ),
    );
    if let Ok(acc) = account_rows {
        for a in acc {
            accounts.insert(a.account_id, a);
        }
    }

    let networth_at_start = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_networth).unwrap_or(false),
        0, //  index
    );
    let networth_at_end = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_networth).unwrap_or(false),
        1, //  index
    );
    let liquid_assets_at_start = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_liquid).unwrap_or(false),
        0, //  index
    );
    let liquid_assets_at_end = sum_networth(
        &all_networth,
        |a| accounts.get(a).map(|ac| ac.is_liquid).unwrap_or(false),
        1, //  index
    );

    let over_period = sum_splits_per_account(
        &connection,
        &dates,
        currency,
        NO_SCENARIO,
        &Occurrences::no_recurrence(),
    );

    let income = -sum_splits(&over_period, |a| {
        accounts
            .get(a)
            .map(|ac| ac.realized_income)
            .unwrap_or(false)
    });
    let passive_income = -sum_splits(&over_period, |a| {
        accounts
            .get(a)
            .map(|ac| ac.is_passive_income)
            .unwrap_or(false)
    });
    let work_income = -sum_splits(&over_period, |a| {
        accounts.get(a).map(|ac| ac.is_work_income).unwrap_or(false)
    });
    let expense = sum_splits(&over_period, |a| {
        accounts.get(a).map(|ac| ac.is_expense).unwrap_or(false)
    });
    let other_taxes = sum_splits(&over_period, |a| {
        accounts.get(a).map(|ac| ac.is_misc_tax).unwrap_or(false)
    });
    let income_taxes = sum_splits(&over_period, |a| {
        accounts.get(a).map(|ac| ac.is_income_tax).unwrap_or(false)
    });

    Ok(Networth {
        income,
        passive_income,
        work_income,
        expenses: expense,
        income_taxes,
        other_taxes,
        networth: networth_at_end.to_f32().unwrap(),
        networth_start: networth_at_start.to_f32().unwrap(),
        liquid_assets: liquid_assets_at_end.to_f32().unwrap(),
        liquid_assets_at_start: liquid_assets_at_start.to_f32().unwrap(),
    })
}
