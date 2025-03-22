use crate::account_lists::price_sources;
use crate::commodities::Commodity;
use crate::connections::SqliteConnect;
use crate::errors::AlrResult;
use crate::models::{AccountId, CommodityId};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use diesel::prelude::*;
use diesel::sql_types::{Float, Integer, Nullable, Timestamp};
use log::info;
use serde::Serialize;
use std::collections::HashMap;

#[derive(QueryableByName, Debug)]
struct Roi {
    #[diesel(sql_type = Integer)]
    pub account_id: AccountId,

    #[diesel(sql_type = Integer)]
    #[diesel(column_name = commodity_id)]
    pub _commodity_id: CommodityId,

    #[diesel(sql_type = Timestamp)]
    pub min_ts: NaiveDateTime,

    #[diesel(sql_type = Timestamp)]
    pub max_ts: NaiveDateTime,

    #[diesel(sql_type = Nullable<Float>)]
    pub shares: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub realized_gains: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub price_paid: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub shares_worth: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub computed_price: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub pl: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub roi: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub weighted_average: Option<f32>,

    #[diesel(sql_type = Nullable<Float>)]
    pub average_cost: Option<f32>,
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
    fn new(roi: &Roi) -> Self {
        Position {
            avg_cost: roi.average_cost.unwrap_or(f32::NAN),
            equity: roi.shares_worth.unwrap_or(f32::NAN),
            gains: roi.realized_gains.unwrap_or(f32::NAN),
            invested: roi.price_paid.unwrap_or(f32::NAN),
            pl: roi.pl.unwrap_or(f32::NAN),
            roi: roi.roi.unwrap_or(f32::NAN),
            shares: roi.shares.unwrap_or(f32::NAN),
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
    t: i64, //  DateTime<Utc>,
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
pub struct Symbol {
    //  <'a> {
    id: CommodityId,
    ticker: String,
    source: i32,
    is_currency: bool,
    accounts: Vec<AccountId>,
    price_scale: i32,
}

#[derive(QueryableByName)]
struct AccountIdAndCommodity {
    #[diesel(sql_type = Integer)]
    id: AccountId,

    #[diesel(sql_type = Integer)]
    commodity_id: CommodityId,
}

pub fn quotes(
    mut connection: SqliteConnect,
    min_ts: DateTime<Utc>,
    max_ts: DateTime<Utc>,
    currency: CommodityId,
    commodities: Option<Vec<CommodityId>>,
    accounts: Option<Vec<AccountId>>,
) -> AlrResult<(Vec<Symbol>, HashMap<AccountId, ForAccount>)> {
    info!("quotes {:?} {:?} {}", &min_ts, &max_ts, currency);

    // Find all commodities

    let mut all_commodities: Vec<Commodity> = {
        use crate::schema::alr_commodities::dsl::*;
        alr_commodities.load::<Commodity>(&mut connection.0)?
    };

    if let Some(commodities) = commodities {
        all_commodities.retain(|comm| commodities.contains(&comm.id));
    }
    let mut symbols = HashMap::new();
    all_commodities.iter_mut().for_each(|comm| {
        symbols.insert(
            comm.id,
            Symbol {
                id: comm.id,
                ticker: comm.quote_symbol.as_ref().cloned().unwrap_or_default(),
                source: comm.quote_source_id.unwrap_or(price_sources::USER),
                is_currency: comm.is_currency(),
                price_scale: comm.price_scale,
                accounts: vec![],
            },
        );
    });

    // Find the corresponding accounts

    let filter_account = match accounts {
        Some(accs) => format!(
            "AND a.id IN ({})",
            accs.iter()
                .map(|id| id.to_string())
                .collect::<Vec<_>>()
                .join(",")
        ),
        None => "".to_string(),
    };
    let query = format!(
        "SELECT a.id, a.commodity_id \
        FROM alr_accounts a  \
        JOIN alr_account_kinds k ON (a.kind_id = k.id) \
        WHERE k.is_trading {filter_account}"
    );
    let accounts = connection.exec::<AccountIdAndCommodity>("quotes", &query)?;
    let mut accs = HashMap::new();
    accounts.iter().for_each(|a| {
        let acc = ForAccount::new(a.id);
        accs.insert(a.id, acc);
        symbols
            .get_mut(&a.commodity_id)
            .unwrap()
            .accounts
            .push(a.id);
    });

    // Remove all symbols for which we have zero account, to limit the scope
    // of the following query.

    symbols.retain(|_, symb| !symb.accounts.is_empty());

    // Compute metrics

    let accs_ids = accs
        .iter()
        .map(|(id, _)| id.to_string())
        .collect::<Vec<_>>()
        .join(",");

    // ??? Also no point in getting too many points, so we should ignore if
    //    granularity is too small.  Perhaps should get the list of historical
    //    prices from alr_balances_currency instead.
    let query = format!(
        "SELECT * \
        FROM alr_roi r \
        WHERE r.account_id IN ({accs_ids}) \
        AND r.currency_id = {currency} \
        AND r.min_ts < '{max_ts}'
        AND '{min_ts}' < r.max_ts
        ORDER BY r.min_ts"
    );

    let rois = connection.exec::<Roi>("roi", &query)?;
    rois.iter().for_each(|r| {
        let a = accs.get_mut(&r.account_id).unwrap();
        let mi = Utc.from_utc_datetime(&r.min_ts);
        let ma = Utc.from_utc_datetime(&r.max_ts);

        if a.oldest.is_none() {
            // The oldest transaction is also the one that corresponds
            // to the minimal requested date from the user.
            a.oldest = Some(mi);
        }
        if mi <= min_ts && min_ts < ma {
            a.start = Position::new(r);
        }

        a.most_recent = Some(mi);
        a.end = Position::new(r);

        a.prices.push(Price {
            t: mi.timestamp_millis(),
            price: r.computed_price.unwrap_or(f32::NAN),
            roi: match r.roi {
                Some(val) => (val - 1.0) * 100.0,
                None => f32::NAN,
            },
            shares: r.shares.unwrap_or(f32::NAN),
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
            a.period_roi = (a.end.equity + a.end.gains - a.start.gains) / d2;
        }
    }

    Ok((symbols.into_values().collect::<Vec<_>>(), accs))
}
