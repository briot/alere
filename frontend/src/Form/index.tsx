import * as React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import Dropdown from 'Form/Dropdown';
import classes from 'services/classes';
import "./Form.scss";

interface SharedInputProps {
   disabled?: boolean;
   text?: string;
   style?: React.CSSProperties;
}

const SharedInput: React.FC<
   SharedInputProps & {textAfter?: boolean, className?: string}
> = p => {
   const c = classes(
      p.className,
      p.disabled && 'disabled',
   );
   return (
      <label
         className={c}
         style={p.style}
      >
         {
            !p.textAfter && p.text && <span>{p.text}:</span>
         }
         {p.children}
         {
            p.textAfter && p.text && <span>{p.text}</span>
         }
      </label>
   );
}

interface InputProps extends SharedInputProps {
   placeholder?: string;
   required?: boolean;
   value: string;
   title?: string;
   onChange?: (val: string) => void;
}
export const Input: React.FC<InputProps> = p => {
   const { onChange } = p;
   const localChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
         onChange?.(e.target.value);
      },
      [onChange]
   );
   return (
      <SharedInput className="input" {...p}>
         <input
            disabled={p.disabled}
            onChange={localChange}
            placeholder={p.placeholder}
            required={p.required}
            title={p.title}
            type='text'
            value={p.value}
         />
      </SharedInput>
   );
}

interface NumberInputProps extends SharedInputProps {
   required?: boolean;
   value: number;
   title?: string;
   onChange?: (val: number) => void;
}
export const NumberInput: React.FC<NumberInputProps> = p => {
   const { onChange } = p;
   const localChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
         onChange?.(parseFloat(e.target.value));
      },
      [onChange]
   );
   return (
      <SharedInput className="input" {...p}>
         <input
            disabled={p.disabled}
            onChange={localChange}
            required={p.required}
            title={p.title}
            type="number"
            value={p.value}
         />
      </SharedInput>
   );
}

interface ButtonProps extends SharedInputProps {
   primary?: boolean;
   danger?: boolean;
   className?: string;
   onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}
export const Button: React.FC<ButtonProps> = p => {
   const c = classes(
      'button',
      p.className,
      p.disabled && 'disabled',
      p.primary && 'primary',
      p.danger && 'danger',
   );
   return (
      <button
         className={c}
         disabled={p.disabled}
         style={p.style}
         onClick={p.onClick}
      >
         {p.text}
      </button>
   );
}


interface CheckboxProps extends SharedInputProps {
   checked: boolean|undefined;
   onChange?: (val: boolean) => void;
   indeterminate?: boolean;
   required?: boolean;
}
export const Checkbox: React.FC<CheckboxProps> = p => {
   const { onChange } = p;
   const localChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         const val = event.target.checked;  //  must capture synchronously
         onChange?.(val);
      },
      [onChange]
   );

   const indetSetter = React.useCallback(
      el => {
         if (el) {
           el.indeterminate = p.indeterminate;
         }
      },
      [p.indeterminate]
   );

   return (
      <SharedInput className="checkbox" textAfter={true} {...p}>
         <input
            checked={p.checked ?? false}
            disabled={p.disabled}
            ref={indetSetter}
            required={p.required}
            onChange={localChange}
            type="checkbox"
         />
      </SharedInput>
   );
}

export interface Option<T> {
   value: T | 'divider';
   text?: string;
   style?: React.CSSProperties;  // when showing the text in the menu
}

export const divider: Option<any> = {value: 'divider'};


interface SelectProps<T> extends SharedInputProps {
   onChange?: (val: T) => void;
   value: T;
   options: Option<T>[];
   required?: boolean;
   direction?: "left" | "right";
   hideArrow?: boolean;
   style?: React.CSSProperties;
   format?: (value: T) => string|undefined;  //  formatting the selected
}

export const Select = <T extends any> (p: SelectProps<T>) => {
   const ROW_HEIGHT = 20;

   const { onChange } = p;
   const selectItem = React.useCallback(
      (val: T) => onChange?.(val),
      [onChange]
   );
   const selected = p.options.filter(o => o.value === p.value)[0]
   const getKey = (index: number) => index;
   const getRow = (q: ListChildComponentProps) => {
      const o = p.options[q.index];
      return o.value === 'divider' ? (
         <div className="option divider" style={q.style} />
      ) : (
         <div
            className={
               `option${o.value === p.value ? ' selected' : ''}`
            }
            style={q.style}
            onClick={() => selectItem(o.value as T)}
         >
            <span style={o.style}>{o.text ?? o.value}</span>
         </div>
      );
   }

   // ??? handling of `required`

   return (
      <SharedInput className="select" {...p} >
         <Dropdown
            closeOnInsideClick={true}
            button={() =>
               <>
                  <div className="text" >
                     {
                        (selected.value !== undefined
                           && selected.value !== "divider"
                           && p.format?.(selected.value))
                        ?? selected?.text
                        ?? selected?.value
                        ?? ''}
                  </div>
                  {
                     !p.hideArrow &&
                     <div className="icon fa fa-caret-down" />
                  }
               </>
            }
            menu={
               <div
                   style={{height: ROW_HEIGHT * Math.min(p.options.length, 15) }}
               >
                  <AutoSizer>
                    {
                       ({ width, height }) => (
                           <FixedSizeList
                              width={width}
                              height={height}
                              itemCount={p.options.length}
                              itemSize={ROW_HEIGHT}
                              itemKey={getKey}
                           >
                              {getRow}
                           </FixedSizeList>
                       )
                    }
                  </AutoSizer>
               </div>
            }
         />
      </SharedInput>
   );
}
