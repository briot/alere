import { BaseLedgerProps } from 'Ledger';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import Settings from 'Ledger/Settings';
import LedgerPanel from 'Ledger/Panel';

export interface LedgerPanelProps extends BaseLedgerProps, BaseProps {
   type: 'ledger';
}

const LedgerModule: DashboardModule<LedgerPanelProps> = {
   Settings,
   Content: LedgerPanel,
}
export default LedgerModule;
