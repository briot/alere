use diesel::backend::Backend;
use diesel::deserialize::FromSql;
use diesel::serialize::{ToSql, Output};
use diesel::sql_types::Integer;

/// Everything that can be bought or sold is represented as a commodity.
/// However it is sometimes convenient to know exactly which kind of
/// commodity we are manipulating.

#[derive(
    Clone,
    Copy,
    Debug,         // Needed for ToSQL
    serde::Serialize,
    FromSqlRow,    // So that struct containing this can be Queryable
    FromPrimitive  // from num-derive crate, convert i32 to this enum
  )]
#[repr(i32)]
pub enum CommodityKind {
    Currency = 0,   //  ??? hard-coded in some of the views (alr_raw_prices)
                    //  Maybe should use feature flags instead
    Stock = 1,
    MutualFund = 2,
    Bond = 3,
}


impl std::fmt::Display for CommodityKind {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            CommodityKind::Currency   => write!(f, "Currency"),
            CommodityKind::Stock      => write!(f, "Stock"),
            CommodityKind::MutualFund => write!(f, "Mutual Fund"),
            CommodityKind::Bond       => write!(f, "Bond"),
        }
    }
}


impl<DB> FromSql<Integer, DB> for CommodityKind
    where DB: Backend,
          i32: FromSql<Integer, DB>
{
    fn from_sql(
        bytes: Option<&DB::RawValue>
    ) -> diesel::deserialize::Result<CommodityKind> {
        let r: i32 = i32::from_sql(bytes)?;
        match num::FromPrimitive::from_i32(r) {
            Some(v) => Ok(v),
            None    => Err(
                format!("Cannot convert {} to CommodityKind", r).into())
        }
    }
}


impl<DB> ToSql<Integer, DB> for CommodityKind
where DB: Backend, i32: ToSql<Integer, DB>,
{
    fn to_sql<W: std::io::Write>(
        &self, out: &mut Output<W, DB>
    ) -> diesel::serialize::Result {
        (*self as i32).to_sql(out)
    }
}

