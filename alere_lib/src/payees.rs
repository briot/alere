use crate::connections::PooledSqlite;
use crate::errors::AlrResult;
use crate::models::PayeeId;
use crate::schema::alr_payees;
use diesel::sql_types::Text;
use diesel::RunQueryDsl;

/// Who money was paid to, or who paid you money

#[derive(diesel::QueryableByName, diesel::Queryable, Debug, serde::Serialize)]
#[diesel(table_name = alr_payees)]
pub struct Payee {
    pub id: PayeeId,
    pub name: String,
}

impl Payee {
    pub fn create(db: &mut PooledSqlite, name: String) -> AlrResult<Self> {
        let qstr = "INSERT INTO alr_payees
             (name)
             VALUES(?)
             RETURNING *";
        let mut q: Vec<Self> = diesel::sql_query(qstr)
            .bind::<Text, _>(&name)
            .load(db)?;
        q.pop().ok_or_else(|| "Cannot insert new payee".into())
    }
}
