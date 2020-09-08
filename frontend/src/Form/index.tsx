import * as React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import "./Form.scss";

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
   type?: 'text' | 'number';
   value?: string;
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
   onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}
export const Button: React.FC<ButtonProps> = p => {
   const c = `button ${p.className || ''}${p.disabled ? ' disabled' : ''}${p.primary ? ' primary' : ''}${p.danger ? ' danger' : ''}`;
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

export interface Option<T> {
   value: T | 'divider';
   text?: React.ReactNode | string;
}


interface SelectProps<T> extends SharedInputProps {
   onChange?: (val: T) => void;
   value: T;
   options: Option<T>[];
   required?: boolean;
   direction?: "left" | "right";
   hideArrow?: boolean;
   style?: React.CSSProperties;
}

export const Select = <T, > (p: SelectProps<T>) => {
   const { onChange } = p;
   const [visible, setVisible] = React.useState(false);
   const menu = React.useRef<HTMLDivElement>(null);

   const onIconClick = React.useCallback(
      () => setVisible(old => !old),
      []
   );

   const selectItem = React.useCallback(
      (val: T) => onChange?.(val),
      [onChange]
   );

   const selected = p.options.filter(o => o.value === p.value)[0]

   const onMouseDown = React.useCallback(
      (e : MouseEvent) => {
         setVisible(old => {
            if (old) {
               let p = e.target as HTMLElement|null;
               while (p) {
                  if (p === menu.current) {
                     return old;  // no change, we want to select an item
                  }
                  p = p.parentElement;
               }
               e.stopPropagation();
               e.preventDefault();
            }
            return false;
         });
      },
      []
   );

   React.useEffect(
      () => {
         if (visible) {
            window.document.addEventListener('mousedown', onMouseDown);
            window.document.addEventListener('mouseup', onMouseDown);
            return () => {
               window.document.removeEventListener('mousedown', onMouseDown);
               window.document.removeEventListener('mouseup', onMouseDown);
            };
         }
      },
      [onMouseDown, visible]
   );

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
            {o.text ?? o.value}
         </div>
      );
   }


   // ??? handling of `required`

   return (
      <SharedInput className="select" {...p} >
         <div
            className="selector"
            onClick={onIconClick}
            style={p.style}
            ref={menu}
         >
            <div
               className="text"
            >
               {selected?.text ?? selected?.value ?? ''}
            </div>
            {
               !p.hideArrow &&
               <div
                  className="icon fa fa-caret-down"
               />
            }
            <div
                className={
                   `menu ${visible ? 'visible' : ''} ${p.direction ?? 'right'}`
                }
                style={{height: 25 * Math.min(p.options.length, 15) }}
            >
               <AutoSizer>
                 {
                    ({ width, height }) => (
                        <FixedSizeList
                           width={width}
                           height={height}
                           itemCount={p.options.length}
                           itemSize={25}
                           itemKey={getKey}
                        >
                           {getRow}
                        </FixedSizeList>
                    )
                 }
               </AutoSizer>
            </div>
         </div>
      </SharedInput>
   );
}
