import * as React from 'react';
import "./Form.css";

interface SharedInputProps {
   disabled?: boolean;
   text?: string;
   style?: React.CSSProperties;
}

const SharedInput: React.FC<
   SharedInputProps & {textAfter?: boolean, className?: string}
> = p => {
   return (
      <label
         className={`${p.className || ''}${p.disabled ? ' disabled' : ''}`}
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
   type?: 'text';
   value?: string;
}
export const Input: React.FC<InputProps> = p => {
   return (
      <SharedInput className="input" {...p}>
         <input
            disabled={p.disabled}
            placeholder={p.placeholder}
            required={p.required}
            type={p.type || 'text'}
            value={p.value}
         />
      </SharedInput>
   );
}

interface ButtonProps extends SharedInputProps {
   primary?: boolean;
   danger?: boolean;
   className?: string;
}
export const Button: React.FC<ButtonProps> = p => {
   const c = `button ${p.className || ''}${p.disabled ? ' disabled' : ''}${p.primary ? ' primary' : ''}${p.danger ? ' danger' : ''}`;
   return (
      <button
         className={c}
         disabled={p.disabled}
         style={p.style}
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
            checked={p.checked}
            disabled={p.disabled}
            ref={indetSetter}
            required={p.required}
            onChange={localChange}
            type="checkbox"
         />
      </SharedInput>
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


interface SelectProps<T> extends SharedInputProps {
   onChange?: (val: string) => void;
   value: T;
   children?: React.ReactNode|React.ReactNode[];
   required?: boolean;
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
      <SharedInput className="select" {...p} >
         <select
            disabled={p.disabled}
            onChange={localChange}
            required={p.required}
            value={p.value}
         >
             {p.children}
         </select>
      </SharedInput>
   );
}
