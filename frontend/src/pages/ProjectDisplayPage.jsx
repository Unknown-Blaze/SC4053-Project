// src/pages/ProjectDisplayPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { FiDollarSign, FiCheckCircle, FiClock, FiLoader, FiArrowRightCircle, FiAlertCircle } from 'react-icons/fi';
import classes from '../styles/ProjectDisplayPage.module.css';
// sendPayment from @gemwallet/api is used on the ProjectDonationPage, not directly here.
// import { sendPayment } from '@gemwallet/api';
import { doc, getDoc } from "firebase/firestore";
import { db } from '../firebase/config';

const LATEST_TRANSACTIONS_ENDPOINT = 'http://127.0.0.1:8000/transaction/latest-transactions';
// Not using MILESTONE_STATUS_ENDPOINT_BASE for this specific fixed status requirement
// const MILESTONE_STATUS_ENDPOINT_BASE = 'http://127.0.0.1:8000/projects';

const ProjectDisplayPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate(); // Initialize useNavigate
  const [projectData, setProjectData] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState(null);

  // --- Transaction State ---
  const [transactions, setTransactions] = useState([]);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [txError, setTxError] = useState(null);

  // --- Milestone State ---
  // This state will now hold milestones with fixed statuses
  const [milestones, setMilestones] = useState([]);
  // isLoadingMilestones and milestonesError might not be strictly needed if we're not fetching them dynamically anymore
  // but keeping them doesn't hurt for now if you plan to reintroduce dynamic fetching later.
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [milestonesError, setMilestonesError] = useState(null);
  // advancingMilestones and handleRequestMilestoneAdvancement are removed as we're fixing statuses
  // const [advancingMilestones, setAdvancingMilestones] = useState(false);


  // Fetch initial project details from Firestore
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
        const projectDocRef = doc(db, 'charity_projects', projectId);
        const docSnap = await getDoc(projectDocRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setProjectData(data);

          // --- MODIFICATION FOR FIXED MILESTONE STATUSES ---
          if (data.milestones && Array.isArray(data.milestones)) {
            const processedMilestones = data.milestones.map((m, index) => {
              let status = "Pending"; // Default status
              if (index === 0) {
                status = "Completed";
              } else if (index === 1) {
                status = "In Progress";
              }
              // All others will remain 'Pending' by default due to the initial value
              return {
                ...m,
                id: m.id || m.name || `milestone-${index}`, // Ensure a unique key
                status: status
              };
            });
            setMilestones(processedMilestones);
          } else {
            setMilestones([]); // Set to empty array if no milestones in Firestore data
          }
          // --- END MODIFICATION ---

        } else {
          setProjectError("Project not found.");
          setProjectData(null);
          setMilestones([]);
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

  // --- Milestone Fetching Logic is REMOVED/COMMENTED OUT ---
  // We are no longer polling a backend for milestone statuses.
  // The statuses are fixed based on their index from Firestore data.

  // const fetchMilestoneStatuses = useCallback(async () => {
  //   // ...
  // }, [projectId]);

  // useEffect(() => {
  //   if (projectId) {
  //     // fetchMilestoneStatuses(); // No initial fetch needed for dynamic statuses
  //     // const intervalId = setInterval(fetchMilestoneStatuses, 5000); // No polling
  //     // return () => clearInterval(intervalId);
  //   }
  // }, [projectId /*, fetchMilestoneStatuses (removed) */]);

  // handleRequestMilestoneAdvancement is REMOVED as the "Advance" button is also removed/commented out
  // const handleRequestMilestoneAdvancement = async () => { ... };


  // --- Transaction Fetching Logic (existing, ensure it's correct) ---
  const fetchTransactions = useCallback(async (isInitialFetch = false) => {
    if (!projectData) return;
    if (!isInitialFetch && isLoadingTx) return;
    setIsLoadingTx(true);
    setTxError(null);
    const url = new URL(LATEST_TRANSACTIONS_ENDPOINT);
    if (lastTxHash && !isInitialFetch) {
      url.searchParams.append('latest_tx_hash', lastTxHash);
    }
    if (projectData && projectData.eth_wallet_address) {
        url.searchParams.append('account', projectData.eth_wallet_address);
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `HTTP error! Status: ${res.status}` }));
        throw new Error(errorData.detail || `HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      const newTxs = data; // Assuming data is directly the array
      if (newTxs && newTxs.length > 0) {
        const formattedTxs = newTxs.map(txData => {
            const tx = txData.tx || txData.transaction || txData;
            const meta = txData.meta || {};
            let amount = 'N/A';
            if (tx.TransactionType === "Payment") {
              if (typeof tx.Amount === 'string') amount = `${parseFloat(tx.Amount) / 1000000} XRP`;
              else if (typeof tx.Amount === 'object') amount = `${tx.Amount.value} ${tx.Amount.currency}`;
            }
            if (meta.delivered_amount) {
               if (typeof meta.delivered_amount === 'string') amount = `${parseFloat(meta.delivered_amount) / 1000000} XRP (Delivered)`;
               else if (typeof meta.delivered_amount === 'object') amount = `${meta.delivered_amount.value} ${meta.delivered_amount.currency} (Delivered)`;
            }
            return {
              hash: txData.hash || tx.hash, type: tx.TransactionType || 'Unknown',
              account: tx.Account || 'Unknown Source', destination: tx.Destination || 'Unknown Destination',
              amount: amount,
              name: tx.Account ? `User (${tx.Account.substring(0, 5)}...${tx.Account.substring(tx.Account.length - 5)})` : 'Anonymous Donor',
              email: tx.TransactionType === "Payment" ? `To: ${ (tx.Destination || 'Project Wallet').substring(0, 8) }...` : 'Blockchain Interaction',
              timestamp: tx.date ? new Date( (tx.date + 946684800) * 1000).toLocaleString() : new Date().toLocaleString(),
            };
          }).filter(Boolean);
        if (isInitialFetch) setTransactions(formattedTxs.slice(0, 5));
        else setTransactions(prevTxs => [...formattedTxs, ...prevTxs].slice(0, 5));
        if (formattedTxs.length > 0) setLastTxHash(formattedTxs[0].hash);
      } else if (isInitialFetch) {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTxError(error.message || "Failed to fetch transactions.");
    } finally {
      setIsLoadingTx(false);
    }
  }, [lastTxHash, isLoadingTx, projectData]);

  useEffect(() => {
    if (projectData) fetchTransactions(true);
  }, [projectData, fetchTransactions]);

  useEffect(() => {
    if (!projectData) return () => {};
    const intervalId = setInterval(() => fetchTransactions(false), 10000);
    return () => clearInterval(intervalId);
  }, [fetchTransactions, projectData]);


  // --- Navigation Handler for "Donate to Cause" button ---
  const handleNavigateToDonatePage = () => {
    if (projectData && projectData.id) {
      navigate(`/donate/project/${projectData.id}`, { state: { project: projectData } });
    } else {
      console.error("Cannot navigate to donation page: projectData or projectData.id is missing.");
      alert("Project details are not fully loaded yet. Please wait and try again.");
    }
  };

  const getMilestoneStatusIcon = (status) => {
    const currentStatus = status ? status.toLowerCase() : "pending";
    if (currentStatus === "completed") return <FiCheckCircle className={`${classes.milestoneIcon} ${classes.completed}`} />;
    if (currentStatus === "in progress") return <FiLoader className={`${classes.milestoneIcon} ${classes.inProgress} ${classes.spinner}`} />;
    return <FiClock className={`${classes.milestoneIcon} ${classes.pending}`} />;
  };

  if (loadingProject) {
    return <div className={classes.pageContainer} style={{ textAlign: 'center', paddingTop: '50px' }}><FiLoader className={classes.spinner} style={{ fontSize: '2em' }} /> <p>Loading project details...</p></div>;
  }
  if (projectError) {
    return <div className={classes.pageContainer} style={{ textAlign: 'center', paddingTop: '50px' }}><FiAlertCircle style={{ fontSize: '2em', color: 'red' }}/> <p>{projectError}</p></div>;
  }
  if (!projectData) {
    return <div className={classes.pageContainer}><p>Project information is unavailable.</p></div>;
  }

  return (
    <div className={classes.pageContainer}>
      <div className={classes.projectHeader}>
        <h1>{projectData.name || 'Project Help all'}</h1>
        <p className={classes.ngoName}>by {projectData.ngoName || 'Teach for All'}</p>
        <p className={classes.projectDescription}>{projectData.description || 'No description provided.'}</p>
      </div>

      <div className={classes.mainContentGrid}>
        <div className={classes.transactionsPanel}>
          <div className={classes.panelHeader}>
            <h2>Recent Donations</h2>
            {isLoadingTx && !transactions.length && <FiLoader className={classes.txLoadingSpinner} />}
          </div>
          {txError && <p className={classes.txErrorMessage}><FiAlertCircle/> {txError}</p>}
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
            {/* "Advance Next Milestone (Simulate)" button is removed as statuses are fixed */}
          </div>
          {/* isLoadingMilestones might still be useful if initial processing takes time, but not for network loading */}
          {isLoadingMilestones && milestones.length === 0 && <FiLoader className={classes.spinner} /> }
          {/* milestonesError would now relate to issues processing Firestore data, not fetching from a status API */}
          {milestonesError && <p className={classes.errorMessage}><FiAlertCircle/> {milestonesError}</p>}
          
          <ul className={classes.milestoneList}>
            {milestones.length > 0 ? (
              milestones.map((milestone) => ( // milestones state already has the fixed statuses
                <li key={milestone.id} // Ensure milestone.id is unique
                    className={`${classes.milestoneItem} ${classes[(milestone.status).toLowerCase().replace(' ', '')]}`}>
                  {getMilestoneStatusIcon(milestone.status)}
                  <div className={classes.milestoneInfo}>
                    <h3 className={classes.milestoneTitle}>{milestone.name || "Milestone"}</h3>
                    {milestone.description && <p className={classes.milestoneDetails}>{milestone.description}</p>}
                    {milestone.amount && ( // Assuming 'amount' is part of the milestone object from Firestore
                        <p className={classes.milestoneAmount}>
                            Target: {milestone.amount} XRP
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
            <button onClick={handleNavigateToDonatePage} disabled={!projectData || !projectData.eth_wallet_address}>
              <FiDollarSign /> Donate to Cause
            </button>
            {(!projectData || !projectData.eth_wallet_address) && <p style={{fontSize: '0.8em', color: 'gray'}}>Donations unavailable.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDisplayPage;