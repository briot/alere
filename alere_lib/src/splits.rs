/// Compute the list of splits in a given time range, including the
/// recurrences of scheduled transactions.

use crate::accounts::Account;
use crate::commodities::Commodity;
use crate::connections::SqliteConnect;
use crate::dates::DateSet;
use crate::errors::Result;
use crate::models::{AccountId, CommodityId, PayeeId, SplitId, TransactionId};
use crate::occurrences::Occurrences;
use crate::payees::Payee;
use crate::query::{Query, SQL, CTE};
use crate::reconciliation::ReconcileKind;
use crate::scaling::scale_value;
use crate::scenarios::{Scenario, NO_SCENARIO};
use crate::schema::alr_splits;
use crate::transactions::Transaction;
use diesel::RunQueryDsl;
use diesel::sql_types::{Nullable, Integer, Timestamp, SmallInt, BigInt, Float};
use rust_decimal::Decimal;
use num_traits::ToPrimitive;


/// The various actions that can be performed on stocks.
/// Non-stock related splits will simply use None.

pub enum SplitStockAction {
    Buy = 0,
    Sell = 1,
    Dividend = 2,    // Also Yield or InterestIncome
    AddShares = 3,
    RemoveShares = 4,
    Split = 5,
    ReinvestDividend = 6,
}

impl std::fmt::Display for SplitStockAction {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            SplitStockAction::Buy              => write!(f, "Buy"),
            SplitStockAction::Sell             => write!(f, "Sell"),
            SplitStockAction::Dividend         => write!(f, "Dividend"),
            SplitStockAction::AddShares        => write!(f, "Add Shares"),
            SplitStockAction::RemoveShares     => write!(f, "Remove Shares"),
            SplitStockAction::Split            => write!(f, "Split"),
            SplitStockAction::ReinvestDividend => write!(f, "Reinvest Dividend"),
        }
    }
}



/// Parts of a transaction.
/// The sum for all splits in a balanced transaction must be 0.  However, it
/// is not possible in general to sum qty directly, since there might be
/// different commodities/currencies involved (see example of AAPL below).

#[derive(diesel::QueryableByName, diesel::Queryable,
         Debug, Default, serde::Serialize)]
#[table_name = "alr_splits"]
pub struct Split {
    pub id: SplitId,

    // The amount of the transaction, as seen on the bank statement.  This is
    // given in the account.commodity, scaled by account.commodity_scu.
    // This could be a number of shares when the account is a Stock account, for
    // instance, or a number of EUR for a checking account.
    pub scaled_qty: i64,

    // In the case of stock splits, the number of shares is multiplied by a
    // given ratio.
    pub ratio_qty: f32,

    // The amount of the transaction as made originally, expressed in
    // value_commodity (and scaled by value_commodity.price_scale)
    // This is potentially given in another currency or commodity.
    // The goal is to support multiple currencies transactions.
    // Here are various ways this value can be used:
    //
    // * a 1000 EUR transaction for an account in EUR. In this case, value is
    //   useless and does not provide any additional information.
    //       qty   = 1000 EUR  (scaled)
    //       value = 1000 EUR  (scaled)
    //
    // * an ATM operation of 100 USD for the same account in EUR while abroad.
    //   Exchange rate at the time: 0.85 EUR = 1 USD. Also assume there is a
    //   bank that applies.
    //      split1:  account=checking account value= -100 USD   qty= -85 EUR
    //               value_commodity=USD
    //               qty is as shown on your bank statement.
    //               value is the amount you actually withdrew.
    //      split2:  account=expense:cash     value= +84.7 EUR  qty= +84.7 EUR
    //               value_commodity=EUR
    //      split3:  account=expense:fees     value= +0.3 EUR   qty= +0.3 EUR
    //               value_commodity=EUR
    //   So value is used to show you exactly the amount you manipulated. The
    //   exchange rate can be computed from qty and value.
    //
    // * Buying 10 shares for AAPL at 120 USD. There are several splits here,
    //   one where we increase the number of shares in the STOCK account:
    //       split1: account=stock   value=1200 USD   qty=10 AAPL
    //
    //   The money came from an investment account in EUR, which has its own
    //   split for the same transaction:
    //       split2: account=investment   value=-1200 USD  qty=-1020 EUR
    pub scaled_value: i64,
    pub value_commodity_id: CommodityId,

    pub reconcile: ReconcileKind,
    pub reconcile_ts: Option<chrono::NaiveDateTime>,

