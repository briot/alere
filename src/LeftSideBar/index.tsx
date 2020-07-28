import React from 'react';
import './LeftSideBar.css';

interface LeftSideBarProps {
}

const LeftSideBar: React.FC<LeftSideBarProps> = p => {
   return (
      <div id='lsidebar'>
         <ul>
           <li>
              <a href='#a'>
                 <span className="fa fa-tachometer" /> Home
              </a>
           </li>
           <li className='selected'>
              <a href='#a'>
                 <span className="fa fa-book" /> Ledger
              </a>
           </li>
           <li>
              <a href='#a'>
                 <span className="fa fa-balance-scale" /> Budget
              </a>
           </li>
           <li>
              <a href='#a'>
                 <span className="fa fa-bank" /> Investments
              </a>
           </li>
           <li>
              <a href='#a'>
                 <span className="fa fa-pie-chart" /> Reports
              </a>
           </li>
        </ul>

        <h3>Favorite reports</h3>

        <ul>
           <li>
              <a href='#a'>
                 <span className="fa fa-line-chart" /> Custom 1
              </a>
           </li>
           <li>
              <a href='#a'>
                 <span className="fa fa-line-chart" /> Custom 2
              </a>
           </li>
        </ul>
      </div>
   );
}

export default LeftSideBar;
