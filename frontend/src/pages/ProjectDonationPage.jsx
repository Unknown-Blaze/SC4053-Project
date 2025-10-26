// src/pages/ProjectDonationPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ethers } from 'ethers'; // Import ethers
import { useAuth } from '../contexts/AuthContext'; // Import useAuth to get user info
import { FiDollarSign, FiArrowLeft, FiCheckCircle, FiLoader, FiAlertCircle } from 'react-icons/fi';
import classes from '../styles/ProjectDonationPage.module.css';

// NOTE: Your project data MUST now include the contract address where donations are sent.
// For example: { id: '1', name: '...', contract_address: '0x...' }
const MOCK_PROJECT_DETAILS = {
  '1': {
    name: "Clean Water Initiative - Rural Village A",
    ngoName: "AquaHope Foundation",
    contract_address: "0x99b1080004758b9913fd888454c446b757672175" // Contract address for donations
  },
  '2': {
    name: "School Supplies for Underprivileged Children",
    ngoName: "LearnForward Org",
    contract_address: "0x99b1080004758b9913fd888454c446b757672175"
  }
};

const PRESET_AMOUNTS = [0.0001, 0.0005, 0.001, 0.0025]; // Amounts in Ether

const ProjectDonationPage = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const { currentUserProfile } = useAuth(); // Get the logged-in user's profile

  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donationStatus, setDonationStatus] = useState('idle'); // 'idle', 'processing', 'error', 'success'
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionId, setTransactionId] = useState(null); // Will store the transaction hash

  const [project, setProject] = useState(() => location.state?.project || null);
  const [isLoadingProject, setIsLoadingProject] = useState(!location.state?.project);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      // In a real app, you would fetch this from Firestore
      console.log("Fetching mock project details for ID:", projectId);
      setIsLoadingProject(true);
      // Simulate fetch
      setTimeout(() => {
        const projectData = MOCK_PROJECT_DETAILS[projectId];
        if (projectData) {
          setProject({ id: projectId, ...projectData });
        }
        setIsLoadingProject(false);
      }, 500);
    };

    if (!project || (project && project.id !== projectId)) {
      fetchProjectDetails();
    } else if (project && project.id === projectId) {
      setIsLoadingProject(false);
    }
  }, [projectId, location.state, project]);

  const handleAmountClick = (presetValue) => {
    setAmount(presetValue);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
      setAmount(value);
    }
  };

  // --- The NEW, SECURE handleDonate function ---
  const handleDonate = async (e) => {
    e.preventDefault();

    console.log("Project data at time of donation:", project);

    // 1. --- VALIDATION ---
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage("Please enter a valid amount.");
      setDonationStatus('error');
      return;
    }
    if (!currentUserProfile?.walletAddress) {
      setErrorMessage("You must be logged in with a connected wallet to donate.");
      setDonationStatus('error');
      return;
    }
    if (!project?.contract_address) {
      setErrorMessage("This project does not have a valid contract address configured.");
      setDonationStatus('error');
      return;
    }
    if (typeof window.ethereum === 'undefined') {
      setErrorMessage("MetaMask is not installed. Please install it to donate.");
      setDonationStatus('error');
      return;
    }

    setDonationStatus('processing');
    setErrorMessage('');

    try {
      // 2. --- SEND DONATION DIRECTLY TO CONTRACT ---
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Debug: Check if contract exists
      console.log("Contract address:", project.contract_address);
      const code = await provider.getCode(project.contract_address);
      console.log("Contract code length:", code.length);
      
      if (code === "0x") {
        throw new Error("Contract not found at this address. The project may not have been deployed yet.");
      }

      // Convert amount to wei
      const amountWei = ethers.parseEther(amount.toString());
      console.log("Sending", amount, "ETH to contract:", project.contract_address);
      
      // Create transaction to send ETH to the contract
      const txResponse = await signer.sendTransaction({
        to: project.contract_address,
        value: amountWei
        // Let MetaMask handle gas estimation
      });

      setTransactionId(txResponse.hash); // Store the transaction hash
      
      // Optional: Wait for the transaction to be confirmed on the blockchain
      await txResponse.wait();

      // 5. --- SUCCESS ---
      setDonationStatus('success');

    } catch (error) {
      console.error('Donation failed:', error);
      // Check for the specific user rejection error code
      if (error.code === 4001 || (error.info && error.info.error && error.info.error.code === 4001)) {
        setErrorMessage('Transaction was rejected in MetaMask.');
      } else {
        setErrorMessage(error.message || 'An unexpected error occurred.');
      }
      setDonationStatus('error');
    }
  };

  // This loading condition is now more explicit
  if (isLoadingProject) {
    return (
      <div className={classes.pageContainer} style={{textAlign: 'center', paddingTop: '50px'}}>
        <FiLoader className={classes.spinner} style={{fontSize: '2em', animation: 'spin 1s linear infinite'}} />
        <p style={{marginTop: '10px', color: '#333'}}>Loading project details...</p>
      </div>
    );
  }

  if (!project && !isLoadingProject) { // After loading, if project is still null (e.g., not found)
    return (
      <div className={classes.pageContainer} style={{textAlign: 'center', paddingTop: '50px'}}>
        <FiAlertCircle style={{fontSize: '2em', color: 'red', marginBottom: '10px'}} />
        <p style={{color: '#333'}}>Project not found.</p>
        <Link to="/" className={classes.backLink} style={{marginTop: '20px'}}>Go to Home</Link>
      </div>
    );
  }
  
  // The rest of your component's return statement for 'idle', 'processing', 'error', 'success' states
  // This part assumes 'project' is now correctly populated if it exists.

  if (donationStatus === 'idle' || donationStatus === 'processing' || donationStatus === 'error') {
    return (
      <div className={classes.pageContainer}>
        <div className={classes.formContainer}>
          <Link to={`/projects/${project.id || projectId}`} className={classes.backLink}>
            <FiArrowLeft /> Back to Project
          </Link>
          <div className={classes.header}>
            <h3>You are donating to:</h3>
            <h1>{project.name}</h1>
            <p className={classes.ngoName}>by {project.ngoName}</p>
          </div>
          {/* The form now calls the new handleDonate function */}
          <form onSubmit={handleDonate}>
            <label htmlFor="amount" className={classes.label}>Select an amount to donate in ETH.</label>
            <div className={classes.presetGrid}>
              {PRESET_AMOUNTS.map(val => (
                <button
                  key={val}
                  type="button"
                  className={`${classes.presetButton} ${amount === val ? classes.selected : ''}`}
                  onClick={() => handleAmountClick(val)}
                >
                  {val} ETH
                </button>
              ))}
            </div>
            <div className={classes.customAmountWrapper}>
              <span></span>
              <input
                type="text"
                id="amount"
                className={classes.customAmountInput}
                placeholder="Or enter a custom amount..."
                value={customAmount}
                onChange={handleCustomAmountChange}
              />
            </div>
            {donationStatus === 'error' && (
              <div className={classes.statusMessageError}>
                <FiAlertCircle /> {errorMessage}
              </div>
            )}
            <button type="submit" className={classes.donateButton} disabled={donationStatus === 'processing'}>
              {donationStatus === 'processing' ? (
                <><FiLoader className={classes.spinner} /> Processing...</>
              ) : (
                <><FiDollarSign /> Donate Now</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (donationStatus === 'success') {
    return (
      <div className={classes.pageContainer}>
        <div className={`${classes.formContainer} ${classes.successContainer}`}>
          <FiCheckCircle className={classes.successIcon} />
          <h1>Thank You!</h1>
          <p>Your donation to <strong>{project.name}</strong> was successful.</p>
          <p>Your generosity is making a real difference.</p>
          <div className={classes.txDetails}>
            <strong>Transaction Hash:</strong>
            {/* Link to a block explorer like Etherscan for the Sepolia testnet */}
            <a href={`https://sepolia.etherscan.io/tx/${transactionId}`} target="_blank" rel="noopener noreferrer">
              {`${transactionId.slice(0, 10)}...${transactionId.slice(-10)}`}
            </a>
          </div>
          <Link to={`/projects/${project.id || projectId}`} className={classes.backToProjectButton}>
            Return to Project Page
          </Link>
        </div>
      </div>
    );
  }

  return null;
};

export default ProjectDonationPage;