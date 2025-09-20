// src/pages/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDocs, collection, query } from 'firebase/firestore'; // Removed unused where, orderBy
import { db } from '../firebase/config';
import styles from './UserProfile.module.css';
import { Link } from 'react-router-dom';

const UserProfile = () => {
    const { currentUserProfile, updateUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [formData, setFormData] = useState({ displayName: '' });
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    useEffect(() => {
        if (currentUserProfile) {
            setFormData({
                displayName: currentUserProfile.displayName || ''
                // No need to set wallet address in formData as it's not directly editable here
            });
        }
    }, [currentUserProfile]);

    useEffect(() => {
        const loadProjects = async () => {
            setLoadingProjects(true);
            try {
                const projectsRef = collection(db, 'charity_projects');
                const q = query(projectsRef);
                const querySnapshot = await getDocs(q);
                const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProjects(projectsData);
            } catch (error) {
                console.error('Error fetching projects:', error);
            } finally {
                setLoadingProjects(false);
            }
        };
        loadProjects();
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

    const getShortAddress = (addr) => {
        if (!addr) return 'Not set';
        if (addr.length <= 12) return addr;
        return `${addr.slice(0, 6)}......${addr.slice(-6)}`;
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
                                        {expanded ? currentUserProfile?.gemWalletAddress : getShortAddress(currentUserProfile?.gemWalletAddress)}
                                        {currentUserProfile?.gemWalletAddress && currentUserProfile?.gemWalletAddress.length > 12 && (
                                            <button
                                                onClick={() => setExpanded(!expanded)}
                                                className={styles.addressToggleButton}
                                            >
                                                {expanded ? 'Hide' : 'Show full'}
                                            </button>
                                        )}
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

                {/* Project List */}
                <div className={styles.projectsSection}>
                    <div className={styles.titleContainer}>
                        <h3 className={styles.projectsTitle}>All Projects</h3>
                    </div>
                    {loadingProjects ? (
                        <p>Loading projects...</p>
                    ) : projects.length > 0 ? (
                        <ul className={styles.projectsList}>
                            {projects.map(project => (
                                <li key={project.id} className={styles.projectItem}>
                                    <Link to={`/projects/${project.id}`} className={styles.projectLink}>
                                        <div><strong>Name:</strong> {project.name || 'Unnamed Project'}</div>
                                        <div><strong>Description:</strong> {project.description || 'No description available.'}</div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No projects found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;