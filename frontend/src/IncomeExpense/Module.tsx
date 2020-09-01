import IncomeExpense, { IncomeExpenseProps } from 'IncomeExpense';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import Settings from 'IncomeExpense/Settings';

export interface IncomeExpensePanelProps extends IncomeExpenseProps, BaseProps {
   type: 'incomeexpenses';
}

const IncomeExpensesModule: DashboardModule<IncomeExpensePanelProps> = {
   Settings,
   Content: IncomeExpense,
}
export default IncomeExpensesModule;
