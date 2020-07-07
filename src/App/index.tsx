import React from 'react';
import Header from 'Header';
import LeftSideBar from 'LeftSideBar';
import RightSideBar from 'RightSideBar';
import Footer from 'Footer';
import './App.css';
import "font-awesome/css/font-awesome.min.css";

const App: React.FC<{}> = () => {
  return (
    <div id="app">
        <Header title="assets:Boursorama:Commun" />
        <LeftSideBar />
        <RightSideBar />
        <Footer />
    </div>
  );
}

export default App;
