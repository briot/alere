use super::*;
use serde::Deserialize;
use std::collections::{BTreeSet, HashMap};

#[derive(Deserialize)]
pub(super) struct NetworthQuery {
    currency: u32,
    dates: String,
}

#[derive(Deserialize)]
pub(super) struct MetricsQuery {
    mindate: String,
    maxdate: String,
    currency: u32,
    interval: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct LedgerQuery {
    mindate: Option<String>,
    maxdate: Option<String>,
    currency: u32,
}

#[derive(Deserialize)]
pub(super) struct QuotesQuery {
    currency: u32,
    accounts: Option<String>,
    commodities: Option<String>,
    mindate: Option<String>,
    maxdate: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct NetworthHistoryQuery {
    mindate: String,
    maxdate: String,
    groupby: String,
    currency: u32,
    scheduled: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct IncomeExpenseQuery {
    income: bool,
    expense: bool,
    currency: u32,
    mindate: String,
    maxdate: String,
}

#[derive(Deserialize)]
pub(super) struct MeanQuery {
    mindate: String,
    maxdate: String,
    prior: u32,
    after: u32,
    unrealized: Option<String>,
    currency: u32,
}

#[derive(Deserialize)]
pub(super) struct PriceHistoryQuery {
    currency: u32,
}

#[derive(Serialize)]
struct NetworthAccount {
    #[serde(rename = "accountId")]
    account_id: u16,
    shares: Vec<Option<f64>>,
    price: Vec<Option<f64>>,
}

fn parse_networth_dates(value: &str) -> Result<Vec<String>, String> {
    let dates: Vec<_> = value.split(',').map(str::trim).collect();
    if dates.is_empty() || dates.iter().any(|date| date.is_empty()) {
        return Err(
            "dates must be a comma-separated list of YYYY-MM-DD dates".into()
        );
    }

    dates
        .into_iter()
        .map(|date| {
            NaiveDate::parse_from_str(date, "%Y-%m-%d")
                .map(|_| date.to_owned())
                .map_err(|_| {
                    format!("invalid date {date:?}; expected YYYY-MM-DD")
                })
        })
        .collect()
}

pub(super) async fn networth(
    State(state): State<AppState>,
    Query(query): Query<NetworthQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let dates = parse_networth_dates(&query.dates)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::Networth {
                currency_id: query.currency,
                dates,
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    let result = receiver.await.map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "repository worker stopped before responding".to_owned(),
        )
    })?;
    result
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

pub(super) async fn metrics(
    State(state): State<AppState>,
    Query(query): Query<MetricsQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let dates =
        parse_networth_dates(&format!("{},{}", query.mindate, query.maxdate))
            .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    if dates[0] > dates[1] {
        return Err((
            StatusCode::BAD_REQUEST,
            "mindate must be on or before maxdate".to_owned(),
        ));
    }

    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::Metrics {
                currency_id: query.currency,
                mindate: dates[0].clone(),
                maxdate: dates[1].clone(),
                interval: query.interval,
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    let result = receiver.await.map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "repository worker stopped before responding".to_owned(),
        )
    })?;
    result
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

pub(super) async fn ledger(
    State(state): State<AppState>,
    Path(ids): Path<String>,
    Query(query): Query<LedgerQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mindate = query.mindate.as_deref().unwrap_or("1980-01-01");
    let maxdate = query.maxdate.as_deref().unwrap_or("2200-01-01");
    let dates = parse_networth_dates(&format!("{mindate},{maxdate}"))
        .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    if dates[0] > dates[1] {
        return Err((
            StatusCode::BAD_REQUEST,
            "mindate must be on or before maxdate".to_owned(),
        ));
    }
    let account_ids = ids
        .split(',')
        .map(|id| {
            id.parse::<u16>().map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    format!("invalid account id {id:?}"),
                )
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    if account_ids.is_empty() {
        return Ok(Json(json!([])));
    }
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::Ledger {
                account_ids,
                mindate: dates[0].clone(),
                maxdate: dates[1].clone(),
                currency_id: query.currency,
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

fn first_value(value: &MultiValue) -> Option<(f64, u16)> {
    value.iter().next().map(|v| {
        (
            v.amount.to_string().parse().unwrap_or(0.0),
            v.commodity.get_id().as_u32() as u16,
        )
    })
}

pub(super) fn ledger_json(
    repository: &Repository,
    account_ids: &[u16],
    mindate: &str,
    maxdate: &str,
    currency_id: u32,
) -> anyhow::Result<Value> {
    let mindate = NaiveDate::parse_from_str(mindate, "%Y-%m-%d")?;
    let maxdate = NaiveDate::parse_from_str(maxdate, "%Y-%m-%d")?;
    let reference_id = if account_ids.len() == 1 {
        account_ids[0]
    } else {
        u16::MAX
    };
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let mut prices = repository.market_prices(Some(currency.clone()));
    let mut running = Decimal::ZERO;
    let mut running_shares = Decimal::ZERO;
    let mut rows = Vec::new();
    for (index, transaction) in repository.transactions().iter().enumerate() {
        let splits = transaction.splits();
        let selected_splits = splits.iter().filter(|split| {
            account_ids.contains(&split.account.get_id().as_u16())
                && split.post_ts.date_naive() <= maxdate
        });
        let selected_in_range = splits.iter().any(|split| {
            account_ids.contains(&split.account.get_id().as_u16())
                && (mindate..=maxdate).contains(&split.post_ts.date_naive())
        });
        if selected_splits.count() == 0 {
            continue;
        }
        let date = transaction.timestamp().date_naive();
        let mut split_json = Vec::new();
        let mut tx_shares = Decimal::ZERO;
        let mut tx_amount = Decimal::ZERO;
        for split in splits.iter() {
            let amount = split.operation.value();
            let shares = split.operation.shares();
            let converted = prices.convert_multi_value(&amount, &split.post_ts);
            if converted.iter().any(|value| value.commodity != currency) {
                anyhow::bail!(
                    "cannot convert split for account {} on {} to currency {}",
                    split.account.get_id().as_u16(),
                    split.post_ts.format("%Y-%m-%d"),
                    currency_id
                );
            }
            let amount_num = decimal_in_currency(&converted, &currency)
                .to_string()
                .parse::<f64>()
                .unwrap_or(0.0);
            let (shares_num, _) =
                first_value(&shares).unwrap_or((0.0, currency_id as u16));
            if split.account.get_id().as_u16() == reference_id {
                tx_shares +=
                    Decimal::from_f64_retain(shares_num).unwrap_or_default();
                tx_amount +=
                    Decimal::from_f64_retain(amount_num).unwrap_or_default();
            }
            let reconcile = match &split.reconciled {
                alere_lib::transactions::ReconcileKind::New => "n",
                alere_lib::transactions::ReconcileKind::Cleared => "c",
                alere_lib::transactions::ReconcileKind::Reconciled(_) => "y",
            };
            split_json.push(json!({
                "accountId": split.account.get_id().as_u16(),
                "amount": amount_num,
                "currency": currency_id,
                "date": split.post_ts.format("%Y-%m-%d").to_string(),
                "payee": transaction.payee().map(|p| p.get_name().to_string()),
                "price": if shares_num == 0.0 { Value::Null } else { json!(amount_num / shares_num) },
                "reconcile": reconcile,
                "shares": shares_num,
            }));
        }
        running += tx_amount;
        running_shares += tx_shares;
        if selected_in_range {
            rows.push(json!({
                "id": index.to_string(),
                "occ": 0,
                "date": date.format("%Y-%m-%d").to_string(),
                "balance": running.to_string().parse::<f64>().unwrap_or(0.0),
                "balanceShares": running_shares.to_string().parse::<f64>().unwrap_or(0.0),
                "memo": transaction.memo().as_deref(),
                "checknum": transaction.check_number(),
                "recurring": false,
                "splits": split_json,
            }));
        }
    }
    Ok(Value::Array(rows))
}

fn decimal_json(value: Option<Decimal>) -> Value {
    value
        .and_then(|value| value.to_string().parse::<f64>().ok())
        .map_or(Value::Null, |value| json!(value))
}

fn performance_position(
    performance: &alere_lib::perf::Performance,
    currency: &Commodity,
) -> Value {
    let monetary = |value: &MultiValue| {
        value
            .iter()
            .find(|component| component.commodity == *currency)
            .map(|component| component.amount)
    };
    let shares = performance.shares.iter().next().map(|value| value.amount);
    json!({
        "avg_cost": decimal_json(performance.average_cost.as_ref().and_then(monetary)),
        "equity": decimal_json(monetary(&performance.equity)),
        "gains": decimal_json(monetary(&performance.realized)),
        "invested": decimal_json(monetary(&performance.invested)),
        "pl": decimal_json(monetary(&performance.pnl)),
        "roi": decimal_json(performance.roi),
        "shares": decimal_json(shares),
        "weighted_avg": decimal_json(performance.weighted_average.as_ref().and_then(monetary)),
    })
}

pub(super) async fn quotes(
    State(state): State<AppState>,
    Query(query): Query<QuotesQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mindate = query.mindate.as_deref().unwrap_or("1970-01-01");
    let maxdate = query.maxdate.as_deref().unwrap_or("2200-01-01");
    let dates = parse_networth_dates(&format!("{mindate},{maxdate}"))
        .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    if dates[0] > dates[1] {
        return Err((
            StatusCode::BAD_REQUEST,
            "mindate must be on or before maxdate".to_owned(),
        ));
    }
    let parse_ids = |value: Option<String>| -> Result<Option<Vec<u32>>, (StatusCode, String)> {
        value.map(|value| {
            value.split(',').map(|id| id.parse::<u32>().map_err(|_| {
                (StatusCode::BAD_REQUEST, format!("invalid id {id:?}"))
            })).collect()
        }).transpose()
    };
    let account_ids = parse_ids(query.accounts)?;
    let commodity_ids = parse_ids(query.commodities)?;
    let start_date = NaiveDate::parse_from_str(&dates[0], "%Y-%m-%d").unwrap();
    let end_date = NaiveDate::parse_from_str(&dates[1], "%Y-%m-%d").unwrap();
    let to_local = |date: NaiveDate| {
        Local
            .from_local_datetime(&date.and_hms_opt(23, 59, 59).unwrap())
            .single()
            .unwrap()
    };
    let start_at = to_local(start_date);
    let end_at = to_local(end_date).min(Local::now());

    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::Quotes {
                currency_id: query.currency,
                account_ids,
                commodity_ids,
                start_at: start_at.to_rfc3339(),
                end_at: end_at.to_rfc3339(),
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

pub(super) async fn networth_history(
    State(state): State<AppState>,
    Query(query): Query<NetworthHistoryQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let dates =
        parse_networth_dates(&format!("{},{}", query.mindate, query.maxdate))
            .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    if dates[0] > dates[1] {
        return Err((
            StatusCode::BAD_REQUEST,
            "mindate must be on or before maxdate".to_owned(),
        ));
    }
    let group_by = match query.groupby.as_str() {
        "days" => GroupByHistory::Days,
        "months" => GroupByHistory::Months,
        "years" => GroupByHistory::Years,
        other => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "unsupported groupby {other:?}; expected days, months, or years"
                ),
            ));
        }
    };
    // Recurring transactions are not represented in the Rust repository yet;
    // the legacy scheduled flag is accepted and ignored.
    let _include_scheduled = query
        .scheduled
        .as_deref()
        .is_some_and(|value| value == "true" || value == "1");
    let points = history_dates(&dates[0], &dates[1], group_by)
        .map_err(|error| (StatusCode::BAD_REQUEST, error.to_string()))?;
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::NetworthHistory {
                currency_id: query.currency,
                dates: points,
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

#[derive(Clone, Copy)]
enum GroupByHistory {
    Days,
    Months,
    Years,
}

fn history_dates(
    mindate: &str,
    maxdate: &str,
    group_by: GroupByHistory,
) -> anyhow::Result<Vec<String>> {
    use chrono::{Datelike, Duration, Months};
    let min = NaiveDate::parse_from_str(mindate, "%Y-%m-%d")?
        .max(NaiveDate::from_ymd_opt(1980, 1, 1).unwrap());
    let requested_max = NaiveDate::parse_from_str(maxdate, "%Y-%m-%d")?;
    let max = requested_max.min(Local::now().date_naive());
    if min > max {
        return Ok(Vec::new());
    }
    let mut dates = Vec::new();
    match group_by {
        GroupByHistory::Days => {
            let start = max
                .checked_sub_days(chrono::Days::new(365))
                .unwrap_or(min)
                .max(min);
            let mut date = start;
            while date <= max {
                dates.push(date);
                date += Duration::days(1);
            }
        }
        GroupByHistory::Months => {
            let mut month =
                NaiveDate::from_ymd_opt(min.year(), min.month(), 1).unwrap();
            loop {
                let next =
                    month.checked_add_months(Months::new(1)).unwrap_or(max);
                let end_of_month = next - Duration::days(1);
                if end_of_month >= min && end_of_month <= max {
                    dates.push(end_of_month);
                }
                if next > max || month >= max {
                    break;
                }
                month = next;
            }
            if dates.len() > 366 {
                dates.drain(..dates.len() - 366);
            }
        }
        GroupByHistory::Years => {
            let mut year = min.year();
            while year <= max.year() {
                let end_of_year =
                    NaiveDate::from_ymd_opt(year, 12, 31).unwrap();
                if end_of_year >= min && end_of_year <= max {
                    dates.push(end_of_year);
                }
                year += 1;
            }
            if dates.len() > 366 {
                dates.drain(..dates.len() - 366);
            }
        }
    }
    Ok(dates.into_iter().map(|date| date.to_string()).collect())
}

pub(super) fn networth_history_json(
    repository: &Repository,
    currency_id: u32,
    dates: &[String],
) -> anyhow::Result<Value> {
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let (values, _) = networth_totals(repository, &currency, dates)?;
    Ok(Value::Array(dates.iter().zip(values).map(|(date, amount)| json!({
        "date": date,
        "networth": amount.to_string().parse::<f64>().unwrap_or(0.0),
    })).collect()))
}

pub(super) fn quotes_json(
    repository: &Repository,
    currency_id: u32,
    account_ids: Option<&[u32]>,
    commodity_ids: Option<&[u32]>,
    start_at: &str,
    end_at: &str,
) -> anyhow::Result<Value> {
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let start_at =
        chrono::DateTime::parse_from_rfc3339(start_at)?.with_timezone(&Local);
    let end_at =
        chrono::DateTime::parse_from_rfc3339(end_at)?.with_timezone(&Local);
    let settings = alere_lib::perf::Settings {
        commodity: Some(currency.clone()),
    };
    let start =
        alere_lib::perf::Performance::load(repository, settings, start_at)?;
    let end = alere_lib::perf::Performance::load(
        repository,
        alere_lib::perf::Settings {
            commodity: Some(currency.clone()),
        },
        end_at,
    )?;
    let starts: std::collections::HashMap<u16, _> = start
        .into_iter()
        .map(|performance| (performance.account.get_id().as_u16(), performance))
        .collect();
    let mut symbols: std::collections::BTreeMap<u32, (Commodity, Vec<Value>)> =
        std::collections::BTreeMap::new();
    let now = Local::now();
    let mut history_by_timestamp =
        HashMap::<i64, HashMap<u16, (Decimal, Option<Decimal>, Decimal)>>::new(
        );
    for performance in end {
        let account_id = performance.account.get_id().as_u16();
        if account_ids.is_some_and(|ids| !ids.contains(&(account_id as u32))) {
            continue;
        }
        let Some(commodity) = performance.shares.commodity().or_else(|| {
            performance.price.as_ref().and_then(MultiValue::commodity)
        }) else {
            continue;
        };
        let commodity_id = commodity.get_id().as_u32();
        if commodity_ids.is_some_and(|ids| !ids.contains(&commodity_id)) {
            continue;
        }
        let start_perf = starts.get(&account_id);
        let start_pos = start_perf.map(|p| performance_position(p, &currency))
            .unwrap_or_else(|| json!({"avg_cost":null,"equity":0,"gains":0,"invested":0,"pl":0,"roi":null,"shares":0,"weighted_avg":null}));
        let end_pos = performance_position(&performance, &currency);
        let get_num = |position: &Value, field: &str| {
            position.get(field).and_then(Value::as_f64)
        };
        let denominator = get_num(&start_pos, "equity").unwrap_or(0.0)
            + get_num(&end_pos, "invested").unwrap_or(0.0)
            - get_num(&start_pos, "invested").unwrap_or(0.0);
        let period_roi = if denominator.abs() < 1e-6 {
            Value::Null
        } else {
            json!(
                (get_num(&end_pos, "equity").unwrap_or(0.0)
                    + get_num(&end_pos, "gains").unwrap_or(0.0)
                    - get_num(&start_pos, "gains").unwrap_or(0.0))
                    / denominator
            )
        };
        let account = repository
            .accounts()
            .iter()
            .find(|account| account.get_id() == performance.account.get_id())
            .unwrap();
        let transactions: Vec<_> = account.iter_transactions().collect();
        let oldest = transactions.iter().map(|tx| tx.timestamp()).min();
        let most_recent = transactions.iter().map(|tx| tx.timestamp()).max();
        let mut timestamps = BTreeSet::from([start_at, end_at]);
        timestamps.extend(
            repository
                .prices()
                .history_for_commodity(&commodity)
                .map(|(_, _, price)| price.timestamp)
                .filter(|timestamp| {
                    *timestamp >= start_at && *timestamp <= end_at
                }),
        );
        let mut price_rows = Vec::new();
        for timestamp in timestamps {
            let timestamp_key = timestamp.timestamp_millis();
            if !history_by_timestamp.contains_key(&timestamp_key) {
                let historical = alere_lib::perf::Performance::load(
                    repository,
                    alere_lib::perf::Settings {
                        commodity: Some(currency.clone()),
                    },
                    timestamp,
                )?;
                let values = historical
                    .into_iter()
                    .filter_map(|position| {
                        let price = position
                            .price
                            .as_ref()?
                            .iter()
                            .find(|value| value.commodity == currency)?
                            .amount;
                        let shares = position.shares.iter().next()?.amount;
                        Some((
                            position.account.get_id().as_u16(),
                            (price, position.roi, shares),
                        ))
                    })
                    .collect();
                history_by_timestamp.insert(timestamp_key, values);
            }
            if let Some((price, roi, shares)) = history_by_timestamp
                .get(&timestamp_key)
                .and_then(|positions| positions.get(&account_id))
            {
                price_rows.push(json!({
                    "t": timestamp_key,
                    "price": decimal_json(Some(*price)),
                    "roi": decimal_json(roi.map(|roi| (roi - Decimal::ONE) * Decimal::ONE_HUNDRED)),
                    "shares": decimal_json(Some(*shares)),
                }));
            }
        }
        let account_json = json!({
            "account": account_id,
            "start": start_pos,
            "end": end_pos,
            "oldest": oldest.map(|date| date.timestamp() as f64).unwrap_or(0.0),
            "most_recent": most_recent.map(|date| date.timestamp() as f64).unwrap_or(0.0),
            "now_for_annualized": now.timestamp(),
            "annualized_roi": decimal_json(performance.annualized_roi),
            "irr": decimal_json(performance.irr),
            "period_roi": period_roi,
            "prices": price_rows,
        });
        symbols
            .entry(commodity_id)
            .or_insert_with(|| (commodity.clone(), Vec::new()))
            .1
            .push(account_json);
    }
    let result = symbols.into_iter().map(|(id, (commodity, accounts))| json!({
        "id": id,
        "ticker": commodity.get_quote_symbol().unwrap_or_else(|| commodity.get_name().to_string()),
        "source": if commodity.get_quote_source().is_some() { 1 } else { 0 },
        "is_currency": commodity.is_currency(),
        "accounts": accounts,
    })).collect::<Vec<_>>();
    Ok(Value::Array(result))
}

pub(super) async fn income_expense(
    State(state): State<AppState>,
    Query(query): Query<IncomeExpenseQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let dates =
        parse_networth_dates(&format!("{},{}", query.mindate, query.maxdate))
            .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    if dates[0] > dates[1] {
        return Err((
            StatusCode::BAD_REQUEST,
            "mindate must be on or before maxdate".to_owned(),
        ));
    }
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::IncomeExpense {
                currency_id: query.currency,
                mindate: dates[0].clone(),
                maxdate: dates[1].clone(),
                income: query.income,
                expense: query.expense,
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

pub(super) fn income_expense_json(
    repository: &Repository,
    currency_id: u32,
    mindate: &str,
    maxdate: &str,
    include_income: bool,
    include_expense: bool,
) -> anyhow::Result<Value> {
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let min = NaiveDate::parse_from_str(mindate, "%Y-%m-%d")?;
    let max = NaiveDate::parse_from_str(maxdate, "%Y-%m-%d")?;
    let totals = alere_lib::metrics::realized_cashflow_per_account(
        repository,
        &currency,
        min,
        max,
        include_income,
        include_expense,
    )?;
    let items = totals
        .into_iter()
        .filter(|(_, amount)| !amount.is_zero())
        .map(|(account_id, amount)| {
            json!({
                "accountId": account_id,
                "value": (-amount).to_string().parse::<f64>().unwrap_or(0.0),
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({ "mindate": mindate, "maxdate": maxdate, "items": items }))
}

pub(super) async fn price_history(
    State(state): State<AppState>,
    Path(account_id): Path<u16>,
    Query(query): Query<PriceHistoryQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::PriceHistory {
                account_id,
                currency_id: query.currency,
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

pub(super) fn price_history_json(
    repository: &Repository,
    account_id: u16,
    currency_id: u32,
) -> anyhow::Result<Value> {
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let Some(account) = repository
        .accounts()
        .iter()
        .find(|account| account.get_id().as_u16() == account_id)
    else {
        return Ok(json!([]));
    };
    let mut origins = std::collections::BTreeMap::<u32, Commodity>::new();
    account.for_each_split(|split| {
        for value in split.operation.shares().iter() {
            origins
                .entry(value.commodity.get_id().as_u32())
                .or_insert(value.commodity);
        }
    });
    let mut rows = origins.values().flat_map(|origin| {
        repository.prices().history(origin, &currency).iter().map(|price| json!({
            "date": price.timestamp.format("%Y-%m-%d").to_string(),
            "price": price.price.to_string().parse::<f64>().unwrap_or(0.0),
        })).collect::<Vec<_>>()
    }).collect::<Vec<_>>();
    rows.sort_by(|a, b| a["date"].as_str().cmp(&b["date"].as_str()));
    Ok(Value::Array(rows))
}

pub(super) async fn mean(
    State(state): State<AppState>,
    Query(query): Query<MeanQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let dates =
        parse_networth_dates(&format!("{},{}", query.mindate, query.maxdate))
            .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    if dates[0] > dates[1] {
        return Err((
            StatusCode::BAD_REQUEST,
            "mindate must be on or before maxdate".to_owned(),
        ));
    }
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::Mean {
                currency_id: query.currency,
                mindate: dates[0].clone(),
                maxdate: dates[1].clone(),
                prior: query.prior.min(24),
                after: query.after.min(24),
                unrealized: query
                    .unrealized
                    .as_deref()
                    .is_some_and(|value| value == "true" || value == "1"),
            },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map(Json)
        .map_err(|error| (StatusCode::BAD_REQUEST, error))
}

pub(super) fn mean_json(
    repository: &Repository,
    currency_id: u32,
    mindate: &str,
    maxdate: &str,
    prior: u32,
    after: u32,
    include_unrealized: bool,
) -> anyhow::Result<Value> {
    use chrono::{Datelike, Duration, Months};
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let min = NaiveDate::parse_from_str(mindate, "%Y-%m-%d")?
        .max(NaiveDate::from_ymd_opt(1980, 1, 1).unwrap());
    let max = NaiveDate::parse_from_str(maxdate, "%Y-%m-%d")?
        .min(Local::now().date_naive());
    if min > max {
        return Ok(json!([]));
    }
    let expanded_min =
        min.checked_sub_months(Months::new(prior)).unwrap_or(min);
    let expanded_max = max
        .checked_add_months(Months::new(after))
        .unwrap_or(max)
        .min(Local::now().date_naive());
    let mut months = Vec::new();
    let mut first =
        NaiveDate::from_ymd_opt(expanded_min.year(), expanded_min.month(), 1)
            .unwrap();
    while first <= expanded_max {
        let next = first
            .checked_add_months(Months::new(1))
            .unwrap_or(expanded_max);
        let last = (next - Duration::days(1)).min(expanded_max);
        if last >= expanded_min {
            months.push(last);
        }
        if next <= first || next > expanded_max {
            break;
        }
        first = next;
    }
    if months.len() > 366 {
        months.drain(..months.len() - 366);
    }
    let prior_date = months
        .first()
        .copied()
        .unwrap_or(min)
        .checked_sub_months(Months::new(1))
        .unwrap_or(min);
    let mut valuation_dates = vec![prior_date.to_string()];
    valuation_dates.extend(months.iter().map(ToString::to_string));
    let (networth, _) =
        networth_totals(repository, &currency, &valuation_dates)?;
    let mut networth_delta = vec![Decimal::ZERO; months.len()];
    for index in 0..months.len() {
        networth_delta[index] = networth[index + 1] - networth[index];
    }
    let cashflow_by_month = alere_lib::metrics::realized_cashflow_per_month(
        repository,
        &currency,
        expanded_min,
        expanded_max,
    )?;
    let rows = months.iter().enumerate().map(|(index, date)| {
        let month = date.format("%Y-%m").to_string();
        let (income, expense) = cashflow_by_month
            .get(&month)
            .copied()
            .unwrap_or((Decimal::ZERO, Decimal::ZERO));
        let start = index.saturating_sub(prior as usize);
        let end = (index + after as usize + 1).min(months.len());
        let count = Decimal::from((end - start) as u32);
        let avg_income = (start..end).map(|i| {
            cashflow_by_month
                .get(&months[i].format("%Y-%m").to_string())
                .map(|values| values.0)
                .unwrap_or(Decimal::ZERO)
        }).sum::<Decimal>() / count;
        let avg_expense = (start..end).map(|i| {
            cashflow_by_month
                .get(&months[i].format("%Y-%m").to_string())
                .map(|values| values.1)
                .unwrap_or(Decimal::ZERO)
        }).sum::<Decimal>() / count;
        let avg_nw = networth_delta[start..end].iter().copied().sum::<Decimal>() / count;
        let delta = if include_unrealized { networth_delta[index] } else { Decimal::ZERO };
        let average_delta = if include_unrealized { avg_nw } else { Decimal::ZERO };
        json!({
            "date": month,
            "value_expenses": (-expense).to_string().parse::<f64>().unwrap_or(0.0),
            "average_expenses": (-avg_expense).to_string().parse::<f64>().unwrap_or(0.0),
            "value_realized": (-income).to_string().parse::<f64>().unwrap_or(0.0),
            "average_realized": (-avg_income).to_string().parse::<f64>().unwrap_or(0.0),
            "value_networth_delta": delta.to_string().parse::<f64>().unwrap_or(0.0),
            "average_networth_delta": average_delta.to_string().parse::<f64>().unwrap_or(0.0),
        })
    }).collect::<Vec<_>>();
    Ok(Value::Array(rows))
}

fn decimal_in_currency(value: &MultiValue, currency: &Commodity) -> Decimal {
    value
        .iter()
        .filter(|component| component.commodity == *currency)
        .map(|component| component.amount)
        .sum()
}

fn networth_totals(
    repository: &Repository,
    currency: &Commodity,
    dates: &[String],
) -> anyhow::Result<(Vec<Decimal>, Vec<Decimal>)> {
    let intervals = dates
        .iter()
        .cloned()
        .map(|date| Intv::UpTo(Instant::EndDay(date)))
        .collect();
    let networth = Networth::new(
        repository,
        Settings {
            hide_zero_rows: false,
            hide_all_same: false,
            group_by: GroupBy::None,
            subtotals: false,
            commodity: Some(currency.clone()),
            elide_boring_accounts: false,
            intervals,
        },
        Local::now(),
        |account| account.get_kind().is_networth(),
    )?;
    let mut total = vec![Decimal::ZERO; dates.len()];
    let mut liquid = vec![Decimal::ZERO; dates.len()];
    networth.tree.traverse(
        |node| {
            let Key::Account(account) = &node.data.key else {
                return Ok(());
            };
            let is_liquid = account.get_kind().is_liquid();
            for index in 0..dates.len() {
                let value = decimal_in_currency(
                    node.data.data.get_market_value(index)?,
                    currency,
                );
                total[index] += value;
                if is_liquid {
                    liquid[index] += value;
                }
            }
            Ok(())
        },
        true,
    )?;
    Ok((total, liquid))
}

pub(super) fn metrics_json(
    repository: &Repository,
    currency_id: u32,
    mindate: &str,
    maxdate: &str,
    period: Option<&str>,
) -> anyhow::Result<Value> {
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let fallback_interval = || -> anyhow::Result<Intv> {
        let min = NaiveDate::parse_from_str(mindate, "%Y-%m-%d")?;
        let max = NaiveDate::parse_from_str(maxdate, "%Y-%m-%d")?;
        let end = max.succ_opt().context("maxdate is out of range")?;
        Ok(Intv::Bounded {
            begin: Instant::StartDay(min.to_string()),
            end: Instant::StartDay(end.to_string()),
        })
    };
    let interval = match period.unwrap_or_default() {
        "1 day" => Intv::LastNDays(1),
        "1 month" => Intv::LastNMonths(1),
        "2 months" => Intv::LastNMonths(2),
        "3 months" => Intv::LastNMonths(3),
        "current month" => Intv::MonthAgo(0),
        "last month" => Intv::MonthAgo(-1),
        "1 year" => Intv::LastNYears(1),
        "2 years" => Intv::LastNYears(2),
        "3 years" => Intv::LastNYears(3),
        "4 years" => Intv::LastNYears(4),
        "5 years" => Intv::LastNYears(5),
        "current year so far" => Intv::YearToDate,
        "current year" => Intv::YearAgo(0),
        "last year" => Intv::YearAgo(1),
        "2 years ago" => Intv::YearAgo(2),
        "3 years ago" => Intv::YearAgo(3),
        "4 years ago" => Intv::YearAgo(4),
        "5 years ago" => Intv::YearAgo(5),
        _ => fallback_interval()?,
    };
    let mut metrics = alere_lib::metrics::Metrics::load(
        repository,
        alere_lib::metrics::Settings {
            commodity: Some(currency.clone()),
            intervals: vec![interval],
        },
        Local::now(),
    )?;
    let metric = metrics
        .pop()
        .context("metrics query returned no interval")?;
    let as_number =
        |value: Decimal| value.to_string().parse::<f64>().unwrap_or(0.0);
    let as_percent = |value: Option<Decimal>| {
        decimal_json(value.map(|ratio| ratio * Decimal::ONE_HUNDRED))
    };
    Ok(json!({
        "income": as_number(decimal_in_currency(&(-&metric.income), &currency)),
        "passive_income": as_number(decimal_in_currency(&(-&metric.passive_income), &currency)),
        "work_income": as_number(decimal_in_currency(&(-&metric.work_income), &currency)),
        "expenses": as_number(decimal_in_currency(&metric.expense, &currency)),
        "income_taxes": as_number(decimal_in_currency(&metric.income_tax, &currency)),
        "other_taxes": as_number(decimal_in_currency(&metric.misc_tax, &currency)),
        "networth": as_number(decimal_in_currency(&metric.end_networth, &currency)),
        "networth_start": as_number(decimal_in_currency(&metric.start_networth, &currency)),
        "liquid_assets": as_number(decimal_in_currency(&metric.end_networth_liquid, &currency)),
        "liquid_assets_at_start": as_number(decimal_in_currency(&metric.start_networth_liquid, &currency)),
        "unrealized": as_number(decimal_in_currency(&metric.unrealized, &currency)),
        "unrealized_liquid": as_number(decimal_in_currency(&metric.unrealized_liquid, &currency)),
        "pnl_illiquid": as_number(decimal_in_currency(&metric.pnl_illiquid, &currency)),
        "saving_rate": as_percent(metric.saving_rate),
        "saving_rate_realized": as_percent(metric.saving_rate_realized),
        "financial_independence": as_percent(metric.financial_independence),
        "passive_income_ratio": as_percent(metric.passive_income_ratio),
        "roi": as_percent(metric.roi),
        "roi_liquid": as_percent(metric.roi_liquid),
        "income_tax_rate": as_percent(metric.income_tax_rate),
        "emergency_fund": alere_lib::metrics::format_duration(&metric.emergency_fund),
        "wealth": alere_lib::metrics::format_duration(&metric.wealth),
    }))
}

pub(super) fn networth_json(
    repository: &Repository,
    currency_id: u32,
    date_strings: &[String],
) -> anyhow::Result<Value> {
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let intervals = date_strings
        .iter()
        .cloned()
        .map(|date| Intv::UpTo(Instant::EndDay(date)))
        .collect();
    let networth = Networth::new(
        repository,
        Settings {
            hide_zero_rows: false,
            hide_all_same: false,
            group_by: GroupBy::None,
            subtotals: false,
            commodity: Some(currency.clone()),
            elide_boring_accounts: false,
            intervals,
        },
        Local::now(),
        |account| account.get_kind().is_networth(),
    )?;

    let mut accounts = Vec::new();
    networth.tree.traverse(
        |node| {
            let Key::Account(account) = &node.data.key else {
                return Ok(());
            };

            let mut shares = Vec::with_capacity(date_strings.len());
            let mut prices = Vec::with_capacity(date_strings.len());
            for index in 0..date_strings.len() {
                let balance = node.data.data.get_value(index)?;
                let market_value = node.data.data.get_market_value(index)?;
                let share_value = account
                    .get_display_commodity()
                    .and_then(|commodity| {
                        balance
                            .iter()
                            .find(|value| value.commodity == commodity)
                            .map(|value| value.amount)
                    })
                    .or_else(|| {
                        let mut values = balance.iter();
                        let first = values.next()?;
                        values.next().is_none().then_some(first.amount)
                    });
                let converted_value = market_value
                    .iter()
                    .find(|value| value.commodity == currency)
                    .map(|value| value.amount);

                match (share_value, converted_value) {
                    (Some(shares_at_date), Some(value_at_date))
                        if !shares_at_date.is_zero() =>
                    {
                        shares.push(shares_at_date.to_string().parse().ok());
                        prices.push(
                            (value_at_date / shares_at_date)
                                .to_string()
                                .parse()
                                .ok(),
                        );
                    }
                    (Some(shares_at_date), Some(value_at_date))
                        if shares_at_date.is_zero()
                            && !account.get_kind().is_stock() =>
                    {
                        shares.push(value_at_date.to_string().parse().ok());
                        prices.push(Some(1.0));
                    }
                    (None, Some(value_at_date))
                        if !account.get_kind().is_stock() =>
                    {
                        // For a non-stock account with several commodities,
                        // report its converted total as shares at unit price.
                        shares.push(value_at_date.to_string().parse().ok());
                        prices.push(Some(1.0));
                    }
                    _ => {
                        shares.push(None);
                        prices.push(None);
                    }
                }
            }
            accounts.push(NetworthAccount {
                account_id: account.get_id().as_u16(),
                shares,
                price: prices,
            });
            Ok(())
        },
        true,
    )?;

    Ok(serde_json::to_value(accounts)?)
}
