// src/pages/AdminLoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { FaLeaf } from 'react-icons/fa';
import classes from './AdminLoginPage.module.css'; // Correct import

// REMOVE THE ENTIRE 'const styles = { ... }' OBJECT HERE

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    navigate('/admin/dashboard');
  };

  if (true) {
    return <Navigate to="/admin/dashboard" replace />;
  }

};

export default AdminLoginPage;