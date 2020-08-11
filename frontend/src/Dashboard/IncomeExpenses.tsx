import * as React from 'react';
import { DateRangePicker, DateRange, rangeDisplay } from 'Dates';
import CategoryPie, { PiePlotProps } from 'Plots/CategoryPie';
import { BaseProps, DashboardPanelProps,
         BasePropEditor } from 'Dashboard/Panels';
import { Checkbox } from 'Form';
import Panel from 'Panel';

export interface IncomeExpensesProps extends PiePlotProps, BaseProps {
   type: 'incomeexpenses';
}

export const isIncomeExpense = (p: BaseProps): p is IncomeExpensesProps => {
   return p.type === "incomeexpenses";
}

const IncomeExpenses: React.FC<DashboardPanelProps<IncomeExpensesProps>> = p => {
   const { setData } = p;
   const settings = React.useCallback(
      () => {
         const changeExp   = (expenses: boolean) => setData({ expenses });
         const changeRange = (range: DateRange) => setData({ range });

         return (
            <form>
               {
                  <BasePropEditor data={p.data} setData={setData} />
               }
               <fieldset>
                  <legend>Profit and Loss</legend>

                  <Checkbox
                     checked={p.data.expenses}
                     onChange={changeExp}
                     text="Show expenses"
                  />

                  <DateRangePicker
                     text="Time period"
                     value={p.data.range}
                     onChange={changeRange}
                  />

                  {/*
               number of columns
               number of rows
                  */}

               </fieldset>
            </form>
      )},
      [p.data, setData]
   );

   return (
      <Panel
         rows={p.data.rowspan}
         cols={p.data.colspan}
         header={`${p.data.expenses ? 'Expenses' : 'Income'} ${rangeDisplay(p.data.range)}`}
         settings={settings}
      >
         <CategoryPie {...p.data} />
      </Panel>
   );
}
export default IncomeExpenses;
