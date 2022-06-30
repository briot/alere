INSERT INTO alr_scenarios VALUES
   (0, 'Actual transactions', '')
;

INSERT INTO alr_price_sources VALUES
   (0, 'User'),
   (1, 'Yahoo Finance'),
   (2, 'Transaction')
;

INSERT INTO alr_account_kinds
   (name, category, is_work_income, is_passive_income, is_unrealized,
    is_networth, is_trading, is_stock, is_income_tax, is_misc_tax,
    name_when_positive, name_when_negative)
VALUES
   --                 category 1=INCOME 2=EXPENSE 3=LIABILITY 4=EQUITY 5=ASSET
   --                 |  is_work_income
   --                 |  |  is_passive_income
   --                 |  |  |  is_unrealized
   --                 |  |  |  |  is_networth
   --                 |  |  |  |  |  is_trading
   --                 |  |  |  |  |  |  is_stock
   --                 |  |  |  |  |  |  |  is_incomde_tax
   --                 |  |  |  |  |  |  |  |  is_misc_tax
   ('Passive income', 1, 0, 1, 0, 0, 0, 0, 0, 0, 'Expense',  'Income'),
   ('Work income',    1, 1, 0, 0, 0, 0, 0, 0, 0, 'Expense',  'Income'),
   ('Misc income',    1, 0, 0, 0, 0, 0, 0, 0, 0, 'Expense',  'Income'),
   ('Unrealized gain',1, 0, 0, 1, 0, 0, 0, 0, 0, 'Expense',  'Income'),

   ('Expense',        2, 0, 0, 0, 0, 0, 0, 0, 0, 'Expense',  'Income'),
   ('Income tax',     2, 0, 0, 0, 0, 0, 0, 1, 0, 'Increase', 'Decrease'),
   ('Other tax',      2, 0, 0, 0, 0, 0, 0, 0, 1, 'Increase', 'Decrease'),

   ('Liability',      3, 0, 0, 0, 1, 0, 0, 0, 0, 'Deposit',  'Paiement'),

   ('Stock',          4, 0, 0, 0, 1, 1, 1, 0, 0, 'Add',      'Remove'),
   ('Bank account',   4, 0, 0, 0, 1, 0, 0, 0, 0, 'Deposit',  'Paiement'),
   ('Equity',         4, 0, 0, 0, 1, 0, 0, 0, 0, 'Increase', 'Decrease'),
   ('Investment',     4, 0, 0, 0, 1, 1, 0, 0, 0, 'Deposit',  'Paiement'), 

   ('Asset',          5, 0, 0, 0, 1, 0, 0, 0, 0, 'Increase', 'Decrease'), 
   ('Non-liquid investment',
                      5, 0, 0, 0, 1, 1, 0, 0, 0, 'Deposit', 'Paiement')
;
