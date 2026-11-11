use super::*;

pub(super) fn price_sources_json(repository: &Repository) -> Value {
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

pub(super) async fn price_sources(
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

pub(super) async fn online_update(
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

pub(super) fn online_symbols_json(repository: &Repository) -> Value {
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

pub(super) fn add_online_prices(
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
