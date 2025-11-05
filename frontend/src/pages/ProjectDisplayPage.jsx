// src/pages/ProjectDisplayPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiDollarSign, FiCheckCircle, FiClock, FiLoader, FiArrowRightCircle, FiAlertCircle, FiFileText } from 'react-icons/fi';
import classes from '../styles/ProjectDisplayPage.module.css';
// sendPayment from @gemwallet/api is used on the ProjectDonationPage, not directly here.
// import { sendPayment } from '@gemwallet/api';
import { doc, getDoc } from "firebase/firestore";
import { db } from '../firebase/config';
import { ethers } from 'ethers';

import { API_ENDPOINTS } from '../config/api';


const ProjectDisplayPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentUserProfile } = useAuth();
  const [projectData, setProjectData] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [txError, setTxError] = useState(null);

  const [milestones, setMilestones] = useState([]);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [milestonesError, setMilestonesError] = useState(null);
  const [contractBalance, setContractBalance] = useState('0');
  const [totalDonations, setTotalDonations] = useState('0');
  const [displayBalance, setDisplayBalance] = useState('0');
  const [isAnimating, setIsAnimating] = useState(false);
  const [contractDetails, setContractDetails] = useState(null);
  const [verifyingMilestone, setVerifyingMilestone] = useState(null);

  // Slot machine animation effect
  const animateBalance = (targetValue) => {
    const target = parseFloat(targetValue);
    const start = parseFloat(displayBalance);
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 FPS
    const stepDuration = duration / steps;
    const increment = (target - start) / steps;
    
    setIsAnimating(true);
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const currentValue = start + (increment * currentStep);
      
      if (currentStep >= steps) {
        setDisplayBalance(targetValue);
        setIsAnimating(false);
        clearInterval(timer);
      } else {
        setDisplayBalance(currentValue.toFixed(6));
      }
    }, stepDuration);
  };

  // Fetch initial project details from backend API (with IPFS support)
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setProjectError("No project ID provided.");
        setLoadingProject(false);
        return;
      }
      setLoadingProject(true);
      setProjectError(null);
      try {
        // First, try to fetch from backend API (includes IPFS metadata)
        const response = await fetch(API_ENDPOINTS.getAllProjects);
        const apiData = await response.json();
        
        if (apiData.success) {
          // Find the specific project by ID
          const foundProject = apiData.projects.find(p => p.id === projectId);
          
          if (foundProject) {
            const data = foundProject;

            if (data.eth_wallet_address) {
              data.recipientAddress = data.eth_wallet_address;
            }

            // Log IPFS info if available
            if (data.ipfs_metadata_hash) {
              console.log(`✅ Project has IPFS metadata: ${data.ipfs_metadata_hash}`);
              console.log(`   IPFS URL: ${data.ipfs_url}`);
            }

            setProjectData(data);

            // Set milestones with proper status based on contract state
            if (data.milestones && Array.isArray(data.milestones)) {
              const processedMilestones = data.milestones.map((m, index) => {
                return {
                  ...m,
                  id: m.id || m.name || `milestone-${index}`,
                  status: "Pending" // All milestones start as pending until funded
                };
              });
              setMilestones(processedMilestones);
            } else {
              setMilestones([]);
            }
          } else {
            setProjectError("Project not found.");
            setProjectData(null);
            setMilestones([]);
          }
        } else {
          throw new Error("Failed to fetch projects from backend");
        }
      } catch (error) {
        console.error("Error fetching project details:", error);
        setProjectError("Failed to load project details.");
        setProjectData(null);
        setMilestones([]);
      } finally {
        setLoadingProject(false);
      }
    };
    fetchProject();
  }, [projectId]);

  // Fetch contract details including milestone status
  const fetchContractDetails = useCallback(async (contractAddress) => {
    if (!contractAddress) return;

    try {
      setIsLoadingMilestones(true);
      setMilestonesError(null);
      
      // Fetch contract details from backend
      const response = await fetch(`http://127.0.0.1:8000/projects/project/${contractAddress}/details`);
      if (!response.ok) {
        throw new Error('Failed to fetch contract details');
      }
      
      const data = await response.json();
      if (data.success) {
        setContractDetails(data);
        
        // Use total donations instead of contract balance (so it doesn't decrease when funds are released)
        const totalDonationsEth = data.total_donations_eth.toString();
        setTotalDonations(totalDonationsEth);
        
        // Get contract balance for milestone funding checks (but don't display it)
        const provider = new ethers.BrowserProvider(window.ethereum || new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/38066dfb93954a2cbb7aed144e5dd81b'));
        const balance = await provider.getBalance(contractAddress);
        const balanceEth = ethers.formatEther(balance);
        setContractBalance(balanceEth); // Keep for milestone funding checks
        
        // Trigger slot machine animation with total donations (not contract balance)
        animateBalance(totalDonationsEth);
        
        // Process milestones with actual contract status
        if (data.milestones && Array.isArray(data.milestones)) {
          let cumulativeTarget = 0;
          let firstUnverifiedIndex = -1; // Track first unverified milestone
          
          const processedMilestones = data.milestones.map((milestone, index) => {
            const milestoneAmount = parseFloat(milestone.amount_eth);
            cumulativeTarget += milestoneAmount;
            const currentBalance = parseFloat(balanceEth);
            
            // Determine status based on contract state and funding
            let status = "Pending";
            let canVerify = false;
            
            if (milestone.is_verified) {
              status = "Verified & Released";
            } else {
              // Find first unverified milestone
              if (firstUnverifiedIndex === -1) {
                firstUnverifiedIndex = index;
              }
              
              // Check if this is the first unverified milestone and has enough funding
              if (index === firstUnverifiedIndex && currentBalance >= cumulativeTarget) {
                status = "Funded - Ready for Verification";
                canVerify = true;
              } else if (milestone.is_completed) {
                status = "Completed - Pending Verification";
              } else if (currentBalance >= cumulativeTarget) {
                // Has enough funds but not the first unverified milestone
                status = "Funded - Waiting for Previous Milestone";
              } else if (currentBalance > 0) {
                const fundingProgress = Math.min((currentBalance / cumulativeTarget) * 100, 100);
                if (fundingProgress > 0) {
                  status = "Partially Funded";
                }
              }
            }
            
            return {
              ...milestone,
              id: milestone.name || `milestone-${index}`,
              index: milestone.index,
              status: status,
              cumulativeTarget: cumulativeTarget,
              individualAmount: milestoneAmount,
              is_completed: milestone.is_completed,
              is_verified: milestone.is_verified,
              verification_hash: milestone.verification_hash,
              canVerify: canVerify // Flag to show verify button
            };
          });
          setMilestones(processedMilestones);
        }
      }
    } catch (error) {
      console.error('Error fetching contract details:', error);
      setMilestonesError('Failed to load contract details');
    } finally {
      setIsLoadingMilestones(false);
    }
  }, []);

  // Fetch contract details when project data is loaded
  useEffect(() => {
    if (projectData?.contract_address) {
      fetchContractDetails(projectData.contract_address);
    }
  }, [projectData, fetchContractDetails]);

  const fetchTransactions = useCallback(async (isInitialFetch = false) => {
    // We need the contract address where donations are sent
    if (!projectData?.contract_address) return;
    if (!isInitialFetch && isLoadingTx) return;

    setIsLoadingTx(true);
    setTxError(null);
    const url = API_ENDPOINTS.latestTransactions(projectData.contract_address);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `HTTP error! Status: ${res.status}` }));
        throw new Error(errorData.detail || `HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();

      // The backend now returns a simple list of transactions
      const newTxs = data.transactions || [];

      if (newTxs.length > 0) {
        // Format the Ethereum transaction data
        const formattedTxs = newTxs.map(tx => ({
          hash: tx.hash,
          name: `User (${tx.from.substring(0, 5)}...${tx.from.substring(tx.from.length - 5)})`,
          email: `To: ${(tx.to || 'Contract').substring(0, 8)}...`,
          amount: `${parseFloat(tx.value_ether).toFixed(4)} ETH`,
        }));

        // We are just displaying the latest 5, so no need for complex state updates
        setTransactions(formattedTxs.slice(0, 5));
      } else if (isInitialFetch) {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTxError(error.message || "Failed to fetch transactions.");
    } finally {
      setIsLoadingTx(false);
    }
  }, [isLoadingTx, projectData]);

  useEffect(() => {
    if (projectData) fetchTransactions(true);
  }, [projectData]); // Removed fetchTransactions from dependency array to prevent re-running on every render


  // --- Navigation Handler (This is now correct because projectData has the right field) ---
  const handleNavigateToDonatePage = () => {
    if (projectData && projectData.id) {
      // projectData now contains the 'recipientAddress' field, so this will work.
      navigate(`/donate/project/${projectData.id}`, { state: { project: projectData } });
    } else {
      console.error("Cannot navigate to donation page: projectData or projectData.id is missing.");
      alert("Project details are not fully loaded yet. Please wait and try again.");
    }
  };

  const getMilestoneStatusIcon = (status) => {
    const currentStatus = status ? status.toLowerCase() : "pending";
    if (currentStatus.includes("verified")) return <FiCheckCircle className={`${classes.milestoneIcon} ${classes.completed}`} />;
    if (currentStatus.includes("completed")) return <FiCheckCircle className={`${classes.milestoneIcon} ${classes.inProgress}`} />;
    if (currentStatus === "funded") return <FiCheckCircle className={`${classes.milestoneIcon} ${classes.completed}`} />;
    if (currentStatus === "partially funded") return <FiLoader className={`${classes.milestoneIcon} ${classes.inProgress} ${classes.spinner}`} />;
    return <FiClock className={`${classes.milestoneIcon} ${classes.pending}`} />;
  };

  // Verify milestone and release funds
  const handleVerifyMilestone = async (milestoneIndex, contractAddress) => {
    if (!contractAddress || typeof milestoneIndex !== 'number') {
      alert('Invalid milestone or contract address');
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is required to verify milestones');
      return;
    }

    try {
      setVerifyingMilestone(milestoneIndex);
      
      // Get unsigned transactions from backend (may include completeMilestone + verifyMilestone)
      const response = await fetch(
        `http://127.0.0.1:8000/projects/project/${contractAddress}/verify-milestone/${milestoneIndex}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to prepare verification transaction');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.transactions || data.transactions.length === 0) {
        throw new Error('Invalid response from server');
      }

      // Check if current user is the verifier
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      if (userAddress.toLowerCase() !== data.verifier_address.toLowerCase()) {
        alert(`Only the verifier (${data.verifier_address.slice(0, 6)}...${data.verifier_address.slice(-4)}) can verify milestones`);
        setVerifyingMilestone(null);
        return;
      }

      // Execute transactions in sequence
      let lastReceipt = null;
      for (const txData of data.transactions) {
        const txResponse = await signer.sendTransaction(txData.transaction);
        lastReceipt = await txResponse.wait();
        console.log(`${txData.description} transaction confirmed:`, lastReceipt.hash);
      }
      
      console.log('Milestone verified, funds released:', lastReceipt);
      
      // Refresh contract details
      await fetchContractDetails(contractAddress);
      
    } catch (error) {
      console.error('Error verifying milestone:', error);
      if (error.code === 4001 || (error.info && error.info.error && error.info.error.code === 4001)) {
        alert('Transaction was rejected in MetaMask');
      } else {
        alert(`Failed to verify milestone: ${error.message}`);
      }
    } finally {
      setVerifyingMilestone(null);
    }
  };

  // Check if current user is the verifier
  const isVerifier = () => {
    if (!contractDetails || !currentUserProfile?.walletAddress) return false;
    return currentUserProfile.walletAddress.toLowerCase() === contractDetails.verifier.toLowerCase();
  };

  if (loadingProject) {
    return <div className={classes.pageContainer} style={{ textAlign: 'center', paddingTop: '50px' }}><FiLoader className={classes.spinner} style={{ fontSize: '2em' }} /> <p>Loading project details...</p></div>;
  }
  if (projectError) {
    return <div className={classes.pageContainer} style={{ textAlign: 'center', paddingTop: '50px' }}><FiAlertCircle style={{ fontSize: '2em', color: 'red' }} /> <p>{projectError}</p></div>;
  }
  if (!projectData) {
    return <div className={classes.pageContainer}><p>Project information is unavailable.</p></div>;
  }

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap');
        `}
      </style>
      <div className={classes.pageContainer} style={{ fontFamily: "'Raleway', sans-serif" }}>
      <div className={classes.projectHeader}>
        <h1>{projectData.name || 'Project Help all'}</h1>
        <p className={classes.ngoName}>by {projectData.ngoName || 'Teach for All'}</p>
        <p className={classes.projectDescription}>{projectData.description || 'No description provided.'}</p>
        
        {/* Contract Balance - Clean and simple */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontFamily: "'Raleway', sans-serif"
        }}>
          <div style={{ 
            fontSize: '2.2rem', 
            fontWeight: '700', 
            marginBottom: '0.5rem',
            color: '#1f2937',
            transition: 'all 0.1s ease',
            transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
            textShadow: isAnimating ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
          }}>
            {parseFloat(displayBalance).toFixed(6)} ETH
          </div>
          <div style={{ 
            fontSize: '1rem', 
            color: '#6b7280',
            fontWeight: '500',
            marginBottom: '0.5rem'
          }}>
            {parseFloat(totalDonations) === 0 ? 'No donations received yet' : 'Total funding received'}
          </div>
          {projectData?.contract_address && (
            <div style={{ 
              fontSize: '0.85rem', 
              color: '#9ca3af',
              fontFamily: 'monospace',
              marginTop: '0.5rem'
            }}>
              Contract: {projectData.contract_address.slice(0, 10)}...{projectData.contract_address.slice(-8)}
            </div>
          )}
        </div>
      </div>

      <div className={classes.mainContentGrid}>
        <div className={classes.transactionsPanel}>
          <div className={classes.panelHeader}>
            <h2>Recent Donations</h2>
            {isLoadingTx && !transactions.length && <FiLoader className={classes.txLoadingSpinner} />}
          </div>
          {txError && <p className={classes.txErrorMessage}><FiAlertCircle /> {txError}</p>}
          {!isLoadingTx && transactions.length === 0 && !txError && <p className={classes.noTransactions}>No recent donations.</p>}
          <ul className={classes.transactionList}>
            {transactions.map((tx, index) => (
              <li key={tx.hash || index} className={classes.transactionItem}>
                <div className={classes.txInfo}>
                  <span className={classes.txName}>{tx.name}</span>
                  <span className={classes.txEmail}>{tx.email}</span>
                </div>
                <span className={classes.txAmount}>{tx.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={classes.milestonesPanel}>
          <div className={classes.panelHeader}>
            <h2>Project Milestones</h2>
          </div>
          {/* isLoadingMilestones might still be useful if initial processing takes time, but not for network loading */}
          {isLoadingMilestones && milestones.length === 0 && <FiLoader className={classes.spinner} />}
          {/* milestonesError would now relate to issues processing Firestore data, not fetching from a status API */}
          {milestonesError && <p className={classes.errorMessage}><FiAlertCircle /> {milestonesError}</p>}

          <ul className={classes.milestoneList}>
            {milestones.length > 0 ? (
              milestones.map((milestone) => ( // milestones state already has the fixed statuses
                <li key={milestone.id} // Ensure milestone.id is unique
                  className={`${classes.milestoneItem} ${classes[(milestone.status).toLowerCase().replace(' ', '').replace('&', '').replace('-', '')]}`}>
                  {getMilestoneStatusIcon(milestone.status)}
                  <div className={classes.milestoneInfo}>
                    <h3 className={classes.milestoneTitle}>{milestone.name || "Milestone"}</h3>
                    {milestone.description && <p className={classes.milestoneDetails}>{milestone.description}</p>}
                    {milestone.cumulativeTarget && ( // Show cumulative target for donors
                      <p className={classes.milestoneAmount}>
                        Target: {milestone.cumulativeTarget.toFixed(6)} ETH
                        {milestone.individualAmount && (
                          <span style={{ fontSize: '0.8em', color: '#6b7280', marginLeft: '0.5rem' }}>
                            (+{milestone.individualAmount.toFixed(6)} ETH)
                          </span>
                        )}
                      </p>
                    )}
                    <p className={classes.milestoneStatusText}>Status: {milestone.status}</p>
                    {/* Verify Document Button - Show when milestone is funded and not verified */}
                    {milestone.canVerify && !milestone.is_verified && isVerifier() && (
                      <button
                        onClick={() => handleVerifyMilestone(milestone.index, projectData.contract_address)}
                        disabled={verifyingMilestone === milestone.index}
                        style={{
                          marginTop: '10px',
                          padding: '8px 16px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: verifyingMilestone === milestone.index ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.9em',
                          fontWeight: '500'
                        }}
                      >
                        {verifyingMilestone === milestone.index ? (
                          <>
                            <FiLoader className={classes.spinner} /> Verifying...
                          </>
                        ) : (
                          <>
                            <FiFileText /> Verify Document
                          </>
                        )}
                      </button>
                    )}
                    {milestone.canVerify && !milestone.is_verified && !isVerifier() && (
                      <p style={{ fontSize: '0.85em', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                        Ready for verification by NGO
                      </p>
                    )}
                  </div>
                </li>
              ))
            ) : !loadingProject ? ( // Show "No milestones" only after project data has loaded (or failed)
              <p>No milestones defined for this project.</p>
            ) : null}
          </ul>
          <div className={classes.donate}>
            {/* UPDATED: The disabled check should now look for the Ethereum wallet */}
            <button onClick={handleNavigateToDonatePage} disabled={!projectData || !projectData.contract_address}>
              <FiDollarSign /> Donate to Cause
            </button>
            {(!projectData || !projectData.contract_address) && <p style={{fontSize: '0.8em', color: 'gray'}}>Donations unavailable.</p>}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default ProjectDisplayPage;