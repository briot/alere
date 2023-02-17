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
   reconcile_ts       datetime,
   post_ts            datetime   NOT NULL,
   account_id         integer    NOT NULL
      REFERENCES alr_accounts(id) DEFERRABLE INITIALLY DEFERRED,
   payee_id           integer
      REFERENCES alr_payees(id)   DEFERRABLE INITIALLY DEFERRED,
   transaction_id     integer    NOT NULL
      REFERENCES alr_transactions(id) DEFERRABLE INITIALLY DEFERRED,
   value_commodity_id integer    NOT NULL
      REFERENCES alr_commodities(id) DEFERRABLE INITIALLY DEFERRED,
   ratio_qty          float      NOT NULL DEFAULT 1.0
);
CREATE TABLE IF NOT EXISTS alr_prices (
   id           integer  NOT NULL PRIMARY KEY AUTOINCREMENT,
   ts           datetime NOT NULL,
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
   SELECT origin_id, target_id, scaled_price, ts, source_id
      FROM alr_prices p2
         JOIN alr_commodities t ON (p2.target_id=t.id)
      WHERE t.kind = 0

   --  consider exchange rates in both directions
   UNION ALL
   SELECT target_id, origin_id,
       CAST(target.price_scale AS FLOAT)
          * origin.price_scale
          / alr_prices.scaled_price,
       ts,
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
      s.post_ts AS ts,
      3 as source_id
      FROM alr_splits s
         JOIN alr_commodities t ON (s.value_commodity_id=t.id)
         JOIN alr_accounts a ON (s.account_id=a.id)
         JOIN alr_commodities curr ON (a.commodity_id=curr.id)
      WHERE t.kind = 0
         AND a.commodity_id <> s.value_commodity_id

         --  Ignore splits (e.g. Dividends) with a null qty, since that
         --  would also result in a null price
         AND s.scaled_qty <> 0

   --  extract prices from transactions  (reverse direction)
   UNION ALL
   SELECT s.value_commodity_id AS origin_id,
      a.commodity_id AS target_id,
      CAST(s.scaled_qty * t.price_scale * t.price_scale   AS FLOAT)
         / (s.scaled_value * a.commodity_scu),
      s.post_ts AS ts,
      3 as source_id
      FROM alr_splits s
         JOIN alr_commodities t ON (s.value_commodity_id=t.id)
         JOIN alr_accounts a ON (s.account_id=a.id)
         JOIN alr_commodities curr ON (a.commodity_id=curr.id)
      WHERE curr.kind = 0
         AND a.commodity_id <> s.value_commodity_id

         --  Ignore splits (e.g. Dividends) with a null value, since that
         --  would also result in a null price
         AND s.scaled_value <> 0

   --  A currency always has a 1.0 exchange rate with itself. This simplifies
   --  the computation of balances later on
   UNION ALL
   SELECT c.id AS origin_id,
      c.id AS target_id,
      c.price_scale AS scaled_price,
      '1900-01-01 00:00:00' as ts,
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
       a.ts,
       a.source_id
   FROM alr_raw_prices a
        JOIN alr_commodities o ON (a.origin_id=o.id)
        JOIN alr_price_history p ON (a.target_id=p.origin_id)
        JOIN alr_commodities c ON (p.origin_id=c.id)
   WHERE
     p.min_ts <= a.ts
     AND a.ts < p.max_ts
     AND (a.origin_id != p.target_id OR a.origin_id = a.target_id)
;


--  Provide price of commodities for any point in time.

CREATE VIEW alr_price_history AS
   SELECT p.origin_id,             --  Currency or Stock
      p.target_id,                 --  Always a currency
      p.scaled_price,              --  scaled by origin_id's price_scale
      p.ts as min_ts,
      COALESCE(
         LEAD(p.ts)
            OVER (PARTITION BY p.origin_id, p.target_id
                  ORDER BY p.ts),
         '2099-12-31 00:00:00'
      ) as max_ts,
      p.source_id
   FROM alr_raw_prices p
;

CREATE VIEW alr_price_history_with_turnkey AS
   SELECT p.origin_id,
     p.target_id,
     p.scaled_price,
     p.price_scale,
     p.ts as min_ts,
     COALESCE(
        LEAD(p.ts)
           OVER (PARTITION BY p.origin_id, p.target_id
                 ORDER BY p.ts),
        '2099-12-31 00:00:00'
     ) as max_ts,
     p.source_id
   FROM alr_raw_prices_with_turnkey p;

-------------------------
-- alr_numbered_splits --
-------------------------
--  Number all splits in ascending order, per account.  This allows us to later
--  apply changes to qty incrementally.
--  ??? Should take into account recurrent splits and scenarios, to compute
--  possible future values.

CREATE VIEW alr_numbered_splits AS
   SELECT *,
      1 as occurrence,   --  ??? Needs to be fixed later
      ROW_NUMBER() OVER win AS rn,
      COALESCE(LEAD(post_ts) OVER win, '2099-12-31 00:00:00') as next_ts
   FROM alr_splits
   WINDOW win AS (PARTITION BY account_id ORDER BY post_ts);

------------------
-- alr_balances --
------------------
--  For all accounts, compute the list of splits and the cumulative qty (i.e.
--  number of shares for stocks, or balance for bank accounts).
--  In addition, this returns a time range during which the account's balance
--  is valid (useful later to know the balance at a specific time).
--  Each row corresponds to a single split (and each split appears only once).
--
--  In the result, scaled_qty and scaled_balance are both scaled
--  by the account's commodity_scu.
--  scaled_value is scaled by the value_commodity's price_scale.
--
--  Example:
--  [.... split details .....................] [... extra ....................]
--  account_id post_ts    scaled_qty ratio_qty scaled_balance        next_ts
--     1       2020-09-04     100       1       100                  2020-09-05
--     1       2020-09-05       0       1       100  (dividends)     2020-10-06
--     1       2020-10-06       0       5       500  (split)         2020-11-07
--     1       2020-11-07     200       1       700  (buy shares)    2099-12-31
--     2       2020-12-08     300       1       300  (other account) 2099-12-31

CREATE VIEW alr_balances AS WITH RECURSIVE
   s AS (
      --  Take the first transaction that impacted each account.  This is the
      --  initial balance.
      SELECT *, scaled_qty AS scaled_balance FROM alr_numbered_splits WHERE rn=1

      UNION ALL

      --  Then each following split either adds to the balance, or even
      --  multiplies it in the case of share splits.  Using scaled quantities
      --  here for better precision in the computation.
      SELECT n.*, s.scaled_balance * n.ratio_qty + n.scaled_qty
      FROM alr_numbered_splits n JOIN s USING (account_id)
      WHERE n.rn = s.rn + 1
   )
   SELECT * FROM s;

---------------------------
-- alr_balances_currency --
---------------------------
--  Similar to alr_balances, but also combines with price history to compute
--  the money value of the shares.  This might result in more time intervals.
--
--  In the output, scaled_qty, scaled_balance and scaled_balance_value are
--  all scaled by the account's commodity_scu.
--  Note that this will output one row per known currency for each split, so
--  in general you should filter on the currency too.
--
--  Example:
--  [. split_details .] [...balance ..............] [... extra .....]
--  post_ts             next_ts      scaled_balance computed_price currency
--  2020-09-04          2020-09-05   100               4.55        EUR
--  2020-09-04          2020-09-05   100               4.78        USD
--  2020-09-05          2020-10-06   100               4.85        EUR
--  2020-09-05          2020-10-06   100               4.99        USD
--  2020-10-06          2020-11-07   500               4.95        EUR
--  2020-10-06          2020-11-07   500               5.01        USD

CREATE VIEW alr_balances_currency AS 
   SELECT
      b.id,                 --  id of the split
      b.scaled_value,       --  as seen in the split
      b.reconcile,          --  as seen in the split
      b.reconcile_ts,       --  as seen in the split
      b.post_ts,            --  timestamp of the split
      b.account_id,         --  what account this applies to
      b.payee_id,           --  who the paiement was made to/from
      b.transaction_id,     --  as seen in the split
      b.value_commodity_id, --  what currency is used for balance_value

      --  Related to number of shares modified: we have the information either
      --  for the split itself (how many shares it impacted), or the balance in
      --  the accounts (how many shares after the split).
      b.scaled_qty,         --  as seen in the split
      b.ratio_qty,          --  for stock splits
      b.scaled_balance,     --  the balance, in shares
      a.commodity_id,       --  commodity for scaled_qty and scaled_balance
      a.commodity_scu,      --  scale for scaled_qty and scaled_balance

      max(b.post_ts, p.min_ts) as min_ts,  --  time range for balance_value
      min(b.next_ts, p.max_ts) as max_ts,

      --  Apply prices
      currency.id AS currency_id,          --  Currency used for prices
      CAST(p.scaled_price AS FLOAT)        --  price of share on that interval
         / source.price_scale
         AS computed_price
   FROM
      alr_balances b
      JOIN alr_accounts a ON (b.account_id = a.id)
      JOIN alr_commodities source ON (source.id = a.commodity_id)
      JOIN alr_price_history_with_turnkey p ON (p.origin_id = source.id)
      JOIN alr_commodities currency
         ON (currency.kind = 0 --  CommodityKind.Currency
             AND p.target_id = currency.id)
   WHERE
      --  intervals intersect
      b.post_ts < p.max_ts
      AND p.min_ts < b.next_ts;

-------------------------
-- transaction summary --
-------------------------
--  For all transactions, compute the impact on the various commodities, only
--  for splits involving networth accounts (so this counts the money moving
--  from one account to buy shares in another account, but does not count fees
--  for instance).
--  Currencies are summed after being converted, using the xrate at the time.
--  Outputs one row for every known currency (EUR, USD,...) but only one of
--  them should be used in the end.
--  ??? Note that if we do not have a known xrate at the time, we will not be
--  able to output the value in other currencies.
--
--  For a transaction buying 2 shares for a total price of 155.13 EUR, with
--  fees worth 2.1 EUR, we get:
--      transaction_id  commodity  currency shares value
--      4167            1          1          -    -155.13    (in EUR)
--      4167            1          2          -    -172.23    (in USD)
--      4167            36         1          2     153.00    (in shares)
--
--  A groceries transaction would have a single line, the amount of money
--  you paid.
--      transaction_id  commodity  currency shares value
--      4168            1          1          -    21.0      (in EUR)
--      4168            1          2          -    24.2      (in USD)
--
--  We do not filter out rows with a null value (typically, for dividends,
--  there is some money but no shares).  This information is useful to
--  compute realized gains.

CREATE VIEW alr_transaction_summary AS 
   SELECT transaction_id,

      --  The information we want is for every tuple (account, stock), but
      --  for currencies we do not care what account it came from.
      CASE WHEN c.kind = 0 THEN NULL ELSE s.account_id END as account_id,
      a.commodity_id,

      MIN(s.post_ts) AS post_ts,

      --  The impact on the number of shares (adding and multiplying)
      SUM(CAST(s.scaled_qty AS FLOAT) / a.commodity_scu)
          FILTER (WHERE c.kind <> 0 AND k.is_networth)
          AS shares_inc,
      exp(SUM(ln(s.ratio_qty))    --  product = exp(sum of logs)
          FILTER (WHERE c.kind <> 0 AND k.is_networth)
          ) AS shares_ratio,

      --  If commodity is a stock: how much the shares where worth when be
      --  bought them (so includes fees).
      --  If commodity is the currency: how much we paid for the shares.
      p.target_id as currency_id,
      SUM(s.scaled_qty * p.scaled_price / p.price_scale / a.commodity_scu)
          FILTER (WHERE k.is_networth)
         AS value 
   FROM alr_splits s
      JOIN alr_accounts a ON (a.id = s.account_id)
      JOIN alr_account_kinds k ON (a.kind_id = k.id)
      JOIN alr_commodities c ON (a.commodity_id = c.id)
      JOIN alr_price_history_with_turnkey p
          ON (a.commodity_id = p.origin_id
              AND p.min_ts <= s.post_ts AND s.post_ts < p.max_ts)
   GROUP BY transaction_id, 2, commodity_id, currency_id;

----------------------------
-- alr_stock_transactions --
----------------------------
--  Similar to the above, but provides the information on a single line
--  per currency (only one of those lines should be used later though), and
--  only for transactions that involve some shares (even if the amount is 0)
--
--   transaction_id  commodity_id currency_id shares_inc shares_ratio paid
--       4167            36            1        2.0          1        -155.13
--       4167            36            2        2.0          1        -172.23
--
--  ??? Would fail if one transaction involved multiple stocks, but not clear
--  that this can happen.

CREATE VIEW alr_stock_transactions AS
   SELECT s1.transaction_id, s1.account_id, s1.commodity_id, s1.currency_id,
       MIN(s1.post_ts) AS min_ts,
       COALESCE(LEAD(s1.post_ts) OVER win, '2099-12-31 00:00:00') AS max_ts,
       ROW_NUMBER() OVER win AS rn,
       SUM(s1.shares_inc) AS shares_inc,
       exp(SUM(ln(s1.shares_ratio))    --  product = exp(sum of logs)
          FILTER(WHERE s1.shares_ratio <> 0)
          ) AS shares_ratio,
       SUM(s2.value) AS paid    --  price paid for those shares
     FROM alr_transaction_summary s1

     --  Need a left join: for instance, a split transaction doesn't involve
     --  multiple currency splits.
     LEFT JOIN alr_transaction_summary s2
        ON (s1.transaction_id = s2.transaction_id
            AND s1.currency_id = s2.currency_id
            AND s2.shares_inc IS NULL)         --  currency only
     WHERE s1.shares_inc is NOT NULL     --  shares only
     GROUP BY s1.transaction_id, s1.account_id,
       s1.commodity_id, s1.currency_id
     WINDOW win AS
       (PARTITION BY s1.account_id, s1.commodity_id, s1.currency_id
        ORDER BY s1.post_ts);

--------------
-- invested --
--------------
--  Total invested for a given commodity, in a given currency.
--  On the same row, we get the number of shares and the amount that was
--  paid for them at the time.
--  ??? Missing test for same commodity traded in two different accounts.
--
--  We get one row per (transaction,account,commodity).
--  At every steps, it computes the resulting number of shares and total paid
--  so far (for various statistics).

CREATE VIEW alr_invested AS WITH RECURSIVE
   st AS (
      SELECT t.account_id, t.commodity_id, t.currency_id, t.rn,
         t.min_ts, t.max_ts,
         t.shares_inc as shares,
         CASE WHEN t.paid <> 0 THEN t.shares_inc ELSE 0 END AS shares_bought,
         CASE WHEN t.shares_inc <> 0 THEN -t.paid ELSE 0 END AS price_paid,
         CASE WHEN t.shares_inc = 0 AND t.paid > 0
            THEN t.paid ELSE 0 END AS realized_gains
      FROM alr_stock_transactions t
      WHERE t.rn = 1

      UNION ALL

      SELECT t.account_id, t.commodity_id, t.currency_id, t.rn,
         t.min_ts, t.max_ts,

         --  Total shares in the end
         old.shares * t.shares_ratio + t.shares_inc AS shares,

         --  Total number of shares we sold or bought for money.
         --  Filter out "add shares" or "remove shares" actions.
         --  We also apply the ratio to take into account the splits.
         CASE WHEN t.paid <> 0
              THEN old.shares_bought * t.shares_ratio + t.shares_inc
              ELSE old.shares_bought * t.shares_ratio END
              AS shares_bought,

         --  Total amount we paid for those shares.
         --  Filter out "dividends" actions
         CASE WHEN t.shares_inc <> 0
              THEN old.price_paid - t.paid
              ELSE old.price_paid
              END
              AS price_paid,

         --  Money made without involving shares (e.g. dividends)
         CASE WHEN t.shares_inc = 0 AND t.paid > 0
              THEN old.realized_gains + t.paid
              ELSE old.realized_gains
              END
              AS realized_gains

      FROM alr_stock_transactions t
         JOIN st old USING (account_id, commodity_id, currency_id)
      WHERE t.rn = old.rn + 1
   )
   SELECT * FROM st;

---------
-- roi --
---------
--  ??? Missing test:
--     If we bought 1 share at 5EUR, then there was a split 5/1, this
--     correctly compute that we bought only one 1 share.  But in alr_roi
--     if the current value is 5 * 8EUR = 40 EUR, it would assume we
--     paid an average of 40 EUR per share, when it should be 5.
--
--  select min_ts, max_ts, shares_worth, computed_price, average_cost FROM alr_roi where commodity_id in (42) AND currency_id=1 AND min_ts <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP < max_ts;

CREATE VIEW alr_roi AS
   SELECT
      t.account_id,
      t.commodity_id,
      t.currency_id,
      MAX(t.min_ts, p.min_ts) AS min_ts,
      MIN(t.max_ts, p.max_ts) AS max_ts,
      t.shares,
      t.realized_gains,
      t.price_paid,
      t.shares * p.scaled_price / p.price_scale  AS shares_worth,
      p.scaled_price / p.price_scale AS computed_price,
      (t.shares * p.scaled_price / p.price_scale) 
          + t.realized_gains - t.price_paid AS pl,

      --  Why is it different from computed_price / average_cost, can we use
      --  the latter ???  One of them has the realized_gain as numerator, the
      --  other as denominator.
      (t.shares * p.scaled_price / p.price_scale + t.realized_gains)
          / t.price_paid AS roi,

      t.price_paid / t.shares_bought AS weighted_average,
      (t.price_paid - t.realized_gains) / t.shares AS average_cost
   FROM alr_invested t
   JOIN alr_price_history_with_turnkey p
      ON (t.commodity_id = p.origin_id AND p.target_id = t.currency_id
          AND p.min_ts < t.max_ts
          AND t.min_ts < p.max_ts);
