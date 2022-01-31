/**
 * Show one or more select boxes to end up with an array of values
 */

import * as React from 'react';
import { SharedInput, SharedInputProps } from '@/Form';
import RoundButton from '@/RoundButton';
import classes from '@/services/classes';
import "./MultipleSelect.scss";

interface EditItemProps<T> {
   val: T;
   idx: number;
   onChange: (val: T|undefined, idx: number) => void;
   onReorder: (old: number, ref: number) => void;
   editOne: (val: T, onChange: (v: T) => void) => React.ReactNode;
}

const EditItem = <T, > (p: EditItemProps<T>) => {
   const [inDrag, setInDrag] = React.useState(false);
   const [targetPos, setTargetPos] = React.useState('');
   const { onChange, onReorder } = p;
   const changeOne = React.useCallback(
      (d: T) => onChange(d, p.idx),
      [p.idx, onChange]
   );
   const removeOne = React.useCallback(
      () => onChange(undefined, p.idx),
      [p.idx, onChange]
   );
   const onDragStart = React.useCallback(
      (e: React.DragEvent<HTMLElement>) => {
         setInDrag(true);
         e.dataTransfer.setData("alere/multiselect", p.idx.toString());
         e.dataTransfer.effectAllowed = "move";
      },
      [p.idx]
   );
   const onDragEnd = React.useCallback(
      (e: React.DragEvent<unknown>) => {
         setInDrag(false);
         setTargetPos('');
      },
      []
   );
   const onDragOver = React.useCallback(
      (e: React.DragEvent<unknown>) => {
         const draggedIdx = parseInt(
            e.dataTransfer.getData("alere/multiselect"), 10);
         // ??? Need to check this is a drag initiated within the same select
         e.preventDefault();
         e.dataTransfer.dropEffect = p.idx === draggedIdx ? "none" : "move";
         setTargetPos(
            (p.idx < draggedIdx)    ? 'before'
            : (p.idx > draggedIdx)  ? 'after'
            : ''
         );
      },
      [p.idx]
   );
   const onDragLeave = React.useCallback(
      () => setTargetPos(''),
      []
   );
   const onDrop = React.useCallback(
      (e: React.DragEvent<unknown>) => {
         e.preventDefault();
         const draggedIdx = parseInt(
            e.dataTransfer.getData("alere/multiselect"), 10);
         onReorder?.(draggedIdx, p.idx  /* ref */);
         setTargetPos('');
      },
      [p.idx, onReorder]
   );

   const cl = classes(
      'row',
      inDrag && 'indrag',
      targetPos,
   );

   return (
      <div
         className={cl}
         draggable="true"
         onDragStart={onDragStart}
         onDragEnd={onDragEnd}
         onDragOver={onDragOver}
         onDragLeave={onDragLeave}
         onDrop={onDrop}
      >
         <span className="draghandle fa fa-grip"></span>
         {
            p.editOne(p.val, changeOne)
         }
         <RoundButton fa="fa-remove" size="tiny" onClick={removeOne} />
      </div>
   );
}

export interface MultipleSelectProps<T> extends SharedInputProps<T[]> {
   onChange: (val: T[]) => void;
   newValue: T;  // default value when adding a new item
   editOne: (val: T, onChange: (v: T) => void) => React.ReactNode;
}

const MultipleSelect = <T, > (p: MultipleSelectProps<T>) => {
   const { onChange } = p;
   const appendNew = React.useCallback(
      () => onChange([...(p.value ?? []), p.newValue]),
      [p.value, p.newValue, onChange]
   );
   const changeList = React.useCallback(
      (d: T | undefined, idx: number) => {
         const val = p.value!;
         if (d === undefined) {
            onChange([...val.slice(0, idx), ...val.slice(idx + 1)]);
         } else {
            onChange([...val.slice(0, idx), d, ...val.slice(idx + 1)]);
         }
      },
      [onChange, p.value]
   );
   const onReorder = React.useCallback(
      (idx: number, ref: number) => {
         const val = p.value!;
         const item = val[idx];

         // This changes the indexes, so that whether we insert before or
         // after, we end up doing the same changes.
         const w = [...val.slice(0, idx), ...val.slice(idx + 1)];
         onChange([...w.slice(0, ref), item, ...w.slice(ref)]);
      },
      [onChange, p.value]
   );

   return (
      <SharedInput className="multipleSelect" {...p} >
         <div>
            {
               (p.value ?? []).map((v: T, i: number) =>
                  <EditItem
                     key={i}
                     idx={i}
                     val={v}
                     onChange={changeList}
                     onReorder={onReorder}
                     editOne={p.editOne}
                  />
               )
            }
            <div className="row">
               <RoundButton fa="fa-plus" size="small" onClick={appendNew} />
            </div>
         </div>
      </SharedInput>
   );

}

export default MultipleSelect;
