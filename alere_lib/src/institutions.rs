use crate::connections::PooledSqlite;
use crate::errors::AlrResult;
use crate::models::InstitutionId;
use crate::schema::alr_institutions;
use diesel::sql_types::{Nullable, Text};
use diesel::RunQueryDsl;

/// This type represents a bank, broker, ... or anyone managing
/// accounts.

#[derive(diesel::QueryableByName, diesel::Queryable, Debug, serde::Serialize)]
#[diesel(table_name = alr_institutions)]
pub struct Institution {
    pub id: InstitutionId,
    pub name: String, //   Display name for the institutions
    pub manager: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub routing_code: Option<String>,
    pub icon: Option<String>, // Url to the icon to show in the GUI
}

impl Institution {
    pub fn create(
        db: &mut PooledSqlite,
        name: String,
        manager: Option<String>,
        address: Option<String>,
        phone: Option<String>,
        routing_code: Option<String>,
    ) -> AlrResult<Self> {
        let qstr = "INSERT INTO alr_institutions
             (name, manager, address, phone, routing_code)
             VALUES(?, ?, ?, ?, ?)
             RETURNING *";
        let mut q: Vec<Self> = diesel::sql_query(qstr)
            .bind::<Text, _>(&name)
            .bind::<Nullable<Text>, _>(&manager)
            .bind::<Nullable<Text>, _>(&address)
            .bind::<Nullable<Text>, _>(&phone)
            .bind::<Nullable<Text>, _>(&routing_code)
            .load(db)?;
        q.pop()
            .ok_or_else(|| "Cannot insert new institution".into())
    }
}
