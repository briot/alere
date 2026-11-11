use alere_lib::{
    account_kinds::AccountKind,
    accounts::{Account, AccountNameDepth},
    commodities::Commodity,
    importers::Importer,
    kmymoney::KmyMoneyImporter,
    multi_values::{MultiValue, Operation},
    networth::{GroupBy, Networth, Settings},
    repositories::Repository,
    times::{Instant, Intv},
    tree_keys::Key,
};
use anyhow::Context;
use axum::{
    Json, Router,
    body::Body,
    extract::{Query, State},
    http::StatusCode,
    http::{Request, Uri, header},
    middleware::{self, Next},
    response::Response,
    routing::get,
};
use chrono::{Local, NaiveDate};
use rust_decimal::Decimal;
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, mpsc},
};
use tokio::sync::oneshot;

#[derive(RustEmbed)]
#[folder = "../dist/"]
struct FrontendAssets;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Clone)]
struct AppState {
    account_list: Arc<Value>,
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
    Json(state.account_list.as_ref().clone())
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
) -> anyhow::Result<Value> {
    let currency = repository
        .commodities
        .iter_commodities()
        .find(|commodity| commodity.get_id().as_u32() == currency_id)
        .cloned()
        .with_context(|| format!("unknown currency id {currency_id}"))?;
    let mut prices = repository.market_prices(Some(currency.clone()));
    let mut income = Decimal::ZERO;
    let mut passive_income = Decimal::ZERO;
    let mut work_income = Decimal::ZERO;
    let mut expenses = Decimal::ZERO;
    let mut income_taxes = Decimal::ZERO;
    let mut other_taxes = Decimal::ZERO;
    let mindate = NaiveDate::parse_from_str(mindate, "%Y-%m-%d")?;
    let maxdate = NaiveDate::parse_from_str(maxdate, "%Y-%m-%d")?;

    for transaction in repository.transactions().iter() {
        for split in transaction.splits().iter() {
            let kind = split.account.get_kind();
            let split_date = split.post_ts.date_naive();
            if split_date < mindate
                || split_date > maxdate
                || kind.is_unrealized()
                || !(kind.is_expense()
                    || kind.is_income()
                    || kind.is_passive_income())
            {
                continue;
            }

            let converted = match &split.operation {
                Operation::Credit(value) => {
                    prices.convert_multi_value(value, &split.post_ts)
                }
                Operation::AddShares { qty } => {
                    prices.convert_value(qty, &split.post_ts)
                }
                Operation::BuyAmount { .. }
                | Operation::BuyPrice { .. }
                | Operation::Reinvest { .. }
                | Operation::Split { .. }
                | Operation::Dividend => MultiValue::zero(),
            };
            let value = decimal_in_currency(&converted, &currency);
            if kind.is_income_tax() {
                income_taxes += value;
            } else if kind.is_misc_tax() {
                other_taxes += value;
            }

            if kind.is_expense() {
                expenses += value;
            } else if kind.is_passive_income() {
                passive_income += value;
                income += value;
            } else if kind.is_work_income() {
                work_income += value;
                income += value;
            } else {
                income += value;
            }
        }
    }

    let (networth, liquid_assets) = networth_totals(
        repository,
        &currency,
        &[mindate.to_string(), maxdate.to_string()],
    )?;
    let as_number =
        |value: Decimal| value.to_string().parse::<f64>().unwrap_or(0.0);
    Ok(json!({
        "income": as_number(-income),
        "passive_income": as_number(-passive_income),
        "work_income": as_number(-work_income),
        "expenses": as_number(expenses),
        "income_taxes": as_number(income_taxes),
        "other_taxes": as_number(other_taxes),
        "networth": as_number(networth[1]),
        "networth_start": as_number(networth[0]),
        "liquid_assets": as_number(liquid_assets[1]),
        "liquid_assets_at_start": as_number(liquid_assets[0]),
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
            let repository = match repository {
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
                    } => metrics_json(
                        &repository,
                        currency_id,
                        &mindate,
                        &maxdate,
                    )
                    .map_err(|error| format!("compute metrics: {error:#}")),
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
    println!("{method} {uri} -> {}", response.status());
    response
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
        account_list: Arc::new(account_list_data),
        repository_requests,
    };

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/account/list", get(account_list))
        .route("/api/plots/networth", get(networth))
        .route("/api/metrics", get(metrics))
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
