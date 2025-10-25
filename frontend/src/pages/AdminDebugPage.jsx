// src/pages/AdminDebugPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import classes from '../styles/AdminLoginPage.module.css';

const AdminDebugPage = () => {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { checkOrphanedAccounts } = useAuth();

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const checkResult = await checkOrphanedAccounts(email);
      setResult(checkResult);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.pageContainer}>
      <div className={classes.formBox}>
        <h2 className={classes.title}>Account Status Checker</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Check if an email has orphaned accounts or conflicts
        </p>

        <form onSubmit={handleCheckEmail}>
          <div className={classes.formGroup}>
            <label htmlFor="email" className={classes.label}>Email Address</label>
            <input 
              type="email" 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className={classes.input} 
              placeholder="Enter email to check"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !email.trim()} 
            className={classes.button}
          >
            {loading ? 'Checking...' : 'Check Account Status'}
          </button>
        </form>

        {result && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            backgroundColor: result.isOrphaned ? '#fff3cd' : 
                           result.authExists && result.firestoreExists ? '#d4edda' : '#f8f9fa'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Account Status</h3>
            <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Email: {result.email}</p>
            <p style={{ margin: '5px 0' }}>Firebase Auth: {result.authExists ? '✅ Exists' : '❌ Not found'}</p>
            <p style={{ margin: '5px 0' }}>Firestore: {result.firestoreExists ? '✅ Exists' : '❌ Not found'}</p>
            <p style={{ margin: '5px 0' }}>Status: {result.isOrphaned ? '⚠️ Orphaned' : '✅ Normal'}</p>
            <p style={{ margin: '10px 0 0 0', fontStyle: 'italic' }}>{result.message}</p>
            
            {result.isOrphaned && (
              <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                backgroundColor: '#f8d7da', 
                border: '1px solid #f5c6cb', 
                borderRadius: '4px' 
              }}>
                <strong>⚠️ Orphaned Account Detected</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                  This email has a Firebase Auth account but no Firestore document. 
                  The user cannot sign up with this email until the orphaned account is cleaned up.
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                  <strong>Solution:</strong> You need to delete the Firebase Auth user manually from the Firebase Console.
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>How to Clean Up Orphaned Accounts:</h4>
          <ol style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
            <li>Select your project</li>
            <li>Go to Authentication → Users</li>
            <li>Find the orphaned user by email</li>
            <li>Click the three dots → Delete user</li>
            <li>Confirm deletion</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AdminDebugPage;
