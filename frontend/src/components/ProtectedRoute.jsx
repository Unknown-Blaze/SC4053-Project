// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// For routes that require a user to be logged in
export const ProtectedRoute = ({ children }) => {
  const { currentUser, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!currentUser) {
    // User not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the child route/component
  return children ? children : <Outlet />;
};

// For routes that should redirect if the user is already logged in (e.g., login, signup)
export const PublicOnlyRoute = ({ children }) => {
  const { currentUser, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (currentUser) {
    // User is authenticated, redirect to their profile page
    return <Navigate to="/userprofile" replace />;
  }

  // User is not authenticated, render the child route/component
  return children ? children : <Outlet />;
};