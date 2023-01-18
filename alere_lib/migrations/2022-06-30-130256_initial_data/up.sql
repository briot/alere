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
   --                 category 1=INCOME 0=EXPENSE 4=LIABILITY 2=EQUITY 3=ASSET
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
   ('income',         1, 0, 0, 0, 0, 0, 0, 0, 0, 'Expense',  'Income'),
   ('Unrealized gain',1, 0, 0, 1, 0, 0, 0, 0, 0, 'Expense',  'Income'),

   ('Expense',        0, 0, 0, 0, 0, 0, 0, 0, 0, 'Expense',  'Income'),
   ('Income tax',     0, 0, 0, 0, 0, 0, 0, 1, 0, 'Increase', 'Decrease'),
   ('Other tax',      0, 0, 0, 0, 0, 0, 0, 0, 1, 'Increase', 'Decrease'),

   ('Liability',      4, 0, 0, 0, 1, 0, 0, 0, 0, 'Deposit',  'Paiement'),

   --  equity/checking/saving = bank account
   ('Equity',         2, 0, 0, 0, 1, 0, 0, 0, 0, 'Deposit',  'Paiement'),
   ('Checking',       2, 0, 0, 0, 1, 0, 0, 0, 0, 'Deposit',  'Paiement'),
   ('Savings',        2, 0, 0, 0, 1, 0, 0, 0, 0, 'Deposit',  'Paiement'),

   ('Stock',          2, 0, 0, 0, 1, 1, 1, 0, 0, 'Add',      'Remove'),
   ('Investment',     2, 0, 0, 0, 1, 1, 0, 0, 0, 'Deposit',  'Paiement'), 

   ('Asset',          3, 0, 0, 0, 1, 0, 0, 0, 0, 'Increase', 'Decrease'), 
   ('Non-liquid investment',
                      3, 0, 0, 0, 1, 1, 0, 0, 0, 'Deposit', 'Paiement')
;
