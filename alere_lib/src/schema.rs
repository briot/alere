table! {
    alr_account_kinds (id) {
        id -> Integer,
        name -> Text,
        name_when_positive -> Text,
        name_when_negative -> Text,
        category -> Integer,
        is_work_income -> Bool,
        is_passive_income -> Bool,
        is_unrealized -> Bool,
        is_networth -> Bool,
        is_trading -> Bool,
        is_stock -> Bool,
        is_income_tax -> Bool,
        is_misc_tax -> Bool,
    }
}

table! {
    alr_accounts (id) {
        id -> Integer,
        name -> Text,
        description -> Nullable<Text>,
        iban -> Nullable<Text>,
        number -> Nullable<Text>,
        closed -> Bool,
        commodity_scu -> Integer,
        last_reconciled -> Nullable<Timestamp>,
        opening_date -> Nullable<Date>,
        commodity_id -> Integer,
        institution_id -> Nullable<Integer>,
        kind_id -> Integer,
        parent_id -> Nullable<Integer>,
    }
}

table! {
    alr_commodities (id) {
        id -> Integer,
        name -> Text,
        symbol_before -> Text,
        symbol_after -> Text,
        kind -> Integer,
        price_scale -> Integer,
        quote_symbol -> Nullable<Text>,
        quote_source_id -> Nullable<Integer>,
        quote_currency_id -> Nullable<Integer>,
    }
}

table! {
    alr_institutions (id) {
        id -> Integer,
        name -> Text,
        manager -> Nullable<Text>,
        address -> Nullable<Text>,
        phone -> Nullable<Text>,
        routing_code -> Nullable<Text>,
        icon -> Nullable<Text>,
    }
}

table! {
    alr_payees (id) {
        id -> Integer,
        name -> Text,
    }
}

table! {
    alr_price_sources (id) {
        id -> Integer,
        name -> Text,
    }
}

table! {
    alr_prices (id) {
        id -> Integer,
        ts -> Timestamp,
        scaled_price -> Bigint,
        origin_id -> Integer,
        source_id -> Integer,
        target_id -> Integer,
    }
}

table! {
    alr_scenarios (id) {
        id -> Integer,
        name -> Text,
        description -> Nullable<Text>,
    }
}

table! {
    alr_splits (id) {
        id -> Integer,
        scaled_qty -> Integer,
        ratio_qty -> Float,
        scaled_value -> Integer,
        value_commodity_id -> Integer,
        reconcile -> SmallInt,
        reconcile_ts -> Nullable<Timestamp>,
        post_ts -> Timestamp,
        account_id -> Integer,
        payee_id -> Nullable<Integer>,
        transaction_id -> Integer,
    }
}

table! {
    alr_transactions (id) {
        id -> Integer,
        timestamp -> Timestamp,
        memo -> Nullable<Text>,
        check_number -> Nullable<Text>,
        scheduled -> Nullable<Text>,
        last_occurrence -> Nullable<Timestamp>,
        scenario_id -> Integer,
    }
}

joinable!(alr_accounts -> alr_account_kinds (kind_id));
joinable!(alr_accounts -> alr_commodities (commodity_id));
joinable!(alr_accounts -> alr_institutions (institution_id));
joinable!(alr_commodities -> alr_price_sources (quote_source_id));
joinable!(alr_prices -> alr_price_sources (source_id));
joinable!(alr_splits -> alr_accounts (account_id));
joinable!(alr_splits -> alr_commodities (value_commodity_id));
joinable!(alr_splits -> alr_payees (payee_id));
joinable!(alr_splits -> alr_transactions (transaction_id));
joinable!(alr_transactions -> alr_scenarios (scenario_id));

allow_tables_to_appear_in_same_query!(
    alr_account_kinds,
    alr_accounts,
    alr_commodities,
    alr_institutions,
    alr_payees,
    alr_price_sources,
    alr_prices,
    alr_scenarios,
    alr_splits,
    alr_transactions,
);
