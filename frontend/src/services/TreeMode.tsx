import { Select } from '@/Form';

export enum TreeMode {
   FLAT,          // Flat list of account, sorted alphabetically
   USER_DEFINED,  // Use parent account set by the user
   ACCOUNT_TYPE,  // Organize by account type
   INSTITUTION,   // By institution
}

interface SelectTreeModeProps {
   treeMode: TreeMode | undefined;
   onChange: (treeMode: TreeMode) => void;
}

export const SelectTreeMode: React.FC<SelectTreeModeProps> = p => {
   return (
      <Select
          text="Group by"
          onChange={p.onChange}
          value={p.treeMode ?? TreeMode.FLAT}
          options={[
             {text: "Flat list",      value: TreeMode.FLAT},
             {text: "Parent account", value: TreeMode.USER_DEFINED},
             {text: "Account type",   value: TreeMode.ACCOUNT_TYPE},
             {text: "Institution",    value: TreeMode.INSTITUTION},
         ]}
      />
   );
}
