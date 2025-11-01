// src/pages/ProjectDonationPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useAuth } from '../contexts/AuthContext';
import { FiDollarSign, FiArrowLeft, FiCheckCircle, FiLoader, FiAlertCircle } from 'react-icons/fi';
import classes from '../styles/ProjectDonationPage.module.css';

const PRESET_AMOUNTS = [0.0001, 0.0005, 0.001, 0.0025];

const ProjectDonationPage = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const { currentUserProfile } = useAuth();

  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donationStatus, setDonationStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionId, setTransactionId] = useState(null);
  const [nftMintStatus, setNftMintStatus] = useState(null);
  const [nftTransactionHash, setNftTransactionHash] = useState(null);

  const [project, setProject] = useState(() => location.state?.project || null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [isLoadingProject, setIsLoadingProject] = useState(!location.state?.project);

  useEffect(() => {
    if (location.state?.project) {
      setProject(location.state.project);
      fetchProjectDetails(location.state.project.contract_address);
    }
  }, [location.state]);

  const fetchProjectDetails = async (contractAddress) => {
    try {
      setIsLoadingProject(true);
      const response = await fetch(
        `http://localhost:8000/projects/project/${contractAddress}/details`
      );
      const data = await response.json();
      
      if (data.success) {
        setProjectDetails(data);
      }
      setIsLoadingProject(false);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setIsLoadingProject(false);
    }
  };

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

  // Determine which milestone this donation is for
  const getCurrentMilestone = () => {
    if (!projectDetails || !projectDetails.milestones) {
      return { name: "General Support", index: 0 };
    }

    // Find the first incomplete/unverified milestone
    const currentMilestone = projectDetails.milestones.find(
      m => !m.is_verified
    );

    return currentMilestone 
      ? { name: currentMilestone.name, index: currentMilestone.index }
      : { name: projectDetails.milestones[0].name, index: 0 };
  };

  const mintNFTCertificate = async (donationTxHash, donationAmount) => {
    try {
      setNftMintStatus('minting');
      console.log("Minting NFT certificate for donation:", donationTxHash);

      const milestone = getCurrentMilestone();

      const response = await fetch(
        `http://localhost:8000/projects/project/${project.contract_address}/mint-certificate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            donor_address: currentUserProfile.walletAddress,
            project_name: project.name,
            milestone_name: milestone.name,  // PASS milestone name
            donation_amount: parseFloat(donationAmount),
            transaction_hash: donationTxHash
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log("NFT minted successfully:", data);
        setNftMintStatus('success');
        setNftTransactionHash(data.nft_details.nft_transaction_hash);
      } else {
        console.error("NFT minting failed:", data);
        setNftMintStatus('failed');
      }
    } catch (error) {
      console.error("Error minting NFT certificate:", error);
      setNftMintStatus('failed');
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();

    console.log("Project data at time of donation:", project);

    // Validation
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
    setNftMintStatus(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      console.log("Contract address:", project.contract_address);
      const code = await provider.getCode(project.contract_address);
      console.log("Contract code length:", code.length);
      
      if (code === "0x") {
        throw new Error("Contract not found at this address. The project may not have been deployed yet.");
      }

      const amountWei = ethers.parseEther(amount.toString());
      console.log("Sending", amount, "ETH to contract:", project.contract_address);
      
      const txResponse = await signer.sendTransaction({
        to: project.contract_address,
        value: amountWei
      });

      setTransactionId(txResponse.hash);
      
      // Wait for confirmation
      const receipt = await txResponse.wait();
      console.log("Donation confirmed:", receipt);

      // SUCCESS - Now mint NFT certificate
      setDonationStatus('success');
      
      // Automatically mint NFT certificate
      await mintNFTCertificate(txResponse.hash, amount);

    } catch (error) {
      console.error('Donation failed:', error);
      if (error.code === 4001 || (error.info && error.info.error && error.info.error.code === 4001)) {
        setErrorMessage('Transaction was rejected in MetaMask.');
      } else {
        setErrorMessage(error.message || 'An unexpected error occurred.');
      }
      setDonationStatus('error');
    }
  };

  if (isLoadingProject) {
    return (
      <div className={classes.pageContainer} style={{textAlign: 'center', paddingTop: '50px'}}>
        <FiLoader className={classes.spinner} style={{fontSize: '2em', animation: 'spin 1s linear infinite'}} />
        <p style={{marginTop: '10px', color: '#333'}}>Loading project details...</p>
      </div>
    );
  }

  if (!project && !isLoadingProject) {
    return (
      <div className={classes.pageContainer} style={{textAlign: 'center', paddingTop: '50px'}}>
        <FiAlertCircle style={{fontSize: '2em', color: 'red', marginBottom: '10px'}} />
        <p style={{color: '#333'}}>Project not found.</p>
        <Link to="/" className={classes.backLink} style={{marginTop: '20px'}}>Go to Home</Link>
      </div>
    );
  }

  if (donationStatus === 'idle' || donationStatus === 'processing' || donationStatus === 'error') {
    const milestone = getCurrentMilestone();
    
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
            {projectDetails && (
              <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>
                Supporting: <strong>{milestone.name}</strong>
              </p>
            )}
          </div>
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
            <strong>Donation Transaction:</strong>
            <a href={`https://sepolia.etherscan.io/tx/${transactionId}`} target="_blank" rel="noopener noreferrer">
              {`${transactionId.slice(0, 15)}...${transactionId.slice(-15)}`}
            </a>
          </div>

          {/* NFT Minting Status */}
          <div className={classes.nftStatus} style={{marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px'}}>
            <h3 style={{marginBottom: '10px'}}>🎖️ Donation Certificate NFT</h3>
            {nftMintStatus === 'minting' && (
              <p><FiLoader className={classes.spinner} /> Minting your certificate NFT...</p>
            )}
            {nftMintStatus === 'success' && (
              <>
                <p style={{color: 'green'}}>✅ Certificate NFT minted successfully!</p>
                <p style={{fontSize: '0.9em', marginTop: '10px'}}>
                  Your donation certificate NFT has been sent to your wallet.
                </p>
                {nftTransactionHash && (
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${nftTransactionHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{fontSize: '0.85em', display: 'block', marginTop: '10px'}}
                  >
                    View NFT Mint Transaction
                  </a>
                )}
                <Link 
                  to="/nft" 
                  style={{
                    display: 'inline-block',
                    marginTop: '15px',
                    padding: '10px 20px',
                    background: '#4CAF50',
                    color: 'white',
                    borderRadius: '5px',
                    textDecoration: 'none'
                  }}
                >
                  View Your NFT Gallery
                </Link>
              </>
            )}
            {nftMintStatus === 'failed' && (
              <p style={{color: 'orange'}}>⚠️ NFT minting is being processed. Check your wallet later.</p>
            )}
          </div>

          <Link to={`/projects/${project.id || projectId}`} className={classes.backToProjectButton} style={{marginTop: '20px'}}>
            Return to Project Page
          </Link>
        </div>
      </div>
    );
  }

  return null;
};

export default ProjectDonationPage;