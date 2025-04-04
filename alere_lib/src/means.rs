use crate::connections::SqliteConnect;
use crate::dates::{DateRange, GroupBy};
use crate::errors::AlrResult;
use crate::models::CommodityId;
use crate::occurrences::Occurrences;
use crate::scenarios::NO_SCENARIO;
use chrono::{DateTime, Datelike, NaiveDate, Utc};
use log::info;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct Point {
    date: NaiveDate, // one per month
    value_expenses: f32,
    average_expenses: f32,
    value_realized: f32,
    value_networth_delta: f32,
    average_networth_delta: f32,
}

pub fn mean(
    mut connection: SqliteConnect,
    min_ts: DateTime<Utc>,
    max_ts: DateTime<Utc>,
    currency: CommodityId,
    prior: u8,
    after: u8,
    unrealized: bool,
) -> AlrResult<Vec<Point>> {
    info!(
        "mean {:?} {:?} prior={} after={} unrealized={} {}",
        &min_ts, &max_ts, prior, after, unrealized, currency
    );

    let dates = DateRange::new(Some(min_ts), Some(max_ts), GroupBy::MONTHS).restrict_to_splits(
        &mut connection,
        NO_SCENARIO,
        &Occurrences::no_recurrence(),
    );

    // The "unrealized" part must be computed from variations in the
    // networth since the variation in prices, for instance, are not
    // recorded as explicit transaction.

    // month => (delta, average)
    let mut unreal = HashMap::new();
    if unrealized {
        let points = crate::metrics::query_networth_history(
            &mut connection,
            &dates,
            currency,
            NO_SCENARIO,
            &Occurrences::no_recurrence(),
            prior,
            after,
        )?;
        for p in &points {
            unreal.insert(
                NaiveDate::from_ymd_opt(p.date.year(), p.date.month(), 1).unwrap(),
                (p.diff, p.average),
            );
        }
    }

    let cashflow = crate::cashflow::monthly_cashflow(
        &mut connection,
        &dates,
        currency,
        NO_SCENARIO,
        &Occurrences::no_recurrence(),
        prior,
        after,
    );

    let mut result = Vec::new();
    for c in cashflow.iter() {
        let u = unreal.get(&c.month).unwrap_or(&(0.0, 0.0));
        result.push(Point {
            date: c.month,
            value_expenses: -c.exp_total.unwrap_or(f32::NAN),
            average_expenses: -c.exp_average.unwrap_or(f32::NAN),
            value_realized: -c.realized_inc_total.unwrap_or(f32::NAN),
            value_networth_delta: u.0,
            average_networth_delta: u.1,
        });
    }
    Ok(result)
}
