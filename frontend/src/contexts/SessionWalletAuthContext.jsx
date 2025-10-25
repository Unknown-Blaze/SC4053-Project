// src/contexts/SessionWalletAuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const SessionWalletAuthContext = createContext();

export const useSessionWalletAuth = () => {
  return useContext(SessionWalletAuthContext);
};

export const SessionWalletAuthProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // Session-only connection - no persistence across browser sessions
  useEffect(() => {
    // Don't auto-connect on page load
    setLoading(false);
  }, []);

  // Clear connection on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear connection when user leaves the page
      setWalletAddress(null);
      setIsConnected(false);
      setProvider(null);
      setSigner(null);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      const signer = await provider.getSigner();

      setWalletAddress(address);
      setIsConnected(true);
      setProvider(provider);
      setSigner(signer);

      return { address, provider, signer };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
  };

  const switchToSepolia = async () => {
    if (!provider) {
      throw new Error('No provider available');
    }

    const SEPOLIA_CHAIN_ID = '0xaa36a7';
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4001) {
        throw new Error('Network switch rejected by user');
      }
      if (switchError.code === 4902) {
        throw new Error('Sepolia Testnet not added to MetaMask');
      }
      throw switchError;
    }
  };

  const getNetworkInfo = async () => {
    if (!provider) return null;
    
    try {
      const network = await provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  };

  const value = {
    walletAddress,
    isConnected,
    loading,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    getNetworkInfo
  };

  return (
    <SessionWalletAuthContext.Provider value={value}>
      {children}
    </SessionWalletAuthContext.Provider>
  );
};
