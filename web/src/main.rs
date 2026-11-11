use alere_lib::{
    account_kinds::AccountKind,
    accounts::{Account, AccountNameDepth},
    commodities::Commodity,
    importers::Importer,
    kmymoney::KmyMoneyImporter,
    multi_values::MultiValue,
    networth::{GroupBy, Networth, Settings},
    repositories::Repository,
    times::{Instant, Intv},
    tree_keys::Key,
};
use anyhow::Context;
use axum::{
    Json, Router,
    body::Body,
    extract::{DefaultBodyLimit, Multipart, Path, Query, State},
    http::StatusCode,
    http::{Request, Uri, header},
    middleware::{self, Next},
    response::Response,
    routing::{get, post},
};
use chrono::{Local, NaiveDate, TimeZone};
use rust_decimal::Decimal;
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, mpsc},
};
use tokio::sync::{RwLock, oneshot};

#[derive(RustEmbed)]
#[folder = "../dist/"]
struct FrontendAssets;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Clone)]
struct AppState {
    account_list: Arc<RwLock<Value>>,
    repository_requests: mpsc::Sender<RepositoryRequest>,
}

enum RepositoryCommand {
    Networth {
        currency_id: u32,
        dates: Vec<String>,
    },
    Metrics {
        currency_id: u32,
        mindate: String,
        maxdate: String,
        interval: Option<String>,
    },
    Ledger {
        account_ids: Vec<u16>,
        mindate: String,
        maxdate: String,
        currency_id: u32,
    },
    Quotes {
        currency_id: u32,
        account_ids: Option<Vec<u32>>,
        commodity_ids: Option<Vec<u32>>,
        start_at: String,
        end_at: String,
    },
    NetworthHistory {
        currency_id: u32,
        dates: Vec<String>,
    },
    IncomeExpense {
        currency_id: u32,
        mindate: String,
        maxdate: String,
        income: bool,
        expense: bool,
    },
    PriceHistory {
        account_id: u16,
        currency_id: u32,
    },
    PriceSources,
    Mean {
        currency_id: u32,
        mindate: String,
        maxdate: String,
        prior: u32,
        after: u32,
        unrealized: bool,
    },
    EditAccount {
        account: Value,
    },
    ImportKmymoney {
        path: PathBuf,
    },
    OnlineSymbols,
    AddOnlinePrices {
        prices: Vec<(u32, Decimal, String)>,
    },
}

struct RepositoryRequest {
    command: RepositoryCommand,
    response: oneshot::Sender<Result<Value, String>>,
}

#[derive(Deserialize)]
struct NetworthQuery {
    currency: u32,
    dates: String,
}

#[derive(Deserialize)]
struct MetricsQuery {
    mindate: String,
    maxdate: String,
    currency: u32,
    interval: Option<String>,
}

#[derive(Deserialize)]
struct LedgerQuery {
    mindate: Option<String>,
    maxdate: Option<String>,
    currency: u32,
}

#[derive(Deserialize)]
struct QuotesQuery {
    currency: u32,
    accounts: Option<String>,
    commodities: Option<String>,
    mindate: Option<String>,
    maxdate: Option<String>,
}

#[derive(Deserialize)]
struct NetworthHistoryQuery {
    mindate: String,
    maxdate: String,
    groupby: String,
    currency: u32,
    scheduled: Option<String>,
}

#[derive(Deserialize)]
struct IncomeExpenseQuery {
    income: bool,
    expense: bool,
    currency: u32,
    mindate: String,
    maxdate: String,
}

#[derive(Deserialize)]
struct MeanQuery {
    mindate: String,
    maxdate: String,
    prior: u32,
    after: u32,
    unrealized: Option<String>,
    currency: u32,
}

#[derive(Deserialize)]
struct PriceHistoryQuery {
    currency: u32,
}

