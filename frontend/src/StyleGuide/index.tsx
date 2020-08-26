import * as React from 'react';
import './StyleGuide.css';

const StyleContent: React.FC<{}> = p => {
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
