// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Routes that require a logged-in user
export const ProtectedRoute = ({ children }) => {
  const { currentUser, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div>Loading...</div>; // could be replaced with a spinner
  }

  if (!currentUser) {
    // User not authenticated → send them to unified auth
    return <Navigate to="/auth" replace />;
  }

  // User is authenticated
  return children ? children : <Outlet />;
};

// Routes that should redirect if the user is already logged in (e.g., login/signup)
export const PublicOnlyRoute = ({ children }) => {
  const { currentUser, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div>Loading...</div>;
  }

  if (currentUser) {
    // Already logged in → go to profile
    return <Navigate to="/userprofile" replace />;
  }

  // User is not authenticated
  return children ? children : <Outlet />;
};
