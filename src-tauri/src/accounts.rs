use alere_lib::models::{Account, AccountKind, Commodity, Institution};
use diesel::prelude::*;

#[derive(serde::Serialize)]
pub struct Accounts {
    accounts: Vec<Account>,
    commodities: Vec<Commodity>,
    kinds: Vec<AccountKind>,
    institutions: Vec<Institution>,
}

#[tauri::command]
pub async fn fetch_accounts() -> Accounts {
    use alere_lib::schema::alr_account_kinds::dsl::*;
    use alere_lib::schema::alr_accounts::dsl::*;
    use alere_lib::schema::alr_commodities::dsl::*;
    use alere_lib::schema::alr_institutions::dsl::*;

    let c = &super::connections::get_connection();

    Accounts {
        accounts: alr_accounts.load(c).expect("Error for accounts"),
        commodities: alr_commodities.load(c).expect("Error for commodities"),
        kinds: alr_account_kinds.load(c).expect("Error for kinds"),
        institutions: alr_institutions.load(c).expect("Error in institution"),
    }
}

pub mod commodity_kinds {
    pub const CURRENCY: &str = "C";
    pub const STOCK: &str = "S";
    pub const MUTUAL_FUND: &str = "M";
    pub const BOUND: &str = "B";
}

pub mod price_sources {
    pub const USER: i32 = 1;
    pub const YAHOO: i32 = 2;
    pub const TRANSACTION: i32 = 3;
}


#[derive(Clone, Copy)]
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
