use crate::accounts::Account;
use crate::commodities::Commodity;
use crate::errors::AlrResult;
use crate::institutions::Institution;
use crate::account_kinds::AccountKind;
use crate::connections::SqliteConnect;
use diesel::prelude::*;

#[derive(serde::Serialize)]
pub struct Accounts {
    accounts: Vec<Account>,
    commodities: Vec<Commodity>,
    kinds: Vec<AccountKind>,
    institutions: Vec<Institution>,
}

pub fn fetch_accounts(connection: SqliteConnect) -> AlrResult<Accounts> {
    use crate::schema::alr_account_kinds::dsl::*;
    use crate::schema::alr_accounts::dsl::*;
    use crate::schema::alr_commodities::dsl::*;
    use crate::schema::alr_institutions::dsl::*;

    Ok(Accounts {
        accounts: alr_accounts.load(&connection.0)?,
        commodities: alr_commodities.load(&connection.0)?,
        kinds: alr_account_kinds.load(&connection.0)?,
        institutions: alr_institutions.load(&connection.0)?,
    })
}

pub mod price_sources {
    pub const USER: i32 = 1;
    pub const YAHOO: i32 = 2;
    pub const TRANSACTION: i32 = 3;
}
