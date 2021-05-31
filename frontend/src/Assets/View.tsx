import * as React from 'react';
import Numeric from '@/Numeric';
import Table from '@/List';
import usePrefs from '@/services/usePrefs';
import usePL from '@/services/usePL';

export interface AssetsProps {
   roundValues?: boolean;
}

const Assets: React.FC<AssetsProps> = p => {
   const { prefs } = usePrefs();
   const currency = prefs.currencyId;
   const pl = usePL('1 day', currency);

   const assetrow = (r: {
      head: string,
      amount: number,
      tooltip?: string,
      bold?: boolean,
      padding?: number
   }) => (
      <Table.TR
         tooltip={r.tooltip}
      >
         {r.bold ? (
            <>
               <Table.TH>
                  {r.head}
               </Table.TH>
               <Table.TH className="amount">
                  <Numeric
                     amount={r.amount}
                     commodity={currency}
                     scale={p.roundValues ? 0 : undefined}
                  />
               </Table.TH>
            </>
         ): (
            <>
               <Table.TD
                  style={{paddingLeft: (r.padding ?? 0) * 20}}
               >
                  {r.head}
               </Table.TD>
               <Table.TD className="amount">
                  <Numeric
                     amount={r.amount}
                     commodity={currency}
                     scale={p.roundValues ? 0 : undefined}
                  />
               </Table.TD>
            </>
         )}
      </Table.TR>
   );

   return (
      <div className='table' style={{height: 'auto'}}>
         {
            assetrow({
               head: 'Networth',
               amount: pl.networth,
               tooltip: 'How much you own minus how much you how at the end of the period',
               bold: true
            })
         }
         {
            assetrow({
               head: 'Liquid',
               amount: pl.liquid_assets,
               tooltip: "The part of your assets in savings, checkings, investments and stocks",
               padding: 1,
            })
         }
         {
            assetrow({
               head: 'Other',
               amount: pl.networth - pl.liquid_assets,
               tooltip: "The part of your assets that cannot be sold quickly, like real-estate, jewels,..",
               padding: 1,
            })
         }
      </div>
   );
}
export default Assets;
