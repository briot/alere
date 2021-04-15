import alere
import datetime
import logging
import alere.importers.kmymoney as kmymoney
from alere.views.base_test import BaseTest


logger = logging.getLogger(__name__)


class KMyMoneyTestCase(BaseTest):

    def setUp(self):
        kmymoney.log_error = lambda m: ""
        super().setUp()

    def tearDown(self):
        kmymoney.log_error = kmymoney.print_to_stderr
        super().tearDown()

    def test_scaled_price(self):
        def test(
                frac: str, scale: int, inverse_scale: int,
                expected: int, expectedInverse: bool):
            d, inverse = kmymoney.scaled_price(frac, scale, inverse_scale)

            num, den = frac.split('/')
            logger.info(
                '  => %s  %s  %s',
                int(num) / int(den),
                d,
                inverse_scale / d if inverse else d / scale)

            self.assertEqual(expected, d, f"{frac=} {scale=} {inverse_scale=}")
            self.assertEqual(
                expectedInverse, inverse, f"{frac=} {scale=} {inverse_scale=}")

        test('24712/10000', 100, 100,   247,       False)
        test('24712/10000', 100, 0,     247,       False)
        test('24412/10000', 100, 100,   244,       False)
        test('247/10000', 100, 100,     4049,      True)
        test('247/10000', 100, 0,       3,         False)
        test('1051/1250', 100, 100,     119,       True)
        test('1051/1250', 100, 1000,    1189,      True)
        test('0/100', 100, 1000,        0,         False)
        test('1/100000', 100, 1000,     100000000, True)
