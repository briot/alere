import * as React from 'react';
import InvestmentsPanel from 'Investment/Panel';

const InvestmentPage: React.FC<{}> = p => {
   return (
      <div className="main">
         <InvestmentsPanel
            hideIfNoShare={true}
         />
      </div>
   );
}

export default InvestmentPage;
