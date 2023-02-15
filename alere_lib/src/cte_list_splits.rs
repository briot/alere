use crate::dates::DateSet;
use crate::occurrences::Occurrences;
use crate::scenarios::{Scenario, NO_SCENARIO};

pub const CTE_SPLITS: &str = "cte_splits";
pub const CTE_SPLITS_WITH_VALUE: &str = "cte_splits_value";

/// A common table expression that returns all splits to consider in the
/// given time range, including the recurrences of scheduled transactions.

pub fn cte_list_splits(
    dates: &dyn DateSet,
    scenario: Scenario,
    max_scheduled_occurrences: &Occurrences,
) -> String {
    let dates_start = dates.get_start();
    let dates_end = dates.get_end();
    let maxo = max_scheduled_occurrences.get_max_occurrences();

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
           s.ratio_qty,
           s.scaled_value,
           s.value_commodity_id,
           s.reconcile,
           s.payee_id,
           s.post_ts
        FROM alr_transactions t
           JOIN alr_splits s ON (s.transaction_id = t.id)
        WHERE t.scheduled IS NULL
            AND (t.scenario_id = {NO_SCENARIO}
                 OR t.scenario_id = {scenario})
            AND post_ts >= '{dates_start}'
            AND post_ts <= '{dates_end}'
    "
    );

    if maxo > 0 {
        // overrides the post_ts for the splits associated with a
        // recurring transaction
        "recurring_splits_and_transaction AS (
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
               s.ratio_qty,
               s.scaled_value,
               s.value_commodity_id,
               s.reconcile,
               s.payee_id,
               alr_next_event(
                   t.scheduled, t.timestamp, t.last_occurrence) as post_ts
            FROM alr_transactions t
               JOIN alr_splits s ON (s.transaction_id = t.id)
            WHERE t.scheduled IS NOT NULL
               AND (t.scenario_id = {NO_SCENARIO}
                    OR t.scenario_id = {scenario})

            UNION SELECT
               s.transaction_id,
               s.occurrence + 1,
               s.split_id,
               alr_next_event(s.scheduled, s.initial_timestamp, s.post_ts),
               s.initial_timestamp,
               s.scheduled,
               s.scenario_id,
               s.check_number,
               s.memo,
               s.account_id,
               s.scaled_qty,
               s.ratio_qty,
               s.scaled_value,
               s.value_commodity_id,
               s.reconcile,
               s.payee_id,
               alr_next_event(s.scheduled, s.initial_timestamp, s.post_ts)
            FROM recurring_splits_and_transaction s
            WHERE s.post_ts IS NOT NULL
              AND s.post_ts <= '{dates_end}'
              AND s.occurrence < {maxo}
        ), {CTE_SPLITS} AS (
           SELECT * FROM recurring_splits_and_transaction
              WHERE post_ts IS NOT NULL
                --  The last computed occurrence might be later than expected
                --  date
                AND post_ts <= '{dates_end}'

                --  The next occurrence might be in the past if it was never
                --  acknowledged.
                --   AND post_ts >= '{dates_start}'
           UNION {non_recurring_splits}
        )".into()
    } else {
        format!("{CTE_SPLITS} AS ({non_recurring_splits})")
    }
}

/// Returns all splits and their associated value, scaled as needed.
/// Requires cte_list_splits

pub fn cte_splits_with_values() -> String {
    format!(
        "
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
    "
    )
}
