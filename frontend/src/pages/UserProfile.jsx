// src/pages/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDocs, collection, query } from 'firebase/firestore';
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
                // Wallet address is not editable, so it's not needed in formData
            });
        }
    }, [currentUserProfile]);

    // fetch transactions from FastAPI
    useEffect(() => {
        const fetchTransactions = async() => {
            if (!currentUserProfile?.gemWalletAddress) return; // safety check
            setLoadingTransactions(true);
            try{
                // api returns all the normal transactions where the address is either the sender or the reciever 
                // assuming the user can only make transactions and not receive, this should be okay
                const res = await fetch(`http://localhost:8000/latest-transactions?address=${currentUserProfile.gemWalletAddress}`);
                if(!res.ok){
                    throw new Error("Failed to fetch transactions");
                }
                const data = await res.json();
                setTransactions(data.transactions ||[]);
            } catch(err){
                console.error("Error fetching transactions:", err);
            } finally{
                setLoadingTransactions(false);
            }
        };

        fetchTransactions();
    }, []);

    // dummy transactions
    // useEffect(() => {
    //     setTransactions([
    //         {
    //         hash: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    //         from: "0x1234567890abcdef1234567890abcdef12345678",
    //         to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    //         value_ether: "0.5",
    //         blockNumber: "5489213",
    //         timeStamp: "1695209123",
    //         },
    //         {
    //         hash: "0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890",
    //         from: "0xdeaddeaddeaddeaddeaddeaddeaddeaddeadbeef",
    //         to: "0x9876543210fedcba9876543210fedcba98765432",
    //         value_ether: "2.134",
    //         blockNumber: "5489200",
    //         timeStamp: "1695208000",
    //         },
    //         {
    //         hash: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    //         from: "0x1234567890abcdef1234567890abcdef12345678",
    //         to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    //         value_ether: "0.5",
    //         blockNumber: "5489213",
    //         timeStamp: "1695209123",
    //         },
    //         {
    //         hash: "0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890",
    //         from: "0xdeaddeaddeaddeaddeaddeaddeaddeaddeadbeef",
    //         to: "0x9876543210fedcba9876543210fedcba98765432",
    //         value_ether: "2.134",
    //         blockNumber: "5489200",
    //         timeStamp: "1695208000",
    //         },
    //         {
    //         hash: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    //         from: "0x1234567890abcdef1234567890abcdef12345678",
    //         to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    //         value_ether: "0.5",
    //         blockNumber: "5489213",
    //         timeStamp: "1695209123",
    //         },
    //         {
    //         hash: "0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890",
    //         from: "0xdeaddeaddeaddeaddeaddeaddeaddeaddeadbeef",
    //         to: "0x9876543210fedcba9876543210fedcba98765432",
    //         value_ether: "2.134",
    //         blockNumber: "5489200",
    //         timeStamp: "1695208000",
    //         },
    //     ]);
    //     setLoadingTransactions(false);
    // }, []);

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
            if (updateUserProfile) {
                await updateUserProfile(formData.displayName);
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
            <div className={styles.userProfileContainer} style={{ textAlign: 'center', padding: '50px' }}>
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
                                        {/* CHANGED: Point to walletAddress instead of gemWalletAddress */}
                                        {
                                            currentUserProfile?.walletAddress && (
                                                <span className={styles.infoValue}>{currentUserProfile?.walletAddress}</span>
                                            )
                                        }
                                        {/* CHANGED: Check for walletAddress to display the "Not connected" message */}
                                        {!currentUserProfile?.walletAddress && (
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
                                    className={styles.inputField}
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
                <div className={styles.transactionsSection}>
                    <div className={styles.transactionsContainer}>
                        <h3 className={styles.transactionsTitle}>Latest Transactions</h3>
                    </div>
                    {loadingTransactions ? (
                        <p>Loading transactions...</p>
                    ) : transactions.length > 0 ? (
                        <ul className={styles.transactionsList}>
                            {transactions.map(transaction => (
                                <li key={transaction.hash} className={styles.transactionItem}>
                                    <p>
                                        <strong>Hash:</strong>{""}
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${transaction.hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {transaction.hash.slice(0,30)}...
                                        </a>
                                    </p>

                                     <p><strong>From:</strong> {transaction.from}</p>
                                     <p><strong>To:</strong> {transaction.to}</p>
                                     <p><strong>Value:</strong> {transaction.value_ether} ETH</p>
                                     <p><strong>Block:</strong> {transaction.blockNumber}</p>
                                     <p>
                                        <strong>Time:</strong>{" "}
                                        {new Date(transaction.timeStamp * 1000).toLocaleString()}
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