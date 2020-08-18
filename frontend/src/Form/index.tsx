import * as React from 'react';
import "./Form.css";

interface CheckboxProps {
   checked: boolean|undefined;
   disabled?: boolean;
   onChange?: (val: boolean) => void;
   text?: string;
   style?: React.CSSProperties;
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

   return (
      <div
         className={`checkbox option ${p.disabled ? 'disabled' : ''}`}
         style={p.style}
      >
         <label>
            <input
               checked={p.checked}
               disabled={p.disabled}
               onChange={localChange}
               type="checkbox"
            />
            {p.text}
         </label>
      </div>
   );
}


interface OptionProps<T> {
   text?: string;
   value?: T;
}
export const Option = <T extends string|number> (p: OptionProps<T>) => {
   return (
      <option value={p.value}>{p.text}</option>
   );
}


interface SelectProps<T> {
   disabled?: boolean;
   onChange?: (val: string) => void;
   text: string;
   value: T;
   children?: React.ReactNode|React.ReactNode[];
}

export const Select = <T extends string|number> (p: SelectProps<T>) => {
   const { onChange } = p;
   const localChange = React.useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
         const v = event.target.value;  //  must capture synchronously
         onChange?.(v);
      },
      [onChange],
   );
   return (
      <div className="select">
         {
            p.text &&
            <label htmlFor={p.text}>{p.text}: </label>
         }
         <select
            disabled={p.disabled}
            id={p.text}
            onChange={localChange}
            value={p.value}
         >
             {p.children}
         </select>
      </div>
   );
}
