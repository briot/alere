//! All known source of prices

use crate::connections::PooledSqlite;
use crate::errors::AlrResult;
use crate::models::PriceSourceId;
use crate::schema::alr_price_sources;
use diesel::sql_types::Text;
use diesel::RunQueryDsl;

#[derive(diesel::QueryableByName, diesel::Queryable, Debug, serde::Serialize)]
#[diesel(table_name = alr_price_sources)]
pub struct PriceSource {
    pub id: PriceSourceId,
    pub name: String,
}

impl PriceSource {
    pub fn create(db: &mut PooledSqlite, name: &str) -> AlrResult<Self> {
        let q = "SELECT * FROM alr_price_sources WHERE name=?";
        let mut r: Vec<Self> = diesel::sql_query(q).bind::<Text, _>(name).load(db)?;
        match r.pop() {
            Some(ps) => Ok(ps),
            None => {
                let q = "INSERT OR IGNORE INTO alr_price_sources (name)
                     VALUES (?)
                     RETURNING *";
                let mut r: Vec<Self> =
                    diesel::sql_query(q).bind::<Text, _>(name).load(db)?;
                r.pop()
                    .ok_or_else(|| "Cannot insert new PriceSource".into())
            }
        }
    }
}
