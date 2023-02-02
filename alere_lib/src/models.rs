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
pub type ScalingFactor = i32;

#[derive(QueryableByName)]
pub struct Roi {
    #[sql_type = "Timestamp"]
    pub min_ts: NaiveDateTime,
    #[sql_type = "Timestamp"]
    pub max_ts: NaiveDateTime,
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
    #[sql_type = "Nullable<Float>"]
    pub balance: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub computed_price: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub roi: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub pl: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub average_cost: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub weighted_average: Option<f32>,
}
