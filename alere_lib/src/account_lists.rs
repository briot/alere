use crate::account_kinds::AccountKind;
use crate::accounts::Account;
use crate::commodities::Commodity;
use crate::connections::SqliteConnect;
use crate::errors::AlrResult;
use crate::institutions::Institution;
use diesel::prelude::*;

#[derive(serde::Serialize)]
pub struct Accounts {
    accounts: Vec<Account>,
    commodities: Vec<Commodity>,
    kinds: Vec<AccountKind>,
    institutions: Vec<Institution>,
}

pub fn fetch_accounts(mut connection: SqliteConnect) -> AlrResult<Accounts> {
    use crate::schema::alr_account_kinds::dsl::*;
    use crate::schema::alr_accounts::dsl::*;
    use crate::schema::alr_commodities::dsl::*;
    use crate::schema::alr_institutions::dsl::*;

    Ok(Accounts {
        accounts: alr_accounts.load(&mut connection.0)?,
        commodities: alr_commodities.load(&mut connection.0)?,
        kinds: alr_account_kinds.load(&mut connection.0)?,
        institutions: alr_institutions.load(&mut connection.0)?,
    })
}

pub mod price_sources {
    pub const USER: i32 = 1;
    pub const YAHOO: i32 = 2;
    pub const TRANSACTION: i32 = 3;
}
