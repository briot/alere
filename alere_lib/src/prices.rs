/// Conversion between various commodities.
/// Typically, this includes historical prices of securities (in a
/// specific currency), or exchange rates between currencies.

use crate::connections::SqliteConnect;
use crate::errors::Result;
use crate::models::{CommodityId, PriceSourceId};
use crate::schema::alr_prices;
use diesel::RunQueryDsl;
use diesel::sql_types::{Integer, Timestamp, Bigint};

#[derive(diesel::QueryableByName, diesel::Queryable,
         Debug, serde::Serialize)]
#[table_name = "alr_prices"]
pub struct Price {
    pub origin_id: CommodityId,
    pub target_id: CommodityId,
    pub date: chrono::NaiveDateTime,

    //  Price of 1 from_id, in to_id currency. This is scaled by
    //  origin's price_scale
    pub scaled_price: u64,

    pub source_id: PriceSourceId,
}

impl Price {
    pub fn create(
        db: &SqliteConnect,
        origin_id: CommodityId,
        target_id: CommodityId,
        date: chrono::NaiveDateTime,
        scaled_price: u64,
        source_id: PriceSourceId,
    ) -> Result<()> {
        let q = 
            "INSERT INTO alr_prices
             (date, scaled_price, origin_id, target_id, source_id)
             VALUES (?, ?, ?, ?, ?)";
        let _: usize = diesel::sql_query(q)
            .bind::<Timestamp, _>(date)
            .bind::<Bigint, _>(scaled_price as i64)
            .bind::<Integer, _>(origin_id)
            .bind::<Integer, _>(target_id)
            .bind::<Integer, _>(source_id)
            .execute(&db.0)?;
        Ok(())
    }
}
