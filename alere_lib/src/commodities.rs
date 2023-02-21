use crate::connections::SqliteConnect;
use crate::commodity_kinds::CommodityKind;
use crate::errors::Result;
use crate::models::{CommodityId, PriceSourceId, ScalingFactor};
use diesel::RunQueryDsl;
use diesel::sql_types::{Integer, Nullable, Text};
use crate::schema::alr_commodities;

/// Currencies, securities and any tangible asset accounted for in accounts.
///
/// All accounts (and the splits that apply to that account) have values given in
/// one commodity.  If this is a standard bank account, that would be a currency.
/// If this is a stock account, that would be a security.
///
/// However, one commodity might be traded in multiple accounts.  For instance, if
/// you have multiple investment portfolios, they could all be trading COCA COLA
/// for instance.  Each of them will have its own performance statistics, depending
/// on when you bought, the fees applied by the institution, and so on.
///
///   split --account_id--> account --commodity_id--> commodity

#[derive(diesel::Queryable, diesel::QueryableByName,
         Debug, serde::Serialize)]
#[table_name = "alr_commodities"]
pub struct Commodity {

    pub id: CommodityId,

    /// Name as displayed in selection boxes in the GUI.  For instance, it
    /// could be "Euro", "Apple Inc.", ...
    pub name: String,

    /// Symbol to display the commodity. For instance, it could be the
    /// euro sign, or "AAPL".  "before" and "after" refer to whether the
    /// symbol is displayed before or after the numeric value.
    pub symbol_before: String,
    pub symbol_after: String,

    /// What kind of commodity this is.
    pub kind: CommodityKind,

    /// Scaling used for prices and values.
    /// If this is 100, then a value given as 2312 in the database is actuall 23.12.
    /// This is used to avoid rounding errors.
    /// Each account can override this value via its commodity_scu field.
    pub price_scale: ScalingFactor,

    /// For online quotes. 
    /// The source refers to one of the plugins available to download
    /// online information.
    ///
    /// The quote_symbol is the ticker, the ISIN, or the iso code for currencies.
    /// It is the information searched for in the online source.
    ///
    /// The quote_currency is the currency in which we retrieve the data,
    /// which is cached because fetching that information is slow in Yahoo.
    /// So if we start with the AAPL commodity,  quote_currency_id might be USD if
    /// the online source gives prices in USD.
    pub quote_symbol: Option<String>,
    pub quote_source_id: Option<PriceSourceId>,
    pub quote_currency_id: Option<CommodityId>,
}

pub struct CommodityConfig<'a> {
    pub name: &'a str,
    pub symbol_before: &'a str,
    pub symbol_after: &'a str,
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
             (name, symbol_before, symbol_after, kind,
              price_scale, quote_symbol, quote_source_id,
              quote_currency_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *";

        let mut n = diesel::sql_query(q)
            .bind::<Text, _>(config.name)
            .bind::<Text, _>(config.symbol_before)
            .bind::<Text, _>(config.symbol_after)
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
