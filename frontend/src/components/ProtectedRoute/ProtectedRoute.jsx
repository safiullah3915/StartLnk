import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If onboarding is NOT completed, redirect to preferences page
  // BUT don't redirect if we are ALREADY on the preferences page
  if (user && user.onboarding_completed === false && location.pathname !== '/onboarding-preferences') {
    console.log('🔄 Onboarding not completed, redirecting to preferences');
    return <Navigate to="/onboarding-preferences" replace />;
  }

  return children;
};

export default ProtectedRoute;
