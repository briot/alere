use crate::connections::SqliteConnect;
use crate::errors::Result;
use crate::models::PayeeId;
use crate::schema::alr_payees;
use diesel::RunQueryDsl;
use diesel::sql_types::Text;

/// Who money was paid to, or who paid you money

#[derive(diesel::QueryableByName, diesel::Queryable,
         Debug, serde::Serialize)]
#[table_name = "alr_payees"]
pub struct Payee {
    pub id: PayeeId,
    pub name: String,
}

impl Payee {
    pub fn create(
        db: &SqliteConnect,
        name: String,
    ) -> Result<Self> {
        let qstr = 
            "INSERT INTO alr_payees
             (name)
             VALUES(?)
             RETURNING *";
        let mut q: Vec<Self> = diesel::sql_query(qstr)
            .bind::<Text, _>(&name)
            .load(&db.0)?;
        q.pop().ok_or("Cannot insert new payee".into())
    }
}
