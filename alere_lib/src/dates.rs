//! Describe a range or set of dates

use crate::cte_list_splits::{cte_list_splits, CTE_SPLITS};
use crate::connections::SqliteConnect;
use chrono::{NaiveDate, Duration, NaiveTime};
use serde::Deserialize;
use lazy_static::lazy_static;
use core::cmp::{max, min};

pub const CTE_DATES: &str = "cte_dates";
pub const SQL_ARMAGEDDON: &str = "'2999-12-31'";

const MAX_DATES: u16 = 366;
// A limit that controls how many dates we return. This is used to limit the
// scope of queries.

lazy_static! {
    static ref MIN_QUERY_DATE: NaiveDate =
       NaiveDate::from_ymd_opt(2000, 1, 1).unwrap();
    static ref MAX_QUERY_DATE: NaiveDate =
       NaiveDate::from_ymd_opt(2200, 1, 1).unwrap();
    pub static ref MIDNIGHT: NaiveTime =
       NaiveTime::from_hms_opt(0, 0, 0).unwrap();
}

#[derive(Deserialize, Clone)]
pub enum GroupBy {
    MONTHS,
    DAYS,
    YEARS,
}

#[derive(QueryableByName)]
struct SplitsRange {
    #[sql_type = "diesel::sql_types::Date"]
    mindate: NaiveDate,
    #[sql_type = "diesel::sql_types::Date"]
    maxdate: NaiveDate,
}


/// Describes a set of dates in a range [start, end]

pub trait DateSet {
    fn get_earliest(&self) -> NaiveDate;
    fn get_most_recent(&self) -> NaiveDate;

    /// Returns the query for a common table expression named CTE_DATES,
    fn cte(&self) -> String;

    /// Return a range that starts at the beginning of times and extends till
    /// the end of self
    fn unbounded_start(&self) -> DateValues {
        DateValues::new(Some(vec![*MIN_QUERY_DATE, self.get_most_recent()]))
    }

    /// Return the start date, formatted as a string suitable for sql
    fn get_start(&self) -> String {
        self.get_earliest().format("%Y-%m-%d").to_string()
    }

    /// Return the end date, formatted as a string suitable for sql
    fn get_end(&self) -> String {
        self.get_most_recent().format("%Y-%m-%d").to_string()
    }
}

/// A special implementation of DateSet, for all dates at regular interval
/// in the range

pub struct DateRange {
    start: NaiveDate,
    end: NaiveDate,
    granularity: GroupBy,
}

impl DateRange {
    pub fn new(
        start: Option<NaiveDate>,
        end: Option<NaiveDate>,
        granularity: GroupBy
    ) -> Self {
        DateRange {
            start: start.unwrap_or(*MIN_QUERY_DATE),
            end: end.unwrap_or(*MAX_QUERY_DATE),
            granularity,
        }
    }

    /// Restrict self to the range actually containing splits (or recurring
    /// occurrences of splits)

    pub fn restrict_to_splits(
        &self,
        connection: &SqliteConnect,
        scenario: super::scenarios::Scenario,
        max_scheduled_occurrences: &super::occurrences::Occurrences,
    ) -> Self {
        let list_splits = cte_list_splits(
            self, scenario, max_scheduled_occurrences);
        let query = format!(
            "
            WITH RECURSIVE {list_splits}
            SELECT strftime('%Y-%m-%d', min(post_date)) AS mindate,
            strftime('%Y-%m-%d', max(post_date)) AS maxdate
            FROM {CTE_SPLITS} "
        );
        let result = crate::connections::execute_and_log::<SplitsRange>(
            connection,
            "restrict_to_splits",
            &query);
        match result {
            Ok(rows) => match rows.first() {
                Some(r) => DateRange::new(
                    Some(max(
                        r.mindate,
                        self.get_earliest())),
                    Some(min(
                        r.maxdate,
                        self.get_most_recent())),
                    self.granularity.clone(),
                ),
                None => DateRange::new(
                    Some(self.get_earliest()),
                    Some(self.get_most_recent()),
                    self.granularity.clone(),
                ),
            },
            Err(_) => DateRange::new(
                Some(self.get_earliest()),
                Some(self.get_most_recent()),
                self.granularity.clone(),
            ),
        }
    }

