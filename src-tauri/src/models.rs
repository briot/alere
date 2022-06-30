#[derive(Queryable, Debug)]
pub struct AlrAccountKinds {
   pub id: i32,
   pub name: String,
   pub name_when_positive: String,
   pub name_when_negative: String,
   pub category: i32,
   pub is_work_income: bool,
   pub is_passive_income: bool,
   pub is_unrealized: bool,
   pub is_networth: bool,
   pub is_trading: bool,
   pub is_stock: bool,
   pub is_income_tax: bool,
   pub is_misc_tax: bool,
}

