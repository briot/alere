use crate::cte_accounts::{
    cte_transactions_for_accounts, CTE_TRANSACTIONS_FOR_ACCOUNTS};
use crate::cte_list_splits::{
    cte_list_splits, cte_splits_with_values, CTE_SPLITS_WITH_VALUE};
use crate::dates::{DateSet, DateValues, MIDNIGHT};
use crate::models::{AccountId, CommodityId};
use crate::occurrences::Occurrences;
use crate::connections::SqliteConnect;
use crate::scenarios::NO_SCENARIO;
use chrono::{DateTime, NaiveDate, TimeZone, Utc, NaiveDateTime};
use diesel::sql_types::{Bool, Date, Float, Integer, Nullable, Text};
use serde::Serialize;
use log::info;

#[derive(Serialize, Clone, Debug)]
pub struct SplitDescr {
    account_id: AccountId,
    post_date: DateTime<Utc>,
    amount: f32,
    currency: CommodityId,
    reconcile: char,
    shares: f32,
    price: f32,
    payee: String,
}

type TransactionId = i32;

#[derive(Serialize, Clone, Debug)]
pub struct TransactionDescr {
    id: TransactionId,
    occurrence: i32,
    date: DateTime<Utc>,
    balance: f32,
    balance_shares: f32,
    memo: String,
    check_number: String,
    is_recurring: bool,
    splits: Vec<SplitDescr>,
}

#[derive(QueryableByName)]
struct SplitRow {
    #[sql_type = "Integer"]
    transaction_id: TransactionId,

    #[sql_type = "Integer"]
    occurrence: i32,

    #[sql_type = "Date"]
    timestamp: NaiveDate,

    #[sql_type = "Nullable<Text>"]
    memo: Option<String>,

    #[sql_type = "Nullable<Text>"]
    check_number: Option<String>,

    #[sql_type = "Float"]
    scaled_qty: f32,

    #[sql_type = "Float"]
    commodity_scu: f32,

    #[sql_type = "Nullable<Float>"]
    computed_price: Option<f32>,

    #[sql_type = "Integer"]
    account_id: AccountId,

    #[sql_type = "Date"]
    post_date: NaiveDate,

    #[sql_type = "Float"]
    value: f32,

    #[sql_type = "Integer"]
    value_commodity_id: CommodityId,

    #[sql_type = "Text"]
    reconcile: String,

    #[sql_type = "Nullable<Bool>"]
    scheduled: Option<bool>,

    #[sql_type = "Nullable<Text>"]
    payee: Option<String>,

    #[sql_type = "Float"]
    scaled_qty_balance: f32,
}

/// Return the ledger information.
/// This takes into account whether the user wants to see scheduled
/// transactions or not, the current scenario,...
///
/// :param account_ids:
///     Can be used to restrict the output to those transactions that
///     impact those accounts (all splits of the transactions are still
///     returned, even those that are not for one of the accounts.
/// :param max_scheduled_occurrences:
///     if 0, ignore all scheduled transactions.
///     if 1, only look at the next occurrence of them.

pub fn ledger(
    connection: SqliteConnect,
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    accountids: Vec<AccountId>,
    occurrences: u16,
) -> Vec<TransactionDescr> {
    info!(
        "ledger {mindate} {maxdate} {:?} {:?}",
        accountids, occurrences
    );
    let occ = Occurrences::new(occurrences);
    let dates = DateValues::new(Some(vec![
        mindate.date_naive(),
        maxdate.date_naive()
    ]));
    let (filter_acct_cte, filter_acct_from) = match accountids.len() {
        0 => ("".to_string(), "".to_string()),
        _ => {
            let acc = cte_transactions_for_accounts(&accountids);
            (
                format!(", {acc}"),
                format!(
                    " JOIN {CTE_TRANSACTIONS_FOR_ACCOUNTS} t \
                 USING (transaction_id)"
                ),
            )
        }
    };
    let ref_id: AccountId = match accountids.len() {
        1 => *accountids.first().unwrap(),
        _ => -1,
    };

    let list_splits = cte_list_splits(
        &dates.unbounded_start(), // from start to get balance right
        NO_SCENARIO,
        &occ,
    );
    let with_values = cte_splits_with_values();
    let dates_start = dates.get_start();
    let query = format!(
        " \
       WITH RECURSIVE {list_splits}  \
       , {with_values}
       {filter_acct_cte}
       , all_splits_since_epoch AS (
          SELECT
             s.transaction_id,
             s.occurrence,
             strftime('%Y-%m-%d', s.timestamp) AS timestamp,
             s.memo AS memo,
             s.check_number AS check_number,
             s.scaled_qty,
             a.commodity_scu,
             s.computed_price,
             s.account_id,
             strftime('%Y-%m-%d', s.post_date) AS post_date,
             s.value,
             s.value_commodity_id,
             s.reconcile,
             s.scheduled,
             p.name AS payee,
             sum(s.scaled_qty)
                OVER (PARTITION BY s.account_id
                      ORDER BY s.timestamp, s.transaction_id, s.post_date
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                AS scaled_qty_balance
          FROM {CTE_SPLITS_WITH_VALUE} s
             {filter_acct_from}
             JOIN alr_accounts a ON (s.account_id = a.id)
             LEFT JOIN alr_payees p ON (s.payee_id = p.id)
       )
       SELECT s.*
       FROM all_splits_since_epoch s
       WHERE s.post_date >= '{dates_start}'

         --  Always include non-validated occurrences of recurring
         --  transactions.
         OR s.scheduled IS NOT NULL
       ORDER BY s.timestamp, s.transaction_id
       "
    );

    let rows = connection.exec::<SplitRow>("ledger", &query);
    match rows {
        Ok(r) => {
            let mut result: Vec<TransactionDescr> = vec![];
            for split in r {
                let need_new = result.is_empty()
                    || result.last().unwrap().id != split.transaction_id
                    || result.last().unwrap().occurrence != split.occurrence;
                if need_new {
                    result.push(TransactionDescr {
                        id: split.transaction_id,
                        occurrence: split.occurrence,
                        date:
                            Utc
                            .from_utc_datetime(
                                &NaiveDateTime::new(
                                    split.timestamp,
                                    *MIDNIGHT
                                )
                            ),
                        balance: 0.0,
                        balance_shares: 0.0,
                        memo: split.memo.unwrap_or_else(|| "".to_string()),
                        check_number: split.check_number
                            .unwrap_or_else(|| "".to_string()),
                        is_recurring: split.scheduled.unwrap_or(false),
                        splits: vec![],
                    });
                }

                let mut r = result.last_mut().unwrap();

                if split.account_id == ref_id {
                    r.balance_shares += split.scaled_qty_balance / split.commodity_scu;
                    r.balance = r.balance_shares * split.computed_price.unwrap_or(std::f32::NAN);
                }

                r.splits.push(SplitDescr {
                    account_id: split.account_id,
                    post_date:
                        Utc
                        .from_utc_datetime(
                            &NaiveDateTime::new(
                                split.post_date,
                                *MIDNIGHT
                            )
                        ),
                    amount: split.value,
                    currency: split.value_commodity_id,
                    reconcile: split.reconcile.chars().next().unwrap(),
                    shares: split.scaled_qty / split.commodity_scu,
                    price: split.computed_price.unwrap_or(std::f32::NAN),
                    payee: split.payee.unwrap_or_else(|| "".to_string()),
                });
            }
            result
        }
        Err(_) => vec![],
    }
}
