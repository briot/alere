#[derive(serde::Serialize)]
pub struct Accounts {
    accounts: Vec<i32>,
    commodities: Vec<i32>,
    kinds: Vec<i32>,
    institutions: Vec<i32>,
}

#[tauri::command]
pub fn fetch_accounts() -> Accounts {
    Accounts{
        accounts: vec!(),
        commodities: vec!(),
        kinds: vec!(),
        institutions: vec!(),
    }
}
