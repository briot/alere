//! Describe a range or set of dates

use chrono::{DateTime, Utc, MIN_DATETIME, MAX_DATETIME};

pub const CTE_DATES: &str = "cte_dates";

pub enum GroupBy {
    MONTHS,
    DAYS,
    YEARS,
}

/// Describes a set of dates in a range [start, end]

pub trait DateSet {

    fn get_earliest(&self) -> DateTime<Utc>;
    fn get_most_recent(&self) -> DateTime<Utc>;

    /// Returns the query for a common table expression named CTE_DATES,
    fn cte(&self) -> String;

    /// Return a range that starts at the beginning of times and extends till
    /// the end of self
    fn unbounded_start(&self) -> DateValues {
        DateValues::new(Some(vec!(MIN_DATETIME, self.get_most_recent())))
    }

    /// Return the start date, formatted as a string suitable for sql
    fn get_start(&self) -> String {
        self.get_earliest().format("%Y-%m-%d %H:%M:%S").to_string()
    }

    /// Return the end date, formatted as a string suitable for sql
    fn get_end(&self) -> String {
        self.get_most_recent().format("%Y-%m-%d %H:%M:%S").to_string()
    }

}

/// A special implementation of DateSet, for all dates at regular interval
/// in the range

pub struct DateRange {
    start: Option<DateTime<Utc>>,
    end: Option<DateTime<Utc>>,
    granularity: GroupBy,
}

impl DateRange {

    pub fn new(
        start: Option<DateTime<Utc>>,
        end: Option<DateTime<Utc>>,
        granularity: GroupBy,
    ) -> Self {
        DateRange {
            start: start,
            end: end,
            granularity: granularity,
        }
    }
}

impl DateSet for DateRange {

    fn cte(&self) -> String {
        "".to_string()
    }

    fn get_earliest(&self) -> DateTime<Utc> {
        self.start.unwrap_or(MIN_DATETIME)
    }

    fn get_most_recent(&self) -> DateTime<Utc> {
        self.end.unwrap_or(MAX_DATETIME)
    }
}

/// A special implementation of DateSet, for a specific set of dates

pub struct DateValues {
    dates: Option<Vec<DateTime<Utc>>>,
}

impl DateValues {

    pub fn new(dates: Option<Vec<DateTime<Utc>>>) -> Self {
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
                            d.format("'%Y-%m-%d %H:%M:%S'")
                        )
                    )
                    .collect::<Vec<_>>()
                    .join(",")
                ),
            None    => "SELECT 1, NULL WHERE 0".to_string()
        };

        format!("{CTE_DATES} (idx, date) AS ({nested})")
    }

    fn get_earliest(&self) -> DateTime<Utc> {
        *self.dates.as_ref().map_or(None, |d| d.first())
            .unwrap_or(&MIN_DATETIME)
    }

    fn get_most_recent(&self) -> DateTime<Utc> {
        *self.dates.as_ref().map_or(None, |d| d.last())
            .unwrap_or(&MAX_DATETIME)
    }
}
