// src/components/CreateProject.jsx (or wherever you have this file)

import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from '../firebase/config';
import { ethers } from 'ethers'; // Import ethers for validation

// REMOVED: const XRPL_ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{25,35}$/;

function CharityProjectForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  // CHANGED: State renamed for clarity
  const [ethWalletAddress, setEthWalletAddress] = useState("");
  const [milestones, setMilestones] = useState([{ name: "", description: "", amount: "" }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { name: "", description: "", amount: "" }]);
  };

  const removeMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  // --- UPDATED VALIDATION LOGIC ---
  const validateForm = () => {
    if (!name.trim()) return "Project Name is required.";
    if (!description.trim()) return "Description is required.";
    if (!contactEmail.trim() || !/\S+@\S+\.\S+/.test(contactEmail))
      return "A valid Contact Email is required.";
    // Use ethers.js to check for a valid Ethereum address
    if (!ethers.isAddress(ethWalletAddress))
      return "Invalid Ethereum wallet address format. It must be a 42-character hex string starting with '0x'.";
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
      // --- SAVE TO FIRESTORE WITH CORRECT ETHEREUM FIELD NAME ---
      const docRef = await addDoc(collection(db, "charity_projects"), {
        name,
        description,
        contact_email: contactEmail,
        // CHANGED: Field name is now eth_wallet_address
        eth_wallet_address: ethWalletAddress,
        milestones: milestones.map(({ name, description, amount }) => ({
          name,
          description,
          amount: parseFloat(amount),
        })),
      });

      setSuccess(`Charity project saved successfully! Document ID: ${docRef.id}`);

      // Clear form
      setName("");
      setDescription("");
      setContactEmail("");
      setEthWalletAddress("");
      setMilestones([{ name: "", description: "", amount: "" }]);
    } catch (err) {
      setError("Failed to save project to the database: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "auto", display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h2>Submit a New Charity Project</h2>
      {error && <p style={{ color: "red", border: '1px solid red', padding: '10px', borderRadius: '5px' }}>{error}</p>}
      {success && <p style={{ color: "green", border: '1px solid green', padding: '10px', borderRadius: '5px' }}>{success}</p>}

      <label>
        Project Name:
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label>
        Project Description:
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>

      <label>
        Contact Email:
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
        />
      </label>

      {/* --- UPDATED WALLET ADDRESS FIELD --- */}
      <label>
        Ethereum Wallet Address (for receiving donations):
        <input
          type="text"
          value={ethWalletAddress}
          onChange={(e) => setEthWalletAddress(e.target.value)}
          required
          placeholder="e.g. 0x1234AbCd..."
        />
      </label>

      <h3>Milestones</h3>
      {milestones.map((m, index) => (
        <div
          key={index}
          style={{ marginBottom: 10, border: "1px solid #ccc", padding: 10, borderRadius: '5px' }}
        >
          <label>
            Milestone Name:
            <input
              type="text"
              value={m.name}
              onChange={(e) =>
                handleMilestoneChange(index, "name", e.target.value)
              }
              required
            />
          </label>
          <label>
            Milestone Description:
            <input
              type="text"
              value={m.description}
              onChange={(e) =>
                handleMilestoneChange(index, "description", e.target.value)
              }
              required
            />
          </label>
          <label>
            Amount (ETH):
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={m.amount}
              onChange={(e) =>
                handleMilestoneChange(index, "amount", e.target.value)
              }
              required
            />
          </label>
          {milestones.length > 1 && (
            <button type="button" onClick={() => removeMilestone(index)}>
              Remove Milestone
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addMilestone}>
        Add Another Milestone
      </button>

      <br />
      <button type="submit" style={{ marginTop: 20, padding: '10px', cursor: 'pointer' }}>
        Submit Project for Review
      </button>
    </form>
  );
}

export default CharityProjectForm;