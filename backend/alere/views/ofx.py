from ofxtools.Parser import OFXTree         # type: ignore
from ofxtools.header import make_header     # type: ignore
from ofxtools.utils import UTC              # type: ignore
from pathlib import Path
from typing import List, Optional, TextIO, Dict, Generator
import alere.models
import datetime
import decimal
import ofxtools.models as om                # type: ignore
import uuid
import xml.etree.ElementTree as ET


class OFX_Exporter:

    def __init__(
            self,
            currency: alere.models.Commodities,
            account_ids: Optional[List[int]] = None,  # defaults to all
            ) -> None:

        acc_mgr = alere.models.Accounts.objects.all()
        if account_ids is not None:
            acc_mgr = acc_mgr.filter(id__in=account_ids)
        else:
            acc_mgr = acc_mgr.filter(kind__is_networth=True)
        self.accounts = list(acc_mgr)

        self.currency = currency

        # ??? Should be part of the account record, likely
        self.account_ids: Dict[int, str] = {}   # accounts
        self.bank_ids: Dict[int, str] = {}      # institutions

    def export_str(self) -> str:
        """
        Export transactions from one or more accounts to OFX (Open Financial
        Exchange) format.
        """
        signonmsgs = om.SIGNONMSGSRSV1(
            sonrs=om.SONRS(
                status=om.STATUS(code=0, severity='INFO'),
                dtserver=datetime.datetime(2015, 1, 2, 17, tzinfo=UTC),
                language='ENG',
                fi=om.FI(org='ALERE', fid='000'),  # required for Quicken
            ),
        )
        ofx = om.OFX(
            signonmsgsrsv1=signonmsgs,

            # Bank Response Message Set V1
            bankmsgsrsv1=om.BANKMSGSRSV1(
                *self._stmt_account_response(),
            ),

            signupmsgsrsv1=om.SIGNUPMSGSRSV1(
                om.ACCTINFOTRNRS(
                    acctinfors=om.ACCTINFORS(
                        # date of last update
                        dtacctup=datetime.datetime.now(UTC),

                        *self._stmt_account_info(),
                    ),
                    trnuid='5678',   # ???
                    status=om.STATUS(code=0, severity='INFO'),
                )
            )
        )

        return (
            str(make_header(version=220))
            + ET.tostring(
                ofx.to_etree(),
                encoding='utf-8',
                short_empty_elements=False,
            ).decode()
        )

    def export_file(
            self,
            filename: Path,
            ) -> None:
        """
        Export transactions from one or more accounts to OFX (Open Financial
        Exchange) format.
        """
        with open(filename, "w") as f:
            f.write(self.export_str())

    def _stmt_account_info(
            self,
            ) -> Generator[om.ACCTINFO, None, None]:
        """
        Return details on the accounts
        """
        for acc in self.accounts:
            yield om.ACCTINFO(
                om.BANKACCTINFO(   # banking services
                    bankacctfrom=self._bank_account_from(acc),
                    suptxdl=True,    # supports transaction details download
                    xfersrc=True,    # can transfer money from it
                    xferdest=True,   # can transfer money to it
                    # maturitydate=None,
                    # maturityamt=None,
                    # minbalreq=None,  # minimum balance to avoid fees
                    # acctclassification='PERSONAL',   # see 11.3.3.1
                    # overdraftlimit=None,
                    svcstatus='ACTIVE',
                ),
                # ccacctinfo=None,    # credit card info
                # bpacctinfo=None,    # bill payment
                # invacctinfo=None,   # investment account info
                desc=acc.name,
            )

    def _bank_account_from(
            self,
            acc: alere.models.Accounts,
            ) -> om.BANKACCTFROM:
        # Generate a random bank id if we do not have one yet
        bankid = self.bank_ids.setdefault(
            acc.institution_id, str(acc.institution_id)[:9])
        accid = self.account_ids.setdefault(acc.id, str(acc.id)[:22])

        # account-from, 11.3.1
        return om.BANKACCTFROM(
            bankid=bankid,
            acctid=accid,
            accttype='CHECKING',
        )

    def _stmt_account_response(
            self,
            ) -> Generator[om.STMTTRNRS, None, None]:
        """
        Return the list of transactions for all accounts
        """
        for acc in self.accounts:
            splits = list(
                alere.models.Splits.objects
                .filter(account_id=acc.id)
                .select_related(
                    "transaction",
                    "payee",
                    "value_commodity",
                    "account",
                )
                .order_by("post_date")
            )
            if not splits:
                continue

            # Compute balance
            scaled_balance = decimal.Decimal(0)
            for s in splits:
                scaled_balance += s.scaled_qty

            yield om.STMTTRNRS(
                trnuid='5678',   # ???
                status=om.STATUS(code=0, severity='INFO'),
                stmtrs=om.STMTRS(
                    # default currency for statement
                    curdef=self.currency.iso_code,

                    bankacctfrom=self._bank_account_from(acc),

                    # statement transactions
                    banktranlist=om.BANKTRANLIST(
                        *self._stmt_transactions(splits),

                        # Start date for transaction data
                        dtstart=splits[0].post_date,

                        # Date clients should use in the next query so as to
                        # miss no split
                        dtend=splits[-1].post_date,
                    ),

                    # ledger balance (amount and date)
                    ledgerbal=om.LEDGERBAL(
                        balamt=scaled_balance / acc.commodity_scu,
                        dtasof=splits[-1].post_date,
                    ),
                ),
            )

    def _stmt_transactions(
            self,
            splits: List[alere.models.Splits],
            ) -> Generator[om.STMTTRN, None, None]:
        """
        The list of transactions for one account
        """
        for s in splits:
            is_transfer = False

            yield om.STMTTRN(
                trntype=(
                    'XFER' if is_transfer
                    else 'DEBIT' if s.scaled_value < 0
                    else 'CREDIT'
                ),
                dtposted=s.post_date,

                # Date that the user initiated transaction
                dtuser=s.transaction.timestamp,

                # Date the funds are available
                dtavail=None,

                # Amount of transaction. The sign indicates
                # the impact on the balance
                trnamt=decimal.Decimal(s.scaled_qty) / s.account.commodity_scu,

                # Id issued by financial institution.
                # ??? should be stored in the database when
                # we import, or now, so that we always emit
                # the same.
                fitid=str(s.transaction.id),
                correctfitid=None,
                correctaction=None,

                checknum=s.transaction.check_number,

                # Payee id ???
                payeeid=None,

                # payee could be either simple name, or
                # PAYEE aggregate
                # ??? Limit is 32 characters, or bytes, not clear. Also special
                # characters like "<" are XML-encoded and that counts in the
                # limit.
                name='' if s.payee is None else s.payee.name[:32],

                # ??? Unfortunately we might lose details here
                # ??? Limit is 255 characters, or bytes, not clear. Also special
                # characters like "<" are XML-encoded and that counts in the
                # limit.
                memo=(s.transaction.memo or '')[:100],

                # ??? For foreign currencies. However, we also store the amount
                # as "number of shares", and we do not have iso_code for those
                # shares. So this should only be done for currencies.
#                currency=(
#                    None
#                    if s.value_commodity == self.currency
#                    and s.value_commodity.kind ==
#                        alere.models.CommodityKinds.CURRENCY
#                    else om.CURRENCY(
#                        cursym=s.value_commodity.iso_code,
#                        currate=1.0,
#                    )
#                ),
            )

    def _transaction_list(self, f: TextIO, acc: alere.models.Accounts) -> None:
        """
        Emits the list of transactions, and returns final balance
        """
        balance = scaled_balance / acc.commodity_scu

        f.write("</BANKTRANLIST>")
        f.write("<AVAILBAL>")
        f.write(f"<DTASOF>{self._format_date(splits[-1].post_date)}</DTASOF>")
        f.write(f"<BALAMT>{balance}</BALAMT>")
        f.write("</AVAILBAL>")
