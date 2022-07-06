use chrono::{NaiveDateTime, NaiveDate};
use serde::Serialize;

pub type AccountId = i32;  //  Diesel does not provide Integer->u32 conversion
pub type CommodityId = i32;
pub type AccountKindId = i32;
pub type InstitutionId = i32;


#[derive(Queryable, Debug, Serialize)]
pub struct AccountKind {
   pub id: AccountKindId,
   pub name: String,
   pub name_when_positive: String,
   pub name_when_negative: String,
   pub category: i32,
   pub is_work_income: bool,
   pub is_passive_income: bool,
   pub is_unrealized: bool,
   pub is_networth: bool,
   pub is_trading: bool,
   pub is_stock: bool,
   pub is_income_tax: bool,
   pub is_misc_tax: bool,
}

#[derive(Queryable, Debug, Serialize)]
pub struct Account {
    pub id: AccountId,
    pub name: String,
    pub description: Option<String>,
    pub iban: Option<String>,
    pub number: Option<String>,
    pub closed: bool,
    pub commodity_scu: i32,
    pub last_reconciled: Option<NaiveDateTime>,
    pub opening_date: Option<NaiveDate>,
    pub commodity_id: CommodityId,
    pub institution_id: Option<InstitutionId>,
    pub kind_id: AccountKindId,
    pub parent_id: Option<AccountId>,
}

#[derive(Queryable, Debug, Serialize)]
pub struct Commodity {
    pub id: CommodityId,
    pub name: String,
    pub symbol_before: String,
    pub symbol_after: String,
    pub iso_code: Option<String>,
    pub kind: String,
    pub price_scale: i32,
    pub quote_symbol: Option<String>,
    pub quote_source_id: Option<i32>,
    pub quote_currency_id: Option<i32>,
}

#[derive(Queryable, Debug, Serialize)]
pub struct Institution {
    pub id: InstitutionId,
    pub name: String,
    pub manager: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub routing_code: Option<String>,
    pub icon: Option<String>,
}
