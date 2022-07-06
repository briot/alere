use chrono::{NaiveDateTime, NaiveDate};
use serde::Serialize;

#[derive(Queryable, Debug, Serialize)]
pub struct AccountKind {
   pub id: i32,
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
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub iban: Option<String>,
    pub number: Option<String>,
    pub closed: bool,
    pub commodity_scu: i32,
    pub last_reconciled: Option<NaiveDateTime>,
    pub opening_date: Option<NaiveDate>,
    pub commodity_id: i32,
    pub institution_id: Option<i32>,
    pub kind_id: i32,
    pub parent_id: Option<i32>,
}

#[derive(Queryable, Debug, Serialize)]
pub struct Commodity {
    pub id: i32,
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
    pub id: i32,
    pub name: String,
    pub manager: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub routing_code: Option<String>,
    pub icon: Option<String>,
}
