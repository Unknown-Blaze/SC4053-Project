// src/pages/NFTGalleryPage.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

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
      <div style={{
        maxWidth: '1200px',
        margin: '50px auto',
        padding: '40px',
        textAlign: 'center'
      }}>
        <h2>Please log in to view your NFT gallery</h2>
        <Link to="/login" style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '12px 24px',
          background: '#4CAF50',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none'
        }}>
          Log In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '50px auto',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{fontSize: '2em'}}>⏳</div>
        <p>Loading your NFT gallery...</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '50px auto',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '15px',
        marginBottom: '30px'
      }}>
        <h1 style={{margin: '0 0 10px 0', fontSize: '2.5em'}}>
          🎖️ Your Donation Certificates
        </h1>
        <p style={{margin: 0, opacity: 0.9}}>
          {currentUserProfile.walletAddress.slice(0, 6)}...{currentUserProfile.walletAddress.slice(-4)}
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
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
        <div style={{
          padding: '20px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: '#f9f9f9',
          borderRadius: '15px'
        }}>
          <div style={{fontSize: '4em', marginBottom: '20px'}}>📭</div>
          <h2>No certificates yet</h2>
          <p style={{color: '#666', marginBottom: '30px'}}>
            Start making donations to earn your first certificate NFT!
          </p>
          <Link to="/projects" style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#4CAF50',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none'
          }}>
            Browse Projects
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '25px'
        }}>
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
  <div style={{
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center'
  }}>
    <div style={{fontSize: '2.5em', marginBottom: '10px'}}>{icon}</div>
    <div style={{
      fontSize: '0.85em',
      color: '#666',
      marginBottom: '5px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '1.5em',
      fontWeight: 'bold',
      color: '#333'
    }}>
      {value}
    </div>
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

  return (
    <div style={{
      background: 'white',
      borderRadius: '15px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }}>
      {/* Certificate Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '30px 20px',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{fontSize: '3em', marginBottom: '10px'}}>🎖️</div>
        <h3 style={{margin: '0 0 10px 0', fontSize: '1.2em'}}>
          Donation Certificate
        </h3>
        <div style={{
          fontSize: '1.5em',
          fontWeight: 'bold',
          marginTop: '10px'
        }}>
          {tier}
        </div>
      </div>

      {/* Certificate Body */}
      <div style={{padding: '20px'}}>
        <div style={{marginBottom: '15px'}}>
          <div style={{
            fontSize: '0.85em',
            color: '#666',
            marginBottom: '5px'
          }}>
            Project
          </div>
          <div style={{
            fontSize: '1em',
            fontWeight: '500',
            color: '#333'
          }}>
            {project}
          </div>
        </div>

        <div style={{marginBottom: '15px'}}>
          <div style={{
            fontSize: '0.85em',
            color: '#666',
            marginBottom: '5px'
          }}>
            Amount Donated
          </div>
          <div style={{
            fontSize: '1.3em',
            fontWeight: 'bold',
            color: '#4CAF50'
          }}>
            {donationAmount} ETH
          </div>
        </div>

        <div style={{marginBottom: '15px'}}>
          <div style={{
            fontSize: '0.85em',
            color: '#666',
            marginBottom: '5px'
          }}>
            Token ID
          </div>
          <div style={{
            fontSize: '0.9em',
            color: '#333',
            fontFamily: 'monospace'
          }}>
            #{certificate.token_id}
          </div>
        </div>

        {txHash && txHash !== 'N/A' && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px',
              background: '#f0f0f0',
              borderRadius: '8px',
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.9em',
              marginTop: '15px'
            }}
          >
            View on Etherscan →
          </a>
        )}
      </div>
    </div>
  );
};

export default NFTGalleryPage;