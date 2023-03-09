use crate::errors::AlrResult;
use crate::models::{AccountId, CommodityId};
use crate::occurrences::Occurrences;
use crate::connections::SqliteConnect;
use crate::reconciliation::ReconcileKind;
use chrono::{DateTime, TimeZone, Utc, NaiveDateTime};
use diesel::sql_types::{
    Bool, Float, Integer, Nullable, Text, SmallInt, Timestamp};
use serde::Serialize;
use log::info;

#[derive(Serialize, Clone, Debug)]
pub struct SplitDescr {
    account_id: AccountId,
    post_ts: DateTime<Utc>,
    amount: f32,
    currency: CommodityId,
    reconcile: String,
    shares: f32,
    ratio: f32,
    price: f32,
    payee: String,
}

type TransactionId = i32;

#[derive(Serialize, Clone, Debug)]
pub struct TransactionDescr {
    id: TransactionId,
    occurrence: i32,
    date: DateTime<Utc>,
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

    #[sql_type = "Timestamp"]
    timestamp: NaiveDateTime,

    #[sql_type = "Nullable<Text>"]
    memo: Option<String>,

    #[sql_type = "Nullable<Text>"]
    check_number: Option<String>,

    #[sql_type = "Float"]
    qty: f32,

    #[sql_type = "Float"]
    ratio_qty: f32,

    #[sql_type = "Nullable<Float>"]
    computed_price: Option<f32>,

    #[sql_type = "Integer"]
    account_id: AccountId,

    #[sql_type = "Timestamp"]
    post_ts: NaiveDateTime,

    #[sql_type = "Float"]
    value: f32,

    #[sql_type = "Integer"]
    value_commodity_id: CommodityId,

    #[sql_type = "SmallInt"]
    reconcile: ReconcileKind,

    #[sql_type = "Nullable<Bool>"]
    scheduled: Option<bool>,

    #[sql_type = "Nullable<Text>"]
    payee: Option<String>,

    #[sql_type = "Float"]
    qty_balance: f32,
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
    min_ts: DateTime<Utc>,
    max_ts: DateTime<Utc>,
    accountids: Vec<AccountId>,
    occurrences: u16,
) -> AlrResult<Vec<TransactionDescr>> {
    info!(
        "ledger {min_ts} {max_ts} {:?} {:?}",
        accountids, occurrences
    );
    let _occ = Occurrences::new(occurrences);
    let filter_acct = match accountids.len() {
        0 => "".to_string(),
        _ => {
           let s: Vec<String> = accountids.iter().map(|&id| id.to_string()).collect();
           let ids = s.join(",");
           format!(" AND b.account_id IN ({ids})")
        }
    };
    let query = format!(
        "SELECT \
           s.transaction_id, \
           1 AS occurrence, \
           t.timestamp, \
           t.memo, \
           t.check_number, \
           s.scaled_qty / a.commodity_scu AS qty, \
           s.ratio_qty, \
           CAST(s.scaled_value * a.commodity_scu AS FLOAT) \
              / (s.scaled_qty * c.price_scale) \
              AS computed_price, \
           s.account_id, \
           s.post_ts, \
           CAST(s.scaled_value AS FLOAT) / c.price_scale AS value, \
           s.value_commodity_id, \
           s.reconcile, \
           t.scheduled, \
           p.name AS payee, \
           b.scaled_balance / a.commodity_scu AS qty_balance
        FROM alr_balances b \
           JOIN alr_splits s USING (transaction_id) \
           JOIN alr_transactions t ON (s.transaction_id = t.id) \
           JOIN alr_accounts a ON (s.account_id = a.id) \
           JOIN alr_commodities c ON (s.value_commodity_id = c.id) \
           LEFT JOIN alr_payees p ON (s.payee_id = p.id) \
        WHERE b.post_ts >= '{min_ts}' \
        AND b.post_ts < '{max_ts}' \
        {filter_acct} \
        ORDER BY t.timestamp, transaction_id"
    );

    let r = connection.exec::<SplitRow>("ledger", &query)?;
    let mut result: Vec<TransactionDescr> = vec![];
    for split in r {
        let need_new = result.is_empty()
            || result.last().unwrap().id != split.transaction_id
            || result.last().unwrap().occurrence != split.occurrence;
        if need_new {
            result.push(TransactionDescr {
                id: split.transaction_id,
                occurrence: split.occurrence,
                date: Utc.from_utc_datetime(&split.timestamp),
                balance_shares: split.qty_balance,
                memo: split.memo.unwrap_or_default(),
                check_number: split.check_number.unwrap_or_default(),
                is_recurring: split.scheduled.unwrap_or(false),
                splits: vec![],
            });
        }

        if let Some(tr) = result.last_mut() {
            tr.splits.push(SplitDescr {
                account_id: split.account_id,
                post_ts: Utc.from_utc_datetime(&split.post_ts),
                amount: split.value,
                currency: split.value_commodity_id,
                reconcile: format!("{}", split.reconcile),
                shares: split.qty,
                ratio: split.ratio_qty,
                price: split.computed_price.unwrap_or(std::f32::NAN),
                payee: split.payee.unwrap_or_default(),
            });
        }
    }
    Ok(result)
}
