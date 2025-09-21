// src/pages/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDocs, collection, query } from 'firebase/firestore'; // Removed unused where, orderBy
import { db } from '../firebase/config';
import styles from '../styles/UserProfile.module.css'
import { Link } from 'react-router-dom';

const UserProfile = () => {
    const { currentUserProfile, updateUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ displayName: '' });
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    const [transactions, setTransactions] = useState([]);
    const [loadingTransactions, setLoadingTransactions] = useState(true);

    useEffect(() => {
        if (currentUserProfile) {
            setFormData({
                displayName: currentUserProfile.displayName || ''
                // No need to set wallet address in formData as it's not directly editable here
            });
        }
    }, [currentUserProfile]);

    // fetch transactions from FastAPI
    useEffect(() => {
        const fetchTransactions = async() => {
            setLoadingTransactions(true);
            try{
                const res = await fetch("http://localhost:8000/latest-transactions");
                if(!res.ok){
                    throw new Error("Failed to fetch transactions");
                }
                const data = await res.json();
                setTransactions(data.transactions || []);
            } catch(err){
                console.error("Error fetching transactions:", err);
            } finally{
                setLoadingTransactions(false);
            }
        };

        fetchTransactions();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        if (!currentUserProfile || !currentUserProfile.uid) {
            console.error("User profile or UID is missing.");
            return;
        }
        try {
            const userDocRef = doc(db, 'users', currentUserProfile.uid);
            await updateDoc(userDocRef, {
                displayName: formData.displayName,
            });
            // The updateUserProfile in AuthContext should ideally handle updating Firebase Auth displayName
            // and then re-fetch/update currentUserProfile which includes the new displayName.
            // If it only updates Firebase Auth, you might need to manually update context or rely on onAuthStateChanged listener.
            if (updateUserProfile) {
                 // Assuming updateUserProfile updates the context's currentUserProfile correctly
                await updateUserProfile(formData.displayName);
            } else if (currentUserProfile.displayName !== formData.displayName) {
                // Manually update local state if updateUserProfile is not robust enough
                // This is a fallback and ideally AuthContext handles this update propagation
                // For simplicity, we assume AuthContext handles it.
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleCancel = () => {
        setFormData({
            displayName: currentUserProfile?.displayName || ''
        });
        setIsEditing(false);
    };

    // Add a check for loading currentUserProfile to prevent rendering with undefined data
    if (!currentUserProfile) {
        return (
            <div className={styles.userProfileContainer} style={{textAlign: 'center', padding: '50px'}}>
                Loading profile...
            </div>
        );
    }

    return (
        <div className={styles.userProfileContainer}>
            <div className={styles.contentWrapper}>
                {/* Profile Information */}
                <div className={styles.profileSection}>
                    <div className={styles.titleContainer}>
                        <h3 className={styles.profileTitle}>Personal Information</h3>
                    </div>
                    {!isEditing ? (
                        <>
                            <div className={styles.profileInfo}>
                                <div className={styles.infoItem}>
                                    <strong className={styles.infoLabel}>Name:</strong>
                                    <span className={styles.infoValue}>{currentUserProfile?.displayName || 'Not set'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong className={styles.infoLabel}>Wallet Address:</strong>
                                    <span className={styles.infoValue}>
                                        {/* MODIFIED HERE: xrplAddress -> gemWalletAddress */}
                                        {
                                            currentUserProfile?.gemWalletAddress && (
                                                <span className={styles.infoValue}>{currentUserProfile?.gemWalletAddress}</span>
                                            )
                                        }
                                        {/* Display message if address is not set */}
                                        {!currentUserProfile?.gemWalletAddress && (
                                            <span style={{ fontStyle: 'italic', color: '#7f8c8d' }}> (Not connected)</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                                Edit Profile
                            </button>
                        </>
                    ) : (
                        <div className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label htmlFor="displayName">Name:</label>
                                <input
                                    type="text"
                                    id="displayName"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleInputChange}
                                    className={styles.inputField} // Assuming you have a class for inputs
                                />
                            </div>
                            <div className={styles.formActions}>
                                <button className={styles.saveButton} onClick={handleSave}>
                                    Save
                                </button>
                                <button className={styles.cancelButton} onClick={handleCancel}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transactions List (use projects styling) */}
                <div className={styles.projectsSection}>
                    <div className={styles.titleContainer}>
                        <h3 className={styles.projectsTitle}>Latest Transactions</h3>
                    </div>
                    {loadingTransactions ? (
                        <p>Loading transactions...</p>
                    ) : transactions.length > 0 ? (
                        <ul className={styles.projectsList}>
                            {transactions.map(transaction => (
                                <li key={transaction.hash} className={styles.projectItem}>
                                    <p>
                                        <strong>Hash:</strong>{""}
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {transaction.hash.slice(0,10)}...
                                        </a>
                                    </p>

                                     <p><strong>From:</strong> {transaction.from}</p>
                                     <p><strong>To:</strong> {transaction.to}</p>
                                     <p><strong>Value:</strong> {transaction.value_ether} ETH</p>
                                     <p><strong>Block:</strong> {transaction.blockNumber}</p>
                                     <p>
                                        <strong>Time:</strong>{" "}
                                        {new Date(tx.timeStamp * 1000).toLocaleString()}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No transactions found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;