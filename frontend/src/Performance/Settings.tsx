import * as React from 'react';
import { DateRange, DateRangePicker } from '@/Dates';
import { PerformancePanelProps } from '@/Performance/Panel';
import { Checkbox } from '@/Form';
import { PanelProps } from '@/Dashboard/Panel';

const Settings: React.FC<PanelProps<PerformancePanelProps>> = p => {
   const changeHide = (hideIfNoShare: boolean) => p.save?.({ hideIfNoShare });
   const changeRange = (range: DateRange) => p.save({ range });
   const columnOptions = [
      ['Account', 'Account'],
      ['Equity', 'Equity'],
      ['Shares', 'Shares'],
      ['Return', 'Return'],
      ['Period Ret', 'Period return'],
      ['Invested', 'Total invested'],
      ['Realized', 'Realized'],
      ['P&L', 'Profit and loss'],
      ['Period P&L', 'Period profit and loss'],
      ['Return/year', 'Annualized return'],
      ['IRR', 'IRR'],
      ['Avg Cost', 'Average cost'],
      ['WAvg', 'Weighted average'],
      ['Last', 'Latest price'],
   ];
   const changeColumn = (id: string, visible: boolean) => {
      const hidden = new Set(p.props.hiddenColumns ?? []);
      if (visible) {
         hidden.delete(id);
      } else {
         hidden.add(id);
      }
      p.save({ hiddenColumns: Array.from(hidden) });
   };
   return (
      <fieldset>
         <legend>Performance</legend>
         <Checkbox
             value={p.props.hideIfNoShare ?? false}
             onChange={changeHide}
             text="Hide no longer traded stocks"
         />
         <fieldset>
            <legend>Visible columns</legend>
            {columnOptions.map(([id, label]) => (
               <Checkbox
                  key={id}
                  value={!p.props.hiddenColumns?.includes(id)}
                  onChange={visible => changeColumn(id, visible)}
                  text={label}
               />
            ))}
         </fieldset>
         {
            !p.excludeFields?.includes("range") &&
            <DateRangePicker
               text="Time period"
               value={p.props.range || 'forever'}
               onChange={changeRange}
            />
         }
      </fieldset>
   );
}
export default Settings;
