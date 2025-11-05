// API Configuration
// Uses environment variable for Railway backend URL, falls back to localhost for development

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const API_ENDPOINTS = {
  // Projects
  createProject: `${API_BASE_URL}/projects/create-project`,
  getAllProjects: `${API_BASE_URL}/projects/all`,
  getProjectDetails: (contractAddress) => `${API_BASE_URL}/projects/project/${contractAddress}/details`,
  mintCertificate: (contractAddress) => `${API_BASE_URL}/projects/project/${contractAddress}/mint-certificate`,
  verifyMilestone: (contractAddress, milestoneIndex) => `${API_BASE_URL}/projects/project/${contractAddress}/verify-milestone/${milestoneIndex}`,
  
  // NFT
  nftGallery: (walletAddress) => `${API_BASE_URL}/nft/gallery/${walletAddress}`,
  nftStats: (walletAddress) => `${API_BASE_URL}/nft/stats/${walletAddress}`,
  
  // Transactions
  latestTransactions: (address) => `${API_BASE_URL}/transaction/latest-transactions?address=${address}`,
};

export default API_BASE_URL;
