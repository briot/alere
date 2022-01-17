import alere.models
import alere.views.queries as queries
from alere.views.queries.dates import DateSet
import datetime
import django.db    # type: ignore
import logging
from typing import List, Union, Optional, Generator
from ..json import JSON


class Split_Descr:
    def __init__(
            self,
            account_id: int,
            post_date: datetime.datetime,
            amount: float,
            currency: int,
            reconcile: bool,
            shares: float,
            price: float,
            payee: Optional[str],
            ):
        self.account_id = account_id
        self.post_date = post_date
        self.amount = amount
        self.currency = currency
        self.reconcile = reconcile
        self.shares = shares
        self.price = price
        self.payee = payee

    def to_json(self) -> JSON:
        return {
            "accountId": self.account_id,
            "amount": self.amount,
            "currency": self.currency,
            "date": self.post_date.strftime("%Y-%m-%d"),
            "payee": self.payee,
            "price": self.price,
            "reconcile": self.reconcile,
            "shares": self.shares,
        }

    def __repr__(self):
        return str(self.to_json())


class Transaction_Descr:
    def __init__(
            self,
            id: int,
            occurrence: int,
            date: datetime.datetime,
            balance: int,
            balance_shares: int,
            memo: str,
            check_number: str,
            is_recurring: bool,
            ):
        self.id = id
        self.occurrence = occurrence
        self.date = date
        self.balance = 0
        self.balance_shares = 0
        self.memo = memo
        self.check_number = check_number
        self.is_recurring = is_recurring
        self.splits: List[Split_Descr] = []

    def to_json(self) -> JSON:
        return {
            "id": self.id,
            "occ": self.occurrence,
            "date": self.date.strftime("%Y-%m-%d"),
            "balance": self.balance,
            "balanceShares": self.balance_shares,
            "memo": self.memo,
            "checknum": self.check_number,
            "recurring": self.is_recurring,
            "splits": [s.to_json() for s in self.splits],
        }

    def __repr__(self):
        return str(self.to_json())


def ledger(
        dates: DateSet,
        account_ids: Optional[List[int]],
        scenario: Union[alere.models.Scenarios, int],
        max_scheduled_occurrences: Optional[int],
        ) -> Generator[Transaction_Descr, None, None]:
    """
    Return the ledger information.
    This takes into account whether the user wants to see scheduled
    transactions or not, the current scenario,...

    :param account_ids:
        Can be used to restrict the output to those transactions that
        impact those accounts (all splits of the transactions are still
        returned, even those that are not for one of the accounts.
    :param max_scheduled_occurrences:
        if 0, ignore all scheduled transactions.
        if 1, only look at the next occurrence of them.
    """

    filter_account_cte = (
        ", " + queries.cte_transactions_for_accounts(account_ids)
        if account_ids
        else ""
    )
    filter_account_from = (
        f" JOIN {queries.CTE_TRANSACTIONS_FOR_ACCOUNTS} t"
        f" USING (transaction_id)"
    )
    list_splits = queries.cte_list_splits(
        dates=DateSet.from_range(
            start=None,  # from beginning to get balance right
            end=dates.max,
            granularity='months',  # irrelevant
            max_scheduled_occurrences=max_scheduled_occurrences,
            scenario=scenario,
        ),
        scenario=scenario,
        max_scheduled_occurrences=max_scheduled_occurrences,
    )

    query = f"""WITH RECURSIVE {list_splits}
       , {queries.cte_splits_with_values()}
       {filter_account_cte}
       , all_splits_since_epoch AS (
          SELECT
             s.transaction_id,
             s.occurrence,
             s.timestamp,
             t.memo,
             t.check_number,
             s.scaled_qty,
             a.commodity_scu,
             s.computed_price,
             s.account_id,
             s.post_date,
             s.value,
             s.value_commodity_id,
             s.reconcile,
             s.scheduled,
             p.name,
             sum(s.scaled_qty)
                OVER (PARTITION BY s.account_id
                      ORDER BY s.timestamp, s.transaction_id, s.post_date
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                AS scaled_qty_balance
          FROM {queries.CTE_SPLITS_WITH_VALUE} s
             {filter_account_from}
             JOIN alr_transactions t ON (s.transaction_id = t.id)
             JOIN alr_accounts a ON (s.account_id = a.id)
             LEFT JOIN alr_payees p ON (s.payee_id = p.id)
       )
    SELECT s.*
    FROM all_splits_since_epoch s
    WHERE s.post_date >= '{dates.datemin}'

      --  Always include non-validated occurrences of recurring
      --  transactions.
      OR s.scheduled IS NOT NULL
    ORDER BY s.timestamp, s.transaction_id
    """

    ref_id = (
        account_ids[0]
        if account_ids and len(account_ids) == 1
        else -1
    )

    current: Optional[Transaction_Descr] = None

    with django.db.connection.cursor() as cur:
        cur.execute(query)

        for (transaction_id, occurrence,
                timestamp, memo, check_number, scaled_qty,
                commodity_scu, computed_price, account_id, post_date,
                value, value_commodity_id, reconcile, scheduled,
                payee, scaled_qty_balance) in cur:

            if (
                    current is None
                    or transaction_id != current.id
                    or occurrence != current.occurrence
               ):
                if current is not None:
                    yield current

                current = Transaction_Descr(
                    id=transaction_id,
                    date=timestamp,
                    occurrence=occurrence,
                    balance=0,
                    balance_shares=0,
                    memo=memo,
                    check_number=check_number,
                    is_recurring=scheduled is not None,
                )

            # Compute the balance when there is a single account
            # ??? Should we have one balance per account instead ?
            if account_id == ref_id:
                current.balance_shares = scaled_qty_balance / commodity_scu
                current.balance = (
                    current.balance_shares * computed_price
                    if computed_price is not None
                    else None
                )

            current.splits.append(
                Split_Descr(
                    account_id=account_id,
                    post_date=post_date,
                    amount=value,
                    currency=value_commodity_id,
                    reconcile=reconcile,
                    shares=scaled_qty / commodity_scu,
                    price=computed_price,
                    payee=payee,
                )
            )

    if current is not None:
        yield current
