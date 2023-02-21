use chrono::{NaiveDate, NaiveDateTime};
use crate::connections::SqliteConnect;
use crate::errors::Result;
use crate::models::{
    AccountId, AccountKindId, CommodityId, InstitutionId, ScalingFactor};
use diesel::RunQueryDsl;
use diesel::sql_types::{Integer, Nullable, Text, Date, Bool, Timestamp};
use crate::schema::alr_accounts;

const NOT_SAVED: AccountId = -1;

/// An account is used for user bank accounts, portfolios,... but also
/// to represent third-party accounts and income/expense categories.
///
/// Tracking investment is a bit more complicated: you will generally have one
/// or more portfolio/investment accounts, like one per broker or institution.
/// But you also need one Stock account for each security you are trading (so
/// for instance buying AAPL is not tracked directly in the investment account,
/// but inside a Stock account which you could also name 'AAPL'.

#[derive(diesel::Queryable,
         diesel::QueryableByName,
         Debug,
         serde::Serialize)]
#[table_name = "alr_accounts"]
pub struct Account {
    pub id: AccountId,
    pub name: String,    //  Short name as displayed to users
    pub description: Option<String>,

    // Only for actual IBAN, not free-form
    pub iban: Option<String>,

    // Any code used by the bank to identify the account
    pub number: Option<String>,

    pub closed: bool,

    // The Smallest Currency Unit for the commodity, in this account. This is
    // provided as a scaling factor: 100 => 0.01 precision.
    //
    // For instance, a EUR checking account will typically have two decimal
    // digits precision, so the commodity_scu is "100". But a broker like
    // Kraken, when trading Bitcoin, uses 0.0001 precision or less, so the
    // commodity_scu is set to 10000.
    //
    // This defaults to the commoditie's price_scale when the account is
    // created, and should only be changed carefully afterwards, since that
    // requires changing all stored prices.
    pub commodity_scu: ScalingFactor,

    // When has the user last reconciled this account with the bank statements
    pub last_reconciled: Option<NaiveDateTime>,

    // When was the account opened
    pub opening_date: Option<NaiveDate>,

    // What is the unit for prices ? This will most often be a currency like
    // "EUR", but for stock accounts it would be the name of the stock like
    // "AAPL". An account has all its operations written in that currency. It is
    // possible that you paid something abroad in a different currency, but the
    // bank has then done a conversion and ultimately invoiced you in EUR.
    pub commodity_id: CommodityId,

    pub institution_id: Option<InstitutionId>,
    pub kind_id: AccountKindId,
    pub parent_id: Option<AccountId>,

    // ??? Could we use
    // parent: Option<RefCell<Weak<Account>>>,
    // children: RefCell<Vec<Rc<Account>>>,

    // ??? interest_rate  (though this should be date-dependent)
    // ??? last_modified  (for account data themselves)
    // ??? hidden         (in gnucash, is this similar to closed)

    // ??? placeholder    (in gnucash)
    // When an account is a place holder, it is made read-only in the GUI and
    // doesn't accept transactions.

    // ??? book
    // if we want to store multiple books (for multiple users, or for separate
    // entities), an account should be associated with a specific user (then
    // all transactions in that account are also for the same user)
}

pub struct AccountConfig<'a> {
    pub name: &'a str,
    pub commodity_scu: i32,
    pub commodity_id: CommodityId,
    pub kind_id: AccountKindId,
    pub description: Option<&'a str>,
    pub iban: Option<&'a str>,
    pub number: Option<&'a str>,
    pub last_reconciled: Option<NaiveDateTime>,
    pub opening_date: Option<NaiveDate>,
    pub institution_id: Option<InstitutionId>,
    pub parent_id: Option<AccountId>,
    pub closed: bool,
}

impl Account {

    /// Create a new account. This is only in memory, and the account is
    /// not saved in the database.

    pub fn new(config: AccountConfig) -> Self {
        Self {
            id: NOT_SAVED,
            name: config.name.into(),
            description: config.description.map(str::to_string),
            closed: config.closed,
            iban: config.iban.map(str::to_string),
            number: config.number.map(str::to_string),
            commodity_id: config.commodity_id,
            commodity_scu: config.commodity_scu,
            last_reconciled: config.last_reconciled,
            opening_date: config.opening_date,
            institution_id: config.institution_id,
            kind_id: config.kind_id,
            parent_id: config.parent_id,
        }
    }

    /// Lookup a company by id

    pub fn lookup(&self, db: &SqliteConnect, id: AccountId) -> Result<Self> {
        let s = "SELECT * FROM alr_accounts WHERE id=?";
        let mut q = diesel::sql_query(s)
            .bind::<Integer, _>(id)
            .load::<Account>(&db.0)?;
        q.pop().ok_or_else(|| "Cannot insert new institution".into())
    }

    /// Save (or update) the account in the database

    pub fn save(&mut self, db: &SqliteConnect) -> Result<()> {
        let s = match self.id {
            NOT_SAVED =>
                "INSERT INTO alr_accounts
                 (name, description, iban, number, closed, commodity_scu,
                  last_reconciled, opening_date, commodity_id,
                  institution_id, kind_id, parent_id)
                 VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 RETURNING *",
            _ =>
                "UPDATE alr_accounts \
                SET name=?, description=?, iban=?, number=?, closed=?, \
                commodity_scu=?, last_reconciled=?, opening_date=?, \
                commodity_id=?, institution_id=?, kind_id=?, parent_id=? \
                WHERE id=?",
        };
        let q = diesel::sql_query(s)
            .bind::<Text, _>(&self.name)
            .bind::<Nullable<Text>, _>(&self.description)
            .bind::<Nullable<Text>, _>(&self.iban)
            .bind::<Nullable<Text>, _>(&self.number)
            .bind::<Bool, _>(&self.closed)
            .bind::<Integer, _>(&self.commodity_scu)
            .bind::<Nullable<Timestamp>, _>(&self.last_reconciled)
            .bind::<Nullable<Date>, _>(&self.opening_date)
            .bind::<Integer, _>(&self.commodity_id)
            .bind::<Nullable<Integer>, _>(&self.institution_id)
            .bind::<Integer, _>(&self.kind_id)
            .bind::<Nullable<Integer>, _>(&self.parent_id);

        match self.id {
            NOT_SAVED => {
                let v = q.get_result::<Account>(&db.0)?;
                self.id = v.id;
            },
            _ => {
                q.bind::<Integer, _>(&self.id).execute(&db.0)?;
            },
        };
        Ok(())
    }
}
