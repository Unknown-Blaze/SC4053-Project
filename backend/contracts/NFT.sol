// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title NGO_NFT
 * @dev Enhanced NFT contract for minting donation certificates with comprehensive tracking
 * Each NFT represents a donation to a specific project/milestone with detailed metadata
 */
contract NGO_NFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Strings for uint256;
    
    uint256 private _tokenIdCounter;
    
    // Enhanced donation record structure
    struct DonationRecord {
        address donor;
        string projectName;
        uint256 donationAmount;
        uint256 timestamp;
        address projectContract;
        string milestoneName;
        uint256 milestoneIndex;
        string tier; // "Bronze", "Silver", "Gold", "Platinum" based on amount
    }
    
    // Mapping from token ID to donation details --> so basically a dictionary mapping the nft_id to the donation record (or donation information)
    mapping(uint256 => DonationRecord) public donationRecords;
    
    // Track total donations per address (donor's address) --> so basically total amount donated from that account
    mapping(address => uint256) public totalDonationsByAddress;
    
    // Track donations made to per project address --> so basically total amount that is donated to the account
    mapping(address => uint256) public totalDonationsPerProject;
    
    // Track number of NFTs per project --> so basically total number of NFTs associated with the account
    mapping(address => uint256) public nftCountPerProject;
    
    // Donation tier thresholds (in wei)
    uint256 public constant BRONZE_THRESHOLD = 0.01 ether;
    uint256 public constant SILVER_THRESHOLD = 0.1 ether;
    uint256 public constant GOLD_THRESHOLD = 0.5 ether;
    uint256 public constant PLATINUM_THRESHOLD = 1 ether;
    
    // Events
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed donor,
        string projectName,
        uint256 donationAmount,
        string tier
    );
    
    event DonationTierAchieved(
        address indexed donor,
        string tier,
        uint256 totalDonations
    );
    
    constructor() ERC721("Charity Donation Certificate", "CDC") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }
    
    // ============================================
    // MINTING FUNCTIONS
    // ============================================
    
    /**
     * @dev Mint a basic NFT certificate
     * @param to The address that will receive the NFT
     * @param uri The metadata URI for the NFT
     */
    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        return tokenId;
    }
    
    /**
     * @dev Mint NFT with complete donation record - ENHANCED
     * @param to Recipient address
     * @param uri Token metadata URI
     * @param projectName Name of the project
     * @param donationAmount Amount donated in wei
     * @param projectContract Address of the project contract
     * @param milestoneName Name of the milestone funded
     * @param milestoneIndex Index of the milestone
     */
    function mintWithRecord(
        address to,
        string memory uri,
        string memory projectName,
        uint256 donationAmount,
        address projectContract,
        string memory milestoneName,
        uint256 milestoneIndex
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Determine donation tier
        string memory tier = _getDonationTier(donationAmount);
        
        // Store donation record
        donationRecords[tokenId] = DonationRecord({
            donor: to,
            projectName: projectName,
            donationAmount: donationAmount,
            timestamp: block.timestamp,
            projectContract: projectContract,
            milestoneName: milestoneName,
            milestoneIndex: milestoneIndex,
            tier: tier
        });
        
        // Update tracking
        totalDonationsByAddress[to] += donationAmount;
        totalDonationsPerProject[projectContract] += donationAmount;
        nftCountPerProject[projectContract]++;
        
        // event that the frontend can listen to 
        emit NFTMinted(tokenId, to, projectName, donationAmount, tier);
        
        // Check if user achieved a new tier
        _checkTierAchievement(to);
        
        return tokenId;
    }
    
    /**
     * @dev Batch mint NFTs for multiple donors
     * @param recipients Array of recipient addresses
     * @param projectName Name of the project
     * @param amounts Array of donation amounts
     * @param projectContract Address of the project contract
     * @param milestoneName Name of the milestone
     * @param milestoneIndex Index of the milestone
     */
    function batchMintWithRecord(
        address[] memory recipients,
        string memory projectName,
        uint256[] memory amounts,
        address projectContract,
        string memory milestoneName,
        uint256 milestoneIndex
    ) public onlyOwner returns (uint256[] memory) {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256[] memory tokenIds = new uint256[](recipients.length);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            string memory uri = _generateMetadataURI(
                projectName,
                amounts[i],
                milestoneName,
                recipients[i]
            );
            
            tokenIds[i] = mintWithRecord(
                recipients[i],
                uri,
                projectName,
                amounts[i],
                projectContract,
                milestoneName,
                milestoneIndex
            );
        }
        
        return tokenIds;
    }
    
    // ============================================
    // DONATION TIER FUNCTIONS
    // ============================================
    
    /**
     * @dev Determine donation tier based on amount
     */
    function _getDonationTier(uint256 amount) internal pure returns (string memory) {
        if (amount >= PLATINUM_THRESHOLD) {
            return "Platinum";
        } else if (amount >= GOLD_THRESHOLD) {
            return "Gold";
        } else if (amount >= SILVER_THRESHOLD) {
            return "Silver";
        } else if (amount >= BRONZE_THRESHOLD) {
            return "Bronze";
        } else {
            return "Supporter";
        }
    }
    
    /**
     * @dev Check if donor achieved a new tier milestone
     */
    function _checkTierAchievement(address donor) internal {
        uint256 total = totalDonationsByAddress[donor];
        string memory tier = _getDonationTier(total);
        
        // emit event to the frontend 
        // donor's address (identity of the donor basically), the tier that the donor belongs to and the total
        emit DonationTierAchieved(donor, tier, total);
    }
    
    /**
     * @dev Get donor's current tier based on total donations
     */
    function getDonorTier(address donor) external view returns (string memory) {
        return _getDonationTier(totalDonationsByAddress[donor]);
    }
    
    // ============================================
    // QUERY FUNCTIONS
    // ============================================
    
    /**
     * @dev Get donation record for a token
     */
    function getDonationRecord(uint256 tokenId) public view returns (DonationRecord memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return donationRecords[tokenId];
    }
    
    /**
     * @dev Get all token IDs owned by an address 
     */
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }
    
    /**
     * @dev Get all donation records for an address
     */
    function getDonationsByOwner(address owner) external view returns (DonationRecord[] memory) {
        uint256 balance = balanceOf(owner);
        DonationRecord[] memory donations = new DonationRecord[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            donations[i] = donationRecords[tokenId];
        }
        
        return donations;
    }
    
    /**
     * @dev Get total donation amount for an address across all their NFTs
     */
    function getTotalDonations(address donor) public view returns (uint256) {
        return totalDonationsByAddress[donor];
    }
    
    /**
     * @dev Get donation statistics for an address
     */
    function getDonorStats(address donor) external view returns (
        uint256 totalDonated,
        uint256 nftCount,
        uint256 projectsSupported,
        string memory tier
    ) {
        totalDonated = totalDonationsByAddress[donor];
        nftCount = balanceOf(donor);
        tier = _getDonationTier(totalDonated);
        
        // Count unique projects
        uint256 balance = balanceOf(donor);
        address[] memory uniqueProjects = new address[](balance);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(donor, i);
            address projectContract = donationRecords[tokenId].projectContract;
            
            bool alreadyCounted = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueProjects[j] == projectContract) {
                    alreadyCounted = true;
                    break;
                }
            }
            
            if (!alreadyCounted) {
                uniqueProjects[uniqueCount] = projectContract;
                uniqueCount++;
            }
        }
        
        projectsSupported = uniqueCount;
        
        return (totalDonated, nftCount, projectsSupported, tier);
    }
    
    /**
     * @dev Get project statistics
     */
    function getProjectStats(address projectContract) external view returns (
        uint256 totalDonated,
        uint256 nftCount,
        uint256 uniqueDonors
    ) {
        totalDonated = totalDonationsPerProject[projectContract];
        nftCount = nftCountPerProject[projectContract];
        
        // This is an approximation - actual unique donors would need more tracking
        uniqueDonors = nftCount; // Each NFT represents at least one donor
        
        return (totalDonated, nftCount, uniqueDonors);
    }
    
    /**
     * @dev Get NFTs for a specific project
     */
    function getNFTsByProject(address projectContract) external view returns (uint256[] memory) {
        uint256 totalSupply = _tokenIdCounter;
        uint256[] memory tempTokenIds = new uint256[](totalSupply);
        uint256 count = 0;
        
        for (uint256 i = 0; i < totalSupply; i++) {
            if (_ownerOf(i) != address(0) && donationRecords[i].projectContract == projectContract) {
                tempTokenIds[count] = i;
                count++;
            }
        }
        
        uint256[] memory projectTokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            projectTokenIds[i] = tempTokenIds[i];
        }
        
        return projectTokenIds;
    }
    
    // ============================================
    // LEADERBOARD FUNCTIONS
    // ============================================
    
    /**
     * @dev Get top donors by total donation amount (off-chain sorting recommended for large datasets)
     * This is a simplified on-chain version for small numbers
     */
    function getTopDonorsSimple(address[] memory donors, uint256 count) 
        external 
        view 
        returns (address[] memory, uint256[] memory) 
    {
        require(count <= donors.length, "Count exceeds donors array length");
        
        address[] memory topAddresses = new address[](count);
        uint256[] memory topAmounts = new uint256[](count);
        
        // Simple selection of top donors (not fully sorted)
        for (uint256 i = 0; i < count; i++) {
            uint256 maxAmount = 0;
            uint256 maxIndex = 0;
            
            for (uint256 j = 0; j < donors.length; j++) {
                uint256 amount = totalDonationsByAddress[donors[j]];
                bool alreadySelected = false;
                
                for (uint256 k = 0; k < i; k++) {
                    if (topAddresses[k] == donors[j]) {
                        alreadySelected = true;
                        break;
                    }
                }
                
                if (!alreadySelected && amount > maxAmount) {
                    maxAmount = amount;
                    maxIndex = j;
                }
            }
            
            topAddresses[i] = donors[maxIndex];
            topAmounts[i] = maxAmount;
        }
        
        return (topAddresses, topAmounts);
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * @dev Generate metadata URI (simplified - in production use IPFS)
     */
    function _generateMetadataURI(
        string memory projectName,
        uint256 amount,
        string memory milestoneName,
        address donor
    ) internal pure returns (string memory) {
        // In production, this would upload to IPFS and return ipfs:// URI
        // For now, return a data URI placeholder
        return string(abi.encodePacked(
            "data:application/json,{",
            '"name":"Donation Certificate - ', projectName, '",',
            '"description":"Certificate of donation",',
            '"attributes":[',
                '{"trait_type":"Amount","value":"', amount.toString(), '"},',
                '{"trait_type":"Milestone","value":"', milestoneName, '"}',
            ']}'
        ));
    }
    
    /**
     * @dev Get total number of minted NFTs
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    // ============================================
    // REQUIRED OVERRIDES
    // ============================================
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
