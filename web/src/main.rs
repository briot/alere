use alere_lib::{
    account_kinds::AccountKind,
    accounts::{Account, AccountNameDepth},
    commodities::Commodity,
    importers::Importer,
    kmymoney::KmyMoneyImporter,
    repositories::Repository,
};
use anyhow::Context;
use axum::{
    Json, Router,
    body::Body,
    extract::State,
    http::{Request, Uri, header},
    middleware::{self, Next},
    response::Response,
    routing::get,
};
use rust_embed::RustEmbed;
use serde::Serialize;
use serde_json::{Value, json};
use std::{net::SocketAddr, path::PathBuf, sync::Arc};

#[derive(RustEmbed)]
#[folder = "../dist/"]
struct FrontendAssets;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
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

async fn account_list(State(response): State<Arc<Value>>) -> Json<Value> {
    Json(response.as_ref().clone())
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
    let mut importer = KmyMoneyImporter::default();
    let repository =
        futures::executor::block_on(importer.import_file(&input, |_, _| {}))
            .with_context(|| {
                format!("import KMyMoney file {}", input.display())
            })?;
    let response_json = Arc::new(account_list_json(&repository));

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/account/list", get(account_list))
        .fallback(frontend)
        .layer(middleware::from_fn(log_request))
        .with_state(response_json);
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
