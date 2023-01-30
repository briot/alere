use crate::account_kinds::AccountKind;
use crate::accounts::Account;
use crate::commodities::Commodity;
use crate::commodity_kinds::CommodityKind;
use crate::connections::{Database, SqliteConnect};
use crate::errors::Result;
use crate::institutions::Institution;
use crate::models::{AccountId, CommodityId};
use crate::prices::Price;
use crate::price_sources::PriceSource;
use crate::payees::Payee;
use crate::splits::{Split, ReconcileKind};
use crate::transactions::Transaction;
use chrono::NaiveDate;
use diesel::{sql_query, Connection, RunQueryDsl};
use diesel::sqlite::SqliteConnection;
use diesel::sql_types::{Nullable, Text, Date, Float, Integer};
use log::{error, info};
use rust_decimal::{Decimal, RoundingStrategy};
use std::collections::{HashMap, HashSet};
use num_traits::{Inv, ToPrimitive};
use std::path::PathBuf;


#[derive(QueryableByName)]
struct KmmKeyValue {

    #[sql_type = "Text"]   // Could be NULL in schema, but not in practice
    #[column_name = "kvpId"]
    id: String,

    #[sql_type = "Text"]
    #[column_name = "kvpType"]
    typ: String,

    #[sql_type = "Text"]
    #[column_name = "kvpKey"]
    key: String,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "kvpData"]
    data: Option<String>
}

static GET_KMM_KEY_VALUE_FOR_ACCOUNTS: &str = 
    "SELECT kmmKeyValuePairs.*
    FROM kmmKeyValuePairs
        LEFT JOIN kmmAccounts
        ON (kmmKeyValuePairs.kvpId = kmmAccounts.id)";


#[derive(QueryableByName, Debug)]
struct KmmInstitutions {

    #[sql_type = "Text"]
    id: String,

    #[sql_type = "Text"]
    name: String,

    #[sql_type = "Nullable<Text>"]
    manager: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "routingCode"]
    routing_code: Option<String>,

    #[sql_type = "Nullable<Text>"]
    telephone: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "addressStreet"]
    address_street: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "addressZipcode"]
    address_zipcode: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "addressCity"]
    address_city: Option<String>,
}

#[derive(QueryableByName, Debug)]
struct KmmPrices {

    #[sql_type = "Text"]
    #[column_name = "fromId"]
    from_id: String,

    #[sql_type = "Text"]
    #[column_name = "toId"]
    to_id: String,

    #[sql_type = "Date"]
    #[column_name = "priceDate"]
    price_date: NaiveDate,

    #[sql_type = "Text"]
    #[column_name = "price"]
    price: String,

    #[sql_type = "Float"]
    #[column_name = "priceFormatted"]
    _price_formatted: f32,

    #[sql_type = "Text"]
    #[column_name = "priceSource"]
    price_source: String,
}

#[derive(QueryableByName, Debug)]
struct KmmCurrencies {
    #[sql_type = "Text"]
    #[column_name = "ISOcode"]
    iso_code: String,

    #[sql_type = "Text"]
    name: String,

    #[sql_type = "Integer"]
    #[column_name = "type"]
    _typ: i32,

    #[sql_type = "Text"]
    #[column_name = "typeString"]
    type_string: String,

    // Unicode code point for the symbol
    #[sql_type = "Integer"]
    #[column_name = "symbol1"]
    _symbol1: i32,

    #[sql_type = "Text"]
    #[column_name = "symbolString"]
    symbol_string: String,

    #[sql_type = "Integer"]
    #[column_name = "symbol2"]
    _symbol2: i32,

    #[sql_type = "Integer"]
    #[column_name = "symbol3"]
    _symbol3: i32,

    #[sql_type = "Integer"]
    #[column_name = "smallestCashFraction"]
    smallest_cash_fraction: i32,

    #[sql_type = "Integer"]
    #[column_name = "smallestAccountFraction"]
    smallest_account_fraction: i32,

    #[sql_type = "Integer"]
    #[column_name = "pricePrecision"]
    _price_precision: i32,
}

#[derive(QueryableByName, Debug)]
struct KmmSecurities {
    #[sql_type = "Text"]
    id: String,

    #[sql_type = "Text"]
    name: String,

    #[sql_type = "Text"]
    symbol: String,

    #[sql_type = "Integer"]
    #[column_name = "type"]
    _typ: i32,

    #[sql_type = "Text"]
    #[column_name = "typeString"]
    type_string: String,

    #[sql_type = "Integer"]
    #[column_name = "smallestAccountFraction"]
    smallest_account_fraction: i32,