#[derive(Serialize)]
struct NetworthAccount {
    #[serde(rename = "accountId")]
    account_id: u16,
    shares: Vec<Option<f64>>,
    price: Vec<Option<f64>>,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

fn commodity_json(commodity: &Commodity) -> Value {
    let symbol = commodity.get_symbol().to_string();
    let symbol_after = commodity.symbol_after();
    let precision = commodity.get_display_precision();
    let scale = 10_u32.checked_pow(u32::from(precision)).unwrap_or(1);

    json!({
        "id": commodity.get_id().as_u32(),
        "name": commodity.get_name().as_str(),
        "symbol_before": if symbol_after { "" } else { &symbol },
        "symbol_after": if symbol_after { &symbol } else { "" },
        "price_scale": scale,
        "is_currency": commodity.is_currency(),
    })
}

fn account_json(account: &Account, repository: &Repository) -> Value {
    let kind = account.get_kind();
    let display_commodity = account.get_display_commodity();
    let commodity_scu = display_commodity
        .as_ref()
        .and_then(|commodity| {
            10_u32.checked_pow(u32::from(commodity.get_display_precision()))
        })
        .unwrap_or(1);
    let institution = account.get_institution();
    let institution_id = institution.as_ref().and_then(|account_institution| {
        repository
            .institutions()
            .iter()
            .position(|item| item == account_institution)
            .map(|index| index as u32 + 1)
    });
    let last_reconciled = account
        .iter_reconciliations()
        .map(|reconciliation| {
            reconciliation.timestamp.format("%Y-%m-%d").to_string()
        })
        .last();

    json!({
        "id": account.get_id().as_u16(),
        "name": account.name(AccountNameDepth::basename()),
        "description": account.get_description(),
        "account_num": account.get_number(),
        "favorite": false,
        "commodityId": display_commodity.map(|commodity| commodity.get_id().as_u32()).unwrap_or(0),
        "commodity_scu": commodity_scu,
        "kindId": kind.get_name(),
        "closed": account.is_closed(),
        "iban": account.get_iban(),
        "parent": account.get_parent().map(|parent| parent.get_id().as_u16()),
        "opening_date": account.get_opened_on()
            .map(|date| date.format("%Y-%m-%d").to_string())
            .unwrap_or_default(),
        "lastReconciled": last_reconciled,
        "institution": institution_id,
    })
}

fn account_kind_json(kind: &AccountKind) -> Value {
    json!({
        "id": kind.get_name(),
        "name": kind.get_name(),
        "positive": kind.get_name_when_positive(),
        "negative": kind.get_name_when_negative(),
        "category": kind.get_category() as u8,
        "is_work_income": kind.is_work_income(),
        "is_passive_income": kind.is_passive_income(),
        "is_unrealized": kind.is_unrealized(),
        "is_networth": kind.is_networth(),
        "is_stock": kind.is_stock(),
        "is_income_tax": kind.is_income_tax(),
        "is_misc_tax": kind.is_misc_tax(),
        "is_trading": kind.is_trading(),
    })
}

fn account_list_json(repository: &Repository) -> Value {
    let accounts: Vec<_> = repository
        .accounts()
        .iter()
        .map(|account| account_json(&account, repository))
        .collect();
    let commodities: Vec<_> = repository
        .commodities
        .iter_commodities()
        .map(commodity_json)
        .collect();
    let account_kinds: Vec<_> = repository
        .account_kinds()
        .iter()
        .map(account_kind_json)
        .collect();
    let institutions: Vec<_> = repository
        .institutions()
        .iter()
        .enumerate()
        .map(|(index, institution)| {
            json!({
                "id": index as u32 + 1,
                "name": institution.get_name(),
                "icon": institution.get_icon(),
            })
        })
        .collect();

    json!([accounts, commodities, account_kinds, institutions])
}

async fn account_list(State(state): State<AppState>) -> Json<Value> {
    Json(state.account_list.read().await.clone())
}

async fn account_edit(
    State(state): State<AppState>,
    Json(account): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::EditAccount { account },
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    let accounts = receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    *state.account_list.write().await = accounts;
    Ok(Json(Value::Null))
}

fn edit_account_json(
    repository: &Repository,
    data: &Value,
) -> anyhow::Result<Value> {
    let id = data
        .get("id")
        .and_then(Value::as_u64)
        .context("account id is required")? as u16;
    let mut account = repository
        .accounts()
        .iter()
        .find(|account| account.get_id().as_u16() == id)
        .with_context(|| format!("unknown account id {id}"))?;
    let name = data
        .get("name")
        .and_then(Value::as_str)
        .context("account name is required")?;
    let kind_name = data
        .get("kindId")
        .and_then(Value::as_str)
        .context("kindId is required")?;
    let kind = repository
        .account_kinds()
        .lookup(kind_name)
        .with_context(|| format!("unknown account kind {kind_name:?}"))?
        .clone();
    account.set_name(name);
    account.set_kind(kind);
    account.set_description(
        data.get("description")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty()),
    );
    account.set_number(
        data.get("account_num")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty()),
    );
    account
        .set_iban(data.get("iban").and_then(Value::as_str).unwrap_or_default());
    if let Some(parent_id) = data.get("parent").and_then(Value::as_u64) {
        let parent_id = parent_id as u16;
        let parent = repository
            .accounts()
            .iter()
            .find(|candidate| candidate.get_id().as_u16() == parent_id)
            .with_context(|| {
                format!("unknown parent account id {parent_id}")
            })?;
        account.set_parent(parent);
    }
    if let Some(opened) = data
        .get("opening_date")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
    {
        let date = NaiveDate::parse_from_str(opened, "%Y-%m-%d")?;
        let timestamp = Local
            .from_local_datetime(&date.and_hms_opt(0, 0, 0).unwrap())
            .single()
            .context("opening date is ambiguous in local time")?;
        account.set_opened_on(Some(timestamp));
    } else {
        account.set_opened_on(None);
    }
    account.set_closed(
        data.get("closed").and_then(Value::as_bool).unwrap_or(false),
    );
    let institution = data
        .get("institution")
        .and_then(Value::as_u64)
        .map(|id| id as usize);
    let institution = institution
        .and_then(|id| id.checked_sub(1))
        .and_then(|index| repository.institutions().iter().nth(index).cloned());
    account.set_institution(institution);
    Ok(account_list_json(repository))
}

