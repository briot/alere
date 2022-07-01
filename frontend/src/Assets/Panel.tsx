import * as React from 'react';
import Assets, { AssetsProps } from '@/Assets/View';
import Settings from '@/Assets/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';

export interface AssetsPanelProps extends PanelBaseProps, AssetsProps {
   type: 'assets';
}

const AssetsPanel: React.FC<PanelProps<AssetsPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ name: 'assets' }}
         fixedSize={true}
         Settings={() =>
            <Settings
               props={p.props}
               excludeFields={p.excludeFields}
               save={p.save}
            />
         }
      >
         <Assets {...p.props} />
      </Panel>
   );
}

const registerAssets = {'assets': AssetsPanel};
export default registerAssets;
