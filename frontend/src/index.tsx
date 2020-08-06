import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from "react-router-dom";
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { AccountsProvider } from 'services/useAccounts';
import { PrefProvider } from 'services/usePrefs';

ReactDOM.render(
  <React.StrictMode>
      <BrowserRouter>
         <PrefProvider>
            <AccountsProvider>
               <App />
            </AccountsProvider>
         </PrefProvider>
      </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