    /// Return a duration for a number of granularity

    fn granularities(&self, count: u8) -> Duration {
        match self.granularity {
            GroupBy::MONTHS => Duration::days(count as i64 * 30),
            GroupBy::DAYS => Duration::days(count as i64),
            GroupBy::YEARS => Duration::days(count as i64 * 365),
        }
    }

    /// Extend the range of dates by a number of granularity

    pub fn extend(&self, prior: u8, after: u8) -> Self {
        let prior_granularity = self.granularities(prior);
        let after_granularity = self.granularities(after);
        DateRange::new(
            Some(self.start - prior_granularity),
            Some(self.end + after_granularity),
            self.granularity.clone(),
        )
    }
}

impl DateSet for DateRange {
    fn cte(&self) -> String {
        let start_str = self.start.format("%Y-%m-%d");
        let end_str = self.end.format("%Y-%m-%d");

        match self.granularity {
            GroupBy::YEARS => format!(
                "
                {CTE_DATES} (date) AS (
                SELECT date('{end_str}', '+1 YEAR', 'start of year', '-1 day')
                UNION
                   SELECT date(m.date, '-1 YEAR')
                   FROM {CTE_DATES} m
                   WHERE m.date >= '{start_str}'
                   LIMIT {MAX_DATES})"
            ),

            GroupBy::MONTHS => format!(
                "
                {CTE_DATES} (date) AS (
                SELECT
                   --  end of first month (though no need to go past the oldest
                   --  known date in the data)
                   date('{start_str}', 'start of month', '+1 month', '-1 day')
                UNION
                   --  end of next month, though no need to go past the last known
                   --  date in the data
                   SELECT date(m.date, 'start of month', '+2 months', '-1 day')
                   FROM {CTE_DATES} m
                   WHERE m.date <= '{end_str}'
                   LIMIT {MAX_DATES})"
            ),

            GroupBy::DAYS => format!(
                "
                {CTE_DATES} (date) AS (
                SELECT '{end_str}'
                UNION
                   SELECT date(m.date, '-1 day')
                   FROM {CTE_DATES} m
                   WHERE m.date >= '{start_str}'
                   LIMIT {MAX_DATES}
                )"
            ),
        }
    }

    fn get_earliest(&self) -> NaiveDate {
        self.start
    }

    fn get_most_recent(&self) -> NaiveDate {
        self.end
    }
}

/// A special implementation of DateSet, for a specific set of dates

pub struct DateValues {
    dates: Option<Vec<NaiveDate>>,
}

impl DateValues {
    pub fn new(dates: Option<Vec<NaiveDate>>) -> Self {
        DateValues { dates }
    }
}

impl DateSet for DateValues {
    fn cte(&self) -> String {
        let nested = match self.dates.as_ref() {
            Some(d) => format!(
                "VALUES {}",
                d.iter()
                    .enumerate()
                    .map(|(idx, d)| format!("({},{})", idx + 1, d.format("'%Y-%m-%d'")))
                    .collect::<Vec<_>>()
                    .join(",")
            ),
            None => "SELECT 1, NULL WHERE 0".to_string(),
        };

        format!("{CTE_DATES} (idx, date) AS ({nested})")
    }

    fn get_earliest(&self) -> NaiveDate {
        *self
            .dates
            .as_ref().and_then(|d| d.first())
            .unwrap_or(&MIN_QUERY_DATE)
    }

    fn get_most_recent(&self) -> NaiveDate {
        *self
            .dates
            .as_ref().and_then(|d| d.last())
            .unwrap_or(&MAX_QUERY_DATE)
    }
}
