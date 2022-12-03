use alere_lib::connections::{
    SqlitePool, SqliteConnect, create_pool, add_functions};
use lazy_static::lazy_static;
use std::path::PathBuf;

lazy_static! {
   static ref POOL: SqlitePool = {
      match tauri::api::path::document_dir() {
         Some(doc) => create_pool(doc),
         None      => create_pool(PathBuf::from("/tmp/")),
      }
   };
}

/// Get a connection from the pool
pub fn get_connection() -> SqliteConnect {
    let connection = POOL.get().unwrap();
    add_functions(&connection);
    connection
}
