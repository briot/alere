import InvestmentsPanel, { InvestmentsPanelProps } from 'Investment/Panel';
import Settings from 'Investment/Settings';
import { BaseProps, DashboardModule } from 'Dashboard/Module';

export interface InvestmentsModuleProps extends InvestmentsPanelProps, BaseProps {
   type: 'investments';
}

const InvestmentsModule: DashboardModule<InvestmentsModuleProps> = {
   Settings,
   Content: InvestmentsPanel,
}
export default InvestmentsModule;

