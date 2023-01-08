use crate::cte_list_splits::{
    cte_list_splits, cte_splits_with_values, CTE_SPLITS_WITH_VALUE};
use crate::dates::{DateRange, DateSet, CTE_DATES};
use crate::models::CommodityId;
use crate::occurrences::Occurrences;
use crate::scenarios::Scenario;
use crate::connections::{SqliteConnect, execute_and_log};
use chrono::NaiveDate;
use crate::accounts::AccountKindCategory;
use diesel::sql_types::{Date, Float, Nullable};


#[derive(QueryableByName)]
pub struct CashFlow {

    #[sql_type = "Date"]
    pub month: NaiveDate,

    #[sql_type = "Nullable<Float>"]
    pub realized_inc_total: Option<f32>,

    #[sql_type = "Nullable<Float>"]
    pub inc_average: Option<f32>,

    #[sql_type = "Nullable<Float>"]
    pub unrealized_inc_total: Option<f32>,

    #[sql_type = "Nullable<Float>"]
    pub unrealized_average: Option<f32>,

    #[sql_type = "Nullable<Float>"]
    pub exp_total: Option<f32>,

    #[sql_type = "Nullable<Float>"]
    pub exp_average: Option<f32>,
}

pub fn monthly_cashflow(
    connection: &SqliteConnect,
    dates: &DateRange,
    currency: CommodityId,
    scenario: Scenario,
    max_scheduled_occurrences: &Occurrences,
    prior: u8,
    after: u8,
) -> Vec<CashFlow> {

    let adjusted = dates.extend(prior, after);
    let adjusted_cte = adjusted.cte();
    let splits = cte_list_splits(dates, scenario, max_scheduled_occurrences);
    let split_values = cte_splits_with_values();
    let income = AccountKindCategory::INCOME as u8;
    let expense = AccountKindCategory::EXPENSE as u8;
    let query = format!(
        "
        WITH RECURSIVE {adjusted_cte},
            {splits},
            {split_values}
        SELECT
           tmp.month,
           tmp.realized_inc_total,
           AVG(tmp.realized_inc_total) OVER
               (ORDER BY tmp.month
                ROWS BETWEEN {prior} PRECEDING
                AND {after} FOLLOWING) AS inc_average,
           tmp.unrealized_inc_total,
           AVG(tmp.unrealized_inc_total) OVER
               (ORDER BY tmp.month
                ROWS BETWEEN {prior} PRECEDING
                AND {after} FOLLOWING) AS unrealized_average,
           tmp.exp_total,
           AVG(tmp.exp_total) OVER
               (ORDER BY tmp.month
                ROWS BETWEEN {prior} PRECEDING
                AND {after} FOLLOWING) AS exp_average
        FROM
           (
              --  Sum of splits for a given months, organized per category
              SELECT
                 strftime('%Y-%m-01', s.post_date) as month,
                 SUM(value) FILTER (WHERE
                    k.category = {income}
                    AND NOT k.is_unrealized
                 ) as realized_inc_total,
                 SUM(value) FILTER (WHERE
                    k.category = {income}
                    AND k.is_unrealized
                 ) as unrealized_inc_total,
                 SUM(value) FILTER (WHERE
                    k.category = {expense}
                 ) as exp_total
              FROM
                 {CTE_SPLITS_WITH_VALUE} s
                 JOIN alr_accounts a ON (s.account_id=a.id)
                 JOIN alr_account_kinds k ON (a.kind_id=k.id)
              WHERE s.value_commodity_id={currency}
              GROUP BY month
           ) tmp,
           {CTE_DATES}
        WHERE tmp.month = strftime('%Y-%m-01', {CTE_DATES}.date);
        "
    );

    let result = execute_and_log::<CashFlow>(
        &connection, "monthly_cashflow", &query);
    result.unwrap_or_default()
}
