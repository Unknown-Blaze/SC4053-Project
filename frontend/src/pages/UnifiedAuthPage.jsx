// src/pages/UnifiedAuthPage.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../contexts/AuthContext';
import { useSessionWalletAuth } from '../contexts/SessionWalletAuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { 
  FiLoader, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiDownload, 
  FiUser, 
  FiLock,
  FiCreditCard,
  FiShield,
  FiArrowRight,
  FiMail,
  FiKey,
  FiHome,
  FiUserCheck
} from 'react-icons/fi';
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from '../firebase/config';

const METAMASK_INSTALL_URL = "https://metamask.io/download/";

const UnifiedAuthPage = () => {
  // Wallet connection state
  const [metaMaskInstalled, setMetaMaskInstalled] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [description, setDescription] = useState('');
  const [userType, setUserType] = useState('donor');
  
  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { login, signup, currentUser, currentUserProfile } = useAuth();
  const { connectWallet, isConnected } = useSessionWalletAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkInstallation() {
      setWalletLoading(true);
      handleStepChange("Checking MetaMask status...");
      try {
        const installed = typeof window.ethereum !== 'undefined';
        setMetaMaskInstalled(installed);
        setWalletChecked(true);
        setWalletLoading(false);
        handleStepChange('');
      } catch (err) {
        console.error("Error checking MetaMask installation:", err);
        setError("Error checking MetaMask installation. Please refresh the page.");
        setWalletLoading(false);
        handleStepChange('');
      }
    }
    checkInstallation();
  }, []);

  const handleStepChange = (message) => {
    setLoadingMessage(message);
  };

  const handleConnectWallet = async () => {
    setWalletLoading(true);
    setError('');
    handleStepChange("Connecting to MetaMask...");
    
    try {
      const walletData = await connectWallet();
      const address = walletData.address;
      setWalletAddress(address);
      handleStepChange("Checking if account exists...");
      
      // Check if user exists in Firestore
      const userQuery = query(
        collection(db, "users"),
        where("walletAddress", "==", address),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        setIsExistingUser(true);
        handleStepChange('');
        // Don't redirect - show login form on same page
      } else {
        setIsExistingUser(false);
        setShowForm(true);
        handleStepChange('');
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Failed to connect wallet. Please try again.");
      handleStepChange('');
    } finally {
      setWalletLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    handleStepChange("Logging in...");
    
    try {
      await login(email, password);
      navigate('/userprofile');
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
      handleStepChange('');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    handleStepChange("Creating your account...");
    
    if (password !== confirmPassword) {
      setLoading(false);
      handleStepChange('');
      return setError("Passwords do not match.");
    }

    let nameToRegister;
    let additionalData = { 
      walletAddress,
      userType: userType // Include userType in additionalData
    };

    if (userType === 'nonprofit') {
      if (!organizationName) { 
        setLoading(false); 
        handleStepChange(''); 
        return setError("Organization Name is required."); 
      }
      if (!contactPersonName) { 
        setLoading(false); 
        handleStepChange(''); 
        return setError("Contact Person Name is required."); 
      }
      if (!organizationType) { 
        setLoading(false); 
        handleStepChange(''); 
        return setError("Organization Type is required."); 
      }
      // For NGOs, use organization name as the display name
      nameToRegister = organizationName;
      additionalData = { 
        ...additionalData, 
        organizationName, 
        contactPersonName, 
        organizationType, 
        registrationNumber, 
        description 
      };
    } else {
      // For donors, use personal name
      nameToRegister = displayName;
    }

    try {
      await signup(email, password, nameToRegister, additionalData, handleStepChange);
      navigate('/userprofile');
    } catch (err) {
      console.error("SignupPage Error in handleSubmit:", err);
      setError(err.message || 'Failed to create an account. Please try again.');
    } finally {
      setLoading(false);
      handleStepChange('');
    }
  };

  if (currentUser && currentUserProfile) {
    return <Navigate to="/userprofile" replace />;
  }

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap');
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8fafc',
        padding: '2rem 0',
        fontFamily: 'Raleway, sans-serif'
      }}>
        <div style={{ 
          maxWidth: '600px', 
          margin: '0 auto', 
          padding: '0 1rem'
        }}>
          {/* Header Section - Only show for initial wallet connection */}
          {!walletAddress && (
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem',
                background: 'linear-gradient(135deg, #1f2937, #3b82f6, #1f2937)',
                backgroundSize: '200% 100%',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                display: 'inline-block',
                transition: 'all 0.3s ease'
              }}>
                Welcome to nGoDonate
              </h1>
              <p style={{ 
                fontSize: '1.1rem', 
                color: '#6b7280'
              }}>
                Connect your wallet to get started with secure, transparent donations to your favorite charity.
              </p>
            </div>
          )}

          {/* Main Auth Card */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FiAlertCircle style={{ width: '20px', height: '20px' }} />
                {error}
              </div>
            )}

            {/* Loading Message */}
            {loadingMessage && (
              <div style={{
                background: '#dbeafe',
                border: '1px solid #93c5fd',
                color: '#1d4ed8',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FiLoader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                {loadingMessage}
              </div>
            )}

            {/* MetaMask Not Installed */}
            {!metaMaskInstalled && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: 'white'
                }}>
                  <FiDownload style={{ width: '40px', height: '40px' }} />
                </div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '1rem'
                }}>
                  MetaMask Required
                </h2>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '2rem',
                  lineHeight: '1.6'
                }}>
                  Please install MetaMask browser extension to connect your wallet and access our platform.
                </p>
                <a 
                  href={METAMASK_INSTALL_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s',
                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 35px rgba(245, 158, 11, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)';
                  }}
                >
                  <FiDownload style={{ width: '20px', height: '20px' }} />
                  Install MetaMask
                </a>
              </div>
            )}

            {/* Wallet Connection Prompt */}
            {metaMaskInstalled && !walletAddress && walletChecked && !isExistingUser && !showForm && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  borderRadius: '16px',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                  <FiCreditCard style={{ width: '28px', height: '28px' }} />
                </div>
                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Connect Your Wallet
                </h2>
                <button 
                  onClick={handleConnectWallet}
                  disabled={walletLoading}
                  style={{
                    background: walletLoading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.875rem 1.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: walletLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: '0 auto',
                    transition: 'all 0.3s',
                    boxShadow: walletLoading ? 'none' : '0 6px 20px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    if (!walletLoading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!walletLoading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
                    }
                  }}
                >
                  {walletLoading ? (
                    <>
                      <FiLoader style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <FiCreditCard style={{ width: '18px', height: '18px' }} />
                      Connect MetaMask
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Existing User Login */}
            {isExistingUser === true && (
              <div>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: 'white'
                }}>
                  <FiUserCheck style={{ width: '40px', height: '40px' }} />
                </div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Account Found!
                </h2>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '2rem',
                  lineHeight: '1.6',
                  textAlign: 'center'
                }}>
                  We found an existing account for this wallet. Please log in with your credentials.
                </p>
                
                <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.5rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '0.5rem',
                      fontSize: '0.95rem'
                    }}>
                      <FiMail style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '0.5rem',
                      fontSize: '0.95rem'
                    }}>
                      <FiKey style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    style={{
                      background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '1rem 2rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s',
                      boxShadow: loading ? 'none' : '0 8px 25px rgba(16, 185, 129, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <FiLoader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                        Logging In...
                      </>
                    ) : (
                      <>
                        <FiShield style={{ width: '20px', height: '20px' }} />
                        Log In
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Registration Form */}
            {showForm && (
              <div>
                <div style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: 'white'
                }}>
                  <FiUser style={{ width: '40px', height: '40px' }} />
                </div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Complete Your Registration
                </h2>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '2rem',
                  lineHeight: '1.6',
                  textAlign: 'center'
                }}>
                  Please provide the following information to create your account.
                </p>
                
                {/* User Type Selection Tabs */}
                <div style={{
                  display: 'flex',
                  background: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '4px',
                  marginBottom: '2rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setUserType('donor')}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: userType === 'donor' ? 'white' : 'transparent',
                      color: userType === 'donor' ? '#374151' : '#6b7280',
                      fontWeight: userType === 'donor' ? '600' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: userType === 'donor' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <FiUser style={{ width: '18px', height: '18px' }} />
                    I'm a Donor
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('nonprofit')}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: userType === 'nonprofit' ? 'white' : 'transparent',
                      color: userType === 'nonprofit' ? '#374151' : '#6b7280',
                      fontWeight: userType === 'nonprofit' ? '600' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: userType === 'nonprofit' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <FiHome style={{ width: '18px', height: '18px' }} />
                    I'm an NGO
                  </button>
                </div>
                
                <form onSubmit={handleSignup} style={{ display: 'grid', gap: '1.5rem' }}>
                  {/* Donor Information */}
                  {userType === 'donor' && (
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      border: '2px solid #e2e8f0'
                    }}>
                      <h3 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        color: '#374151',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FiUser style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                        Personal Information
                      </h3>
                      
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            <FiMail style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            <FiKey style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                            Password
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Create a password"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            <FiKey style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm your password"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            <FiUser style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                            placeholder="Enter your full name"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NGO Information */}
                  {userType === 'nonprofit' && (
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      border: '2px solid #e2e8f0'
                    }}>
                      <h3 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        color: '#374151',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FiHome style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                        Organization Details
                      </h3>
                      
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            <FiMail style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                            Organization Email Address
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter organization email"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            <FiKey style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                            Organization Password
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Create organization password"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            <FiKey style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                            Confirm Organization Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm organization password"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            Organization Name
                          </label>
                          <input
                            type="text"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            required
                            placeholder="Enter organization name"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            Contact Person Name
                          </label>
                          <input
                            type="text"
                            value={contactPersonName}
                            onChange={(e) => setContactPersonName(e.target.value)}
                            required
                            placeholder="Enter contact person name"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            Organization Type
                          </label>
                          <input
                            type="text"
                            value={organizationType}
                            onChange={(e) => setOrganizationType(e.target.value)}
                            required
                            placeholder="e.g., Charity, Foundation, NGO"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            Registration Number
                          </label>
                          <input
                            type="text"
                            value={registrationNumber}
                            onChange={(e) => setRegistrationNumber(e.target.value)}
                            required
                            placeholder="Enter registration number"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                        
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontWeight: '500', 
                            color: '#374151',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem'
                          }}>
                            Organization Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            placeholder="Describe your organization's mission and activities"
                            rows={4}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'all 0.2s',
                              outline: 'none',
                              resize: 'vertical'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    style={{
                      background: loading ? '#9ca3af' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '1rem 2rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s',
                      boxShadow: loading ? 'none' : '0 8px 25px rgba(139, 92, 246, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 12px 35px rgba(139, 92, 246, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <FiLoader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <FiUser style={{ width: '20px', height: '20px' }} />
                        Create Account
                        <FiArrowRight style={{ width: '16px', height: '16px' }} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Fallback - Show if nothing else matches */}
            {!metaMaskInstalled && walletChecked && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ color: '#6b7280' }}>MetaMask is not installed. Please install it to continue.</p>
              </div>
            )}

            {metaMaskInstalled && walletChecked && !walletAddress && !isExistingUser && !showForm && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ color: '#6b7280' }}>Please connect your wallet to continue.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UnifiedAuthPage;