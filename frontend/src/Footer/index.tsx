import React from 'react';
import Numeric from 'Numeric';
import './Footer.css';

interface FooterProps {
}

const Footer: React.FC<FooterProps> = p => {
   return (
      <div id='footer'>
         <div className='global' >
            Net worth: <Numeric currency='euro' amount={24523.21} />
         </div>
      </div>
   );
}

export default Footer;
