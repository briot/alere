use crate::connections::SqliteConnect;
use crate::commodities::Commodity;
use crate::errors::Result;
use crate::models::{AccountId, CommodityId};
use chrono::{DateTime, Utc, TimeZone, NaiveDateTime};
use diesel::prelude::*;
use diesel::sql_types::{Integer, Float, Timestamp, Nullable};
use log::info;
use serde::Serialize;
use std::collections::HashMap;
use crate::account_lists::price_sources;


#[derive(QueryableByName, Debug)]
pub struct Roi {
    #[sql_type = "Timestamp"]
    pub min_ts: NaiveDateTime,
    #[sql_type = "Timestamp"]
    pub max_ts: NaiveDateTime,
    #[sql_type = "Integer"]
    pub commodity_id: CommodityId,
    #[sql_type = "Integer"]
    pub account_id: AccountId,
    #[sql_type = "Float"]
    pub realized_gain: f32,
    #[sql_type = "Float"]
    pub invested: f32,
    #[sql_type = "Float"]
    pub shares: f32,
    #[sql_type = "Integer"]
    pub currency_id: CommodityId,
    #[sql_type = "Nullable<Float>"]
    pub balance: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub computed_price: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub roi: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub pl: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub average_cost: Option<f32>,
    #[sql_type = "Nullable<Float>"]
    pub weighted_average: Option<f32>,
}

#[derive(Serialize)]
pub struct Position {
    avg_cost: f32,
    equity: f32,
    gains: f32,
    invested: f32,
    pl: f32,
    roi: f32,
    shares: f32,
    weighted_avg: f32,
}

impl Position {
    pub fn new(roi: &Roi) -> Self {
        Position {
            avg_cost: roi.average_cost.unwrap_or(f32::NAN),
            equity: roi.balance.unwrap_or(f32::NAN),
            gains: roi.realized_gain,
            invested: roi.invested,
            pl: roi.pl.unwrap_or(f32::NAN),
            roi: roi.roi.unwrap_or(f32::NAN),
            shares: roi.shares,
            weighted_avg: roi.weighted_average.unwrap_or(f32::NAN),
        }
    }
}

impl Default for Position {
    fn default() -> Self {
        Position {
            avg_cost: 0.0,
            equity: 0.0,
            gains: 0.0,
            invested: 0.0,
            pl: 0.0,
            roi: 0.0,
            shares: 0.0,
            weighted_avg: 0.0,
        }
    }
}

#[derive(Serialize)]
pub struct Price {
    t: i64,  //  DateTime<Utc>,
    price: f32,
    roi: f32,
    shares: f32,
}

/// Details on an investment account

#[derive(Serialize)]
pub struct ForAccount {
    account: AccountId,
    start: Position,                    // as of min_ts
    end: Position,                      // as of max_ts
    oldest: Option<DateTime<Utc>>,      // oldest transaction (for annualized)
    most_recent: Option<DateTime<Utc>>, // most recent transaction
    now_for_annualized: DateTime<Utc>,
    prices: Vec<Price>,
    annualized_roi: f32,
    period_roi: f32,
}

impl ForAccount {
    pub fn new(id: AccountId) -> ForAccount {
        ForAccount {
            account: id,
            start: Default::default(),
            end: Default::default(),
            oldest: None,
            most_recent: None,
            now_for_annualized: Utc::now(),
            prices: vec![],
            annualized_roi: f32::NAN,
            period_roi: f32::NAN,
        }
    }
}

/// Details on a traded symbol

#[derive(Serialize)]
pub struct Symbol {  //  <'a> {
    id: CommodityId,
    ticker: String,
    source: i32,
    is_currency: bool,
    accounts: Vec<AccountId>,
    price_scale: i32,
}

#[derive(QueryableByName)]
struct AccountIdAndCommodity {

    #[sql_type = "Integer"]
    id: AccountId,

    #[sql_type = "Integer"]
    commodity_id: CommodityId,
}

