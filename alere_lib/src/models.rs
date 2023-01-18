use chrono::NaiveDateTime;
use diesel::sql_types::{Integer, Float, Timestamp, Nullable};

pub type AccountId = i32; //  Diesel does not provide Integer->u32 conversion
pub type AccountKindId = i32;
pub type CommodityId = i32;
pub type InstitutionId = i32;
pub type PriceSourceId = i32;
pub type PayeeId = i32;
pub type TransactionId = i32;
pub type SplitId = i32;

#[derive(QueryableByName)]
pub struct Roi {
    #[sql_type = "Timestamp"]
    pub mindate: NaiveDateTime,
    #[sql_type = "Timestamp"]
    pub maxdate: NaiveDateTime,
    #[sql_type = "Integer"]
    pub commodity_id: CommodityId,
    #[sql_type = "Integer"]
    pub account_id: AccountId,
    #[sql_type = "Float"]
    pub realized_gain: f32,
    #[sql_type = "Float"]
    pub invested: f32,
    #[sql_type = "Float"]
    pub shares: f32,
    #[sql_type = "Integer"]
    pub currency_id: CommodityId,
    #[sql_type = "Float"]
    pub balance: f32,
    #[sql_type = "Float"]
    pub computed_price: f32,
    #[sql_type = "Nullable<Float>"]
    pub roi: Option<f32>,
    #[sql_type = "Float"]
    pub pl: f32,
    #[sql_type = "Nullable<Float>"]
    pub average_cost: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub weighted_average: Option<f32>,
}
