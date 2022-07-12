use chrono::{NaiveDateTime, TimeZone };
use chrono_tz::UTC;
use diesel::sqlite::{Sqlite, SqliteConnection};
use diesel::sql_types::{Text, Timestamp, Nullable};
use diesel::r2d2::{Pool, ConnectionManager, PooledConnection};
use diesel::{sql_query, QueryResult, RunQueryDsl};
use dotenv::dotenv;
use memoize::memoize;
use regex::Regex;
use rrule::{RRule, RRuleSet, Unvalidated, RRuleError};
use std::env;

sql_function!(
    fn alr_next_event(
        rule: Text,
        timestamp: Timestamp,  //  reference timestamp
        previous: Nullable<Timestamp>) -> Nullable<Timestamp>
);

#[memoize(Capacity: 120)]   // thread-local
fn parse_ruleset(
    start: NaiveDateTime,
    rule: String,
) -> Result<RRuleSet, RRuleError>
{
    let s = UTC.timestamp(start.timestamp(), 0);
    let raw: RRule<Unvalidated> = rule.parse()?;
    let r = raw.build(s)?;
    return Ok(r);
}

fn next_event(
    rule: String,
    timestamp: NaiveDateTime,
    previous: Option<NaiveDateTime>
) -> Option<NaiveDateTime> {
    if rule.is_empty() {   // only occurs once, no recurring
        match previous {
            Some(_) => None,
            None    => Some(timestamp),
        }
    } else {
        let rs = match parse_ruleset(timestamp, rule) {
            Ok(r)  => r,
            Err(e) => {
                print!("Error parsing rrule {:?}", e);
                return None;
            }
        };
        let prev = UTC.timestamp(
            previous
                .map(|p| p.timestamp())
                .unwrap_or(0),
            0
        );
        let next = rs.just_after(
            UTC.timestamp(prev.timestamp(), 0),
            false,  // inclusive
        );
        next.ok()?.map(|dt| dt.naive_utc())
    }
}

fn add_functions(connection: &SqliteConnection) {
    alr_next_event::register_impl(connection, next_event)
        .expect("Could not register alr_next_event");
}

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
   static ref POOL: SqlitePool = create_pool();
   static ref RE_REMOVE_COMMENTS: Regex = Regex::new(r"--.*").unwrap();
   static ref RE_COLLAPSE_SPACES: Regex = Regex::new(r"\s+").unwrap();
}

pub fn get_connection() -> PooledConnection<ConnectionManager<SqliteConnection>> {
    let connection = POOL.get().unwrap();
    add_functions(&connection);
    connection
}

pub fn execute_and_log
   <U: diesel::query_source::QueryableByName<Sqlite>>
   (query: &str) -> QueryResult<Vec<U>>
{
    let t = RE_REMOVE_COMMENTS.replace_all(query, "");
    let query = RE_COLLAPSE_SPACES.replace_all(&t, " ");
    let connection = super::connections::get_connection();
    dbg!(&query);
    let res = sql_query(query).load(&connection);
    if let Err(ref r) = res {
        print!("Error in query {:?}", r);
    }
    res
}

