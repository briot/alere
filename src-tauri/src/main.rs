#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

#[macro_use]
extern crate diesel;
extern crate dotenv;

pub mod schema;
pub mod models;

use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use dotenv::dotenv;
use std::env;

// use self::models::*;
// use self::diesel::prelude::*;

fn establish_connection() -> SqliteConnection {
   dotenv().ok();
   let database_url = env::var("DATABASE_URL")
       .expect("DATABASE_URL must be set");
   SqliteConnection::establish(&database_url)
       .expect(&format!("Error connecting to {}", database_url))
}

#[tauri::command]
fn show_account_kinds() {
    use schema::alr_account_kinds::dsl::*;

    let connection = establish_connection();
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
    .invoke_handler(tauri::generate_handler![greet])
    .invoke_handler(tauri::generate_handler![show_account_kinds])
    .run(context)
    .expect("error while running tauri application");
}
