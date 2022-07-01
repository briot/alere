use diesel::sqlite::SqliteConnection;
use diesel::r2d2::{Pool, ConnectionManager};
use dotenv::dotenv;
use std::env;

type SqlitePool = Pool<ConnectionManager<SqliteConnection>>;

fn create_pool() -> SqlitePool {
   dotenv().ok();
   let database_url = env::var("DATABASE_URL")
       .expect("DATABASE_URL must be set");
   SqlitePool::builder()
      .max_size(8)
      .build(ConnectionManager::new(database_url))
      .expect("Failed to create connection pool")
}

lazy_static! {
   pub static ref POOL: SqlitePool = create_pool();
}
