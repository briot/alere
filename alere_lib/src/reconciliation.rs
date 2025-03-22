use diesel::backend::Backend;
use diesel::deserialize::FromSql;
use diesel::serialize::{Output, ToSql};
use diesel::sql_types::SmallInt;
use diesel::sqlite::Sqlite;

#[derive(
    Copy,
    Clone,
    Debug,
    serde::Serialize,
    FromSqlRow,    // so that struct containing this can be Queryable
    FromPrimitive, // from num-derive crate, convert from i32 to this enum
)]
#[repr(i16)]
pub enum ReconcileKind {
    // Used for a newly entered split
    NEW = 0,

    // When the split has been seen on a bank statement
    CLEARED = 1,

    // When the split has been checked by the user, and the overall result of
    // a bank statement matches all previously reconciled + currently cleared
    // transactions.
    RECONCILED = 2,
}

impl Default for ReconcileKind {
    fn default() -> Self {
        ReconcileKind::NEW
    }
}

impl std::fmt::Display for ReconcileKind {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ReconcileKind::NEW => write!(f, "n"),
            ReconcileKind::CLEARED => write!(f, "c"),
            ReconcileKind::RECONCILED => write!(f, "R"),
        }
    }
}

impl<DB> FromSql<SmallInt, DB> for ReconcileKind
where
    DB: Backend,
    i16: FromSql<SmallInt, DB>,
{
    fn from_sql(bytes: DB::RawValue<'_>) -> diesel::deserialize::Result<ReconcileKind> {
        let r: i16 = i16::from_sql(bytes)?;
        match num::FromPrimitive::from_i16(r) {
            Some(v) => Ok(v),
            None => Err(format!("Cannot convert {} to ReconcileKind", r).into()),
        }
    }
}

impl ToSql<SmallInt, Sqlite> for ReconcileKind {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Sqlite>) -> diesel::serialize::Result {
        out.set_value(*self as i32);
        Ok(diesel::serialize::IsNull::No)
    }
}
