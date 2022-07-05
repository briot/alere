#[derive(serde::Serialize)]
pub struct Accounts {
    accounts: Vec<i32>,
    commodities: Vec<i32>,
    kinds: Vec<i32>,
    institutions: Vec<i32>,
}

#[tauri::command]
pub fn fetch_accounts() -> Accounts {
    Accounts{
        accounts: vec!(),
        commodities: vec!(),
        kinds: vec!(),
        institutions: vec!(),
    }
}


pub enum AccountKindCategory {
    EXPENSE = 0,
    INCOME = 1,
    // Used for categories
    // It is possible for the amount of a transaction to be either positive or
    // negative. For instance, buying food is an expense, but if you get
    // reimbursed for one of your purchases, you would still store that
    // reimbursement as an EXPENSE, although with a positive value.

    EQUITY = 2,
    LIABILITY = 4,
    // Used for user account. Indicates money owned or money due.

    ASSET = 3,
    // For accounts that are blocked until a certain date, or for real-estate
    // and other goods that take a long time to sell like a car, that you want
    // to track.
}
