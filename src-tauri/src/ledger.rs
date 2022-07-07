use chrono::{Utc, DateTime, NaiveDate, TimeZone};
use diesel::sql_types::{Integer, Float, Bool, Text, Date};
use serde::Serialize;
use super::dates::{DateSet, DateValues};
use super::models::{AccountId, CommodityId};
use super::occurrences::Occurrences;
use super::cte_list_splits::{
    cte_list_splits, cte_splits_with_values, CTE_SPLITS_WITH_VALUE};
use super::cte_accounts::{
    cte_transactions_for_accounts, CTE_TRANSACTIONS_FOR_ACCOUNTS};

#[derive(Serialize, Clone, Debug)]
pub struct SplitDescr {
    account_id: AccountId,
    post_date: DateTime<Utc>,
    amount: f32,
    currency: CommodityId,
    reconcile: bool,
    shares: f32,
    price: f32,
    payee: Option<String>,
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

    #[sql_type = "Text"]
    memo: String,

    #[sql_type = "Text"]
    check_number: String,

    #[sql_type = "Float"]
    scaled_qty: f32,

    #[sql_type = "Float"]
    commodity_scu: f32,

    #[sql_type = "Float"]
    computed_price: f32,

    #[sql_type = "Integer"]
    account_id: AccountId,

    #[sql_type = "Date"]
    post_date: NaiveDate,

    #[sql_type = "Float"]
    value: f32,

    #[sql_type = "Integer"]
    value_commodity_id: CommodityId,

    #[sql_type = "Bool"]
    reconcile: bool,

    #[sql_type = "Bool"]
    scheduled: bool,

    #[sql_type = "Text"]
    payee: String,

    #[sql_type = "Integer"]
    scaled_qty_balance: i32,
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

#[tauri::command]
pub fn ledger(
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    account_ids: Option<Vec<AccountId>>,
    max_scheduled_occurrences: Occurrences,
) -> Vec<TransactionDescr> {
    let dates = DateValues::new(Some(vec![mindate.date(), maxdate.date()]));
    dbg!("ledger", &mindate, &maxdate);
    let filter_account_cte = match &account_ids {
        Some(ids) => {
            let acc = cte_transactions_for_accounts(&ids);
            format!(", {acc}")
        },
        None => "".to_string(),
    };
    let filter_account_from = match &account_ids {
        Some(_) => format!(
            " JOIN {CTE_TRANSACTIONS_FOR_ACCOUNTS} t \
             USING (transaction_id)"),
        None => "".to_string(),
    };
    let list_splits = cte_list_splits(
        &dates.unbounded_start(),   // from start to get balance right
        super::scenarios::NO_SCENARIO,
        Occurrences::No_Recurrence(),
    );
    let with_values = cte_splits_with_values();
    let dates_start = dates.get_start();
    let query = format!(" \
       WITH RECURSIVE {list_splits}  \
       , {with_values}
       {filter_account_cte}
       , all_splits_since_epoch AS (
          SELECT
             s.transaction_id,
             s.occurrence,
             s.timestamp,
             s.memo,
             s.check_number,
             s.scaled_qty,
             a.commodity_scu,
             s.computed_price,
             s.account_id,
             s.post_date,
             s.value,
             s.value_commodity_id,
             s.reconcile,
             s.scheduled,
             p.name,
             sum(s.scaled_qty)
                OVER (PARTITION BY s.account_id
                      ORDER BY s.timestamp, s.transaction_id, s.post_date
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                AS scaled_qty_balance
          FROM {CTE_SPLITS_WITH_VALUE} s
             {filter_account_from}
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
       ");

    let rows = super::connections::execute_and_log::<SplitRow>(&query);
    match rows {
        Ok(r) => {
            dbg!(r.len());  //  MANU
            let mut result: Vec<TransactionDescr> = vec![];
            for split in r {
                let need_new =
                    result.len() == 0
                    || result.last().unwrap().id != split.transaction_id
                    || result.last().unwrap().occurrence != split.occurrence;
                if need_new {
                    result.push(TransactionDescr {
                        id: split.transaction_id,
                        occurrence: split.occurrence,
                        date: Utc.from_utc_date(&split.timestamp)
                            .and_hms(0, 0, 0),
                        balance: 0.0,
                        balance_shares: 0.0,
                        memo: split.memo,
                        check_number: split.check_number,
                        is_recurring: split.scheduled,
                        splits: vec![],
                    });
                }

                result.last_mut().unwrap().splits.push(SplitDescr {
                    account_id: split.account_id,
                    post_date: Utc.from_utc_date(&split.post_date)
                        .and_hms(0, 0, 0),
                    amount: split.value,
                    currency: split.value_commodity_id,
                    reconcile: split.reconcile,
                    shares: split.scaled_qty / split.commodity_scu,
                    price: split.computed_price,
                    payee: Some(split.payee),
                });
            }
            dbg!(&result); //  MANU
            result
        },
        Err(e) => {
            print!("ledger: error processing query {:?}\n", e);
            vec![]
        }
    }
}
