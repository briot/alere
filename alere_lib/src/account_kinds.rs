use crate::connections::SqliteConnect;
use crate::errors::AlrResult;
use crate::models::AccountKindId;
use diesel::{sql_query, RunQueryDsl};
use diesel::backend::Backend;
use diesel::deserialize::FromSql;
use diesel::serialize::{ToSql, Output};
use diesel::sql_types::{Bool, Text, Integer};
use crate::schema::alr_account_kinds;


/// A general categorization for account kinds.
/// These broadly match how we present things in the GUI, though the actual
/// accounts have finer grained flags

#[derive(Clone, Copy, Debug, serde::Serialize,
    FromSqlRow,     // So that struct containing this can be Queryable
    //AsExpression,
    FromPrimitive   // from num-derive crate, convert from i32 to this enum
  )]
#[repr(i32)]
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

impl<DB> FromSql<Integer, DB> for AccountKindCategory
    where DB: Backend,
          i32: FromSql<Integer, DB>
{
    fn from_sql(
        bytes: Option<&DB::RawValue>
    ) -> diesel::deserialize::Result<AccountKindCategory> {
        let r: i32 = i32::from_sql(bytes)?;
        match num::FromPrimitive::from_i32(r) {
            Some(v) => Ok(v),
            None    => Err(
                format!("Cannot convert {} to AccountKindCategory", r)
                .into())
        }
    }
}

impl<DB> ToSql<Integer, DB> for AccountKindCategory
where
    DB: Backend,
    i32: ToSql<Integer, DB>,
{
    fn to_sql<W: std::io::Write>(
        &self, out: &mut Output<W, DB>
    ) -> diesel::serialize::Result {
        (*self as i32).to_sql(out)
    }
}

/// Fine-grained properties for accounts. Thanks to these flags, we can make
/// various computations.

#[derive(Debug, serde::Serialize,
         diesel::Queryable, diesel::QueryableByName)]
#[table_name = "alr_account_kinds"]
pub struct AccountKind {
    pub id: AccountKindId,

    // The name used for display purposes only
    pub name: String,

    // credit / increase / ...
    pub name_when_positive: String,

    // debit / decrease / ...
    pub name_when_negative: String,

    pub category: AccountKindCategory,

    //-------------------------
    // Expenses and income

    // Whether this is an income category resulting from work activities, which
    // would disappear if you stopped working. This includes salary,
    // unemployment,...
    pub is_work_income: bool,

    // Whether this is an income category not resulting from work activities,
    // like dividends, rents,...
    pub is_passive_income: bool,

    // Whether this is a potential income or expense, i.e. the amount might
    // change later. This includes stock price changes, real-estate until you
    // actually sell, and so on. This is the result of your assets' value
    // changing over time.
    // When this is False, some money was actually transferred from/to one of
    // your accounts.
    pub is_unrealized: bool,

    //---------------------------
    // Networth

    /// True for all accounts used to compute the networth.
    /// It should be False for categories in general.
    pub is_networth: bool,

    //---------------------------
    // Investments

    // Whether the account should be displayed in the Investment and Performance
    // views.
    pub is_trading: bool,

    // An account used to trade one security
    pub is_stock: bool,

    //------------------------------
    // Taxes

    // Whether this category is part of your income taxes. This is used in the
    // metrics view to compute the actual tax rate.
    pub is_income_tax: bool,

    // Whether this should count as taxes, other than income taxes
    pub is_misc_tax: bool,
}


/// We want to avoid duplicating account kinds in the database (though it would
/// not matter for the queries, it is better for user convenience).

#[derive(Debug)]
pub struct AccountKindManager {
    name: &'static str,
    category: AccountKindCategory,
    is_income_tax: bool,
    is_misc_tax: bool,
    is_networth: bool,
    is_passive_income: bool,
    is_stock: bool,
    is_trading: bool,
    is_unrealized: bool,
    is_work_income: bool,
}

impl AccountKindManager {
    pub fn new(name: &'static str, category: AccountKindCategory) -> Self {
        Self {
            name,
            category,
            is_income_tax: false,
            is_misc_tax: false,
            is_networth: false,
            is_passive_income: false,
            is_stock: false,
            is_trading: false,
            is_unrealized: false,
            is_work_income: false,
        }
    }