async fn import_kmymoney(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<Value>, (StatusCode, String)> {
    let mut file_data = None;
    while let Some(field) = multipart.next_field().await.map_err(|error| {
        (StatusCode::BAD_REQUEST, format!("read upload: {error}"))
    })? {
        if field.name() == Some("file") {
            file_data = Some(field.bytes().await.map_err(|error| {
                (
                    StatusCode::BAD_REQUEST,
                    format!("read uploaded file: {error}"),
                )
            })?);
            break;
        }
    }
    let file_data = file_data.ok_or((
        StatusCode::BAD_REQUEST,
        "multipart field 'file' is required".to_owned(),
    ))?;
    static UPLOAD_ID: std::sync::atomic::AtomicU64 =
        std::sync::atomic::AtomicU64::new(0);
    let path = std::env::temp_dir().join(format!(
        "alere-import-{}-{}.kmy",
        std::process::id(),
        UPLOAD_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    ));
    std::fs::write(&path, &file_data).map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("save uploaded file: {error}"),
        )
    })?;
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::ImportKmymoney { path: path.clone() },
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
    let _ = std::fs::remove_file(&path);
    let accounts = result.map_err(|error| (StatusCode::BAD_REQUEST, error))?;
    *state.account_list.write().await = accounts;
    Ok(Json(json!({ "success": true })))
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

