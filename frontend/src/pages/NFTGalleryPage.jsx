// src/pages/NFTGalleryPage.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import styles from '../styles/NFTGalleryPage.module.css';

const NFTGalleryPage = () => {
  const { currentUserProfile } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUserProfile?.walletAddress) {
      fetchNFTGallery();
      fetchDonorStats();
    }
  }, [currentUserProfile]);

  const fetchNFTGallery = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/nft/gallery/${currentUserProfile.walletAddress}`
      );
      const data = await response.json();
      
      if (data.success) {
        setCertificates(data.certificates);
      } else {
        setError('Failed to load NFT gallery');
      }
    } catch (err) {
      console.error('Error fetching NFT gallery:', err);
      setError('Failed to load NFT gallery');
    }
  };

  const fetchDonorStats = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/nft/stats/${currentUserProfile.walletAddress}`
      );
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching donor stats:', err);
      setLoading(false);
    }
  };

  if (!currentUserProfile) {
    return (
      <div className={styles.loginPrompt}>
        <h2>Please log in to view your NFT gallery</h2>
        <Link to="/login" className={styles.loginButton}>
          Log In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingIcon}>⏳</div>
        <p>Loading your NFT gallery...</p>
      </div>
    );
  }

  return (
    <div className={styles.gallerySection}>
      {/* Header */}
      <div className={styles.titleContainer}>
        <h1 className={styles.galleryTitle}>
          🎖️ Your Donation Certificates
        </h1>
        <span className={styles.walletAddress}>
          {currentUserProfile.walletAddress}
        </span>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className={styles.statsGrid}>
          <StatCard
            icon="💎"
            label="Overall Tier"
            value={stats.overall_tier}
          />
          <StatCard
            icon="💰"
            label="Total Donated"
            value={`${stats.total_donated_eth} ETH`}
          />
          <StatCard
            icon="🎯"
            label="Projects Supported"
            value={stats.projects_supported}
          />
          <StatCard
            icon="📜"
            label="Certificates"
            value={stats.total_nfts}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔭</div>
          <h2 className={styles.emptyTitle}>No certificates yet</h2>
          <p className={styles.emptyText}>
            Start making donations to earn your first certificate NFT!
          </p>
          <Link to="/projects" className={styles.browseButton}>
            Browse Projects
          </Link>
        </div>
      ) : (
        <div className={styles.certificatesGrid}>
          {certificates.map((cert) => (
            <CertificateCard key={cert.token_id} certificate={cert} />
          ))}
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value }) => (
  <div className={styles.statCard}>
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statLabel}>{label}</div>
    <div className={styles.statValue}>{value}</div>
  </div>
);

// Certificate Card Component
const CertificateCard = ({ certificate }) => {
  const getAttributeValue = (traitType) => {
    const attr = certificate.attributes.find(a => a.trait_type === traitType);
    return attr ? attr.value : 'N/A';
  };

  const donationAmount = getAttributeValue('Donation Amount (ETH)');
  const tier = getAttributeValue('Tier');
  const project = getAttributeValue('Project');
  const txHash = getAttributeValue('Transaction Hash');
  const milestone = getAttributeValue('Milestone');

  return (
    <div className={styles.certificateCard}>
      {/* Certificate Header */}
      <div className={styles.certificateHeader}>
        <div className={styles.certificateIcon}>🎖️</div>
        <h3 className={styles.certificateTitle}>
          Donation Certificate
        </h3>
        <div className={styles.certificateTier}>
          {tier}
        </div>
      </div>

      {/* Certificate Body */}
      <div className={styles.certificateBody}>
        <div className={styles.fieldsGrid}>
          <div className={styles.certificateField}>
            <div className={styles.fieldLabel}>Project</div>
            <div className={styles.fieldValue}>{project}</div>
          </div>

          <div className={styles.certificateField}>
            <div className={styles.fieldLabel}>Milestone</div>
            <div className={styles.fieldValue}>{milestone}</div>
          </div>

          <div className={styles.certificateField}>
            <div className={styles.fieldLabel}>Amount Donated</div>
            <div className={styles.amountValue}>{donationAmount} ETH</div>
          </div>

          <div className={styles.certificateField}>
            <div className={styles.fieldLabel}>Token ID</div>
            <div className={styles.tokenId}>#{certificate.token_id}</div>
          </div>
        </div>

        {txHash && txHash !== 'N/A' && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.etherscanLink}
          >
            View on Etherscan →
          </a>
        )}
      </div>
    </div>
  );
};

export default NFTGalleryPage;