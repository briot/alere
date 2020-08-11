import * as React from 'react';
import Networth, { NetworthProps } from 'NetWorth';
import { Checkbox } from 'Form';
import { BaseProps, DashboardPanelProps,
         BasePropEditor } from 'Dashboard/Panels';
import { RelativeDate, MultiDatePicker } from 'Dates';
import Panel from 'Panel';

export interface NetworthPanelProps extends BaseProps, NetworthProps {
   type: 'networth';
}

const NetworthPanel: React.FC<DashboardPanelProps<NetworthPanelProps>> = p => {
   const { setData } = p;
   const settings = React.useCallback(
      () => {
         const changeValue = (showValue: boolean) => setData({ showValue });
         const changePrice = (showPrice: boolean) => setData({ showPrice });
         const changeShares = (showShares: boolean) => setData({ showShares });
         const changedates = (dates: RelativeDate[]) => setData({ dates });
         return (
            <form>
               <fieldset>
                  <legend>Networth</legend>
                  <Checkbox
                     checked={p.data.showValue}
                     onChange={changeValue}
                     text="Show values"
                  />
                  <Checkbox
                     checked={p.data.showPrice}
                     onChange={changePrice}
                     text="Show prices"
                  />
                  <Checkbox
                     checked={p.data.showShares}
                     onChange={changeShares}
                     text="Show shares"
                  />
                  <MultiDatePicker
                     text="dates"
                     value={p.data.dates}
                     onChange={changedates}
                  />
               </fieldset>
               <BasePropEditor data={p.data} setData={setData} />
            </form>
         );
      },
      [setData, p.data]
   );

   return (
      <Panel
         cols={p.data.colspan}
         rows={p.data.rowspan}
         header="Net Worth"
         settings={settings}
      >
         <Networth {...p.data} />
      </Panel>
   );
}

export const getNetworthPanel = (
   d: BaseProps, s: (p: Partial<BaseProps>)=>void
) => {
   return d.type === "networth"
      ? <NetworthPanel data={d as NetworthPanelProps} setData={s} />
      : null;
}

