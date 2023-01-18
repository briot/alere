/// Compute the list of splits in a given time range, including the
/// recurrences of scheduled transactions.

use crate::query::{Query, SQL, CTE};
use crate::dates::DateSet;
use crate::scenarios::{Scenario, NO_SCENARIO};
use crate::occurrences::Occurrences;
use crate::schema::alr_splits;
use crate::connections::SqliteConnect;
use crate::errors::Result;
use crate::models::{
    AccountId, CommodityId, PayeeId, SplitId, TransactionId};
use diesel::RunQueryDsl;
use diesel::sql_types::{Nullable, Text, Date, Integer};

pub enum ReconcileKind {
    NEW = 0,
    CLEARED = 1,
    RECONCILED = 2,
}

/// Parts of a transaction.
/// The sum of qty for all splits in a transaction must be 0.
///
/// For instance: withdraw 100 USD abroad, equivalent to 85 EUR,
/// with 0.1 EUR as a fee.
///   checking account: commodify=EUR
///   split1:  accountid=checking account
///            value= -100  USD
///            qty=  -85.1
///   split2:  accountid=expense:cash
///            value= +85   EUR
///            qty= +85
///   split3:  accountid=expense:fees
///            value= +0.1 EUR
///            qty= +0.1

#[derive(diesel::QueryableByName, diesel::Queryable,
         Debug, serde::Serialize)]
#[table_name = "alr_splits"]
pub struct Split {
    pub id: SplitId,
    pub scaled_qty: i32,
    pub scaled_value: i32,
    pub reconcile: String,   //  ??? should be ReconcileKind
    pub reconcile_date: Option<chrono::NaiveDate>,  // include in the above
    pub post_date: chrono::NaiveDate,
    pub account_id: AccountId,
    pub payee_id: Option<PayeeId>,
    pub transaction_id: TransactionId,
    pub value_commodity_id: CommodityId,
}

impl Split {
    pub fn create(
        db: &SqliteConnect,
        scaled_qty: i64,  //  could be negative
        scaled_value: u64,
        reconcile: ReconcileKind,
        reconcile_date: Option<chrono::NaiveDate>,
        post_date: chrono::NaiveDate,
        account_id: AccountId,
        payee_id: Option<PayeeId>,
        transaction_id: TransactionId,
        value_commodity_id: CommodityId,
    ) -> Result<Self> {
        let qstr = 
            "INSERT INTO alr_splits
            (scaled_qty, scaled_value, reconcile, reconcile_date,
             post_date, account_id, payee_id, transaction_id,
             value_commodity_id)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *";
        let mut q: Vec<Self> = diesel::sql_query(qstr)
            .bind::<Integer, _>(scaled_qty as i32)
            .bind::<Integer, _>(scaled_value as i32)
            .bind::<Text, _>(match reconcile {
                ReconcileKind::NEW => "n",
                ReconcileKind::CLEARED => "c",
                ReconcileKind::RECONCILED => "r",
            })
            .bind::<Nullable<Date>, _>(&reconcile_date)
            .bind::<Date, _>(post_date)
            .bind::<Integer, _>(account_id)
            .bind::<Nullable<Integer>, _>(payee_id)
            .bind::<Integer, _>(transaction_id)
            .bind::<Integer, _>(value_commodity_id)
            .load(&db.0)?;
        q.pop().ok_or("Cannot insert new institution".into())
    }
}


pub struct SplitsList<'a> {
    dates: &'a dyn DateSet,
    scenario: &'a Scenario,
    occurrences: Occurrences,
}

pub struct SplitsListResult {
//    account_id: u32,
}

impl<'a> SplitsList<'a> {

    pub fn new(dates: &'a dyn DateSet) -> Self {
        SplitsList {
            dates,
            scenario: &NO_SCENARIO,
            occurrences: Occurrences::no_recurrence(),
        }
    }

    pub fn scenario(mut self, scenario: &'a Scenario) -> Self {
        self.scenario = scenario;
        self
    }

    /// Set the recurrence of the split
    pub fn occurrences(mut self, occurrences: Occurrences) -> Self {
        self.occurrences = occurrences;
        self
    }

}

impl<'a> Query for SplitsList<'a> {
    type Result = SplitsListResult;

    fn query(self) -> SQL {
        let dates_start = self.dates.get_start();
        let dates_end = self.dates.get_end();
        let maxo = self.occurrences.get_max_occurrences();
        let scenario = self.scenario;
        let non_recurring_splits = format!(
            "
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
                AND post_date <= '{dates_end}'"
        );

        if maxo > 0 {
            // overrides the post_date for the splits associated with a
            // recurring transaction
            SQL::new(
                vec![
                    CTE::new(
                        String::from("recurring_splits_and_transaction"),
                        format!(
                            "SELECT
                               t.id as transaction_id,
                               1 as occurrence,
                               s.id as split_id,
                               alr_next_event(
                                  t.scheduled, t.timestamp, t.last_occurrence)
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
                                  t.scheduled, t.timestamp, t.last_occurrence)
                                  as post_date
                            FROM alr_transactions t
                               JOIN alr_splits s ON (s.transaction_id = t.id)
                            WHERE t.scheduled IS NOT NULL
                               AND (t.scenario_id = {NO_SCENARIO}
                                    OR t.scenario_id = {scenario})

                            UNION SELECT
                             s.transaction_id,
                             s.occurrence + 1,
                             s.split_id,
                             alr_next_event(
                                s.scheduled, s.initial_timestamp, s.post_date),
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
                             alr_next_event(
                                s.scheduled, s.initial_timestamp, s.post_date)
                            FROM recurring_splits_and_transaction s
                            WHERE s.post_date IS NOT NULL
                              AND s.post_date <= '{dates_end}'
                              AND s.occurrence < {maxo}
                            ")
                    )
                ],

                format!(
                    "
                    SELECT * FROM recurring_splits_and_transaction
                       WHERE post_date IS NOT NULL
                         --  The last computed occurrence might be later
                         --  than expected  date
                         AND post_date <= '{dates_end}'

                         --  The next occurrence might be in the past if it
                         --  was never  acknowledged.
                         --   AND post_date >= '{dates_start}'
                    UNION {non_recurring_splits}
                    "
                )
            )
        } else {
            SQL::new(
                Vec::new(),
                non_recurring_splits,
            )
        }
    }
}


//fn test(dates: &dyn DateSet) {
//    let q = SplitsList::new(dates).scenario(&NO_SCENARIO).query();
//    let ctes_str =
//        q.ctes
//        .iter()
//        .map(|cte| cte.to_string())
//        .collect::<Vec<_>>()
//        .join(",");
//    let sql = q.sql;
//    let full = format!("WITH {ctes_str} {sql}");
//}
