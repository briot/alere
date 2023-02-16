use crate::connections::SqliteConnect;
use crate::commodity_kinds::CommodityKind;
use crate::errors::Result;
use crate::models::{CommodityId, PriceSourceId, ScalingFactor};
use diesel::RunQueryDsl;
use diesel::sql_types::{Integer, Nullable, Text};
use crate::schema::alr_commodities;

/// Currencies, securities and any tangible asset accounted for
/// in accounts.

#[derive(diesel::Queryable, diesel::QueryableByName,
         Debug, serde::Serialize)]
#[table_name = "alr_commodities"]
pub struct Commodity {

    pub id: CommodityId,

    /// Name as displayed in selection boxes in the GUI.  For instance, it
    /// could be "EUR" (iso code for currencies), "Apple Inc.", ...
    pub name: String,

    /// Symbol to display the commodity. For instance, it could be the
    /// euro sign, or "AAPL".  "before" and "after" refer to whether the
    /// symbol is displayed before or after the numeric value.
    pub symbol_before: String,
    pub symbol_after: String,

    /// For currencies
    pub iso_code: Option<String>,

    /// What kind of commodity this is.
    pub kind: CommodityKind,

    /// Scaling used in the alr_prices table.
    pub price_scale: ScalingFactor,

    /// For online quotes. 
    /// The source refers to one of the plugins available to download
    /// online information.
    /// The quote_symbol is the ticker.
    /// The quote_currency is the currency in which we retrieve the data,
    /// which is cached because fetching that information is slow in Yahoo.
    pub quote_symbol: Option<String>,
    pub quote_source_id: Option<PriceSourceId>,
    pub quote_currency_id: Option<CommodityId>,
}

pub struct CommodityConfig<'a> {
    pub name: &'a str,
    pub symbol_before: &'a str,
    pub symbol_after: &'a str,
    pub iso_code: Option<&'a str>,
    pub kind: CommodityKind,
    pub price_scale: i32,
    pub quote_symbol: Option<&'a str>,
    pub quote_source_id: Option<i32>,
    pub quote_currency_id: Option<CommodityId>,
}

impl Commodity {

    /// Create a new commodity in the database

    pub fn create(
        db: &SqliteConnect,
        config: CommodityConfig,
    ) -> Result<Self> {
        let q = 
            "INSERT INTO alr_commodities
             (name, symbol_before, symbol_after, iso_code, kind,
              price_scale, quote_symbol, quote_source_id,
              quote_currency_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *";

        let mut n = diesel::sql_query(q)
            .bind::<Text, _>(config.name)
            .bind::<Text, _>(config.symbol_before)
            .bind::<Text, _>(config.symbol_after)
            .bind::<Nullable<Text>, _>(config.iso_code)
            .bind::<Integer, _>(config.kind)
            .bind::<Integer, _>(config.price_scale)
            .bind::<Nullable<Text>, _>(config.quote_symbol)
            .bind::<Nullable<Integer>, _>(config.quote_source_id)
            .bind::<Nullable<Integer>, _>(config.quote_currency_id)
            .load(&db.0)?;

        n.pop().ok_or_else(|| "Cannot insert commodity".into())
    }

    /// Whether this commodity represents a currency

    pub fn is_currency(&self) -> bool {
        matches!(self.kind, CommodityKind::Currency)
    }

}
