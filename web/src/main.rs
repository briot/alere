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
use serde::Serialize;
use serde_json::{Value, json};
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, mpsc},
};
use tokio::sync::{RwLock, oneshot};

mod accounts;
mod financial;
mod prices;

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

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
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
                .send(Ok(accounts::account_list_json(&repository)))
                .is_err()
            {
                return;
            }

            while let Ok(request) = request_receiver.recv() {
                let result = match request.command {
                    RepositoryCommand::Networth { currency_id, dates } => {
                        financial::networth_json(
                            &repository,
                            currency_id,
                            &dates,
                        )
                        .map_err(|error| {
                            format!("compute net worth: {error:#}")
                        })
                    }
                    RepositoryCommand::Metrics {
                        currency_id,
                        mindate,
                        maxdate,
                        interval,
                    } => financial::metrics_json(
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
                    } => financial::ledger_json(
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
                    } => financial::quotes_json(
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
                    } => financial::networth_history_json(
                        &repository,
                        currency_id,
                        &dates,
                    )
                    .map_err(|error| {
                        format!("compute net worth history: {error:#}")
                    }),
                    RepositoryCommand::IncomeExpense {
                        currency_id,
                        mindate,
                        maxdate,
                        income,
                        expense,
                    } => financial::income_expense_json(
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
                    } => financial::price_history_json(
                        &repository,
                        account_id,
                        currency_id,
                    )
                    .map_err(|error| {
                        format!("compute price history: {error:#}")
                    }),
                    RepositoryCommand::PriceSources => {
                        Ok(prices::price_sources_json(&repository))
                    }
                    RepositoryCommand::OnlineSymbols => {
                        Ok(prices::online_symbols_json(&repository))
                    }
                    RepositoryCommand::AddOnlinePrices { prices } => {
                        prices::add_online_prices(&mut repository, prices)
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
                    } => financial::mean_json(
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
                        accounts::edit_account_json(&repository, &account)
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
                                Ok(accounts::account_list_json(&repository))
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
        .route("/api/account/list", get(accounts::account_list))
        .route("/api/account/edit", post(accounts::account_edit))
        .route("/api/plots/networth", get(financial::networth))
        .route("/api/metrics", get(financial::metrics))
        .route("/api/ledger/:ids", get(financial::ledger))
        .route("/api/quotes", get(financial::quotes))
        .route("/api/networth_history", get(financial::networth_history))
        .route("/api/incomeexpense", get(financial::income_expense))
        .route("/api/prices/:account_id", get(financial::price_history))
        .route("/api/price_source/list", get(prices::price_sources))
        .route("/api/online", post(prices::online_update))
        .route("/api/mean", get(financial::mean))
        .route(
            "/api/import/kmymoney",
            post(accounts::import_kmymoney)
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