    #[sql_type = "Integer"]
    #[column_name = "pricePrecision"]
    price_precision: i32,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "tradingMarket"]
    _trading_market: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "tradingCurrency"]
    _trading_currency: Option<String>,

    #[sql_type = "Integer"]
    #[column_name = "roundingMethod"]
    _rounding_method: i32,
}

#[derive(QueryableByName, Debug)]
struct KmmPayees {
    #[sql_type = "Text"]
    id: String,

    #[sql_type = "Text"]
    name: String,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "reference"]
    _reference: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "email"]
    _email: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "addressStreet"]
    _address_street: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "addressCity"]
    _address_city: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "addressZipcode"]
    _address_zipcode: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "addressState"]
    _address_state: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "telephone"]
    _telephone: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "notes"]
    _notes: Option<String>,

    #[sql_type = "Nullable<Integer>"]
    #[column_name = "defaultAccountId"]
    _default_account_id: Option<AccountId>,

    #[sql_type = "Nullable<Integer>"]
    #[column_name = "matchData"]
    _match_data: Option<i32>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "matchIgnoreCase"]
    _match_ignore_case: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "matchKeys"]
    _match_keys: Option<String>,
}

#[derive(QueryableByName, Debug)]
struct KmmAccounts {
    #[sql_type = "Text"]
    id: String,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "institutionId"]
    institution_id: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "parentId"]
    parent_id: Option<String>,

    #[sql_type = "Nullable<Date>"]
    #[column_name = "lastReconciled"]
    last_reconciled: Option<NaiveDate>,

    #[sql_type = "Nullable<Date>"]
    #[column_name = "lastModified"]
    _last_modified: Option<NaiveDate>,

    #[sql_type = "Nullable<Date>"]
    #[column_name = "openingDate"]
    opening_date: Option<NaiveDate>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "accountNumber"]
    account_number: Option<String>,

    #[sql_type = "Text"]
    #[column_name = "accountType"]
    _account_type: String,

    #[sql_type = "Text"]
    #[column_name = "accountTypeString"]
    account_type_string: String,

    #[sql_type = "Text"]
    #[column_name = "isStockAccount"]
    _is_stock_account: String,

    #[sql_type = "Text"]
    #[column_name = "accountName"]
    account_name: String,

    #[sql_type = "Nullable<Text>"]
    description: Option<String>,

    #[sql_type = "Text"]
    #[column_name = "currencyId"]
    currency_id: String,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "balance"]
    _balance: Option<String>,

    #[sql_type = "Float"]
    #[column_name = "balanceFormatted"]
    _balance_formatted: f32,

    #[sql_type = "Float"]
    #[column_name = "transactionCount"]
    _transaction_count: f32,
}

#[derive(QueryableByName, Debug)]
struct KmmPriceSource {
    #[sql_type = "Text"]
    #[column_name = "priceSource"]
    price_source: String,
}

#[derive(QueryableByName, Debug)]
struct KmmTransactionsAndSchedule {
    #[sql_type = "Text"]
    id: String,

    #[sql_type = "Date"]
    #[column_name = "postDate"]
    post_ts: NaiveDate,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "memo"]
    memo: Option<String>,

    #[sql_type = "Text"]
    #[column_name = "currencyId"]
    currency_id: String,

    #[sql_type = "Nullable<Integer>"]
    #[column_name = "occurence"]
    occurrence: Option<i32>,    //  number of the repeating occurrence

    #[sql_type = "Nullable<Integer>"]
    #[column_name = "occurenceMultiplier"]
    occurrence_multiplier: Option<i32>,

    #[sql_type = "Nullable<Date>"]
    #[column_name = "startDate"]
    start_date: Option<NaiveDate>,

    #[sql_type = "Nullable<Date>"]
    #[column_name = "endDate"]
    end_date: Option<NaiveDate>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "lastDayInMonth"]
    last_day_in_month: Option<String>,

    #[sql_type = "Nullable<Integer>"]
    #[column_name = "weekendOption"]
    weekend_option: Option<i32>,

    #[sql_type = "Nullable<Date>"]
    #[column_name = "lastPayment"]
    last_payment: Option<NaiveDate>,
}

#[derive(QueryableByName, Debug)]
struct KmmSplits {
    #[sql_type = "Text"]
    #[column_name = "transactionId"]
    transaction_id: String,

    #[sql_type = "Text"]
    #[column_name = "txType"]
    _tx_type: String,

