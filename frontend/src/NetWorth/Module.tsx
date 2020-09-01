import Networth, { NetworthProps } from 'NetWorth';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import Settings from 'NetWorth/Settings';

export interface NetworthPanelProps extends BaseProps, NetworthProps {
   type: 'networth';
}

const NetworthModule: DashboardModule<NetworthPanelProps> = {
   Settings,
   Content: Networth,
}
export default NetworthModule;