    // When has the split impacted the account.
    // For instance, a transfer done on 2020-01-01 between accountA and accountB
    // could have:
    //   transaction timestamp:  2020-01-01
    //   post_date for accountA: 2020-01-01  (-x EUR)
    //   post_date for accountB: 2020-01-03  (+x EUR)
    //        (took a few days to be credited)
    // kmymoney and gnucash seem to have the same flexibility in their database,
    // but not take advantage of it in the user interface.
    pub post_ts: chrono::NaiveDateTime,

    pub account_id: AccountId,
    pub payee_id: Option<PayeeId>,
    pub transaction_id: TransactionId,
}

impl Split {

    // Create a new split with default values.
    // This is only created in memory, not in the database.

    pub fn new(
        transaction: &Transaction,
        account: &Account,
        qty: Decimal, // like on bank statement (e.g. number of shares or money)
        ratio_qty: Decimal,
        value: Decimal,  //  original amount of transaction
        value_commodity: &Commodity,
        post_ts: chrono::NaiveDateTime,
    ) -> Result<Self> {
        let scaled_qty = scale_value(Some(qty), account.commodity_scu)
            .ok_or_else(|| format!("Could not scale {}", qty))?;
        let scaled_value = scale_value(Some(value), value_commodity.price_scale)
            .ok_or_else(|| format!("Could not scale {}", value))?;

        Ok(Self {
            transaction_id: transaction.id,
            account_id: account.id,
            scaled_qty,
            ratio_qty: ratio_qty.to_f32().unwrap_or(1.0),
            scaled_value,
            value_commodity_id: value_commodity.id,
            post_ts,
            ..Default::default()
        })
    }

    // Set the reconciliation status

    pub fn set_reconcile(
        &mut self,
        reconcile: ReconcileKind,
        ts: Option<chrono::NaiveDateTime>,
    ) {
        self.reconcile = reconcile;
        self.reconcile_ts = ts;
    }

    // Set the payee

    pub fn set_payee(&mut self, payee: Option<&Payee>) {
        self.payee_id = payee.map(|p| p.id);
    }

    // Guess the action, based on various attributes

    pub fn get_action(&self) -> Option<SplitStockAction> {
        None
    }

    // Save the split in the database.

    pub fn save(
        &self,
        db: &SqliteConnect,
    ) -> Result<()> {
        let qstr = 
            "INSERT INTO alr_splits
            (scaled_qty, ratio_qty, scaled_value, reconcile, reconcile_ts,
             post_ts, account_id, payee_id, transaction_id,
             value_commodity_id)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        diesel::sql_query(qstr)
            .bind::<BigInt, _>(self.scaled_qty)
            .bind::<Float, _>(self.ratio_qty)
            .bind::<BigInt, _>(self.scaled_value)
            .bind::<SmallInt, _>(self.reconcile)
            .bind::<Nullable<Timestamp>, _>(&self.reconcile_ts)
            .bind::<Timestamp, _>(self.post_ts)
            .bind::<Integer, _>(self.account_id)
            .bind::<Nullable<Integer>, _>(self.payee_id)
            .bind::<Integer, _>(self.transaction_id)
            .bind::<Integer, _>(self.value_commodity_id)
            .execute(&db.0)?;
        Ok(())
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
                AND post_ts <= '{dates_end}'"
        );

        if maxo > 0 {
            // overrides the post_ts for the splits associated with a
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
                               s.ratio_qty,
                               s.scaled_value,
                               s.value_commodity_id,
                               s.reconcile,
                               s.payee_id,
                               alr_next_event(
                                  t.scheduled, t.timestamp, t.last_occurrence)
                                  as post_ts
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
                                s.scheduled, s.initial_timestamp, s.post_ts),
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
                             alr_next_event(
                                s.scheduled, s.initial_timestamp, s.post_ts)
                            FROM recurring_splits_and_transaction s
                            WHERE s.post_ts IS NOT NULL
                              AND s.post_ts <= '{dates_end}'
                              AND s.occurrence < {maxo}
                            ")
                    )
                ],

                format!(
                    "
                    SELECT * FROM recurring_splits_and_transaction
                       WHERE post_ts IS NOT NULL
                         --  The last computed occurrence might be later
                         --  than expected  date
                         AND post_ts <= '{dates_end}'

                         --  The next occurrence might be in the past if it
                         --  was never  acknowledged.
                         --   AND post_ts >= '{dates_start}'
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
