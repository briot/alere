use chrono::{NaiveDateTime, TimeZone};
use chrono_tz::UTC;
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel::sql_types::{Nullable, Text, Timestamp, Float};
use diesel::sqlite::{Sqlite, SqliteConnection};
use diesel::{sql_query, QueryResult, RunQueryDsl};
use lazy_static::lazy_static;
use log::{log_enabled, Level::Error};
use memoize::memoize;
use regex::Regex;
use rrule::{RRule, RRuleError, RRuleSet, Unvalidated};
use std::ops::Deref;
use std::path::Path;

diesel_migrations::embed_migrations!(); //  creates embedded_migrations

/// A named query

pub struct Query <U: diesel::query_source::QueryableByName<Sqlite>> {
    pub name: &'static str,
    pub sql: String,
    _marker: std::marker::PhantomData<U>,
}

impl<U: diesel::query_source::QueryableByName<Sqlite>> Query<U> {

    /// Build a new named query. When it is executed, the name is showed in
    /// the log file instead of the query itself.

    pub fn new(
        name: &'static str,
        sql: &'static str,
    ) -> Self {
        let s = RE_REMOVE_COMMENTS.replace_all(sql, "");
        let s = RE_COLLAPSE_SPACES.replace_all(&s, " ");
        Query {
            name,
            sql: s.into(),
            _marker: Default::default(),
        }
    }

    /// Execute the query

    pub fn exec(&self, connection: &SqliteConnect) -> QueryResult<Vec<U>> {
        let res = sql_query(&self.sql).load(&connection.0);
        match res {
            Err(ref r) => {
                log::error!(
                    "{}: Error in query {}: {:?}", self.name, r, self.sql);
            }
            Ok(_) => {
                log::debug!("{}", self.name);
            }
        };
        res
    }

    // Bind a parameter to the query

//    pub fn bind<ST, Value>(self, value: Value) -> UncheckedBind<Self, Value, ST>
}


/// A connection to the database

pub struct SqliteConnect(
    pub PooledConnection<ConnectionManager<SqliteConnection>>
);

impl SqliteConnect {

    /// Execute and log a query

    pub fn exec<U: diesel::query_source::QueryableByName<Sqlite>>(
        &self,
        queryname: &str,
        query: &str,
    ) -> QueryResult<Vec<U>> {
        let res = sql_query(query).load(&self.0);
        match res {
            Err(ref r) => {
                if log_enabled!(Error) {
                    //let query = RE_REMOVE_COMMENTS.replace_all(query, "");
                    //let query = RE_COLLAPSE_SPACES.replace_all(&query, " ");
                    log::error!(
                        "{}: Error in query {}: {:?}", queryname, r, query);
                }
            }
            Ok(_) => {
                log::debug!("{}", &queryname);
            }
        };
        res
    }
}

// ??? So that the following works. Not clear that it is better than
// "&db.0" though.
//    fn func(db: &sqliteConnect) {
//        sql_query("...").load(&**db);
//    }
impl Deref for SqliteConnect {
    // type Target = SqliteConnection;
    type Target = PooledConnection<ConnectionManager<SqliteConnection>>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

/// A pool of connections.
/// Compared to a straight r2d2 pool, this wrapper can be modified to point to
/// a new database when the user opens a new file.
#[derive(Default)]
pub struct Database {
    low: Option<Pool<ConnectionManager<SqliteConnection>>>,
}

impl Database {

    /// Change the active database file.
    /// It tries to apply any migration to bring the schema to the version
    /// expected by alere.
    /// If the file cannot be opened, self.low is set to None.

    pub fn open_file(
        &mut self,
        path: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let db = String::from(path.to_str().unwrap());
        log::info!("Open database {:?}", &db);

        let _check_if_exists = std::fs::File::open(&db)?;
        self.internal_open(&db)
    }

    /// Create a new empty database.
    /// Any existing file is first deleted so we start the database from
    /// scratch, and only create the schema and initial data in it.
    /// If the file cannot be opened, self.low is set to None.

    pub fn create_file(
        &mut self,
        path: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let db = String::from(path.to_str().unwrap());
        log::info!("Create database {:?}", &db);
        _ = std::fs::remove_file(&db);
        self.internal_open(&db)
    }

    /// Internal implementation for open/create

    fn internal_open(
        &mut self,
        dburl: &str
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.low = None;

        let pool = Pool::builder()
            .max_size(20)
            .build(ConnectionManager::new(dburl))
            .expect("Failed to create connection pool");
        let connection = pool.get().unwrap();
        let migrated = embedded_migrations::run_with_output(
            &connection, &mut std::io::stdout());
        match migrated {
            Ok(_) => (),
            Err(e) => log::error!("{}", e),
        };

        self.low = Some(pool);
        Ok(())
    }

    /// Get a connection to the database
    /// It panics if the database was not initialized via a call to open_file.

    pub fn get(&self) -> Result<SqliteConnect, &'static str> {
        match &self.low {
            None     => Err("No database was selected"),
            Some(db) => {
                let connection = db.get().unwrap();

                // Register custom functions, has to be done per connection
                alr_next_event::register_impl(&connection, next_event)
                    .expect(
                        "Could not register custom functions with sqlite");

                //  Those exist in sqlite3 itself, but it needs to be
                //  compiled with special flags that apparently are not used
                //  by Rust.
                exp::register_impl(&connection, alr_exp)
                    .expect("Could not register custom functions with sqlite");
                ln::register_impl(&connection, alr_ln)
                    .expect("Could not register custom functions with sqlite");

                Ok(SqliteConnect (connection))
            }
        }
    }
}

sql_function!(
    fn alr_next_event(
        rule: Text,
        timestamp: Timestamp,  //  reference timestamp
        previous: Nullable<Timestamp>) -> Nullable<Timestamp>
);
sql_function!(
    fn ln(val: Nullable<Float>) -> Nullable<Float>
);
sql_function!(
    fn exp(val: Nullable<Float>) -> Nullable<Float>
);

fn alr_ln(val: Option<f32>) -> Option<f32> {
   val.map(|v| v.ln())
}

fn alr_exp(val: Option<f32>) -> Option<f32> {
   val.map(|v| v.exp())
}


#[memoize(Capacity: 120)] // thread-local
fn parse_ruleset(start: NaiveDateTime, rule: String) -> Result<RRuleSet, RRuleError> {
    let s = UTC.timestamp_opt(start.timestamp(), 0).unwrap();
    let raw: RRule<Unvalidated> = rule.parse()?;
    let r = raw.build(s)?;
    Ok(r)
}

/// Functions implemented in Rust and executed by sqlite

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
                log::error!("Error parsing rrule {:?}", e);
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

lazy_static! {
    static ref RE_REMOVE_COMMENTS: Regex = Regex::new(r"--.*").unwrap();
    static ref RE_COLLAPSE_SPACES: Regex = Regex::new(r"\s+").unwrap();
}
