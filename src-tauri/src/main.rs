#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

#[macro_use]
extern crate diesel;
extern crate dotenv;

#[macro_use]
extern crate lazy_static;

pub mod schema;
pub mod models;
pub mod metrics;
pub mod accounts;
pub mod connections;
pub mod scenarios;
pub mod dates;

use diesel::prelude::*;

#[tauri::command]
fn show_account_kinds() {
    use schema::alr_account_kinds::dsl::*;

    let connection = connections::get_connection();
    let results = alr_account_kinds
        .limit(5)
        .load::<models::AlrAccountKinds>(&connection)
        .expect("Error loading account kinds");

    println!("Displaying {} account kinds", results.len());
    for kind in results {
        println!("{:?}", kind);
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
   format!("Hello, {}!", name)
}

fn main() {
  let context = tauri::generate_context!();
  tauri::Builder::default()
    .menu(tauri::Menu::os_default(&context.package_info().name))
    .invoke_handler(tauri::generate_handler![
        greet,
        show_account_kinds,
        metrics::compute_networth,
        accounts::fetch_accounts,
    ])
    .run(context)
    .expect("error while running tauri application");
}
