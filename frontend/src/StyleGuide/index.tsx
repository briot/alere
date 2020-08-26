import * as React from 'react';
import { Button, Checkbox, Input, Select, Option } from 'Form';
import RoundButton from 'RoundButton';
import './StyleGuide.css';

const StyleContent: React.FC<{}> = p => {
   const form = () => {
      return (
         <form onSubmit={(e) => e.preventDefault()}>
            <fieldset>
               <legend>Fieldset</legend>
               <div className="twocolumn">
                  <div>
                     <Checkbox checked={true} text='label' />
                     <Checkbox checked={false} text='unchecked' />
                  </div>
                  <div>
                     <Checkbox checked={true} text='disabled' disabled={true} />
                     <Checkbox
                        checked={true}
                        text='indeterminate'
                        indeterminate={true}
                     />
                  </div>
               </div>
               <Select text="label" value="1">
                  <Option text="choice1" value="1" />
                  <Option text="choice2" value="2" />
               </Select>
               <Select text="disabled" disabled={true} value="1">
                  <Option text="choice1" value="1" />
                  <Option text="choice2" value="2" />
               </Select>
               <Input placeholder="placeholder" text="input" />
               <Input placeholder="placeholder" disabled={true} text="disabled"/>
               <Input required={true} text="invalid" placeholder="required"/>
               <div className="wrappedRow">
                  <Button text="label" />
                  <Button text="primary" primary={true} />
                  <Button text="danger" danger={true} />
                  <Button text="disabled" disabled={true} />
                  <Button text="disabled" disabled={true} primary={true}/>
               </div>
            </fieldset>
         </form>
      );
   }

   const roundbutton = () => {
      return (
         <>
            <div className="wrappedRow">
               <RoundButton fa="fa-book" size="large"  text="Large" url="#"/>
               <RoundButton fa="fa-book" size="normal" text="Normal" url="#"/>
               <RoundButton fa="fa-book" size="small"  text="Small" url="#"/>
               <RoundButton fa="fa-book" size="tiny"   text="Tiny" url="#"/>
            </div>
            <div className="wrappedRow">
               <RoundButton fa="fa-book" size="large"  disabled={true} text="Large" />
               <RoundButton fa="fa-book" size="normal" disabled={true} text="Normal" />
               <RoundButton fa="fa-book" size="small"  disabled={true} text="Small" />
               <RoundButton fa="fa-book" size="tiny"   disabled={true} text="Tiny" />
            </div>
            <div className="wrappedRow">
               <RoundButton fa="fa-book" size="large"  selected={true} text="Large" />
               <RoundButton fa="fa-book" size="normal" selected={true} text="Normal" />
               <RoundButton fa="fa-book" size="small"  selected={true} text="Small" />
               <RoundButton fa="fa-book" size="tiny"   selected={true} text="Tiny" />
            </div>
            <div className="wrappedRow">
               <Button text="label" className="morph"/>
               <Button text="primary" className="morph" primary={true} />
               <Button text="disabled" className="morph" disabled={true} />
               <Button text="disabled" className="morph" primary={true} disabled={true}/>
            </div>
         </>
      );
   }

   return (
      <>
         <h1>Palette</h1>
         <div className="palette">
            <span className="color100">color-100</span>
            <span className="color200">color-200</span>
            <span className="color300">color-300</span>
            <span className="color400">color-400</span>
            <span className="color500">color-500</span>
            <span className="color600">color-600</span>
            <span className="color700">color-700</span>
            <span className="color800">color-800</span>
            <span className="color900">color-900</span>
         </div>
         <div className="palette">
            <span className="gray100">gray-100</span>
            <span className="gray200">gray-200</span>
            <span className="gray300">gray-300</span>
            <span className="gray400">gray-400</span>
            <span className="gray500">gray-500</span>
            <span className="gray600">gray-600</span>
            <span className="gray700">gray-700</span>
            <span className="gray800">gray-800</span>
            <span className="gray900">gray-900</span>
         </div>
         <div className="palette">
            <span className="invalid100">invalid-100</span>
            <span className="invalid200">invalid-200</span>
            <span className="invalid300">invalid-300</span>
            <span className="invalid400">invalid-400</span>
            <span className="invalid500">invalid-500</span>
            <span className="invalid600">invalid-600</span>
            <span className="invalid700">invalid-700</span>
            <span className="invalid800">invalid-800</span>
            <span className="invalid900">invalid-900</span>
         </div>

         <h1>Forms</h1>
         <div className="twocolumn">
            <div className="panel">
               {form()}
            </div>
            <div style={{marginTop: 20}} >
               {form()}
            </div>
         </div>

         <h1>Round buttons</h1>
         <div className="twocolumn">
            <div className="panel">
               {roundbutton()}
            </div>
            <div>
               {roundbutton()}
            </div>
         </div>
      </>
   );
}

const StyleGuide: React.FC<{}> = p => {
   return (
      <div className="styleguide">
         <div className="page darkpalette">
            <StyleContent />
         </div>
         <div className="page lightpalette">
            <StyleContent />
         </div>
      </div>
   );
}

export default StyleGuide;
