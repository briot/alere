//! Describe a range or set of dates

use chrono::{Utc, TimeZone, Date};
use serde::Deserialize;

pub const CTE_DATES: &str = "cte_dates";
pub const SQL_ARMAGEDDON: &str = "'2999-12-31'";

const MAX_DATES: u16 = 366;
// A limit that controls how many dates we return. This is used to limit the
// scope of queries.

lazy_static! {
    static ref MIN_QUERY_DATE: Date<Utc> = Utc.ymd(2000, 1, 1);
    static ref MAX_QUERY_DATE: Date<Utc> = Utc.ymd(2200, 1, 1);
}

#[derive(Deserialize)]
pub enum GroupBy {
    MONTHS,
    DAYS,
    YEARS,
}

/// Describes a set of dates in a range [start, end]

pub trait DateSet {

    fn get_earliest(&self) -> Date<Utc>;
    fn get_most_recent(&self) -> Date<Utc>;

    /// Returns the query for a common table expression named CTE_DATES,
    fn cte(&self) -> String;

    /// Return a range that starts at the beginning of times and extends till
    /// the end of self
    fn unbounded_start(&self) -> DateValues {
        DateValues::new(Some(vec!(*MIN_QUERY_DATE, self.get_most_recent())))
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
    start: Date<Utc>,
    end: Date<Utc>,
    granularity: GroupBy,
}

impl DateRange {

    pub fn new(
        start: Option<Date<Utc>>,
        end: Option<Date<Utc>>,
        granularity: GroupBy,
    ) -> Self {
        DateRange {
            start: start.unwrap_or(*MIN_QUERY_DATE),
            end: end.unwrap_or(*MAX_QUERY_DATE),
            granularity: granularity,
        }
    }
}

impl DateSet for DateRange {

    fn cte(&self) -> String {
        let start_str = self.start.format("%Y-%m-%d");
        let end_str = self.end.format("%Y-%m-%d");

        match self.granularity {
            GroupBy::YEARS => format!("
                {CTE_DATES} (date) AS (
                SELECT date('{end_str}', '+1 YEAR', 'start of year', '-1 day')
                UNION
                   SELECT date(m.date, '-1 YEAR')
                   FROM {CTE_DATES} m
                   WHERE m.date >= '{start_str}'
                   LIMIT {MAX_DATES})"),

            GroupBy::MONTHS => format!("
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
                   LIMIT {MAX_DATES})"),

            GroupBy::DAYS => format!("
                {CTE_DATES} (date) AS (
                SELECT '{end_str}'
                UNION
                   SELECT date(m.date, '-1 day')
                   FROM {CTE_DATES} m
                   WHERE m.date >= '{start_str}'
                   LIMIT {MAX_DATES}
                )"),
        }
    }

    fn get_earliest(&self) -> Date<Utc> {
        self.start
    }

    fn get_most_recent(&self) -> Date<Utc> {
        self.end
    }
}

/// A special implementation of DateSet, for a specific set of dates

pub struct DateValues {
    dates: Option<Vec<Date<Utc>>>,
}

impl DateValues {

    pub fn new(dates: Option<Vec<Date<Utc>>>) -> Self {
        DateValues {
            dates: dates,
        }
    }
}

impl DateSet for DateValues {

    fn cte(&self) -> String {
        let nested = match self.dates.as_ref() {
            Some(d) =>
                format!(
                    "VALUES {}",
                    d.iter()
                    .enumerate()
                    .map(|(idx, d)|
                        format!(
                            "({},{})",
                            idx + 1,
                            d.format("'%Y-%m-%d'")
                        )
                    )
                    .collect::<Vec<_>>()
                    .join(",")
                ),
            None    => "SELECT 1, NULL WHERE 0".to_string()
        };

        format!("{CTE_DATES} (idx, date) AS ({nested})")
    }

    fn get_earliest(&self) -> Date<Utc> {
        *self.dates.as_ref().map_or(None, |d| d.first())
            .unwrap_or(&MIN_QUERY_DATE)
    }

    fn get_most_recent(&self) -> Date<Utc> {
        *self.dates.as_ref().map_or(None, |d| d.last())
            .unwrap_or(&MAX_QUERY_DATE)
    }
}
