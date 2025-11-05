// src/pages/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDocs, collection, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { API_ENDPOINTS } from '../config/api';
import styles from '../styles/Userprofile.module.css';

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
            if (!currentUserProfile?.walletAddress) return; // safety check
            setLoadingTransactions(true);
            try{
                // api returns all the normal transactions where the address is either the sender or the reciever 
                // assuming the user can only make transactions and not receive, this should be okay
                const res = await fetch(API_ENDPOINTS.latestTransactions(currentUserProfile.walletAddress));
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
            {/* Header / Hero */}
            <div className={styles.heroHeader}>
                <h1 className={styles.heroTitle}>Profile Page</h1>
                <p className={styles.heroSubtitle}>Manage your identity and view recent activity.</p>
            </div>

            <div className={styles.contentWrapper}>
                {/* Profile Information (single wide box) */}
                <div className={styles.profileSection}>
                    <div className={styles.titleContainer}>
                        <div className={styles.titleRow}>
                            <FiUser className={styles.titleIcon} />
                            <h3 className={styles.profileTitle}>Personal Information</h3>
                        </div>
                        <div className={styles.subtitle}>Update your display name and view your wallet address.</div>
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
            </div>
        </div>
    );
};

export default UserProfile;