    pub fn is_income_tax(self, val: bool) -> Self {
        Self { is_income_tax: val, ..self }
    }
    pub fn is_misc_tax(self, val: bool) -> Self {
        Self { is_misc_tax: val, ..self }
    }
    pub fn is_networth(self, val: bool) -> Self {
        Self { is_networth: val, ..self }
    }
    pub fn is_passive_income(self, val: bool) -> Self {
        Self { is_passive_income: val, ..self }
    }
    pub fn is_stock(self, val: bool) -> Self {
        Self { is_stock: val, ..self }
    }
    pub fn is_trading(self, val: bool) -> Self {
        Self { is_trading: val, ..self }
    }
    pub fn is_unrealized(self, val: bool) -> Self {
        Self { is_unrealized: val, ..self }
    }
    pub fn is_work_income(self, val: bool) -> Self {
        Self { is_work_income: val, ..self }
    }

    /// Check whether the combination of flags is valid

    fn is_valid(&self) -> AlrResult<()> {
        if self.is_passive_income || self.is_work_income {
            match self.category {
                AccountKindCategory::INCOME => {},
                _ => return AlrResult::Err("Must be an income".into()),
            };
        }
        if self.is_networth {
            match self.category {
                AccountKindCategory::ASSET
                | AccountKindCategory::LIABILITY
                | AccountKindCategory::EQUITY => {},
                _ => return Err("networth has incorrect category".into())
            };
        }

        if self.is_work_income && self.is_passive_income {
            return Err("Work income must not be passive income".into());
        }

        Ok(())
    }

    /// Find an existing account_kind that matches the criterias, or create a
    /// new one if none could be found.

    pub fn get_or_create(
        &self, db: &SqliteConnect
    ) -> AlrResult<AccountKind> {
        self.is_valid()?;
        let lookup = 
            "SELECT * FROM alr_account_kinds
             WHERE category=?1
                 AND is_income_tax=?2
                 AND is_misc_tax=?3
                 AND is_networth=?4
                 AND is_passive_income=?5
                 AND is_stock=?6
                 AND is_trading=?7
                 AND is_unrealized=?8
                 AND is_work_income=?9
            ";

        let mut q: Vec<AccountKind> = sql_query(lookup)
            .bind::<Integer, _>(self.category)
            .bind::<Bool, _>(self.is_income_tax)
            .bind::<Bool, _>(self.is_misc_tax)
            .bind::<Bool, _>(self.is_networth)
            .bind::<Bool, _>(self.is_passive_income)
            .bind::<Bool, _>(self.is_stock)
            .bind::<Bool, _>(self.is_trading)
            .bind::<Bool, _>(self.is_unrealized)
            .bind::<Bool, _>(self.is_work_income)
            .load(&db.0)?;

        if q.is_empty() {
            let insert = 
                "INSERT INTO alr_account_kinds
                   (name, category, name_when_positive,
                    name_when_negative, is_work_income,
                    is_passive_income, is_unrealized, is_networth,
                    is_trading, is_stock, is_income_tax, is_misc_tax)
                 VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 RETURNING *";
            q = sql_query(insert)
                .bind::<Text, _>(self.name)
                .bind::<Integer, _>(self.category)
                .bind::<Text, _>("increase")
                .bind::<Text, _>("decrease")
                .bind::<Bool, _>(self.is_work_income)
                .bind::<Bool, _>(self.is_passive_income)
                .bind::<Bool, _>(self.is_unrealized)
                .bind::<Bool, _>(self.is_networth)
                .bind::<Bool, _>(self.is_trading)
                .bind::<Bool, _>(self.is_stock)
                .bind::<Bool, _>(self.is_income_tax)
                .bind::<Bool, _>(self.is_misc_tax)
                .load(&db.0)?;
        }

        match q.len() {
            1 => {
                if let Some(e) = q.pop() {
                    Ok(e)
                } else {
                    Err("Cannot insert account_kind".into())
                }
            },
            _ => Err(format!("Too many matches for {:?}", self).into()),
        }
    }
}

