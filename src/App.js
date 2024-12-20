import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AccountManagement from './pages/AccountManagement';
import Home from './pages/Home'; // Assuming you have a Home component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/account" element={<AccountManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
