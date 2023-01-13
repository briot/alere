/// Compute the list of splits in a given time range, including the
/// recurrences of scheduled transactions.

use crate::query::{Query, SQL, CTE};
use crate::dates::DateSet;
use crate::scenarios::{Scenario, NO_SCENARIO};
use crate::occurrences::Occurrences;

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