async fn networth(
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

async fn metrics(
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

async fn ledger(
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

fn ledger_json(
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

async fn quotes(
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

async fn networth_history(
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

fn networth_history_json(
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

fn quotes_json(
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
        let end_price = performance.price.as_ref().and_then(|value| {
            value
                .iter()
                .find(|v| v.commodity == currency)
                .map(|v| v.amount)
        });
        let price_rows = end_price.map(|price| vec![json!({
            "t": end_at.timestamp_millis(),
            "price": decimal_json(Some(price)),
            "roi": decimal_json(performance.roi.map(|roi| (roi - Decimal::ONE) * Decimal::ONE_HUNDRED)),
            "shares": decimal_json(performance.shares.iter().next().map(|v| v.amount)),
        })]).unwrap_or_default();
        let account_json = json!({
            "account": account_id,
            "start": start_pos,
            "end": end_pos,
            "oldest": oldest.map(|date| date.timestamp() as f64).unwrap_or(0.0),
            "most_recent": most_recent.map(|date| date.timestamp() as f64).unwrap_or(0.0),
            "now_for_annualized": now.timestamp(),
            "annualized_roi": decimal_json(performance.annualized_roi),
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

async fn income_expense(
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

fn income_expense_json(
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

async fn price_history(
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

fn price_history_json(
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

async fn mean(
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

fn mean_json(
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

fn price_sources_json(repository: &Repository) -> Value {
    let mut sources = serde_json::Map::new();
    for source in repository.price_sources().iter() {
        let id = source.get_id().as_u8();
        sources.insert(
            id.to_string(),
            json!({ "id": id, "name": source.get_name().to_string() }),
        );
    }
    Value::Object(sources)
}

async fn price_sources(
    State(state): State<AppState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::PriceSources,
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
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error))
}

async fn online_update(
    State(state): State<AppState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::OnlineSymbols,
            response,
        })
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker is unavailable".to_owned(),
            )
        })?;
    let symbols = receiver
        .await
        .map_err(|_| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                "repository worker stopped before responding".to_owned(),
            )
        })?
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error))?;
    let symbols: Vec<(u32, String)> = symbols
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|row| {
            Some((
                row.get("id")?.as_u64()? as u32,
                row.get("symbol")?.as_str()?.to_owned(),
            ))
        })
        .collect();
    if symbols.is_empty() {
        return Ok(Json(json!("")));
    }

    use stock_importer::StockSource;
    let source = stock_importer::YahooFinance::new().map_err(|error| {
        (
            StatusCode::BAD_GATEWAY,
            format!("initialize Yahoo Finance client: {error}"),
        )
    })?;
    let results = futures::future::join_all(
        symbols.iter().map(|(_, symbol)| source.fetch_price(symbol)),
    )
    .await;
    let mut updates = Vec::new();
    let mut failures = Vec::new();
    for ((commodity_id, symbol), result) in symbols.into_iter().zip(results) {
        match result {
            Ok(price) => {
                if let Some(amount) = Decimal::from_f64_retain(price.price) {
                    updates.push((
                        commodity_id,
                        amount,
                        price.timestamp.to_rfc3339(),
                    ));
                } else {
                    failures.push(format!("{symbol}: invalid price"));
                }
            }
            Err(error) => failures.push(format!("{symbol}: {error}")),
        }
    }
    if updates.is_empty() && !failures.is_empty() {
        return Err((StatusCode::BAD_GATEWAY, failures.join("; ")));
    }
    for warning in &failures {
        eprintln!("Online price update failed: {warning}");
    }
    let (response, receiver) = oneshot::channel();
    state
        .repository_requests
        .send(RepositoryRequest {
            command: RepositoryCommand::AddOnlinePrices { prices: updates },
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
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error))?;
    Ok(Json(json!("")))
}

fn online_symbols_json(repository: &Repository) -> Value {
    let balances = repository.compute_commodity_balances();
    let symbols = repository
        .commodities
        .iter_commodities()
        .filter_map(|commodity| {
            if commodity.is_currency() {
                return None;
            }
            let quote_source = commodity.get_quote_source()?;
            if !quote_source.to_ascii_lowercase().contains("yahoo") {
                return None;
            }
            let symbol = commodity.get_quote_symbol()?;
            if balances.get(commodity).copied().unwrap_or_default()
                <= Decimal::ZERO
            {
                return None;
            }
            Some(json!({"id": commodity.get_id().as_u32(), "symbol": symbol}))
        })
        .collect::<Vec<_>>();
    Value::Array(symbols)
}

fn add_online_prices(
    repository: &mut Repository,
    prices: Vec<(u32, Decimal, String)>,
) -> anyhow::Result<()> {
    use alere_lib::{price_sources::PriceSourceFrom, prices::Price};
    let target = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == 1)
        .cloned()
        .context("default currency id 1 is missing")?;
    for (commodity_id, amount, timestamp) in prices {
        let Some(origin) = repository
            .commodities
            .iter_commodities()
            .find(|commodity| commodity.get_id().as_u32() == commodity_id)
            .cloned()
        else {
            continue;
        };
        let timestamp = chrono::DateTime::parse_from_rfc3339(&timestamp)?
            .with_timezone(&Local);
        repository.add_price(
            &origin,
            &target,
            Price::new(timestamp, amount, PriceSourceFrom::Transaction),
        );
    }
    Ok(())
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

fn metrics_json(
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
        "last year" => Intv::YearAgo(-1),
        "2 years ago" => Intv::YearAgo(-2),
        "3 years ago" => Intv::YearAgo(-3),
        "4 years ago" => Intv::YearAgo(-4),
        "5 years ago" => Intv::YearAgo(-5),
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
        "financial_independence": as_percent(metric.financial_independence),
        "passive_income_ratio": as_percent(metric.passive_income_ratio),
        "roi": as_percent(metric.roi),
        "roi_liquid": as_percent(metric.roi_liquid),
        "income_tax_rate": as_percent(metric.income_tax_rate),
        "emergency_fund": alere_lib::metrics::format_duration(&metric.emergency_fund),
        "wealth": alere_lib::metrics::format_duration(&metric.wealth),
    }))
}

fn networth_json(
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

fn start_repository_worker(
    input: PathBuf,
) -> anyhow::Result<(Value, mpsc::Sender<RepositoryRequest>)> {
    let (request_sender, request_receiver) =
        mpsc::channel::<RepositoryRequest>();
    let (ready_sender, ready_receiver) = mpsc::channel();
    std::thread::Builder::new()
        .name("alere-repository".to_owned())
        .spawn(move || {
            let mut importer = KmyMoneyImporter::default();
            let repository = futures::executor::block_on(
                importer.import_file(&input, |_, _| {}),
            );
            let mut repository = match repository {
                Ok(repository) => repository,
                Err(error) => {
                    let _ = ready_sender.send(Err(error.to_string()));
                    return;
                }
            };
            if ready_sender
                .send(Ok(account_list_json(&repository)))
                .is_err()
            {
                return;
            }

            while let Ok(request) = request_receiver.recv() {
                let result = match request.command {
                    RepositoryCommand::Networth { currency_id, dates } => {
                        networth_json(&repository, currency_id, &dates).map_err(
                            |error| format!("compute net worth: {error:#}"),
                        )
                    }
                    RepositoryCommand::Metrics {
                        currency_id,
                        mindate,
                        maxdate,
                        interval,
                    } => metrics_json(
                        &repository,
                        currency_id,
                        &mindate,
                        &maxdate,
                        interval.as_deref(),
                    )
                    .map_err(|error| format!("compute metrics: {error:#}")),
                    RepositoryCommand::Ledger {
                        account_ids,
                        mindate,
                        maxdate,
                        currency_id,
                    } => ledger_json(
                        &repository,
                        &account_ids,
                        &mindate,
                        &maxdate,
                        currency_id,
                    )
                    .map_err(|error| format!("compute ledger: {error:#}")),
                    RepositoryCommand::Quotes {
                        currency_id,
                        account_ids,
                        commodity_ids,
                        start_at,
                        end_at,
                    } => quotes_json(
                        &repository,
                        currency_id,
                        account_ids.as_deref(),
                        commodity_ids.as_deref(),
                        &start_at,
                        &end_at,
                    )
                    .map_err(|error| format!("compute quotes: {error:#}")),
                    RepositoryCommand::NetworthHistory {
                        currency_id,
                        dates,
                    } => {
                        networth_history_json(&repository, currency_id, &dates)
                            .map_err(|error| {
                                format!("compute net worth history: {error:#}")
                            })
                    }
                    RepositoryCommand::IncomeExpense {
                        currency_id,
                        mindate,
                        maxdate,
                        income,
                        expense,
                    } => income_expense_json(
                        &repository,
                        currency_id,
                        &mindate,
                        &maxdate,
                        income,
                        expense,
                    )
                    .map_err(|error| {
                        format!("compute income/expense: {error:#}")
                    }),
                    RepositoryCommand::PriceHistory {
                        account_id,
                        currency_id,
                    } => {
                        price_history_json(&repository, account_id, currency_id)
                            .map_err(|error| {
                                format!("compute price history: {error:#}")
                            })
                    }
                    RepositoryCommand::PriceSources => {
                        Ok(price_sources_json(&repository))
                    }
                    RepositoryCommand::OnlineSymbols => {
                        Ok(online_symbols_json(&repository))
                    }
                    RepositoryCommand::AddOnlinePrices { prices } => {
                        add_online_prices(&mut repository, prices)
                            .map(|()| json!(""))
                            .map_err(|error| {
                                format!("apply online prices: {error:#}")
                            })
                    }
                    RepositoryCommand::Mean {
                        currency_id,
                        mindate,
                        maxdate,
                        prior,
                        after,
                        unrealized,
                    } => mean_json(
                        &repository,
                        currency_id,
                        &mindate,
                        &maxdate,
                        prior,
                        after,
                        unrealized,
                    )
                    .map_err(|error| format!("compute means: {error:#}")),
                    RepositoryCommand::EditAccount { account } => {
                        edit_account_json(&repository, &account)
                            .map_err(|error| format!("edit account: {error:#}"))
                    }
                    RepositoryCommand::ImportKmymoney { path } => {
                        let imported = futures::executor::block_on(
                            importer.import_file(&path, |_, _| {}),
                        );
                        let _ = std::fs::remove_file(&path);
                        match imported {
                            Ok(new_repository) => {
                                repository = new_repository;
                                Ok(account_list_json(&repository))
                            }
                            Err(error) => {
                                Err(format!("import KMyMoney file: {error:#}"))
                            }
                        }
                    }
                };
                let _ = request.response.send(result);
            }
        })?;

    let account_list = ready_receiver
        .recv()
        .context("repository worker stopped during startup")?
        .map_err(anyhow::Error::msg)?;
    Ok((account_list, request_sender))
}

async fn log_request(request: Request<Body>, next: Next) -> Response<Body> {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let response = next.run(request).await;
    let missing = missing_query_parameters(uri.path(), uri.query());
    if missing.is_empty() {
        println!("{method} {uri} -> {}", response.status());
    } else {
        println!(
            "{method} {uri} -> {} (missing parameters: {})",
            response.status(),
            missing.join(", ")
        );
    }
    response
}

fn missing_query_parameters(
    path: &str,
    query: Option<&str>,
) -> Vec<&'static str> {
    let required: &[&str] = match path {
        "/api/plots/networth" => &["currency", "dates"],
        "/api/metrics" => &["mindate", "maxdate", "currency"],
        "/api/quotes" => &["currency"],
        "/api/networth_history" => {
            &["mindate", "maxdate", "groupby", "currency"]
        }
        "/api/incomeexpense" => {
            &["income", "expense", "currency", "mindate", "maxdate"]
        }
        "/api/mean" => &[
            "mindate",
            "maxdate",
            "prior",
            "after",
            "unrealized",
            "currency",
        ],
        p if p.starts_with("/api/ledger/") => &["currency"],
        p if p.starts_with("/api/prices/") => &["currency"],
        _ => return Vec::new(),
    };
    let supplied: std::collections::HashSet<&str> = query
        .unwrap_or_default()
        .split('&')
        .filter_map(|item| {
            let (key, value) = item.split_once('=')?;
            (!value.is_empty() && value != "undefined" && value != "null")
                .then_some(key)
        })
        .collect();
    required
        .iter()
        .copied()
        .filter(|name| !supplied.contains(name))
        .collect()
}

async fn frontend(uri: Uri) -> Response<Body> {
    let requested_path = uri.path().trim_start_matches('/');
    let requested_path = if requested_path.is_empty() {
        "index.html"
    } else {
        requested_path
    };
    let (asset_path, asset) = match FrontendAssets::get(requested_path) {
        Some(asset) => (requested_path, asset),
        // Serve client-side React routes through the SPA entry point, while
        // missing API and Vite asset paths remain real 404s.
        None if !requested_path.starts_with("api/")
            && !requested_path.starts_with("assets/") =>
        {
            (
                "index.html",
                FrontendAssets::get("index.html")
                    .expect("Vite build includes index.html"),
            )
        }
        None => {
            return Response::builder()
                .status(axum::http::StatusCode::NOT_FOUND)
                .body(Body::empty())
                .expect("valid not-found response");
        }
    };

    let content_type = mime_guess::from_path(asset_path)
        .first_or_octet_stream()
        .essence_str()
        .to_owned();
    Response::builder()
        .header(header::CONTENT_TYPE, content_type)
        .body(Body::from(asset.data.into_owned()))
        .expect("valid static asset response")
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let input = std::env::var_os("ALERE_KMY")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("./Comptes.kmy"));
    let (account_list_data, repository_requests) =
        start_repository_worker(input)?;
    let state = AppState {
        account_list: Arc::new(RwLock::new(account_list_data)),
        repository_requests,
    };

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/account/list", get(account_list))
        .route("/api/account/edit", post(account_edit))
        .route("/api/plots/networth", get(networth))
        .route("/api/metrics", get(metrics))
        .route("/api/ledger/:ids", get(ledger))
        .route("/api/quotes", get(quotes))
        .route("/api/networth_history", get(networth_history))
        .route("/api/incomeexpense", get(income_expense))
        .route("/api/prices/:account_id", get(price_history))
        .route("/api/price_source/list", get(price_sources))
        .route("/api/online", post(online_update))
        .route("/api/mean", get(mean))
        .route(
            "/api/import/kmymoney",
            post(import_kmymoney)
                .layer(DefaultBodyLimit::max(512 * 1024 * 1024)),
        )
        .fallback(frontend)
        .layer(middleware::from_fn(log_request))
        .with_state(state);
    let address = std::env::var("ALERE_ADDR")
        .ok()
        .and_then(|value| value.parse::<SocketAddr>().ok())
        .unwrap_or_else(|| SocketAddr::from(([127, 0, 0, 1], 3000)));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("bind web server address");

    println!("Alere API listening on http://{address}");
    println!(
        "Windows browser (WSL2): http://localhost:{}",
        address.port()
    );
    axum::serve(listener, app)
        .await
        .expect("serve HTTP requests");
    Ok(())
}
