import * as React from 'react';
import Assets, { AssetsProps } from '@/Assets/View';
import Settings from '@/Assets/Settings';
import Panel, { PanelProps, PanelBaseProps } from '@/Dashboard/Panel';


export interface AssetsPanelProps extends PanelBaseProps, AssetsProps {
   type: 'assets';
}

//const createPanel = <T extends PanelBaseProps, PROPS extends PanelProps<T>> (
//   name: PROPS['props']['type'],
//   View: React.FC<PROPS['props']>,
//) => () => {
//   const S = (p: PROPS) => {
//      return (
//         <fieldset>
//            <legend>{name}</legend>
//         </fieldset>
//      )
//   };
//
//   const P = (p: PROPS) => {
//      return (
//         <Panel
//            {...p}
//            header={{ name }}
//            Settings={
//               <S
//                  props={p.props}
//                  excludeFields={p.excludeFields}
//                  save={p.save}
//               />
//            }
//         >
//            <View {...p.props} />
//         </Panel>
//      );
//   };
//
//   return {[name]: P};
//}
//export const registerAssets = createPanel('assets', Assets);


//export const registerAssets = () => {
//   const name = 'assets';
//
//   const S = (p: PanelProps<AssetsPanelProps>) => {
//      return (
//         <fieldset>
//            <legend>{name}</legend>
//         </fieldset>
//      )
//   };
//
//   const P = (p: PanelProps<AssetsPanelProps>) => {
//      return (
//         <Panel
//            {...p}
//            header={{ name }}
//            Settings={
//               <S
//                  props={p.props}
//                  excludeFields={p.excludeFields}
//                  save={p.save}
//               />
//            }
//         >
//            <Assets {...p.props} />
//         </Panel>
//      );
//   };
//
//   return {[name]: P};
//}


const AssetsPanel: React.FC<PanelProps<AssetsPanelProps>> = p => {
   return (
      <Panel
         {...p}
         header={{ name: 'assets' }}
         Settings={
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

export const registerAssets = {'assets': AssetsPanel};
