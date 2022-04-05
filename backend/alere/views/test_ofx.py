import io
from ofxtools.Parser import OFXTree         # type: ignore
from ofxtools.models.ofx import OFX         # type: ignore
from .ofx import OFX_Exporter
from .base_test import BaseTest, Split
from typing import Tuple


class OFXTestCase(BaseTest):

    def _export(self) -> Tuple[OFXTree, OFX, str]:
        e = OFX_Exporter(
            currency=self.eur,
        )
        exported = e.export_str()

        try:
            with io.BytesIO(exported.encode('utf-8')) as f:
                parser = OFXTree()
                parser.parse(f)

                # Calling convert() validates the tree
                return (parser, parser.convert(), exported)
        except Exception:
            print(f"while parsing {exported}")
            raise

    def test_no_transactions(self):
        tree, ofx, msg = self._export()
        self.assertEqual(len(tree.findall(".//BANKMSGSRSV1")), 1, msg)
        self.assertEqual(len(tree.findall(".//STMTTRN")), 0, msg)

    def test_one_account(self):
        self.create_transaction(
            [Split(self.salary,  -123400, '2020-11-01'),
             Split(self.checking, 122900, '2020-11-02'),
             Split(self.taxes, 500, '2020-11-02')])   # fees
        self.create_transaction(
            [Split(self.salary,   10000, '2020-12-01'),
             Split(self.checking, -10000, '2020-12-02')])

        # ??? Missing categories
        # ??? Missing fees (transaction with more than 2 splits)
        # ??? Check memos
        # ??? Missing account details (name,...)

        tree, ofx, msg = self._export()
        self.assertEqual(len(tree.findall(".//STMTTRN")), 2, msg)
        self.assertEqual(
            [e.text for e in tree.findall(".//TRNAMT")],
            ['1229', '-100', '5'],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//TRNTYPE")],
            ['CREDIT', 'DEBIT'],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//BALAMT")],
            ['1129'],
            msg,
        )
        fitids = [e.text for e in tree.findall(".//FITID")]
        self.assertEqual(len(fitids), 2, msg)
        self.assertNotEqual(fitids[0], fitids[1], msg)  # must be different

    def test_two_accounts(self):
        self.create_transaction(
            [Split(self.salary,  -123400, '2020-11-01'),
             Split(self.checking, 123400, '2020-11-02')])
        self.create_transaction(
            [Split(self.salary,  -100000, '2020-12-01'),
             Split(self.investment_eur, 100000, '2020-12-02')])

        tree, ofx, msg = self._export()
        self.assertEqual(len(tree.findall(".//STMTTRN")), 2, msg)
        self.assertEqual(
            [e.text for e in tree.findall(".//TRNAMT")],
            ['1234', '1000'],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//TRNTYPE")],
            ['CREDIT', 'CREDIT'],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//BALAMT")],
            ['1234', '1000'],
            msg,
        )

    def test_transfers(self):
        self.create_transaction(
            [Split(self.checking,  -23400, '2020-11-01'),
             Split(self.investment_eur, 22900, '2020-11-02'),
             Split(self.taxes, 500, '2020-11-02')])   # fees

        tree, ofx, msg = self._export()
        self.assertEqual(len(tree.findall(".//STMTTRN")), 2, msg)
        self.assertEqual(
            [e.text for e in tree.findall(".//TRNAMT")],
            ['-234', '229'],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//BALAMT")],
            ['-234', '234'],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//TRNTYPE")],
            ['XFER', 'XFER'],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//BANKACCFROM/ACCTID")],
            [self.checking.id, self.investment_eur.id],
            msg,
        )
        self.assertEqual(
            [e.text for e in tree.findall(".//BANKACCTO/ACCTID")],
            [self.investment_eur.id, self.checking.id],
            msg,
        )
        fitids = [e.text for e in tree.findall(".//FITID")]
        self.assertEqual(len(fitids), 2, msg)
        self.assertEqual(fitids[0], fitids[1], msg)  # must be the same
        print(msg)

    def test_foreign_currency(self):
        pass
