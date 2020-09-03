import Cashflow, { CashflowProps } from 'Cashflow';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import Settings from 'Cashflow/Settings';

export interface CashflowPanelProps extends BaseProps, CashflowProps {
   type: 'metrics';
}

const CashflowModule: DashboardModule<CashflowPanelProps> = {
   Settings,
   Content: Cashflow,
}
export default CashflowModule;
