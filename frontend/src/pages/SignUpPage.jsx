// src/pages/SignupPage.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // Import ethers
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import classes from './AdminLoginPage.module.css';
import { FiLoader, FiAlertCircle, FiCheckCircle, FiDownloadCloud } from 'react-icons/fi';

import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from '../firebase/config';

// MetaMask Install URL
const METAMASK_INSTALL_URL = "https://metamask.io/download/";

const SignupPage = () => {
  // --- State variables remain mostly the same, just renamed for clarity ---
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

  // --- Renamed State Variables for MetaMask ---
  const [metaMaskInstalled, setMetaMaskInstalled] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);

  const { signup, currentUser, currentUserProfile } = useAuth();
  const navigate = useNavigate();

  // --- useEffect to check for MetaMask installation ---
  useEffect(() => {
    async function checkInstallation() {
      setWalletLoading(true);
      handleStepChange("Checking MetaMask status...");
      try {
        // The presence of window.ethereum indicates an Ethereum-compatible browser wallet is installed.
        const installed = typeof window.ethereum !== 'undefined';
        setMetaMaskInstalled(installed);
        console.log("MetaMask installed status:", installed);
        if (!installed) {
          handleStepChange("MetaMask not detected.");
        } else {
          handleStepChange("");
        }
      } catch (e) {
        console.error("Error checking MetaMask installation:", e);
        setMetaMaskInstalled(false);
        setError("Could not detect MetaMask. Ensure your browser supports extensions and try refreshing.");
        handleStepChange("");
      } finally {
        setWalletLoading(false);
        setWalletChecked(true);
      }
    }
    checkInstallation();
  }, []);

  const handleStepChange = (message) => {
    setLoadingMessage(message || '');
  };

  // --- The core logic to connect to MetaMask ---
  const handleConnectWallet = async () => {
    if (!metaMaskInstalled) {
      setError("Please install MetaMask first.");
      return;
    }

    setError('');
    setWalletLoading(true);
    handleStepChange("Please approve connection in MetaMask...");

    try {
      // 1. Create a provider
      const provider = new ethers.BrowserProvider(window.ethereum);

      // 2. Request account access. This is where the user interaction happens.
      const accounts = await provider.send("eth_requestAccounts", []);
      const newAddress = accounts[0];

      if (!newAddress) {
        // This case is unlikely if the above line doesn't throw, but good for safety
        throw new Error("Connection approved, but no address was returned.");
      }

      handleStepChange("Checking network...");

      // 3. Get the current network and check if it's correct
      const network = await provider.getNetwork();
      const chainId = `0x${network.chainId.toString(16)}`;

      const SEPOLIA_CHAIN_ID = '0xaa36a7';

      if (chainId !== SEPOLIA_CHAIN_ID) {
        handleStepChange("Please switch to the Sepolia Testnet...");
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError) {
          // Handle case where user rejects the network switch
          if (switchError.code === 4001) {
            throw new Error("Network switch rejected. Please switch to Sepolia manually in MetaMask.");
          }
          // Handle case where Sepolia isn't added to MetaMask
          if (switchError.code === 4902) {
            throw new Error("Sepolia Testnet is not added to your MetaMask. Please add it manually.");
          }
          throw switchError; // Rethrow other errors
        }
      }

      handleStepChange("Verifying wallet address...");

      // 4. Check if the address is already in use in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("walletAddress", "==", newAddress), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error(`This wallet address is already associated with an account.`);
      }

      // 5. Success! Set the address.
      setWalletAddress(newAddress);
      handleStepChange("MetaMask Ready! You can now complete your registration.");

    } catch (err) {
      console.error('Error during MetaMask connection process:', err);
      let errorMessage = 'An unexpected error occurred.';
      
      // Check for the specific user rejection error code
      if (err.code === 4001 || (err.info && err.info.error && err.info.error.code === 4001)) {
        errorMessage = 'Connection to MetaMask was rejected. Please approve the request to continue.';
      } else {
        errorMessage = err.message || 'Failed to connect wallet.';
      }
      
      setError(errorMessage);
      setWalletAddress(null);
      handleStepChange('');
    } finally {
      setWalletLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password should be at least 6 characters.");

    if (!walletAddress) {
      return setError("Please connect your MetaMask wallet before registering.");
    }

    setError('');
    setLoading(true);
    handleStepChange("Starting registration...");

    let nameToRegister;
    // Pass walletAddress under the key 'walletAddress' to be stored in Firestore
    let additionalData = {
      userType,
      walletAddress: walletAddress
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

        {error && <p className={classes.error}><FiAlertCircle style={{ marginRight: '5px' }} />{error}</p>}

        {/* --- Updated JSX for MetaMask --- */}

        {!walletChecked && (
          <div className={classes.formGroup} style={{ textAlign: 'center', padding: '20px 0' }}>
            <FiLoader className={classes.spinner} style={{ fontSize: '1.5em', color: '#0D253F', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#34495E', marginTop: '10px' }}>{loadingMessage || "Checking MetaMask status..."}</p>
          </div>
        )}

        {walletChecked && !metaMaskInstalled && (
          <div className={classes.formGroup} style={{ textAlign: 'center', padding: '20px', border: '1px dashed #0D253F', borderRadius: '8px', backgroundColor: 'rgba(13, 37, 63, 0.03)' }}>
            <FiDownloadCloud style={{ fontSize: '2em', color: '#0D253F', marginBottom: '10px' }} />
            <p style={{ color: '#0D253F', marginBottom: '15px', fontWeight: 500 }}>MetaMask Extension Required</p>
            <a href={METAMASK_INSTALL_URL} target="_blank" rel="noopener noreferrer" className={classes.button} style={{ backgroundColor: '#007bff', width: 'auto' }}>
              Install MetaMask
            </a>
            <p style={{ color: '#34495E', fontSize: '0.8em', marginTop: '15px' }}>After installing, please <button onClick={() => window.location.reload()} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>refresh this page</button>.</p>
          </div>
        )}

        {walletChecked && metaMaskInstalled && !walletAddress && (
          <div className={classes.formGroup} style={{ textAlign: 'center', marginBottom: '25px' }}>
            <button
              type="button"
              onClick={handleConnectWallet}
              className={classes.button}
              disabled={walletLoading}
              style={{ backgroundColor: '#007bff', width: 'auto', padding: '12px 25px' }}
            >
              {walletLoading ? <FiLoader className={classes.spinner} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} /> : null}
              {walletLoading ? loadingMessage : "Connect Your MetaMask Wallet"}
            </button>
            <p style={{ color: '#34495E', fontSize: '0.85em', marginTop: '10px' }}>You'll need to connect your wallet to proceed with registration.</p>
          </div>
        )}

        {walletAddress && (
          <div className={classes.formGroup} style={{ textAlign: 'center', marginBottom: '20px', padding: '15px', border: '1px solid #4CAF50', borderRadius: '8px', backgroundColor: '#e8f5e9' }}>
            <FiCheckCircle style={{ fontSize: '1.5em', color: '#4CAF50', marginBottom: '8px' }} />
            <p style={{ color: '#388E3C', fontWeight: '500', margin: '0 0 5px 0' }}>MetaMask Connected!</p>
            <p style={{ fontSize: '0.8em', wordBreak: 'break-all', margin: '0', color: '#555' }}>Address: {walletAddress}</p>
          </div>
        )}

        {metaMaskInstalled && walletAddress && (
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
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={classes.input} autoComplete="email" disabled={loading} />
              </div>
              <div className={classes.formGroup}>
                <label htmlFor="password" className={classes.label}>Password (min. 6 characters)</label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={classes.input} autoComplete="new-password" disabled={loading} />
              </div>
              <div className={classes.formGroup}>
                <label htmlFor="confirmPassword" className={classes.label}>Confirm Password</label>
                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={classes.input} autoComplete="new-password" disabled={loading} />
              </div>

              <button type="submit" disabled={loading || !walletAddress} className={classes.button}>
                {loading && !loadingMessage.includes("MetaMask Wallet") ? (
                  <>
                    <FiLoader className={classes.spinner} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                    {loadingMessage || 'Processing...'}
                  </>
                ) : `Complete Registration`}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: '20px' }}>
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