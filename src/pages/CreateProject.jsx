import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from '../firebase/config';

const XRPL_ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{25,35}$/;

function CharityProjectForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [xrplWallet, setXrplWallet] = useState("");
  const [milestones, setMilestones] = useState([{ description: "", amount: "" }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { description: "", amount: "" }]);
  };

  const removeMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!name.trim()) return "Name is required.";
    if (!description.trim()) return "Description is required.";
    if (!contactEmail.trim() || !/\S+@\S+\.\S+/.test(contactEmail))
      return "Valid email is required.";
    if (!XRPL_ADDRESS_REGEX.test(xrplWallet))
      return "Invalid XRPL wallet address format.";
    for (const m of milestones) {
      if (!m.description.trim()) return "Milestone description is required.";
      if (!(parseFloat(m.amount) > 0)) return "Milestone amount must be positive.";
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
      const docRef = await addDoc(collection(db, "charity_projects"), {
        name,
        description,
        contact_email: contactEmail,
        xrpl_wallet: xrplWallet,
        milestones: milestones.map(({ description, amount }) => ({
          description,
          amount: parseFloat(amount),
        })),
      });

      setSuccess(`Charity project saved! Document ID: ${docRef.id}`);

      // Clear form
      setName("");
      setDescription("");
      setContactEmail("");
      setXrplWallet("");
      setMilestones([{ description: "", amount: "" }]);
    } catch (err) {
      setError("Failed to save project: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "auto" }}>
      <h2>Submit Charity Project</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <label>
        Name:
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label>
        Description:
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

      <label>
        XRPL Wallet Address:
        <input
          type="text"
          value={xrplWallet}
          onChange={(e) => setXrplWallet(e.target.value)}
          required
          placeholder="e.g. rEXAMPLExxxxxxxxxxxxxxxxxxxxxxxx"
        />
      </label>

      <h3>Milestones</h3>
      {milestones.map((m, index) => (
        <div
          key={index}
          style={{ marginBottom: 10, border: "1px solid #ccc", padding: 10 }}
        >
          <label>
            Description:
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
            Amount:
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={m.amount}
              onChange={(e) =>
                handleMilestoneChange(index, "amount", e.target.value)
              }
              required
            />
          </label>
          {milestones.length > 1 && (
            <button type="button" onClick={() => removeMilestone(index)}>
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addMilestone}>
        Add Milestone
      </button>

      <br />
      <button type="submit" style={{ marginTop: 20 }}>
        Submit Project
      </button>
    </form>
  );
}

export default CharityProjectForm;