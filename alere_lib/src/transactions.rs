use crate::connections::SqliteConnect;
use crate::errors::AlrResult;
use crate::models::TransactionId;
use diesel::RunQueryDsl;
use diesel::sql_types::{Nullable, Text, Integer, Timestamp};
use crate::schema::alr_transactions;

/// A transaction is made of one or more splits, the sum of which is zero
/// (we take from one or more accounts and give to one or more accounts).

#[derive(diesel::QueryableByName, diesel::Queryable,
         Debug, serde::Serialize)]
#[table_name = "alr_transactions"]
pub struct Transaction {
    pub id: TransactionId,

    // When was the operation performed by the user.  It might be some days
    // before the corresponding splits are effective on their respective
    // accounts.
    pub timestamp: chrono::NaiveDateTime,

    pub memo: Option<String>,
    pub check_number: Option<String>,

    // The recurrence rule. See python dateutil.rrule module, or RFC-5545
    //  iCalendar RFC <https://tools.ietf.org/html/rfc5545>
    //
    // A scheduled transaction has not occurred yet, and is actually a
    // template for future transactions. It describes how it will be
    // recurring (or not).  When an instance of a recurring transaction
    // is validated by the user, a separate transaction is created for it.
    //
    // This could be the empty string, in which case this is a scheduled,
    // non-recurring event.
    //
    // The start date for this transaction is given by timestamp. If an
    // occurrence has already occurred, we save the date of the last
    // occurrence, so that we can later easily compute the single next
    // occurrence (e.g. in the ledger).
    //
    // The string is a list of semi-colon separated parameters:
    //   - freq=<val>    YEARLY|MONTHLY|WEEKLY|DAILY|HOURLY|
    //                   MINUTELY|SECONDLY
    //     How often can events occur (once a year for YEARLY, once a
    //     month for MONTHLY and so on).
    //
    //   - interval=<integer_or_list>
    //     The interval between each freq iteration. For example, when
    //     using YEARLY, an interval of 2 means once every two years, but
    //     with HOURLY, it means once every two hours.
    //
    //   - wkst=<integer>   (monday=1, tuesday=2,...)
    //     Specify the first day of the week.
    //     This will affect recurrences based on weekly periods.
    //
    //   - until=<date>
    //   - count=<integer>
    //     Only one of these two fields can be specified.
    //     until is the last valid date (included).
    //
    //   - bysetpos=<integer_or_list>
    //     Each given integer will specify an occurrence number,
    //     corresponding to the nth occurrence of the rule inside the
    //     frequency period. For example, a set_pos of -1 if combined
    //     with a MONTHLY frequency, and a week_day of
    //     (MO, TU, WE, TH, FR), will result in the last work day of every
    //     month.
    //
    //   - bymonth=<integer_or_list>
    //     The list of months to apply the recurrence to.
    //
    //   - bymonthday=<integer_or_list>
    //     The exact day(s) of the month to apply the recurrence to.
    //
    //   - year_day=<integer_or_list>
    //     The exact day(s) of the year this recurrence applies to.
    //
    //   - easter=<integer_or_list>
    //     Each integer will define an offset from the Easter Sunday.
    //     Passing the offset 0 to byeaster will yield the Easter Sunday
    //     itself. This is an extension to the RFC specification.
    //
    //   - byweekno=<integer_or_list>
    //     The week numbers to apply the recurrence to. Week numbers have
    //     the meaning described in ISO8601, that is, the first week of
    //     the year is that containing at least four days of the new year.
    //
    //   - byweekday=<integer_or_list>
    //     a combination of the MO, TU,... constants.
    //     It’s also possible to use an argument n for the weekday
    //     instances, which will mean the nth occurrence of this weekday
    //     in the period. For example, with MONTHLY, or with YEARLY and
    //     BYMONTH, using FR(+1) in byweekday will specify the first
    //     Friday of the month where the recurrence happens. Notice that
    //     in the RFC documentation, this is specified as BYDAY, but was
    //     renamed to avoid the ambiguity of that keyword.
    //
    //   - byhour
    //   - byminute
    //   - bysecond
    //     irrelevant, we only use dates
    pub scheduled: Option<String>,
    pub last_occurrence: Option<chrono::NaiveDateTime>,

    // The scenario this transaction is active in. All past transactions
    // reconciled from bank accounts will in general have a null
    // scenario, indicating they should always be taken into account. But
    // it is possible to add hypothetical transactions by setting
    // scenario to a non-null value.
    pub scenario_id: crate::scenarios::Scenario,
}

impl Transaction {
    pub fn create(
        db: &SqliteConnect,
        timestamp: chrono::NaiveDateTime,
        memo: Option<String>,
        check_number: Option<String>,
        scheduled: Option<String>,
        last_occurrence: Option<chrono::NaiveDateTime>,
        scenario: crate::scenarios::Scenario,
    ) -> AlrResult<Self> {
        let qstr = 
            "INSERT INTO alr_transactions
             (timestamp, memo, check_number, scheduled, last_occurrence,
             scenario_id)
             VALUES (?, ?, ?, ?, ?, ?)
             RETURNING *";
        let mut q: Vec<Self> = diesel::sql_query(qstr)
            .bind::<Timestamp, _>(&timestamp)
            .bind::<Nullable<Text>, _>(&memo)
            .bind::<Nullable<Text>, _>(&check_number)
            .bind::<Nullable<Text>, _>(&scheduled)
            .bind::<Nullable<Timestamp>, _>(&last_occurrence)
            .bind::<Integer, _>(&scenario)
            .load(&db.0)?;
        q.pop().ok_or_else(|| "Cannot insert new transaction".into())
    }

    pub fn add_to_memo(
            &mut self, db: &SqliteConnect, memo: &str
    ) -> AlrResult<()> {
        if !memo.is_empty() {
            match &self.memo {
                Some(m) => {
                    let mut s = String::from(m);
                    s.push_str(memo);
                    self.memo = Some(s);
                },
                None => {
                    self.memo = Some(String::from(memo));
                }
            };
            let q = "UPDATE alr_transactions SET memo = ? WHERE id = ?";
            let _ = diesel::sql_query(q)
                .bind::<Nullable<Text>, _>(&self.memo)
                .bind::<Integer, _>(self.id)
                .execute(&db.0)?;
        }
        Ok(())
    }

    pub fn set_check_number(
        &mut self, db: &SqliteConnect, check_number: Option<&str>,
    ) -> AlrResult<()> {
        match check_number {
            None | Some("") => {},
            Some(c) => {
                let q = "UPDATE alr_transactions
                    SET check_number = ? WHERE id = ?";
                let _ = diesel::sql_query(q)
                    .bind::<Text, _>(&c)
                    .bind::<Integer, _>(self.id)
                    .execute(&db.0)?;
            },
        };
        Ok(())
    }
}
