/// Conversion between various commodities.
/// Typically, this includes historical prices of securities (in a
/// specific currency), or exchange rates between currencies.
use crate::connections::PooledSqlite;
use crate::errors::AlrResult;
use crate::models::{CommodityId, PriceSourceId};
use crate::schema::alr_prices;
use diesel::sql_types::{Bigint, Integer, Timestamp};
use diesel::RunQueryDsl;

#[derive(diesel::QueryableByName, diesel::Queryable, Debug, serde::Serialize)]
#[diesel(table_name = alr_prices)]
pub struct Price {
    pub origin_id: CommodityId,
    pub target_id: CommodityId,
    pub ts: chrono::NaiveDateTime,

    //  Price of 1 from_id, in to_id currency. This is scaled by
    //  origin's price_scale
    pub scaled_price: u64,

    pub source_id: PriceSourceId,
}

impl Price {
    pub fn create(
        db: &mut PooledSqlite,
        origin_id: CommodityId,
        target_id: CommodityId,
        timestamp: chrono::NaiveDateTime,
        scaled_price: u64,
        source_id: PriceSourceId,
    ) -> AlrResult<()> {
        let q = "INSERT INTO alr_prices
             (ts, scaled_price, origin_id, target_id, source_id)
             VALUES (?, ?, ?, ?, ?)";
        let _: usize = diesel::sql_query(q)
            .bind::<Timestamp, _>(timestamp)
            .bind::<Bigint, _>(scaled_price as i64)
            .bind::<Integer, _>(origin_id)
            .bind::<Integer, _>(target_id)
            .bind::<Integer, _>(source_id)
            .execute(db)?;
        Ok(())
    }
}
