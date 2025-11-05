// src/pages/ProjectDisplayPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiDollarSign, FiCheckCircle, FiClock, FiLoader, FiArrowRightCircle, FiAlertCircle } from 'react-icons/fi';
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

  // Function to check contract balance and update milestone statuses
  const checkContractStatus = useCallback(async (projectData) => {
    if (!projectData?.contract_address) return;

    try {
      setIsLoadingMilestones(true);
      
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        console.log('MetaMask not available for contract interaction');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get contract balance
      const balance = await provider.getBalance(projectData.contract_address);
      const balanceEth = ethers.formatEther(balance);
      setContractBalance(balanceEth);

      // Trigger slot machine animation
      animateBalance(balanceEth);

      // If we have the contract ABI, we can get more detailed info
      // For now, just show the balance
      console.log(`Contract balance: ${balanceEth} ETH`);
      
      // Update milestone statuses based on funding
      if (projectData.milestones && Array.isArray(projectData.milestones)) {
        let cumulativeTarget = 0;
        const updatedMilestones = projectData.milestones.map((milestone, index) => {
          const milestoneAmount = parseFloat(milestone.amount);
          const currentBalance = parseFloat(balanceEth);
          
          // Calculate cumulative target for this milestone
          cumulativeTarget += milestoneAmount;
          
          let status = "Pending";
          let fundingProgress = 0;
          
          // Check if current balance meets the cumulative target for this milestone
          if (currentBalance >= cumulativeTarget) {
            status = "Funded";
            fundingProgress = 100;
          } else if (currentBalance > 0) {
            // Calculate funding progress towards cumulative target
            fundingProgress = Math.min((currentBalance / cumulativeTarget) * 100, 100);
            if (fundingProgress >= 100) {
              status = "Funded";
            } else if (fundingProgress > 0) {
              status = "Partially Funded";
            } else {
              status = "Pending";
            }
          }
          
          return {
            ...milestone,
            id: milestone.id || milestone.name || `milestone-${index}`,
            status: status,
            fundingProgress: fundingProgress,
            cumulativeTarget: cumulativeTarget, // Show cumulative target to donors
            individualAmount: milestoneAmount // Keep original amount for reference
          };
        });
        setMilestones(updatedMilestones);
      }
      
    } catch (error) {
      console.error('Error checking contract status:', error);
      setMilestonesError('Failed to check contract funding status');
    } finally {
      setIsLoadingMilestones(false);
    }
  }, []);

  // Check contract status when project data is loaded
  useEffect(() => {
    if (projectData?.contract_address) {
      checkContractStatus(projectData);
    }
  }, [projectData, checkContractStatus]);

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
    if (currentStatus === "funded") return <FiCheckCircle className={`${classes.milestoneIcon} ${classes.completed}`} />;
    if (currentStatus === "partially funded") return <FiLoader className={`${classes.milestoneIcon} ${classes.inProgress} ${classes.spinner}`} />;
    return <FiClock className={`${classes.milestoneIcon} ${classes.pending}`} />;
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
            fontWeight: '500'
          }}>
            {contractBalance === '0' ? 'No donations received yet' : 'Total funding received'}
          </div>
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
                  className={`${classes.milestoneItem} ${classes[(milestone.status).toLowerCase().replace(' ', '')]}`}>
                  {getMilestoneStatusIcon(milestone.status)}
                  <div className={classes.milestoneInfo}>
                    <h3 className={classes.milestoneTitle}>{milestone.name || "Milestone"}</h3>
                    {milestone.description && <p className={classes.milestoneDetails}>{milestone.description}</p>}
                    {milestone.cumulativeTarget && ( // Show cumulative target for donors
                      <p className={classes.milestoneAmount}>
                        Target: {milestone.cumulativeTarget.toFixed(6)} ETH
                        {milestone.individualAmount && (
                          <span style={{ fontSize: '0.8em', color: '#6b7280', marginLeft: '0.5rem' }}>
                            (+{milestone.individualAmount} ETH)
                          </span>
                        )}
                      </p>
                    )}
                    <p className={classes.milestoneStatusText}>Status: {milestone.status}</p>
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