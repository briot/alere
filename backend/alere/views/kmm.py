from .kmymoney import KMyMoney
import sqlalchemy

kmm = KMyMoney('/Users/briot/money/Comptes.kmy')

def do_query(query, params=[]):
    sqla = sqlalchemy.create_engine(kmm.sqlite)
    return sqla.execute(query, params)
