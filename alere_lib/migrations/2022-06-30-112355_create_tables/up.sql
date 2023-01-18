CREATE TABLE IF NOT EXISTS alr_institutions (
   id           integer NOT NULL PRIMARY KEY AUTOINCREMENT,
   name         text NOT NULL,
   manager      text,
   address      text,
   phone        text,
   routing_code text,
   icon         text
);
CREATE TABLE IF NOT EXISTS alr_payees (
   id           integer NOT NULL PRIMARY KEY AUTOINCREMENT,
   name         text    NOT NULL
);
CREATE TABLE IF NOT EXISTS alr_price_sources (
   id           integer NOT NULL PRIMARY KEY AUTOINCREMENT,
   name         text    NOT NULL
);
CREATE TABLE IF NOT EXISTS alr_scenarios (
   id           integer NOT NULL PRIMARY KEY AUTOINCREMENT,
   name         text    NOT NULL,
   description  text
);
CREATE TABLE IF NOT EXISTS alr_transactions (
   id              integer  NOT NULL PRIMARY KEY AUTOINCREMENT,
   timestamp       datetime NOT NULL,
   memo            text,
   check_number    text,
   scheduled       text,
   last_occurrence datetime,
   scenario_id     integer NOT NULL
      REFERENCES alr_scenarios(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS alr_splits (
   id                 integer    NOT NULL PRIMARY KEY AUTOINCREMENT,
   scaled_qty         integer    NOT NULL,
   scaled_value       integer    NOT NULL,
   reconcile          varchar(1) NOT NULL,
   reconcile_date     date,
   post_date          date   NOT NULL,
   account_id         integer    NOT NULL
      REFERENCES alr_accounts(id) DEFERRABLE INITIALLY DEFERRED,
   payee_id           integer
      REFERENCES alr_payees(id)   DEFERRABLE INITIALLY DEFERRED,
   transaction_id     integer    NOT NULL
      REFERENCES alr_transactions(id) DEFERRABLE INITIALLY DEFERRED,
   value_commodity_id integer    NOT NULL
      REFERENCES alr_commodities(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS alr_prices (
   id           integer  NOT NULL PRIMARY KEY AUTOINCREMENT,
   date         datetime NOT NULL,
   scaled_price bigint  NOT NULL,
   origin_id    integer  NOT NULL
      REFERENCES alr_commodities (id) DEFERRABLE INITIALLY DEFERRED,
   source_id    integer  NOT NULL
      REFERENCES alr_price_sources (id) DEFERRABLE INITIALLY DEFERRED,
   target_id    integer  NOT NULL
      REFERENCES alr_commodities (id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS alr_commodities (
   id                integer    NOT NULL PRIMARY KEY AUTOINCREMENT,
   name              text       NOT NULL,
   symbol_before     text       NOT NULL,
   symbol_after      text       NOT NULL,
   iso_code          text,
   kind              integer    NOT NULL,
   price_scale       integer    NOT NULL,
   quote_symbol      text,
   quote_source_id   integer
      REFERENCES alr_price_sources (id) DEFERRABLE INITIALLY DEFERRED,
   quote_currency_id integer
      REFERENCES alr_commodities (id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX alr_transactions_scenario_id ON alr_transactions
   (scenario_id);
CREATE INDEX alr_splits_account_id ON alr_splits (account_id);
CREATE INDEX alr_splits_payee_id ON alr_splits (payee_id);
CREATE INDEX alr_splits_transaction_id ON alr_splits (transaction_id);
CREATE INDEX alr_splits_value_commodity_id ON alr_splits
   (value_commodity_id);
CREATE INDEX alr_prices_origin_id ON alr_prices (origin_id);
CREATE INDEX alr_prices_source_id ON alr_prices (source_id);
CREATE INDEX alr_prices_target_id ON alr_prices (target_id);
CREATE INDEX alr_commodities_quote_source_id ON alr_commodities
   (quote_source_id);
CREATE INDEX alr_commodities_quote_currency_id ON alr_commodities
   (quote_currency_id);
CREATE TABLE IF NOT EXISTS alr_accounts (
   id              integer NOT NULL PRIMARY KEY AUTOINCREMENT,
   name            text    NOT NULL,
   description     text,
   iban            text,
   number          text,
   closed          boolean NOT NULL,
   commodity_scu   integer NOT NULL,
   last_reconciled datetime,
   opening_date    date,
   commodity_id    integer NOT NULL
      REFERENCES alr_commodities (id) DEFERRABLE INITIALLY DEFERRED,
   institution_id  integer
      REFERENCES alr_institutions (id) DEFERRABLE INITIALLY DEFERRED,
   kind_id         integer NOT NULL
      REFERENCES alr_account_kinds (id) DEFERRABLE INITIALLY DEFERRED,
   parent_id       integer
      REFERENCES alr_accounts (id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX alr_accounts_commodity_id ON alr_accounts (commodity_id);
CREATE INDEX alr_accounts_institution_id ON alr_accounts (institution_id);
CREATE INDEX alr_accounts_kind_id ON alr_accounts (kind_id);
CREATE INDEX alr_accounts_parent_id ON alr_accounts (parent_id);
CREATE TABLE IF NOT EXISTS alr_account_kinds (
   id                 integer NOT NULL PRIMARY KEY AUTOINCREMENT,
   name               text    NOT NULL,
   name_when_positive text    NOT NULL,
   name_when_negative text    NOT NULL,
   category           integer NOT NULL,
   is_work_income     boolean NOT NULL,
   is_passive_income  boolean NOT NULL,
   is_unrealized      boolean NOT NULL,
   is_networth        boolean NOT NULL,
   is_trading         boolean NOT NULL,
   is_stock           boolean NOT NULL,
   is_income_tax      boolean NOT NULL,
   is_misc_tax        boolean NOT NULL,
   CONSTRAINT passive_income_is_also_income CHECK
      ((NOT is_passive_income OR category = 1)),
   CONSTRAINT work_income_is_also_income CHECK
      ((NOT is_work_income OR category = 1)),
   CONSTRAINT incomeexpense_is_not_networth CHECK
      ((NOT (category IN (1, 0)) OR NOT is_networth)),
   CONSTRAINT work_income_is_not_passive_income CHECK
      (((is_work_income AND NOT is_passive_income)
        OR (NOT is_work_income AND is_passive_income)
        OR (NOT is_work_income AND NOT is_passive_income)))
);


--  Lookup prices in various places.
--  This combines price information from the historical prices in
--  alr_prices (applying conversions in both directions), and from
--  the prices used in actual transactions.
--  This table only has currencies as targets, so can contain the
--  price of stocks or exchange rates between currencies.
--  Only prices explicitly found in the database exist.
--
--  scaled_price are scaled by origin's price_scale as in alr_prices

CREATE VIEW alr_raw_prices AS
   SELECT origin_id, target_id, scaled_price, date, source_id
      FROM alr_prices p2
         JOIN alr_commodities t ON (p2.target_id=t.id)
      WHERE t.kind = 0

   --  consider exchange rates in both directions
   UNION ALL
   SELECT target_id, origin_id,
       CAST(target.price_scale AS FLOAT)
          * origin.price_scale
          / alr_prices.scaled_price,
       date,
       source_id
      FROM alr_prices
         JOIN alr_commodities origin
            ON (alr_prices.origin_id=origin.id)
         JOIN alr_commodities target
            ON (alr_prices.target_id=target.id)
      WHERE origin.kind = 0

   --  extract prices from transactions.
   UNION ALL
   SELECT a.commodity_id AS origin_id,
      s.value_commodity_id AS target_id,
      CAST(s.scaled_value
           * a.commodity_scu   --  scale for s.scaled_qty
           * curr.price_scale  --  to get a scaled value
           AS FLOAT)
         / (s.scaled_qty
            * t.price_scale),  --  scale for s.scaled_qty
      s.post_date AS date,
      3 as source_id
      FROM alr_splits s
         JOIN alr_commodities t ON (s.value_commodity_id=t.id)
         JOIN alr_accounts a ON (s.account_id=a.id)
         JOIN alr_commodities curr ON (a.commodity_id=curr.id)
      WHERE t.kind = 0
         AND a.commodity_id <> s.value_commodity_id

   --  extract prices from transactions  (reverse direction)
   UNION ALL
   SELECT s.value_commodity_id AS origin_id,
      a.commodity_id AS target_id,
      CAST(s.scaled_qty * t.price_scale * t.price_scale   AS FLOAT)
         / (s.scaled_value * a.commodity_scu),
      s.post_date AS date,
      3 as source_id
      FROM alr_splits s
         JOIN alr_commodities t ON (s.value_commodity_id=t.id)
         JOIN alr_accounts a ON (s.account_id=a.id)
         JOIN alr_commodities curr ON (a.commodity_id=curr.id)
      WHERE curr.kind = 0
         AND a.commodity_id <> s.value_commodity_id

   --  A currency always has a 1.0 exchange rate with itself. This simplifies
   --  the computation of balances later on
   UNION ALL
   SELECT c.id AS origin_id,
      c.id AS target_id,
      c.price_scale AS scaled_price,
      '1900-01-01 00:00:00' as date,
      3 as source_id
      FROM alr_commodities c
      WHERE c.kind = 0
;


--  Similar to alr_raw_prices but also include prices after going through a
--  turnkey currency (ie commodity -> currency1 -> currency2) by taking
--  advantage of the exchange rates in the database. Because there is always a
--  1.0 xrate from a currency to itself, all the direct commodity->currency1
--  rates are also available.
--  All prices scaled by origin.price_scale

CREATE VIEW alr_raw_prices_with_turnkey AS
   SELECT a.origin_id,
       p.target_id,
       CAST(a.scaled_price AS FLOAT) * p.scaled_price
          / c.price_scale AS scaled_price,
       o.price_scale,
       a.date,
       a.source_id
   FROM alr_raw_prices a
        JOIN alr_commodities o ON (a.origin_id=o.id)
        JOIN alr_price_history p ON (a.target_id=p.origin_id)
        JOIN alr_commodities c ON (p.origin_id=c.id)
   WHERE
     p.mindate<=a.date
     AND a.date<p.maxdate
     AND (a.origin_id != p.target_id OR a.origin_id = a.target_id)
;


--  Provide price of commodities for any point in time.

CREATE VIEW alr_price_history AS
   SELECT p.origin_id,             --  Currency or Stock
      p.target_id,                 --  Always a currency
      p.scaled_price,              --  scaled by origin_id's price_scale
      p.date as mindate,
      COALESCE(
         LEAD(p.date)
            OVER (PARTITION BY p.origin_id, p.target_id
                  ORDER BY p.date),
         '2999-12-31 00:00:00'
      ) as maxdate,
      p.source_id
   FROM alr_raw_prices p
;

CREATE VIEW alr_price_history_with_turnkey AS
   SELECT p.origin_id,
     p.target_id,
     p.scaled_price,
     p.price_scale,
     p.date as mindate,
     COALESCE(
        LEAD(p.date)
           OVER (PARTITION BY p.origin_id, p.target_id
                 ORDER BY p.date),
        '2999-12-31 00:00:00'
     ) as maxdate,
     p.source_id
   FROM alr_raw_prices_with_turnkey p
;


--  For all accounts, compute the total amount invested (i.e. money
--  transferred from other user accounts) and realized gains (i.e.
--  money transferred to other user accounts).
--
--  For efficiency (to avoid traversing tables multiple times), this
--  duplicates the alr_balances and alr_balances_currency views.
--
--  To handle multi-currency, the computation is duplicated in all
--  possible currencies known in the database, applying the exchange
--  rate at the time of the transaction.
--
--  All values given in currency_id and unscaled

CREATE VIEW alr_invested AS
   WITH internal_splits AS (
      SELECT s2.transaction_id,
         s2.account_id,
         xrate.target_id,
         CAST(s2.scaled_value        --  number of shares
               * xrate.scaled_price  --  convert to currency
               AS FLOAT)
            / (c2.price_scale        --  scale of scaled_value
               * xrate.price_scale   --  scale of xrate.scaled_price
            )  AS value
      FROM alr_splits s2

      --  All the splits that transfer money between two accounts
      --  (they do not modify overall networth).
      JOIN alr_accounts s2a ON (s2.account_id=s2a.id)
      JOIN alr_account_kinds s2ak
          ON (s2a.kind_id=s2ak.id AND s2ak.is_networth)
      JOIN alr_commodities c2 ON (s2.value_commodity_id = c2.id)

      --  To handle multi-currencies, we convert the prices to a common
      --  currency
      JOIN alr_price_history_with_turnkey xrate
            ON (s2.value_commodity_id=xrate.origin_id
                AND s2.post_date >= xrate.mindate
                AND s2.post_date < xrate.maxdate)
   ),
   include_empty_range AS (
      SELECT
         a.id AS account_id,
         a.commodity_id,
         s2.target_id as currency_id,   --  currency for investment,...
         s.post_date AS mindate,
         COALESCE(
            LEAD(s.post_date) OVER win,
            '2999-12-31 00:00:00'
         ) AS maxdate,
         CAST(SUM(CASE WHEN s.account_id = s2.account_id
                       THEN s.scaled_qty ELSE 0 END)
            OVER win
            AS FLOAT
           ) / a.commodity_scu
           AS shares,
         SUM(CASE WHEN s.account_id <> s2.account_id AND s2.value < 0
                  THEN -s2.value
                  ELSE 0 END)
            OVER win
            AS invested,
         SUM(CASE WHEN s.account_id <> s2.account_id AND s2.value > 0
                  THEN s2.value
                  ELSE 0 END)
            OVER win
            AS realized_gain,
         SUM(CASE WHEN s.account_id <> s2.account_id
                    AND s2.value <> 0
                    AND s.scaled_qty <> 0
                  THEN abs(s2.value)
                  ELSE 0 END)
            OVER win
            AS invested_for_shares,
         CAST(SUM(CASE WHEN s.account_id <> s2.account_id
                    AND s2.value <> 0 AND s.scaled_qty <> 0
                  THEN abs(s.scaled_qty) ELSE 0 END)
               OVER win
              AS FLOAT)
            / a.commodity_scu AS shares_transacted
      FROM alr_splits s
        JOIN internal_splits s2 USING (transaction_id)
        JOIN alr_accounts a ON (s.account_id = a.id)
      WINDOW win AS (
          PARTITION BY s.account_id, s2.target_id
          ORDER BY s.post_date
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      )
  )
  SELECT *
  FROM include_empty_range
  WHERE mindate <> maxdate
;


--  For all accounts, compute the return on investment at any point in time, by
--  combining the balance at that time with the total amount invested that far
--  and realized gains moved out of the account.

CREATE VIEW alr_roi AS
   SELECT
      max(b.mindate, p.mindate) as mindate,
      min(b.maxdate, p.maxdate) as maxdate,
      b.commodity_id,      --  Which stock are we talking about ?
      b.account_id,        --  traded in which account ?
      b.realized_gain,     --  in b.currency_id
      b.invested,          --  in b.currency_id
      b.shares,            --  in b.commodity_id
      b.currency_id,       -- all values are given in this currency
      CAST(b.shares * p.scaled_price AS FLOAT) / p.price_scale AS balance,
      CAST(p.scaled_price AS FLOAT) / p.price_scale
         AS computed_price,
      (CAST(b.shares * p.scaled_price AS FLOAT) / p.price_scale
         + b.realized_gain) / b.invested as roi,
      CAST(b.shares * p.scaled_price AS FLOAT) / p.price_scale
         + b.realized_gain - b.invested as pl,
      (b.invested - b.realized_gain) / b.shares as average_cost,
      (b.invested_for_shares / b.shares_transacted) as weighted_average
   FROM
      alr_invested b

      --  price of shares given in the same currency as investment, gains, ...
      JOIN alr_price_history_with_turnkey p
         ON (b.commodity_id = p.origin_id AND b.currency_id = p.target_id)
   WHERE
      b.mindate < p.maxdate
      AND p.mindate < b.maxdate
;
