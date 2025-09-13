// src/pages/SignupPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import classes from './AdminLoginPage.module.css'; // Or your actual SignupPage.module.css
import { FiLoader, FiAlertCircle, FiCheckCircle, FiDownloadCloud } from 'react-icons/fi'; // Added FiDownloadCloud
import { getAddress, isInstalled, openExtension } from '@gemwallet/api';

import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from '../firebase/config';

const GEMWALLET_INSTALL_URL = "https://gemwallet.app/download";

const SignupPage = () => {
  const [userType, setUserType] = useState('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [description, setDescription] = useState('');

  const [gemWalletInstalled, setGemWalletInstalled] = useState(null);
  const [gemWalletAddress, setGemWalletAddress] = useState(null); // This state variable name is already good
  const [gemWalletLoading, setGemWalletLoading] = useState(false);
  const [gemWalletChecked, setGemWalletChecked] = useState(false);

  // MODIFIED: Destructure the renamed function from useAuth
  const { signup, currentUser, currentUserProfile, updateUserGemWalletAddress } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkInstallation() {
      setGemWalletLoading(true);
      handleStepChange("Checking GemWallet status...");
      try {
        const installed = await isInstalled();
        setGemWalletInstalled(installed.result); // Access the boolean result
        console.log("GemWallet installed status:", installed.result);
        if (!installed.result) {
          handleStepChange("GemWallet not detected.");
        } else {
          handleStepChange("");
        }
      } catch (e) {
        console.error("Error checking GemWallet installation:", e);
        setGemWalletInstalled(false);
        setError("Could not detect GemWallet. Ensure your browser supports extensions and try refreshing.");
        handleStepChange("");
      } finally {
        setGemWalletLoading(false);
        setGemWalletChecked(true);
      }
    }
    checkInstallation();
  }, []);

  useEffect(() => {
    console.log("SignupPage Effect: currentUser:", currentUser, "currentUserProfile:", currentUserProfile);
  }, [currentUser, currentUserProfile]);

  const handleStepChange = (message) => {
    setLoadingMessage(message || '');
  };

  const handleConnectGemWallet = async () => {
    if (!gemWalletInstalled) {
      setError("Please install GemWallet first.");
      return;
    }

    setError('');
    setGemWalletLoading(true);
    handleStepChange("Please approve connection in GemWallet...");
    try {
      const response = await getAddress();
      console.log("GemWallet getAddress response:", response);

      if (response && response.type === 'response' && response.result && response.result.address) {
        const newGemAddress = response.result.address;
        handleStepChange("Verifying wallet address...");

        const usersRef = collection(db, "users");
        // MODIFIED: Query Firestore using 'gemWalletAddress' field
        const q = query(usersRef, where("gemWalletAddress", "==", newGemAddress), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setError(`This GemWallet address (${newGemAddress.substring(0,6)}...) is already associated with an account. Please log in or use a different wallet.`);
          setGemWalletAddress(null);
          handleStepChange("");
        } else {
          setGemWalletAddress(newGemAddress);
          handleStepChange("GemWallet Ready! You can now complete your registration.");
        }
      } else if (response && response.type === 'reject') {
        setError('Connection to GemWallet was rejected. Please ensure you approve the request in GemWallet, or try again.');
        setGemWalletAddress(null);
        handleStepChange('');
      } else if (response && response.type === 'error' && response.message) {
        setError(`GemWallet error: ${response.message}. Please try again.`);
        setGemWalletAddress(null);
        handleStepChange('');
      } else if (response && response.type === 'error') {
        setError('GemWallet reported an unspecified error. Please try again.');
        setGemWalletAddress(null);
        handleStepChange('');
      }
      else {
        setError('Connection to GemWallet failed due to an unexpected response. Please try again.');
        setGemWalletAddress(null);
        handleStepChange('');
      }
    } catch (err) {
      console.error('Error during GemWallet connection process:', err);
      let errorMessage = 'An unexpected error occurred while trying to connect to GemWallet.';
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      setGemWalletAddress(null);
      handleStepChange('');
    } finally {
      setGemWalletLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password should be at least 6 characters.");

    if (!gemWalletAddress) {
        return setError("Please connect your GemWallet before registering.");
    }

    setError('');
    setLoading(true);
    handleStepChange("Starting registration...");

    let nameToRegister;
    // MODIFIED: Pass gemWalletAddress under the key 'gemWalletAddress'
    let additionalData = {
        userType,
        gemWalletAddress: gemWalletAddress
    };

    if (userType === 'donor') {
      if (!displayName.trim()) { setLoading(false); handleStepChange(''); return setError("Full Name is required for donors."); }
      nameToRegister = displayName;
    } else {
      if (!organizationName.trim()) { setLoading(false); handleStepChange(''); return setError("Organization Name is required."); }
      if (!contactPersonName.trim()) { setLoading(false); handleStepChange(''); return setError("Contact Person Name is required."); }
      if (!organizationType) { setLoading(false); handleStepChange(''); return setError("Organization Type is required."); }
      nameToRegister = contactPersonName;
      additionalData = { ...additionalData, organizationName, contactPersonName, organizationType, registrationNumber, description };
    }

    try {
      console.log("SignupPage: Calling signup function with GemWallet address:", gemWalletAddress);
      await signup(email, password, nameToRegister, additionalData, handleStepChange);
      console.log("SignupPage: Firebase account and profile created/updated with GemWallet address.");
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
    console.log("SignupPage: User already logged in and profile exists. Redirecting.");
    return <Navigate to="/userprofile" replace />;
  }

  const renderDonorFieldsJsx = (
  <>
    <div className={classes.formGroup}>
      <label htmlFor="displayName" className={classes.label}>Full Name</label>
      <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className={classes.input} disabled={loading} />
    </div>
  </>
);

  const renderNonprofitFieldsJsx = (
  <>
    <div className={classes.formGroup}>
      <label htmlFor="organizationName" className={classes.label}>Organization Name</label>
      <input type="text" id="organizationName" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required className={classes.input} disabled={loading} />
    </div>
    <div className={classes.formGroup}>
        <label htmlFor="contactPersonName" className={classes.label}>Contact Person Name</label>
        <input type="text" id="contactPersonName" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} required className={classes.input} disabled={loading} />
    </div>
    <div className={classes.formGroup}>
        <label htmlFor="organizationType" className={classes.label}>Organization Type</label>
        <input type="text" id="organizationType" value={organizationType} onChange={(e) => setOrganizationType(e.target.value)} required className={classes.input} disabled={loading} />
    </div>
    <div className={classes.formGroup}>
        <label htmlFor="registrationNumber" className={classes.label}>Registration Number (Optional)</label>
        <input type="text" id="registrationNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className={classes.input} disabled={loading} />
    </div>
    <div className={classes.formGroup}>
      <label htmlFor="description" className={classes.label}>Brief Description of Organization</label>
      <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className={classes.textarea} placeholder="What your organization does, its mission..." disabled={loading} />
    </div>
  </>
);

  return (
    <div className={classes.pageContainer}>
      <div className={classes.formBox}>
        <h2 className={classes.title}>Register for nGoDONATE</h2>

        {error && <p className={classes.error}><FiAlertCircle style={{marginRight: '5px'}}/>{error}</p>}

        {!gemWalletChecked && (
            <div className={classes.formGroup} style={{ textAlign: 'center', padding: '20px 0' }}>
                <FiLoader className={classes.spinner} style={{ fontSize: '1.5em', color: '#0D253F', animation: 'spin 1s linear infinite' }}/>
                <p style={{color: '#34495E', marginTop: '10px'}}>{loadingMessage || "Checking GemWallet status..."}</p>
            </div>
        )}

        {gemWalletChecked && !gemWalletInstalled && (
            <div className={classes.formGroup} style={{ textAlign: 'center', padding: '20px', border: '1px dashed #0D253F', borderRadius: '8px', backgroundColor: 'rgba(13, 37, 63, 0.03)' }}>
                <FiDownloadCloud style={{ fontSize: '2em', color: '#0D253F', marginBottom: '10px' }}/>
                <p style={{color: '#0D253F', marginBottom: '15px', fontWeight: 500}}>GemWallet Extension Required</p>
                <a href={GEMWALLET_INSTALL_URL} target="_blank" rel="noopener noreferrer" className={classes.button} style={{backgroundColor: '#007bff', width: 'auto'}}>
                    Install GemWallet
                </a>
                <p style={{color: '#34495E', fontSize: '0.8em', marginTop: '15px'}}>After installing, please <button onClick={() => window.location.reload()} style={{background:'none', border:'none', color:'#007bff', textDecoration:'underline', cursor:'pointer', padding:0}}>refresh this page</button>.</p>
            </div>
        )}

        {gemWalletChecked && gemWalletInstalled && !gemWalletAddress && (
            <div className={classes.formGroup} style={{ textAlign: 'center', marginBottom: '25px' }}>
                <button
                    type="button"
                    onClick={handleConnectGemWallet}
                    className={classes.button}
                    disabled={gemWalletLoading}
                    style={{ backgroundColor: '#007bff', width: 'auto', padding: '12px 25px' }}
                >
                    {gemWalletLoading ? <FiLoader className={classes.spinner} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} /> : null}
                    {gemWalletLoading ? loadingMessage : "Connect Your GemWallet"}
                </button>
                <p style={{color: '#34495E', fontSize: '0.85em', marginTop: '10px'}}>You'll need to connect your wallet to proceed with registration.</p>
            </div>
        )}

        {gemWalletAddress && (
            <div className={classes.formGroup} style={{ textAlign: 'center', marginBottom: '20px', padding: '15px', border: '1px solid #4CAF50', borderRadius: '8px', backgroundColor: '#e8f5e9'}}>
                <FiCheckCircle style={{ fontSize: '1.5em', color: '#4CAF50', marginBottom: '8px' }}/>
                <p style={{color: '#388E3C', fontWeight: '500', margin: '0 0 5px 0'}}>GemWallet Connected!</p>
                <p style={{ fontSize: '0.8em', wordBreak: 'break-all', margin: '0', color: '#555' }}>Address: {gemWalletAddress}</p>
            </div>
        )}

        {gemWalletInstalled && gemWalletAddress && (
          <>
            <div className={classes.userTypeToggle}>
              <button
                className={`${classes.toggleButton} ${userType === 'donor' ? classes.active : ''}`}
                onClick={() => setUserType('donor')}
                disabled={loading}>
                I'm a Donor
              </button>
              <button
                className={`${classes.toggleButton} ${userType === 'nonprofit' ? classes.active : ''}`}
                onClick={() => setUserType('nonprofit')}
                disabled={loading}>
                I'm a Nonprofit
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {userType === 'donor' ? renderDonorFieldsJsx : renderNonprofitFieldsJsx}

              <div className={classes.formGroup}>
                <label htmlFor="email" className={classes.label}>Email Address</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={classes.input} autoComplete="email" disabled={loading}/>
              </div>
              <div className={classes.formGroup}>
                <label htmlFor="password" className={classes.label}>Password (min. 6 characters)</label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={classes.input} autoComplete="new-password" disabled={loading}/>
              </div>
              <div className={classes.formGroup}>
                <label htmlFor="confirmPassword" className={classes.label}>Confirm Password</label>
                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={classes.input} autoComplete="new-password" disabled={loading}/>
              </div>

              <button type="submit" disabled={loading || !gemWalletAddress} className={classes.button}>
                {loading && !loadingMessage.includes("GemWallet") ? (
                  <>
                    <FiLoader className={classes.spinner} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                    {loadingMessage || 'Processing...'}
                  </>
                ) : `Complete Registration`}
              </button>
            </form>
          </>
        )}
        
        <div style={{marginTop: '20px'}}>
            <p className={classes.linkText}>
            Already have an account? <Link to="/login">Log In</Link>
            </p>
            <Link to="/" className={classes.backLink}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;