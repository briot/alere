use diesel::backend::Backend;
use diesel::deserialize::FromSql;
use diesel::serialize::{ToSql, Output};
use diesel::sql_types::SmallInt;

#[derive(Copy, Clone, Debug, serde::Serialize,
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
            ReconcileKind::NEW        => write!(f, "n"),
            ReconcileKind::CLEARED    => write!(f, "c"),
            ReconcileKind::RECONCILED => write!(f, "R"),
        }
    }
}

impl<DB> FromSql<SmallInt, DB> for ReconcileKind
    where DB: Backend,
          i16: FromSql<SmallInt, DB>
{
    fn from_sql(
        bytes: Option<&DB::RawValue>
    ) -> diesel::deserialize::Result<ReconcileKind> {
        let r: i16 = i16::from_sql(bytes)?;
        match num::FromPrimitive::from_i16(r) {
            Some(v) => Ok(v),
            None    => Err(
                format!("Cannot convert {} to ReconcileKind", r)
                .into())
        }
    }
}

impl<DB> ToSql<SmallInt, DB> for ReconcileKind
where
    DB: Backend,
    i16: ToSql<SmallInt, DB>,
{
    fn to_sql<W: std::io::Write>(
        &self, out: &mut Output<W, DB>
    ) -> diesel::serialize::Result {
        (*self as i16).to_sql(out)
    }
}
