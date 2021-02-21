import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from "react-router-dom";
import './index.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorker from './serviceWorker';
import { AccountsProvider } from 'services/useAccounts';
import { PrefProvider } from 'services/usePrefs';
import { HistProvider } from 'services/useHistory';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
   defaultOptions: {
     queries: {
       staleTime: 5 * 60000,  // 5min
     },
   },
});

ReactDOM.render(
  <React.StrictMode>
      <BrowserRouter>
         <QueryClientProvider client={queryClient}>
            <PrefProvider>
               <HistProvider>
                  <AccountsProvider>
                     <App />
                  </AccountsProvider>
               </HistProvider>
            </PrefProvider>
        </QueryClientProvider>
      </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);

