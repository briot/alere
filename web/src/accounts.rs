use super::*;

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

pub(super) fn account_list_json(repository: &Repository) -> Value {
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

pub(super) async fn account_list(State(state): State<AppState>) -> Json<Value> {
    Json(state.account_list.read().await.clone())
}

pub(super) async fn account_edit(
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

pub(super) fn edit_account_json(
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

pub(super) async fn import_kmymoney(
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
