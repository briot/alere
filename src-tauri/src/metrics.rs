use chrono::{Utc, DateTime};
use rust_decimal::Decimal;
use rust_decimal_macros::*;
use diesel::{sql_query};
use diesel::sql_types::Integer;
use crate::diesel::RunQueryDsl;

pub struct PerAccount {
    account_id: i32,
    shared: Vec<Option<Decimal>>,   // one entry per date index
    price: Vec<Option<Decimal>>,    // one entry per date index
}

#[derive(Debug, QueryableByName)]
struct Count {

    #[sql_type = "Integer"]
    count: i32,
}

pub fn networth(
    dates: Vec<DateTime<Utc>>,
    currency: u16,
    scenario: u16,
    max_scheduled_occurrences: Option<u16>,
) -> Vec<PerAccount> {

    let _query = "
       WITH RECURSIVE
          {list_splits},
          {queries.cte_balances()},
          {queries.cte_balances_currency()},
          {dates.cte()}
       SELECT
          {CTE_DATES}.idx,
          b.account_id,
          b.shares,
          b.computed_price
       FROM {queries.CTE_BALANCES_CURRENCY} b
          JOIN alr_accounts a ON (b.account_id = a.id)
          JOIN alr_account_kinds k ON (a.kind_id = k.id),
          {CTE_DATES}
       WHERE
          b.currency_id = {currency_id}
          AND b.mindate <= {CTE_DATES}.date
          AND {CTE_DATES}.date < b.maxdate
          AND k.is_networth
    ";

    let query = "
       SELECT count(*) as count FROM alr_accounts
    ";

    let connection = super::connections::POOL.get().unwrap();
    let count: Vec<Count> = sql_query(query).load(&connection).unwrap();
    print!("MANU {:?}", count);

    vec!(
         PerAccount{
             account_id: 0,
             shared: vec!(Some(dec!(0))),
             price: vec!(Some(dec!(0))),
         }
    )
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
   currency: u16,
) -> Networth {

   let all_networth = networth(
       vec!(mindate, maxdate),
       currency,
       super::scenarios::NO_SCENARIO,
       None,   // max_scheduled_occurrences
   );

   Networth{
       income: 0.0,
       passive_income: 0.0,
       work_income: 0.0,
       expenses: 0.0,
       income_taxes: 0.0,
       other_taxes: 0.0,
       networth: 0.0,
       networth_start: 0.0,
       liquid_assets: 0.0,
       liquid_assets_at_start: 0.0,
   }
}
