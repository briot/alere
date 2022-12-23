use alere_lib::dates::{DateRange, GroupBy};
use alere_lib::models::CommodityId;
use alere_lib::occurrences::Occurrences;
use alere_lib::scenarios::NO_SCENARIO;
use chrono::{NaiveDate, DateTime, Utc, Datelike};
use crate::connections::get_connection;
use log::info;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct Point {
    date: NaiveDate,
    value_expenses: f32,
    average_expenses: f32,
    value_realized: f32,
    value_networth_delta: f32,
    average_networth_delta: f32,
}


#[tauri::command]
pub async fn mean(
    mindate: DateTime<Utc>,
    maxdate: DateTime<Utc>,
    currency: CommodityId,
    prior: u8,
    after: u8,
    unrealized: bool,
) -> Vec<Point> {
    info!("mean {:?} {:?} prior={} after={} unrealized={} {}",
          &mindate, &maxdate, prior, after, unrealized, currency);

    let connection = get_connection();

    let dates = DateRange::new(
        Some(mindate.date_naive()),
        Some(maxdate.date_naive()),
        GroupBy::MONTHS,
    ).restrict_to_splits(
        &connection,
        NO_SCENARIO,
        &Occurrences::no_recurrence(),
    );

    // The "unrealized" part must be computed from variations in the
    // networth since the variation in prices, for instance, are not
    // recorded as explicit transaction.

    // month => (delta, average)
    let mut unreal = HashMap::new();
    if unrealized {
        let points = super::metrics::query_networth_history(
            &connection,
            &dates,
            currency,
            NO_SCENARIO,
            &Occurrences::no_recurrence(),
            prior,
            after,
        );
        for p in &points {
            unreal.insert(
                NaiveDate::from_ymd_opt(
                    p.date.year(), p.date.month(), 1).unwrap(),
                (p.diff, p.average)
            );
        }
    }

    let cashflow = super::cashflow::monthly_cashflow(
        &connection,
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
    result
}
