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
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore"; // Added updateDoc

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

  const value = {
    currentUser,
    currentUserProfile,
    fetchUserProfile,
    login,
    signup,
    logout,
    loadingAuth,
    updateUserGemWalletAddress, // RENAMED: Expose the renamed function
  };

  return (
    <AuthContext.Provider value={value}>
      {!loadingAuth && children}
    </AuthContext.Provider>
  );
};