    #[sql_type = "Integer"]
    #[column_name = "splitId"]
    _id: i32,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "payeeId"]
    payee_id: Option<String>,

    #[sql_type = "Nullable<Date>"]
    #[column_name = "reconcileDate"]
    reconcile_date: Option<chrono::NaiveDate>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "action"]
    action: Option<String>,

    #[sql_type = "Integer"]
    #[column_name = "reconcileFlag"]
    reconcile_flag: i32,

    #[sql_type = "Text"]
    #[column_name = "value"]
    _value: String,

    #[sql_type = "Text"]
    #[column_name = "valueFormatted"]
    _value_formatted: String,

    #[sql_type = "Text"]
    #[column_name = "shares"]
    shares: String,

    #[sql_type = "Text"]
    #[column_name = "sharesFormatted"]
    _shares_formatted: String,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "price"]
    price: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "priceFormatted"]
    _price_formatted: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "memo"]
    memo: Option<String>,

    #[sql_type = "Text"]
    #[column_name = "accountId"]
    account_id: String,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "costCenterId"]
    _cost_center_id: Option<String>,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "checkNumber"]
    check_number: Option<String>,

    #[sql_type = "Date"]
    #[column_name = "postDate"]
    post_ts: chrono::NaiveDate,

    #[sql_type = "Nullable<Text>"]
    #[column_name = "bankId"]
    _bank_id: Option<String>,
}

#[derive(Default)]
struct KmyFile {
    account_is_closed: HashSet<String>,
    account_iban: HashMap<String, String>,
    account_has_opening_balances: HashSet<String>,
    online_sources: HashMap<String, String>,
    security_ids: HashMap<String, String>,
    account_kinds: HashMap<String, AccountKind>,  // lower cased key
    institutions: HashMap<String, Institution>,
    commodities: HashMap<String, Commodity>,  // iso_code -> currency
    qty_scales: HashMap<String, i32>,   // commodity_id -> scale
    payees: HashMap<String, Payee>,
    accounts: HashMap<String, Account>,
}

impl KmyFile {

