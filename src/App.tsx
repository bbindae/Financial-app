import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

/**
 * Main application component with routing
 * Handles navigation between login and dashboard pages
 */
function App() {
  const { currentUser, loading } = useAuth();

  // Show loading spinner while Firebase initializes
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login route */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected dashboard route */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Root redirect - redirect to dashboard if logged in, otherwise to login */}
      <Route 
        path="/" 
        element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} 
      />
      
      {/* Catch-all route - redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
