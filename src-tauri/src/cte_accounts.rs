use super::cte_list_splits::CTE_SPLITS;
use super::models::AccountId;

pub const CTE_TRANSACTIONS_FOR_ACCOUNTS: &str = "cte_tr_account";

/// The list of transactions for which one of the splits is about one of
/// the accounts.
/// Requires CTE_SPLITS

pub fn cte_transactions_for_accounts(account_ids: &[AccountId]) -> String {
    let s: Vec<String> = account_ids.iter().map(|&id| id.to_string()).collect();
    let ids = s.join(",");
    format!(
        "{CTE_TRANSACTIONS_FOR_ACCOUNTS} AS ( \
        SELECT DISTINCT transaction_id \
        FROM {CTE_SPLITS} s \
        WHERE s.account_id IN ({ids}))"
    )
}