    /// Import key/value pairs from KMyMoney
    pub fn import_key_values(
        &mut self, kmy: &SqliteConnection
    ) -> Result<()> {
        let kv = sql_query(GET_KMM_KEY_VALUE_FOR_ACCOUNTS)
            .load::<KmmKeyValue>(kmy)?;
        let mut ignored = HashSet::new();

        for row in kv.into_iter() {
            match row.key.as_str() {
                "mm-closed" => {
                    if let Some(d) = row.data {
                       if d.to_lowercase() == "yes" {
                           self.account_is_closed.insert(row.id);
                        }
                    }
                },
                "iban" => {
                    if let Some(d) = row.data {
                        self.account_iban.insert(row.id, d);
                    }
                },
                "OpeningBalanceAccount" => {
                    if let Some(d) = row.data {
                        if d.to_lowercase() == "yes" {
                            self.account_has_opening_balances.insert(
                                row.id);
                        }
                    }
                },
                "Imported" | "lastStatementBalance" | "lastNumberUsed" => {
                    // Not needed
                },
                "priceMode" => {
                    // Whether transactions are entered as price/share or
                    // total amount. Not needed.
                },
                "kmm-baseCurrency" | "kmm-id" => {
                    // File-level, default currency to use for new accounts
                },
                "reconciliationHistory" | "Tax"
                | "StatementKey" | "lastImportedTransactionDate" => {
                    if !ignored.contains(&row.key) {
                        error!(
                            "Ignored keyValue: account={} key={} data={:?} (may have others with same key)",
                            row.id, row.key, row.data
                        );
                        ignored.insert(row.key);
                    }
                },
                "kmm-online-source" => {
                    if let Some(d) = row.data {
                        self.online_sources.insert(row.id, d);
                    }
                },
                "kmm-security-id" => {
                    if let Some(d) = row.data {
                        self.security_ids.insert(row.id, d);
                    }
                },
                _ => {
                    if let Some(d) = row.data {
                        if d != "" {
                            error!(
                                "Unknown keyValue: id={} type={} key={} data={:?}",
                                row.id, row.typ, row.key, d
                            );
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Create account kinds
    pub fn create_account_kinds(
        &mut self,
        target: &SqliteConnect,
    ) -> Result<()> {
        // Download the list of account kinds already defined in the database
        // (which come from the initial data we loaded via migrations).

        let existing: Vec<AccountKind> =
            sql_query("SELECT * FROM alr_account_kinds")
            .load(&target.0)?;
        for k in existing {
            self.account_kinds.insert (k.name.to_lowercase(), k);
        }
        Ok(())
    }

    pub fn import_institutions(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
    ) -> Result<()> {
        let q = "SELECT kmmInstitutions.* from kmmInstitutions";
        let inst = diesel::sql_query(q).load::<KmmInstitutions>(kmy)?;
        for t in inst {
            self.institutions.insert(
                t.id.into(),
                Institution::create(
                    target,
                    t.name.clone(),
                    t.manager.clone(),
                    Some(format!(
                        "{}\n{}\n{}",
                        t.address_street.unwrap_or("".into()),
                        t.address_zipcode.unwrap_or("".into()),
                        t.address_city.unwrap_or("".into()),
                    )),
                    t.telephone.clone(),
                    t.routing_code.clone(),
                )?
            );
        }
        Ok(())
    }

    /// Import all currencies used in the kmy file

    pub fn import_currencies(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
    ) -> Result<()> {
        let q = "SELECT * FROM kmmCurrencies";
        let currencies = diesel::sql_query(q).load::<KmmCurrencies>(kmy)?;

        for c in currencies.into_iter() {
            if c.type_string != "Currency" {
                log::error!("Error: unexpected currency type {:?}", c);
                continue;
            }
            let comm = Commodity::create(
                target,
                &c.name,
                "",                        // symbol_before
                &c.symbol_string,          // symbol_after
                Some(&c.iso_code),
                CommodityKind::Currency,   // kind
                c.smallest_cash_fraction,  // price_scale
                None,                      // quote_symbol
                None,                      // quote_source_id
                None,                      // quote_currency_id
            )?;
            self.qty_scales.insert(
                c.iso_code.clone(), c.smallest_account_fraction);
            self.commodities.insert(c.iso_code.clone(), comm);
        }

        Ok(())
    }

    /// Import all securities

    pub fn import_securities(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
    ) -> Result<()> {
        let q = "SELECT * FROM kmmSecurities";
        let securities = diesel::sql_query(q).load::<KmmSecurities>(kmy)?;

        for c in securities.into_iter() {
            let kind = match c.type_string.as_str() {
                "Stock"       => CommodityKind::Stock,
                "Mutual Fund" => CommodityKind::MutualFund,
                "Bound"       => CommodityKind::Bond,
                e             => return Err(
                    format!("Invalid security type {}", e).into()),
            };

            let comm = Commodity::create(
                target,
                &c.name,
                "",                        // symbol_before
                &c.symbol,                 // symbol_after
                None,                      // iso_code
                kind,                      // kind
                i32::pow(10, c.price_precision as u32),  // price_scale
                Some(&c.symbol),           // quote_symbol
                None,                      // quote_source_id
                None,                      // quote_currency_id
            )?;
            self.qty_scales.insert(
                c.id.clone(), c.smallest_account_fraction);
            self.commodities.insert(c.id.clone(), comm);
        }

        Ok(())
    }

    /// Import payees

    pub fn import_payees(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
    ) -> Result<()> {
        let q = "SELECT * FROM kmmPayees";
        let payees = diesel::sql_query(q).load::<KmmPayees>(kmy)?;

        for p in payees {
            self.payees.insert(
                p.id,
                Payee::create(target, p.name)?,
            );
        }
        Ok(())
    }

    pub fn import_accounts(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
    ) -> Result<()> {
        let q = "SELECT * FROM kmmAccounts";
        let mut parents = HashMap::new();
        for a in diesel::sql_query(q).load::<KmmAccounts>(kmy)? {
            if let Some(p) = a.parent_id {
                parents.insert(a.id.clone(), p);
            }

            // To ease importing, we consider every line in the decription
            // starting with "alere:" as containing hints for the importer.
            // Currently:
            //     alere: account_kind_name

            let config: Vec<&str> =
                a.description
                .as_deref()
                .unwrap_or_default()
                .split('\n')
                .filter(|line| line.starts_with("alere:"))
                .take(1)
                .collect();

            let akind_name = match config.get(0) {
                None  => &a.account_type_string,
                Some(line) => line.split(':').skip(1).next().unwrap(),
            }.trim().to_lowercase();

            let akind = match self.account_kinds.get(&akind_name) {
                None => {
                    println!(
                        "Could not get account_kind '{}' for account '{}'",
                        akind_name, a.account_name);

                    // Fallback to the general category from KmyMoney, which
                    // should always be defined.
                    self.account_kinds.get (&a.account_type_string).unwrap().id
                },
                Some(k) => k.id,
            };

            let mut acc = Account::new(
                &a.account_name,                      // name
                a.description.as_deref(),             // description
                self.account_iban.get(&a.id).map(|c| c.as_str()),
                a.account_number.as_deref(),          // number
                self.account_is_closed.contains(&a.id), // closed
                *self.qty_scales.get(&a.currency_id)   // commodity_scu
                    .expect(&format!("No qty_scales for {}", a.currency_id)),
                a.last_reconciled               // last_reconciled
                    .map(|r| r.and_hms_opt(0, 0, 0))
                    .flatten(),
                a.opening_date,                 // opening_date
                self.commodities.get(&a.currency_id).unwrap().id,
                a.institution_id
                    .map(|id| self.institutions.get(&id))
                    .flatten()
                    .map(|inst| inst.id),
                akind,
                None,   // parent
            );

            //  Save the account to get a unique id in the database
            let _: () = acc.save(target)?;

            self.accounts.insert(a.id, acc);
        }

        // We can now set the parent accounts
        for (key, parent) in parents.iter() {
            let p = self.accounts[parent].id;
            let mut acc = self.accounts.get_mut(key).unwrap();
            acc.parent_id = Some(p);
            let _: () = acc.save(target)?;
        }

        Ok(())
    }

    /// Load the list of all price sources used in the KMyMoney file

    pub fn import_price_sources(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
    ) -> Result<HashMap<String, PriceSource>> {
        let q = "SELECT DISTINCT kmmPrices.priceSource from kmmPrices";
        let r = diesel::sql_query(q).load::<KmmPriceSource>(kmy)?;
        let mut result = HashMap::new();
        for s in r {
            result.insert(
                s.price_source.clone(),
                PriceSource::create(target, &s.price_source)?,
            );
        }
        Ok(result)
    }

    /// Convert a price read from kmymoney into a scaled price, where scale
    /// is the currency's scale.
    /// There might be rounding errors because we want to represent things
    /// as integers, with a fixed scaling factor (??? should we change
    /// that), so we try to find the best representation, possibly
    /// storing the inverse of the number.
    /// For instance, with a scale of 100 (so two digits precision):
    ///
    ///  EUR->E000041    price=247/10000  = 0.0247
    ///
    ///  Round down | Round up   | Inverse, round down | Inverse round up |
    ///  -----------+------------+---------------------+------------------+
    ///    2/100    |    3/100   | 4048 / 100          | 4049 / 100       |
    ///    0.02     |    0.03    | 0,02470355731       | 0,02469745616    |
    ///    -23.5%   |    +17.66% |   +0.0144%          |  -0.0103%  <==== |
    ///
    /// But
    ///  price = 24712/10000 = 2.4712
    ///  Round down | Round up  | Inverse, round down | Inverse round up |
    ///  -----------+-----------+---------------------+------------------+
    ///  247/100    | 248/100   | 40/100              | 41/100           |
    ///   2.47      |   2.48    |   2.5               |  2,4390243902    |
    ///  -0.048% <==|  +0.35%   |  +1.152%            | -1.3119%         |
    ///
    /// And
    ///  USD->EUR   price = 1051/1250 = 0.8408
    ///  Round down | Round up  | Inverse, round down | Inverse round up |
    ///  -----------+-----------+---------------------+------------------+
    ///    84/100   | 85/100    | 118/100             | 119/100          |
    ///    0.84     | 0.85      | 0,8474576271        | 0,8403361345     |
    ///    -0.0952% | +1.082%   | +0.785%             | -0.0552% <===    |

    fn scaled_price(
        &self,
        text: &str,           //  read in kmyMony
        scale: u32,           //  scale to apply for direct conversion
        inverse_scale: u32,   //  scale for opposite conversion
    )  -> (Option<i64>, bool) {
        if text.len() == 0 { 
            return (None, false);
        }

        let s: Vec<&str> = text.split('/').collect();
        assert!(s.len() == 2);

        let num = s[0].parse::<i64>().unwrap();
        let den = s[1].parse::<i64>().unwrap();
        if num == 0 {
            return (Some(0), false);
        }

//        if den == 1 {
//            return (
//                (Decimal::new(num, 1) * Decimal::from(scale)).to_i64(),
//                false
//            );
//        }

        let d = Decimal::new(num, 1) / Decimal::new(den, 1);

        fn round_and_err(
            d: Decimal,
            scale: u32,
            strat: RoundingStrategy,
        ) -> (Decimal, Decimal) {
            let v = d.round_dp_with_strategy(scale, strat);
            let err1 = if v.is_zero() {
                Decimal::MAX
                } else { d / v - Decimal::ONE };
            (v, err1)
        }

        fn best(d: Decimal, scale: u32) -> (Decimal, Decimal) {
            let (d1, err1) = round_and_err(
                d, scale, RoundingStrategy::MidpointTowardZero);
            let (d2, err2) = round_and_err(
                d, scale, RoundingStrategy::MidpointAwayFromZero);
            let p = if err2 < err1 { d2 } else { d1 };
            let err = Decimal::min(err1, err2);
            (p, err)
        }

        let (p, err) = best(d, scale);
        let price_tolerance = Decimal::from_f32_retain(0.001).unwrap();
//        if text == "-25/1" {
//            println!("MANU text={} num={} den={} d={} scale={} p={} err={}",
//                text, num, den, d, scale, p, err);
//        }

        if err != Decimal::ZERO && inverse_scale != 0 {
            let (p2, err2) = best(d.inv(), inverse_scale);
//            if text == "-25/1" {
//                println!("MANU    inverse_scale={} p2={} err2={}",
//                    inverse_scale, p2, err2);
//            }
            if err2 < err {
                if err2 > price_tolerance {
                    println!(
                        "WARNING: price {} ({}) imported with rounding error {}",
                        text, d, err2 * Decimal::ONE_HUNDRED);
                }
                return ((p2 * Decimal::from(inverse_scale)).to_i64(), true);
            }
        }

        if err > price_tolerance {
            println!(
                "WARNING: price {} ({}) imported with rounding error {}",
                text, d, err * Decimal::ONE_HUNDRED);
        }

        ((p * Decimal::from(scale)).to_i64(), false)
    }

    ///
    /// kMyMoney sometimes has prices from Security->Currency which do not
    /// really make sense and are wrongly rounded on import. For instance:
    ///   fromId  toId     priceDate   price
    ///   ------  -------  ----------  ---------
    ///   EUR     E000041  2021-01-27  247/10000
    /// would be imported as a scaled price of "2" (when scale is 100),
    ///    0.02 differs by -19% of the original !
    /// instead of "2.47". On import, try to preserve the maximum precision
    /// If instead we store 10000/247=40.4858299 as 40.48 for the reverse
    /// operation, we get better results
    ///    1/40.48 = 0,02470355731  differs by 0.014% of the original
    ///
    /// With different numbers, the result is not as good though. For
    /// instance:
    ///    USD    EUR   1051/1250             (i.e. 0.8408)
    /// where price_scale is 100 for both currencies (in kMyMoney,
    /// smallCashFraction is 100).
    ///    we could either store 84/100  (differs by -0.1% of the original)
    ///    or store the reverse 1250/1051=1.189343  as 1.18
    ///       (1 / 1.18 = 0.847457, which differs by 0.8% of the original)

    pub fn import_prices(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
        price_sources: &HashMap<String, PriceSource>,
    ) -> Result<()> {
        let q = "SELECT * FROM kmmPrices";
        let prices = diesel::sql_query(q).load::<KmmPrices>(kmy)?;
        for price in prices {
            let origin = match self.commodities.get(&price.from_id) {
                None => return Err(
                    format!("No matching commodity {}", price.from_id)
                    .into()
                ),
                Some(orig) => orig,
            };

            let dest = match self.commodities.get(&price.to_id) {
                None => return Err(
                    format!("No matching commodity {}", price.to_id)
                    .into()
                ),
                Some(orig) => orig,
            };

            let p = self.scaled_price(
                &price.price,
                origin.price_scale as u32,   //  scale
                dest.price_scale as u32,     //  inverse scale
            );
            let date = match price.price_date.and_hms_opt(0, 0, 0) {
                Some(d) => d,
                None    => {
                   return Err(
                       format!("Could not parse date {}", price.price_date)
                       .into()
                   );
                }
            };
            let source = price_sources.get(&price.price_source)
                .ok_or(format!(
                    "Invalid price source {}",
                    price.price_source))?;

            match p {
                (Some(val), true) => {
                    let _: () = Price::create(
                        target,
                        dest.id,
                        origin.id,
                        date,
                        val as u64,
                        source.id,
                    )?;
                },
                (Some(val), false) => {
                    let _: () = Price::create(
                        target,
                        origin.id,
                        dest.id,
                        date,
                        val as u64,
                        source.id,
                    )?;
                },
                (None, _) => {
                    return Err(format!(
                        "Could not parse price {} for commodity {}",
                        price.price,
                        origin.id).into());
                },
            };
        }

        Ok(())
    }

    /// Example of multi-currency transaction:
    ///   kmmTransactions:
    ///   *  id=1   currencyId=USD
    ///   kmmSplits:
    ///   *  transactionId=1  account=brokerage(currency=EUR)
    ///      value=-1592.12 (expressed in kmmTransactions.currencyId USD)
    ///      shares=-1315.76 (expressions in split.account.currency EUR)
    ///      price= N/A
    ///   * transactionId=1   account=stock(currency=STOCK)
    ///      value=1592.12 (in kmmTransactions.currencyId USD)
    ///      shares=32     (in STOCK)
    ///      price=48.85   (in USD)

    pub fn import_transactions(
        &mut self,
        kmy: &SqliteConnection,
        target: &SqliteConnect,
    ) -> Result<()> {
        // transactions too
        // - transaction.entryDate:  not needed
        // - ??? transaction.bankId: for imports
        // - ??? transaction.txType: Normal or Scheduled
        // - ??? kmmSchedules.name
        // - ??? kmmSchedules.autoEnter
        // - ??? kmmSchedules.type    Bill/Deposit/Transfer
        // - ??? kmmSchedules.paymentType ('Other')
        //   also: write check, bank transfer, standing order, direct
        //   debit, manual deposit, direct deposit
        // - ??? Check that transPostDate == schedule_start when the
        //   latter exists
        // - ??? schedule_freq is Once, Day, Week, Half-month, month, year
        // - ??? kmmSchedules.fixed
        //    indicates whether the amount is an estimate ('N') or
        //    fixed ('Y')

        // Recreate a recurrence rule from the fields in KmyMoney
        fn compute_scheduled(
            freq: i32, interval: i32, end: Option<NaiveDate>,
            last_in_month: bool, week_end: i32
        ) -> Option<String> {
            if freq == 1 {
                return Some("".into());    //  once
            }
            let mut parts: Vec<String> = Vec::new();

            parts.push(match freq {
                2     => "freq=DAILY".into(),
                4     => "freq=WEEKLY".into(),
                18    => "freq=HALFMONTHLY".into(),
                32    => "freq=MONTHLY".into(),
                16384 => "freq=YEARLY".into(),
                _     => return None,
            });

            parts.push(format!("interval={}", interval).into());

            match end {
                None  => {},
                Some(e) => parts.push(format!("until={}", e).into()),
            };

            if last_in_month {
                assert!(freq == 32);
                parts.push("bysetpos=-1".into());
                parts.push("byday=MO,TU,WE,TH,FR,SA,SU".into());
            };

            match week_end {
                0   => {  //  previous working day
                    println!(
                        "Cannot handle scheduled transactions that use previous working day when on week-ends");
                    return None;
                },
                1   => {  //  next working day
                    parts.push("byweekday=MO,TU,WE,TH,FR".into());
                },
                2   => { },  //  always on given day
                _   => {
                    println!("Wrong week-end processing {}", week_end);
                    return None;
                },
            };

            Some(parts.join(";"))
        }

        let mut transactions = HashMap::new();
        let mut tx_currencies = HashMap::new();

        let q = "SELECT
                kmmTransactions.id,
                kmmTransactions.postDate,
                kmmTransactions.memo,
                kmmTransactions.currencyId,
                kmmSchedules.occurence,
                kmmSchedules.occurenceMultiplier,
                kmmSchedules.startDate,
                kmmSchedules.endDate,
                kmmSchedules.lastDayInMonth,
                kmmSchedules.weekendOption,
                kmmSchedules.lastPayment
             FROM kmmTransactions LEFT JOIN kmmSchedules USING (id)";
        for tx in sql_query(q).load::<KmmTransactionsAndSchedule>(kmy)? {
            let post_ts = match tx.start_date {
                None     => tx.post_ts.and_hms_opt(0, 0, 0).unwrap(),
                Some(sd) => sd.and_hms_opt(0, 0, 0).unwrap(),
            };
            let scheduled = match tx.occurrence {
                None     => None,
                Some(s)  => compute_scheduled(
                    s,   //  frequency
                    tx.occurrence_multiplier.unwrap(),  // interval
                    tx.end_date,                        // end date
                    tx.last_day_in_month.unwrap() == "Y",
                    tx.weekend_option.unwrap(),
                ),
            };
            let tr = Transaction::create(
                target,
                post_ts,
                tx.memo,
                None,
                scheduled,
                tx.last_payment,
                crate::scenarios::NO_SCENARIO,
            )?;
            transactions.insert(tx.id.clone(), tr);
            tx_currencies.insert(
                tx.id.clone(),
                self.commodities.get(&tx.currency_id).unwrap()
            );
        }

        let q = "SELECT * FROM kmmSplits";
        for sp in sql_query(q).load::<KmmSplits>(kmy)? {
            let reconcile = match sp.reconcile_flag {
                0  => ReconcileKind::NEW,
                1  => ReconcileKind::CLEARED,
                _  => ReconcileKind::RECONCILED,
            };
            let acc = &self.accounts[&sp.account_id];
            let (shares, _)  = self.scaled_price(
                &sp.shares,
                acc.commodity_scu as u32,   // scale
                0,                          // inverse_scale
            );
            let shares = shares.unwrap_or(0);
            let currency: CommodityId;
            let scaled_value: i64;

            match (sp.action.as_deref(), sp.price) {
                (Some("Dividend") | Some("Add"), _) | (_, None) => {
                    // kmymoney sets "1.00" for the price, which does
                    // not reflect the current price of the share at the
                    // time, so better have nothing.
                    // In kmymoney, foreign currencies are not supported
                    // in transactions.
                    currency = acc.commodity_id;
                    scaled_value = shares;
                },
                (_, Some(p)) => {
                    let (price, _) = self.scaled_price(
                        &p,
                        1_000_000,   // scale for a stock account
                        0,           // inverse_scale
                    );
                    let cur = tx_currencies[&sp.transaction_id];
                    currency = cur.id;
                    scaled_value =
                        shares * price.unwrap()
                        * (cur.price_scale as i64)
                        / (
                            1_000_000                  // scale for price
                            * acc.commodity_scu as i64 // scale for shares
                        );

                },
            };

            let _: Split = Split::create(
                target,
                shares,                       // scaled_qty
                scaled_value as u64,          // scaled_value
                reconcile,                    // reconcile
                sp.reconcile_date.map(|d| d.and_hms_opt(0, 0, 0).unwrap()),
                sp.post_ts.and_hms_opt(0, 0, 0).unwrap(),  // post_ts
                acc.id,                       // account_id
                sp.payee_id
                    .map(|pi| self.payees.get(&pi)) // payee_id
                    .flatten()
                    .map(|p| p.id),
                transactions[&sp.transaction_id].id,   // transaction_id
                currency,                     // value_commodity_id
            )?;

            let mut m = sp.memo
                .map(|me| me.clone())
                .unwrap_or("".into());
            match sp.action.as_deref() {
                Some("Add") if shares >= 0 =>
                    { m.push_str("Add shares"); },
                Some("Add")                =>
                    { m.push_str("Remove shares"); },
                Some("Buy") if shares >= 0 =>
                    { m.push_str("Buy shares"); },
                Some("Buy")                =>
                    { m.push_str("Sell shares"); },
                Some("Dividend")           =>
                    { m.push_str("Dividends"); },
                Some("Reinvest")           =>
                    { m.push_str("Reinvested dividend"); },
                _                          => {},
            };
            let _: () = transactions.get_mut(&sp.transaction_id)
                .unwrap()
                .add_to_memo(target, &m)?;
            let _: () = transactions.get_mut(&sp.transaction_id)
                .unwrap()
                .set_check_number(target, sp.check_number.as_deref(),
            )?;
        }

        Ok(())
    }
}


pub fn import(
    target: &PathBuf,
    source: &PathBuf,
) -> Result<()> {
    info!("import {} into {}", source.display(), target.display());

    // Establish a new connection to a kmymoney database.
    let s = String::from(source.to_string_lossy());
    let kmy = match SqliteConnection::establish(&s) {
        Ok(k)  => k,
        Err(e) => return Err(format!("Error reading {}, {}", s, e).into()),
    };

    // Create the target file
    let mut db = Database::new();
    if let Err(e) = db.create_file(target) {
        return Err(
            format!("Error creating {}, {}", target.display(), e).into());
    }
    let connection = db.get()?;

    connection.0.transaction::<(), crate::errors::AlrError, _>(|| {
        let mut file = KmyFile::default();
        file.import_key_values(&kmy)
             .map_err(|e| format!("{} while importing key-values", e))?;
        let _: () = file.create_account_kinds(&connection)?;
        let price_sources = file.import_price_sources(&kmy, &connection)?;
        let _: () = file.import_institutions(&kmy, &connection)
             .map_err(|e| format!("{} while importing institutions", e))?;
        let _: () = file.import_currencies(&kmy, &connection)
             .map_err(|e| format!("{} while importing currencies", e))?;
        let _: () = file.import_securities(&kmy, &connection)
             .map_err(|e| format!("{} while importing securities", e))?;
        let _: () = file.import_payees(&kmy, &connection)
             .map_err(|e| format!("{} while importing payees", e))?;
        let _: () = file.import_accounts(&kmy, &connection)
             .map_err(|e| format!("{} while importing accounts", e))?;
        let _: () = file.import_prices(&kmy, &connection, &price_sources)
             .map_err(|e| format!("{} while importing prices", e))?;
        let _: () = file.import_transactions(&kmy, &connection)
             .map_err(|e| format!("{} while importing transactions", e))?;
        Ok(())
    })?;

    Ok(())
}
