import * as React from 'react';
import './Spinner.scss';

interface SpinnerProps { }
const Spinner: React.FC<SpinnerProps> = p => {
   return (
      <div className="spinner">
         <div />
         <div />
         <div />
         <div />
         <div />
         <div />
         <div />
         <div />
      </div>
   );
}
export default Spinner;
