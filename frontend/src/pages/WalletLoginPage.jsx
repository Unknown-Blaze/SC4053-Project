// src/pages/WalletLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { FiLoader, FiAlertCircle, FiCheckCircle, FiDownloadCloud } from 'react-icons/fi';
import classes from '../styles/AdminLoginPage.module.css';

const METAMASK_INSTALL_URL = "https://metamask.io/download/";

const WalletLoginPage = () => {
  const [metaMaskInstalled, setMetaMaskInstalled] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    async function checkInstallation() {
      setWalletLoading(true);
      handleStepChange("Checking MetaMask status...");
      try {
        const installed = typeof window.ethereum !== 'undefined';
        setMetaMaskInstalled(installed);
        
        if (installed) {
          // Check if already connected
          const provider = new ethers.BrowserProvider(window.ethereum);
          try {
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
              setWalletAddress(accounts[0].address);
              handleStepChange("Wallet already connected!");
            }
          } catch (e) {
            // Not connected, that's fine
          }
        }
      } catch (e) {
        console.error("Error checking MetaMask:", e);
        setMetaMaskInstalled(false);
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

  const handleConnectWallet = async () => {
    if (!metaMaskInstalled) {
      setError("Please install MetaMask first.");
      return;
    }

    setError('');
    setWalletLoading(true);
    handleStepChange("Please approve connection in MetaMask...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const newAddress = accounts[0];

      if (!newAddress) {
        throw new Error("Connection approved, but no address was returned.");
      }

      handleStepChange("Checking network...");
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
          if (switchError.code === 4001) {
            throw new Error("Network switch rejected. Please switch to Sepolia manually in MetaMask.");
          }
          if (switchError.code === 4902) {
            throw new Error("Sepolia Testnet is not added to your MetaMask. Please add it manually.");
          }
          throw switchError;
        }
      }

      setWalletAddress(newAddress);
      handleStepChange("MetaMask Connected! Redirecting...");
      
      // Redirect to appropriate page based on wallet
      setTimeout(() => {
        navigate('/dashboard'); // or wherever you want to redirect
      }, 1000);

    } catch (err) {
      console.error('Error during MetaMask connection:', err);
      let errorMessage = 'An unexpected error occurred.';
      
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

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className={classes.pageContainer}>
      <div className={classes.formBox}>
        <h2 className={classes.title}>Connect Your Wallet</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Connect your MetaMask wallet to access nGoDONATE
        </p>

        {error && <p className={classes.error}><FiAlertCircle style={{ marginRight: '5px' }} />{error}</p>}

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
            <p style={{ color: '#34495E', fontSize: '0.8em', marginTop: '15px' }}>
              After installing, please <button onClick={() => window.location.reload()} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>refresh this page</button>.
            </p>
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
            <p style={{ color: '#34495E', fontSize: '0.85em', marginTop: '10px' }}>
              You'll need to connect your wallet to proceed.
            </p>
          </div>
        )}

        {walletAddress && (
          <div className={classes.formGroup} style={{ textAlign: 'center', marginBottom: '20px', padding: '15px', border: '1px solid #4CAF50', borderRadius: '8px', backgroundColor: '#e8f5e9' }}>
            <FiCheckCircle style={{ fontSize: '1.5em', color: '#4CAF50', marginBottom: '8px' }} />
            <p style={{ color: '#388E3C', fontWeight: '500', margin: '0 0 5px 0' }}>MetaMask Connected!</p>
            <p style={{ fontSize: '0.8em', wordBreak: 'break-all', margin: '0', color: '#555' }}>Address: {walletAddress}</p>
            <p style={{ fontSize: '0.8em', margin: '10px 0 0 0', color: '#666' }}>{loadingMessage}</p>
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p className={classes.linkText}>
            New to nGoDONATE? <button onClick={handleSignUp} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}>Sign Up</button>
          </p>
          <button onClick={() => navigate('/')} className={classes.backLink} style={{ background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', marginTop: '10px' }}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletLoginPage;
