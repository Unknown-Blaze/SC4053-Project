// src/components/CreateProject.jsx (or wherever you have this file)
import React, { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from '../firebase/config';
import { ethers } from 'ethers'; // Import ethers for validation
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { 
  PlusIcon, 
  MinusIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

// REMOVED: const XRPL_ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{25,35}$/;

function CharityProjectForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [ethWalletAddress, setEthWalletAddress] = useState("");
  const [ngoName, setNgoName] = useState("");
  const [milestones, setMilestones] = useState([{ name: "", description: "", amount: "" }]);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [stepMessage, setStepMessage] = useState(null);
  const { currentUserProfile, currentUser } = useAuth();

  const onStepChange = (message) => {
    setStepMessage(message);
  };

  useEffect(() => {
    if (currentUserProfile) {
      setNgoName(currentUserProfile.organizationName);
      // Auto-fill email from logged-in user
      if (currentUser && currentUser.email) {
        setContactEmail(currentUser.email);
      }
      // Auto-fill wallet address from user profile
      if (currentUserProfile.walletAddress) {
        setEthWalletAddress(currentUserProfile.walletAddress);
      }
    }
  }, [currentUserProfile, currentUser]);
  
  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addMilestone = () => {
    const newMilestones = [...milestones, { name: "", description: "", amount: "" }];
    setMilestones(newMilestones);
    setCurrentMilestoneIndex(newMilestones.length - 1);
  };

  const removeMilestone = (index) => {
    const newMilestones = milestones.filter((_, i) => i !== index);
    setMilestones(newMilestones);
    if (currentMilestoneIndex >= newMilestones.length) {
      setCurrentMilestoneIndex(Math.max(0, newMilestones.length - 1));
    }
  };

  const nextMilestone = () => {
    setCurrentMilestoneIndex((prev) => Math.min(prev + 1, milestones.length - 1));
  };

  const prevMilestone = () => {
    setCurrentMilestoneIndex((prev) => Math.max(prev - 1, 0));
  };

  // --- UPDATED VALIDATION LOGIC ---
  const validateForm = () => {
    if (!name.trim()) return "Project Name is required.";
    if (!description.trim()) return "Description is required.";
    // Email and wallet address are auto-filled, so no need to validate them
    for (const m of milestones) {
      if (!m.name.trim()) return "Milestone Name is required.";
      if (!m.description.trim()) return "Milestone Description is required.";
      if (!(parseFloat(m.amount) > 0)) return "Milestone Amount must be a positive number.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // Prepare milestone data for backend
      const milestoneData = milestones.map(({ name, description, amount }) => ({
        name,
        description,
        amount: parseFloat(amount),
      }));

      onStepChange("Preparing smart contract deployment...");
      
      console.log('Starting project creation...');
      console.log('Request data:', {
        name,
        description,
        contact_email: contactEmail,
        eth_wallet_address: ethWalletAddress,
        milestones: milestoneData,
        ngoName: ngoName,
        verifier_address: ethWalletAddress
      });
      
      // Call backend to get unsigned transaction
      const response = await fetch(API_ENDPOINTS.createProject, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          contact_email: contactEmail,
          eth_wallet_address: ethWalletAddress,
          milestones: milestoneData,
          ngoName: ngoName,
          verifier_address: ethWalletAddress // Using NGO wallet as verifier for now
        })
      });

      if (!response.ok) {
        console.error('Backend response not ok:', response.status, response.statusText);
        let errorMessage = 'Failed to create project';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          const textResponse = await response.text();
          console.error('Raw response:', textResponse);
          errorMessage = `Server error: ${response.status} - ${textResponse}`;
        }
        throw new Error(errorMessage);
      }

      const projectData = await response.json();
      console.log('Backend response:', projectData);
      console.log('Unsigned transaction:', projectData.unsigned_transaction);
      
      onStepChange("Please sign the transaction in MetaMask...");
      
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Get the provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Ensure the transaction has the correct format
      const tx = {
        ...projectData.unsigned_transaction,
        to: undefined, // Remove 'to' field for contract deployment
        data: projectData.unsigned_transaction.data
      };
      
      console.log('Formatted transaction for MetaMask:', tx);
      
      // Sign and send the transaction
      const txResponse = await signer.sendTransaction(tx);
      
      onStepChange("Waiting for transaction confirmation...");
      
      // Wait for transaction to be mined
      const receipt = await txResponse.wait();
      
      if (!receipt.contractAddress) {
        throw new Error('Contract deployment failed - no contract address received');
      }
      
      onStepChange("Saving project to database...");
      
      // Save project data to Firestore with contract information
      const firestoreData = {
        name,
        description,
        contact_email: contactEmail,
        eth_wallet_address: ethWalletAddress,
        milestones: milestoneData,
        ngoName: ngoName,
        // Contract-related fields
        project_id: `proj_${Date.now()}_${receipt.contractAddress.slice(-8)}`,
        contract_address: receipt.contractAddress,
        transaction_hash: receipt.hash,
        total_amount_eth: milestoneData.reduce((sum, m) => sum + m.amount, 0),
        milestone_count: milestoneData.length,
        status: "deployed",
        created_at: new Date().toISOString()
      };

      // 🆕 Add IPFS metadata hash if available
      if (projectData.ipfs_metadata_hash) {
        firestoreData.ipfs_metadata_hash = projectData.ipfs_metadata_hash;
        firestoreData.ipfs_metadata_uri = projectData.ipfs_metadata_uri;
        console.log(`✅ Project metadata stored on IPFS: ${projectData.ipfs_metadata_uri}`);
      }

      const docRef = await addDoc(collection(db, "charity_projects"), firestoreData);

      let successMessage = `Project created successfully! Contract deployed at: ${receipt.contractAddress}`;
      if (projectData.ipfs_metadata_hash) {
        successMessage += `\n📦 Metadata stored on IPFS: ${projectData.ipfs_metadata_hash}`;
      }
      setSuccess(successMessage);

      // Clear form (but keep auto-filled fields)
      setName("");
      setDescription("");
      setMilestones([{ name: "", description: "", amount: "" }]);
      setStepMessage(null);
    } catch (err) {
      setError("Failed to create project: " + err.message);
      setStepMessage(null);
    }
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap');
        `}
      </style>
      <div style={{ 
        minHeight: '100vh', 
        background: '#f8fafc',
        padding: '2rem 0',
        fontFamily: 'Raleway, sans-serif'
      }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '0 1rem'
      }}>
        {/* Header Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            marginBottom: '0.5rem',
            color: '#1f2937'
          }}>
            Create Your Next Initiative
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#6b7280'
          }}>
            Launch your next charity initiative and set up milestones for funding.
          </p>
        </div>

        {/* Main Form Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <form onSubmit={handleSubmit}>

            {/* Project Details Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <DocumentTextIcon style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                Project Details
              </h2>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Project Name */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
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
                    placeholder="Enter the name of your project."
                  />
                </div>

                {/* Project Description */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Project Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      transition: 'all 0.2s',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    placeholder="Describe your charity project and the impact it will have."
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <UserIcon style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                Contact Information
              </h2>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Email Field */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    Contact Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={contactEmail}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        color: '#64748b',
                        cursor: 'not-allowed'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#10b981',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      ✓ Auto-filled
                    </div>
                  </div>
                </div>

                {/* Wallet Address Field */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    <WalletIcon style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.25rem' }} />
                    Ethereum Wallet Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={ethWalletAddress}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        color: '#64748b',
                        cursor: 'not-allowed',
                        fontFamily: 'monospace'
                      }}
                      placeholder="e.g. 0x1234AbCd..."
                    />
                    <div style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#10b981',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      ✓ Auto-filled
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CurrencyDollarIcon style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                  Funding Milestones
                </h2>
                <button
                  type="button"
                  onClick={addMilestone}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <PlusIcon style={{ width: '20px', height: '20px' }} />
                  Add Milestone
                </button>
              </div>

              {/* Milestone Carousel */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '15px',
                padding: '1.5rem',
                border: '2px solid #e2e8f0',
                position: 'relative',
                minHeight: '300px'
              }}>
                {/* Milestone Navigation */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <button
                    type="button"
                    onClick={prevMilestone}
                    disabled={currentMilestoneIndex === 0}
                    style={{
                      background: currentMilestoneIndex === 0 ? '#e5e7eb' : '#3b82f6',
                      color: currentMilestoneIndex === 0 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: currentMilestoneIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    ←
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Milestone</span>
                    <span style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '600', 
                      color: '#374151' 
                    }}>
                      {currentMilestoneIndex + 1} of {milestones.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={nextMilestone}
                    disabled={currentMilestoneIndex === milestones.length - 1}
                    style={{
                      background: currentMilestoneIndex === milestones.length - 1 ? '#e5e7eb' : '#3b82f6',
                      color: currentMilestoneIndex === milestones.length - 1 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: currentMilestoneIndex === milestones.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    →
                  </button>
                </div>

                {/* Current Milestone Form */}
                <div style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontWeight: '500', 
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontSize: '0.95rem'
                      }}>
                        Milestone Name *
                      </label>
                      <input
                        type="text"
                        value={milestones[currentMilestoneIndex]?.name || ''}
                        onChange={(e) =>
                          handleMilestoneChange(currentMilestoneIndex, "name", e.target.value)
                        }
                        required
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
                        placeholder="e.g., Phase 1: Initial Setup"
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
                        Milestone Description *
                      </label>
                      <textarea
                        value={milestones[currentMilestoneIndex]?.description || ''}
                        onChange={(e) =>
                          handleMilestoneChange(currentMilestoneIndex, "description", e.target.value)
                        }
                        required
                        rows={3}
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
                        placeholder="Describe what this milestone will achieve."
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
                        Funding Amount (ETH) *
                      </label>
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={milestones[currentMilestoneIndex]?.amount || ''}
                        onChange={(e) =>
                          handleMilestoneChange(currentMilestoneIndex, "amount", e.target.value)
                        }
                        required
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
                        placeholder="0.5"
                      />
                    </div>
                  </div>

                  {/* Remove Milestone Button */}
                  {milestones.length > 1 && (
                    <div style={{ 
                      marginTop: '1rem', 
                      display: 'flex', 
                      justifyContent: 'flex-end' 
                    }}>
                      <button
                        type="button"
                        onClick={() => removeMilestone(currentMilestoneIndex)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#fecaca'}
                        onMouseOut={(e) => e.target.style.background = '#fee2e2'}
                      >
                        <MinusIcon style={{ width: '16px', height: '16px' }} />
                        Remove Milestone
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem 3rem',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)';
                }}
              >
                Submit Project for Review
              </button>
              
              {/* Error Message - Positioned below submit button */}
              {error && (
                <div style={{
                  marginTop: '1.5rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '1rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  maxWidth: '500px',
                  margin: '1.5rem auto 0'
                }}>
                  <div style={{ width: '20px', height: '20px', background: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>!</div>
                  {error}
                </div>
              )}

              {/* Step Message - Positioned below submit button */}
              {stepMessage && (
                <div style={{
                  marginTop: '1.5rem',
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  color: '#1d4ed8',
                  padding: '1rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  maxWidth: '500px',
                  margin: '1.5rem auto 0'
                }}>
                  <div style={{ width: '20px', height: '20px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>⏳</div>
                  {stepMessage}
                </div>
              )}

              {/* Success Message - Positioned below submit button */}
              {success && (
                <div style={{
                  marginTop: '1.5rem',
                  background: '#d1fae5',
                  border: '1px solid #a7f3d0',
                  color: '#059669',
                  padding: '1rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  maxWidth: '500px',
                  margin: '1.5rem auto 0'
                }}>
                  <CheckIcon style={{ width: '20px', height: '20px' }} />
                  {success}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}

export default CharityProjectForm;