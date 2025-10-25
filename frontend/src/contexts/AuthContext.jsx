// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore"; // Added updateDoc and Firestore query functions

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle fetching profile
    return userCredential;
  };

  // Signup now focuses on Firebase Auth and basic profile creation.
  // Wallet address will be added in a separate step or if provided during this call.
  const signup = async (email, password, displayName, additionalData = {},
                        onStepChange = (message) => console.log(message)
                       ) => {
    let user = null;
    try {
      onStepChange("Checking account status...");
      
      // Check if email exists in both systems
      const emailCheck = await checkEmailExists(email);
      
      if (emailCheck.authExists && emailCheck.firestoreExists) {
        // Email exists in both - this is a real conflict
        throw new Error("An account with this email already exists. Please use the login page instead.");
      } else if (emailCheck.isOrphaned) {
        // Orphaned account - email exists in Auth but not Firestore
        onStepChange("Found orphaned account, attempting to clean up...");
        // We can't delete the auth user without the password, so we'll create a new one
        // This will fail with email-already-in-use, which we'll handle
        console.log("Orphaned account detected, proceeding with signup...");
      }
      
      onStepChange("Creating your account...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;

      onStepChange("Updating profile...");
      await updateProfile(user, { displayName: displayName });

      onStepChange("Saving your information...");
      const userRef = doc(db, "users", user.uid);
      const userProfileData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        createdAt: serverTimestamp(),
        phone: '',
        defaultAddress: { unitNo: '', address: '', area: '' },
        preferredPaymentMethodId: '',
        preferredDeliveryTypeId: '',
        ...additionalData, // userType, nonprofit fields
        // MODIFIED: Store GemWallet address under 'gemWalletAddress'
        gemWalletAddress: additionalData.gemWalletAddress || null,
      };
      await setDoc(userRef, userProfileData);

      onStepChange("Finalizing...");
      setCurrentUserProfile(userProfileData);
      setCurrentUser(user);

      return { userCredential };

    } catch (error) {
      console.error("Error in signup process:", error.message);
      
      // Handle specific error cases
      if (error.code === 'auth/email-already-in-use') {
        // Check if this is an orphaned account
        const emailCheck = await checkEmailExists(email);
        if (emailCheck.isOrphaned) {
          throw new Error("This email was previously used but the account was incomplete. Please contact support to resolve this issue.");
        } else {
          throw new Error("An account with this email already exists. Please use the login page instead.");
        }
      }
      
      if (user && error.code !== 'auth/email-already-in-use') {
          try {
              onStepChange("Signup failed. Cleaning up...");
              await user.delete();
              console.log("Firebase Auth user deleted due to signup error.");
          } catch (deleteError) {
              console.error("Failed to delete auth user after signup error:", deleteError);
          }
      }
      throw error;
    } finally {
        onStepChange(null);
    }
  };

  // Function to check if email exists in both Firebase Auth and Firestore
  const checkEmailExists = async (email) => {
    try {
      // Check Firebase Auth first
      const authExists = await checkEmailInAuth(email);
      
      // Check Firestore
      const firestoreExists = await checkEmailInFirestore(email);
      
      // If email exists in Auth but not in Firestore, it's an orphaned account
      if (authExists && !firestoreExists) {
        console.log("Found orphaned Firebase Auth user, attempting cleanup...");
        // We can't delete the auth user without the password, so we'll handle this in signup
        return { authExists: true, firestoreExists: false, isOrphaned: true };
      }
      
      return { authExists, firestoreExists, isOrphaned: false };
    } catch (error) {
      console.error("Error checking email existence:", error);
      return { authExists: false, firestoreExists: false, isOrphaned: false };
    }
  };

  // Check if email exists in Firebase Auth
  const checkEmailInAuth = async (email) => {
    try {
      await signInWithEmailAndPassword(auth, email, 'dummy-password');
      return true;
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        return true; // Email exists but wrong password
      } else if (error.code === 'auth/user-not-found') {
        return false; // Email doesn't exist
      }
      return false;
    }
  };

  // Check if email exists in Firestore
  const checkEmailInFirestore = async (email) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email), limit(1));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking email in Firestore:", error);
      return false;
    }
  };

  // RENAMED and MODIFIED: Function to update GemWallet address
  const updateUserGemWalletAddress = async (userId, newGemWalletAddress) => {
    if (!userId || !newGemWalletAddress) {
      console.error("User ID and GemWallet address are required to update.");
      return false;
    }
    try {
      const userRef = doc(db, "users", userId);
      // MODIFIED: Update the 'gemWalletAddress' field
      await updateDoc(userRef, { gemWalletAddress: newGemWalletAddress });

      if (currentUserProfile && currentUserProfile.uid === userId) {
        // MODIFIED: Update local profile state with 'gemWalletAddress'
        setCurrentUserProfile(prevProfile => ({ ...prevProfile, gemWalletAddress: newGemWalletAddress }));
      }
      console.log("User GemWallet address updated in Firestore:", newGemWalletAddress);
      return true;
    } catch (error) {
      console.error("Error updating user GemWallet address:", error);
      return false;
    }
  };


  const logout = () => {
    return signOut(auth);
  };

  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setCurrentUserProfile(null);
      return null;
    }
    try {
      const userRef = doc(db, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const profileData = { uid: userId, ...docSnap.data() };
        // Ensure profileData.gemWalletAddress is correctly loaded if it exists
        setCurrentUserProfile(profileData);
        return profileData;
      } else {
        console.warn("No such user profile document for UID:", userId);
        setCurrentUserProfile(null);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setCurrentUserProfile(null);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await fetchUserProfile(user.uid); // This will now fetch profile possibly containing gemWalletAddress
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
      }
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // Admin function to check for orphaned accounts
  const checkOrphanedAccounts = async (email) => {
    try {
      const emailCheck = await checkEmailExists(email);
      return {
        email,
        authExists: emailCheck.authExists,
        firestoreExists: emailCheck.firestoreExists,
        isOrphaned: emailCheck.isOrphaned,
        message: emailCheck.isOrphaned 
          ? "This email has an orphaned Firebase Auth account (exists in Auth but not in Firestore)"
          : emailCheck.authExists && emailCheck.firestoreExists
          ? "This email has a complete account in both systems"
          : "This email is available for registration"
      };
    } catch (error) {
      console.error("Error checking orphaned accounts:", error);
      return { error: error.message };
    }
  };

  const value = {
    currentUser,
    currentUserProfile,
    fetchUserProfile,
    login,
    signup,
    logout,
    loadingAuth,
    updateUserGemWalletAddress, // RENAMED: Expose the renamed function
    checkOrphanedAccounts, // Admin function to check account status
  };

  return (
    <AuthContext.Provider value={value}>
      {!loadingAuth && children}
    </AuthContext.Provider>
  );
};