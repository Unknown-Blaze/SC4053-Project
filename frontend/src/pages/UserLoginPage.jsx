// src/pages/UserLoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import classes from '../styles/AdminLoginPage.module.css'; // Reuse styles

const UserLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth(); // Use the same login from AuthContext
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/userprofile'); // Redirect to user profile page
    } catch (err) {
      setError('Failed to log in. Check credentials.');
    }
    setLoading(false);
  };

   if (currentUser) { // If already logged in, redirect to profile
    return <Navigate to="/userprofile" replace />;
  }

  return (
    <div className={classes.pageContainer}>
      <div className={classes.formBox}>
        <h2 className={classes.title}>Welcome Back!</h2>
        {error && <p className={classes.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          {/* Email and Password inputs similar to AdminLoginPage */}
          <div className={classes.formGroup}>
            <label htmlFor="email" className={classes.label}>Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={classes.input} />
          </div>
          <div className={classes.formGroup}>
            <label htmlFor="password" className={classes.label}>Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={classes.input} />
          </div>
          <button type="submit" disabled={loading} className={classes.button}>
            {loading ? 'Logging In...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: '15px', fontSize: '0.9em' }}>
          No account? <Link to="/signup" style={{ color: '#007bff' }}>Sign Up Here</Link>
        </p>
        <Link to="/" className={classes.backLink}>← Back to Main Page</Link>
      </div>
    </div>
  );
};
export default UserLoginPage;