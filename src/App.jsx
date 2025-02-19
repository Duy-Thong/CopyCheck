import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ClassAssignments from './pages/ClassAssignments';
import SubmitAssignment from './pages/SubmitAssignment';
import AccountManagement from './pages/AccountManagement';
import ClassStatistics from './pages/ClassStatistics';
import OCR from './pages/OCR';
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/class/:classId/assignments" element={
            <PrivateRoute>
              <ClassAssignments />
            </PrivateRoute>
          } />
          <Route path='/account' element={ <AccountManagement/> } /> 
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/submit" element={<SubmitAssignment />} />
          <Route path="/class/:classId/statistics" element={
            <PrivateRoute>
              <ClassStatistics />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
          <Route path="ocr" element={<OCR />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
