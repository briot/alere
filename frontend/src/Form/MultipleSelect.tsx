/**
 * Show one or more select boxes to end up with an array of values
 */

import * as React from 'react';
import { SharedInput, SharedInputProps } from '@/Form';
import RoundButton from '@/RoundButton';
import "./MultipleSelect.scss";

export interface MultipleSelectProps<T> extends SharedInputProps<T[]> {
   onChange: (val: T[]) => void;
   newValue: T;  // default value when adding a new item
   editOne: (val: T, onChange: (v: T) => void) => React.ReactNode;
}

const MultipleSelect = <T extends {}, > (p: MultipleSelectProps<T>) => {
   const { onChange } = p;

   const appendNew = React.useCallback(
      () => onChange([...(p.value ?? []), p.newValue]),
      [p.value, p.newValue, onChange]
   );

   const val = p.value ?? [];

   const EditItem = (p2: {idx: number}) => {

      const changeOne = (d: T) => {
         onChange([...val.slice(0, p2.idx),
                   d,
                   ...val.slice(p2.idx + 1)]);
      };
      const removeOne = () => {
         onChange([...val.slice(0, p2.idx),
                   ...val.slice(p2.idx + 1)]);
      };

      return (
         <div className="row">
            {
               p.editOne(val[p2.idx], changeOne)
            }
            <RoundButton fa="fa-remove" size="tiny" onClick={removeOne} />
         </div>
      );
   }

   return (
      <SharedInput className="multipleSelect" {...p} >
         <div>
            {
               val.map((_, i) => <EditItem idx={i} key={i} />)
            }
            <div className="row">
               <RoundButton fa="fa-plus" size="small" onClick={appendNew} />
            </div>
         </div>
      </SharedInput>
   );

}

export default MultipleSelect;
