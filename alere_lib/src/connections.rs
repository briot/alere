use chrono::{NaiveDateTime, TimeZone};
use chrono_tz::UTC;
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel::sql_types::{Nullable, Text, Timestamp};
use diesel::sqlite::{Sqlite, SqliteConnection};
use diesel::{sql_query, QueryResult, RunQueryDsl};
use lazy_static::lazy_static;
use log::{debug, log_enabled, Level::Debug, error, info};
use memoize::memoize;
use regex::Regex;
use rrule::{RRule, RRuleError, RRuleSet, Unvalidated};
use std::path::PathBuf;

diesel_migrations::embed_migrations!(); //  creates embedded_migrations

pub type SqliteConnect = PooledConnection<ConnectionManager<SqliteConnection>>;
 
sql_function!(
    fn alr_next_event(
        rule: Text,
        timestamp: Timestamp,  //  reference timestamp
        previous: Nullable<Timestamp>) -> Nullable<Timestamp>
);

#[memoize(Capacity: 120)] // thread-local
fn parse_ruleset(start: NaiveDateTime, rule: String) -> Result<RRuleSet, RRuleError> {
    let s = UTC.timestamp_opt(start.timestamp(), 0).unwrap();
    let raw: RRule<Unvalidated> = rule.parse()?;
    let r = raw.build(s)?;
    Ok(r)
}

fn next_event(
    rule: String,
    timestamp: NaiveDateTime,
    previous: Option<NaiveDateTime>,
) -> Option<NaiveDateTime> {
    if rule.is_empty() {
        // only occurs once, no recurring
        match previous {
            Some(_) => None,
            None => Some(timestamp),
        }
    } else {
        let rs = match parse_ruleset(timestamp, rule) {
            Ok(r) => r,
            Err(e) => {
                error!("Error parsing rrule {:?}", e);
                return None;
            }
        };
        let prev = UTC.timestamp_opt(
            previous.map(|p| p.timestamp()).unwrap_or(0), 0)
            .unwrap();
        let next = rs.just_after(
            UTC.timestamp_opt(prev.timestamp(), 0).unwrap(),
            false, // inclusive
        );
        next.ok()?.map(|dt| dt.naive_utc())
    }
}

pub fn add_functions(connection: &SqliteConnection) {
    alr_next_event::register_impl(connection, next_event)
        .expect("Could not register alr_next_event");
}

lazy_static! {
    static ref RE_REMOVE_COMMENTS: Regex = Regex::new(r"--.*").unwrap();
    static ref RE_COLLAPSE_SPACES: Regex = Regex::new(r"\s+").unwrap();
}

pub fn log_cleanup_query(msg: &str, query: &str) {
    if log_enabled!(Debug) {
        let query = RE_REMOVE_COMMENTS.replace_all(query, "");
        let query = RE_COLLAPSE_SPACES.replace_all(&query, " ");
        debug!("{} {}", &msg, &query);
    }
}

pub fn execute_and_log<U: diesel::query_source::QueryableByName<Sqlite>>(
    connection: &SqliteConnect,
    msg: &str,
    query: &str,
) -> QueryResult<Vec<U>> {
    let res = sql_query(query).load(connection);
    if let Err(ref r) = res {
        log_cleanup_query(&msg, &query);
        log::error!("{:?}: Error in query {:?}", msg, r);
    }
    res
}

type SqlitePool = Pool<ConnectionManager<SqliteConnection>>;

/// A pool of connections.
/// Compared to a straight r2d2 pool, this wrapper can be modified to point to
/// a new database when the user opens a new file.
pub struct Database {
    low: SqlitePool,
}

impl Database {

    pub fn new(filename: &PathBuf) -> Self {
        Database {
            low: Database::create_pool(filename),
        }
    }

    /// Change the active database file
    pub fn set_file(&mut self, name: &PathBuf) {
        self.low = Database::create_pool(name);
    }

    /// Get a connection from the pool
    pub fn get(&self) -> SqliteConnect {
        let connection = self.low.get().unwrap();
        add_functions(&connection);
        connection
    }

    fn create_pool(database_path: &PathBuf) -> SqlitePool {
        let db = String::from(database_path.to_str().unwrap());
        info!("Open database {:?}", &db);
        let pool = Pool::builder()
            .max_size(20)
            .build(ConnectionManager::new(db))
            .expect("Failed to create connection pool");

        let connection = pool.get().unwrap();

        let migrated = embedded_migrations::run_with_output(
            &connection, &mut std::io::stdout());
        match migrated {
            Ok(_) => (),
            Err(e) => error!("{}", e),
        };

        pool
    }
}