pub fn quotes(
    connection: SqliteConnect,
    min_ts: DateTime<Utc>,
    max_ts: DateTime<Utc>,
    currency: CommodityId,
    commodities: Option<Vec<CommodityId>>,
    accounts: Option<Vec<AccountId>>
) -> Result<(Vec<Symbol>, HashMap<AccountId, ForAccount>)> {
    info!("quotes {:?} {:?} {}", &min_ts, &max_ts, currency);

    // Find all commodities

    let mut all_commodities: Vec<Commodity> = {
       use crate::schema::alr_commodities::dsl::*;
       alr_commodities.load::<Commodity>(&connection.0)?
    };

    if let Some(commodities) = commodities {
        all_commodities.retain(|comm| commodities.contains(&comm.id));
    }
    let mut symbols = HashMap::new();
    all_commodities.iter_mut().for_each(
        |comm| {
            symbols.insert(comm.id, Symbol {
                id: comm.id,
                ticker: comm.quote_symbol
                    .as_ref()
                    .cloned()
                    .unwrap_or_default(),
                source: comm.quote_source_id.unwrap_or(price_sources::USER),
                is_currency: comm.is_currency(),
                price_scale: comm.price_scale,
                accounts: vec![],
            });
        }
    );

    // Find the corresponding accounts

    let filter_account = match accounts {
        Some(accs) => format!(
            "AND a.id IN ({})",
            accs
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",")
        ),
        None       => "".to_string(),
    };
    let query = format!(
        "SELECT a.id, a.commodity_id \
        FROM alr_accounts a  \
        JOIN alr_account_kinds k ON (a.kind_id = k.id) \
        WHERE k.is_trading {filter_account}"
    );
    let accounts = connection.exec::<AccountIdAndCommodity>(
        "quotes", &query)?;
    let mut accs = HashMap::new();
    accounts
        .iter()
        .for_each(|a| {
            let acc = ForAccount::new(a.id);
            accs.insert(a.id, acc);
            symbols.get_mut(&a.commodity_id).unwrap().accounts.push(a.id);
        });

    // Remove all symbols for which we have zero account, to limit the scope
    // of the following query.

    symbols.retain(|_, symb| !symb.accounts.is_empty());

    // Compute metrics

    let accs_ids = accs.iter()
        .map(|(id, _)| id.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let query = format!(
        "SELECT * \
        FROM alr_roi r \
        WHERE r.account_id IN ({accs_ids}) \
        AND r.currency_id = {currency} \
        ORDER BY r.min_ts"
    );

    let rois = connection.exec::<Roi>("roi", &query)?;
    rois
        .iter()
        .for_each(|r| {
            let a_in_map = accs.get_mut(&r.account_id);
            let mut a = a_in_map.unwrap();
            let mi = Utc.from_utc_datetime(&r.min_ts);
            let ma = Utc.from_utc_datetime(&r.max_ts);

            if a.oldest.is_none() {
                a.oldest = Some(mi);
            }
            a.most_recent = Some(mi);

            if mi <= min_ts && min_ts < ma {
                a.start = Position::new(r);
            }
            if mi <= max_ts && max_ts < ma {
                a.end = Position::new(r);
            }

            a.prices.push(Price {
                t: mi.timestamp_millis(),
                price: r.computed_price.unwrap_or(f32::NAN),
                roi: match r.roi {
                    Some(val) => (val - 1.0) * 100.0,
                    None      => f32::NAN,
                },
                shares: r.shares,
            });
        });

    for (_, a) in accs.iter_mut() {
        let now = Utc::now();

        // Annualized total return on investment
        if let Some(old) = a.oldest {
            let d = (now - old).num_days() as f32;
            a.annualized_roi = f32::powf(a.end.roi, 365.0 / d);
        }

        // Return over the period [mindata, max_ts]
        let d2 = a.start.equity + a.end.invested - a.start.invested;
        if f32::abs(d2) >= 1E-6 {
            a.period_roi =
                (a.end.equity + a.end.gains - a.start.gains)
                / d2;
        }
    }

    Ok((symbols.into_values().collect::<Vec<_>>(), accs))
}
