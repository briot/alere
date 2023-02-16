//! All known source of prices

use crate::connections::SqliteConnect;
use crate::errors::Result;
use crate::models::PriceSourceId;
use crate::schema::alr_price_sources;
use diesel::RunQueryDsl;
use diesel::sql_types::Text;

#[derive(diesel::QueryableByName, diesel::Queryable,
         Debug, serde::Serialize)]
#[table_name = "alr_price_sources"]
pub struct PriceSource {
    pub id: PriceSourceId,
    pub name: String,
}

impl PriceSource {
    pub fn create(
        db: &SqliteConnect,
        name: &str,
    ) -> Result<Self> {
        let q = "SELECT * FROM alr_price_sources WHERE name=?";
        let mut r: Vec<Self> = diesel::sql_query(q)
            .bind::<Text, _>(name)
            .load(&db.0)?;
        match r.pop() {
            Some(ps) => Ok(ps),
            None => {
                let q = 
                    "INSERT OR IGNORE INTO alr_price_sources (name)
                     VALUES (?)
                     RETURNING *";
                let mut r: Vec<Self> = diesel::sql_query(q)
                    .bind::<Text, _>(name)
                    .load(&db.0)?;
                r.pop().ok_or_else(
                    || "Cannot insert new PriceSource".into())
            }
        }
    }
}
