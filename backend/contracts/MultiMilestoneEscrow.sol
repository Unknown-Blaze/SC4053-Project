// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiMilestoneEscrow {
    // Core contract participants
    address public donor;
    address payable public recipient;
    address public verifier; // NGO or authorized verifier
    
    // Milestone management
    struct Milestone {
        string name;
        string description;
        uint256 amount; // Amount in wei for this milestone
        bool isCompleted;
        bool isVerified;
        uint256 completionTime;
        string verificationHash; // IPFS hash or proof of completion
    }
    
    // Donor tracking structure - ENHANCED
    struct DonorInfo {
        address donorAddress;
        uint256 totalContributed;
        uint256 donationCount;
        uint256 lastDonationTime;
        uint256 firstDonationTime;
    }
    
    Milestone[] public milestones;
    uint256 public currentMilestoneIndex;
    uint256 public totalAmount;
    uint256 public releasedAmount;
    uint256 public totalDonations; // Track total donations received
    
    // Donation tracking - ENHANCED
    mapping(address => DonorInfo) public donorInfo;
    address[] public donorAddresses;
    mapping(address => bool) public isDonor;
    
    // Legacy mapping for backward compatibility
    mapping(address => uint256) public donorContributions;
    
    // Contract states
    enum ContractState { Active, Completed, Cancelled }
    ContractState public contractState;
    
    // Events
    event MilestoneCreated(uint256 indexed milestoneIndex, string name, uint256 amount);
    event MilestoneCompleted(uint256 indexed milestoneIndex, string verificationHash);
    event MilestoneVerified(uint256 indexed milestoneIndex);
    event FundsReleased(uint256 indexed milestoneIndex, uint256 amount);
    event DonationReceived(
        address indexed donor, 
        uint256 amount, 
        uint256 totalDonations,
        uint256 donorTotalContribution
    );
    event ContractCompleted();
    event ContractCancelled();
    
    // Modifiers
    modifier onlyDonor() {
        require(msg.sender == donor, "Only donor can perform this action");
        _;
    }
    
    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can perform this action");
        _;
    }
    
    modifier onlyDonorOrVerifier() {
        require(msg.sender == donor || msg.sender == verifier, "Only donor or verifier can perform this action");
        _;
    }
    
    modifier contractActive() {
        require(contractState == ContractState.Active, "Contract is not active");
        _;
    }
    
    constructor(
        address payable _recipient,
        address _verifier,
        string[] memory _milestoneNames,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneAmounts
    ) {
        require(_recipient != address(0), "Invalid recipient address");
        require(_verifier != address(0), "Invalid verifier address");
        require(_milestoneNames.length == _milestoneDescriptions.length, "Names and descriptions length mismatch");
        require(_milestoneNames.length == _milestoneAmounts.length, "Names and amounts length mismatch");
        require(_milestoneNames.length > 0, "At least one milestone required");
        
        donor = msg.sender; // Project creator (NGO)
        recipient = _recipient;
        verifier = _verifier;
        
        // Create milestones
        for (uint256 i = 0; i < _milestoneNames.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be greater than 0");
            milestones.push(Milestone({
                name: _milestoneNames[i],
                description: _milestoneDescriptions[i],
                amount: _milestoneAmounts[i],
                isCompleted: false,
                isVerified: false,
                completionTime: 0,
                verificationHash: ""
            }));
            totalAmount += _milestoneAmounts[i];
            emit MilestoneCreated(i, _milestoneNames[i], _milestoneAmounts[i]);
        }
        
        // Contract starts with 0 ETH - will be funded by donations
        contractState = ContractState.Active;
    }
    
    // ============================================
    // TOP DONORS TRACKING FUNCTIONS - NEW
    // ============================================
    
    /**
     * @dev Get top N donors sorted by total contribution
     * @param count Number of top donors to return
     * @return addresses Array of donor addresses
     * @return contributions Array of total contributions
     * @return donationCounts Array of donation counts
     */
    function getTopDonors(uint256 count) external view returns (
        address[] memory addresses,
        uint256[] memory contributions,
        uint256[] memory donationCounts
    ) {
        uint256 totalDonors = donorAddresses.length;
        uint256 returnCount = count > totalDonors ? totalDonors : count;
        
        if (totalDonors == 0) {
            return (new address[](0), new uint256[](0), new uint256[](0));
        }
        
        // Create arrays with all donors for sorting
        address[] memory tempAddresses = new address[](totalDonors);
        uint256[] memory tempContributions = new uint256[](totalDonors);
        uint256[] memory tempCounts = new uint256[](totalDonors);
        
        // Copy all donor data
        for (uint256 i = 0; i < totalDonors; i++) {
            address donorAddr = donorAddresses[i];
            tempAddresses[i] = donorAddr;
            tempContributions[i] = donorInfo[donorAddr].totalContributed;
            tempCounts[i] = donorInfo[donorAddr].donationCount;
        }
        
        // Bubble sort (descending by contribution amount)
        for (uint256 i = 0; i < totalDonors; i++) {
            for (uint256 j = i + 1; j < totalDonors; j++) {
                if (tempContributions[j] > tempContributions[i]) {
                    // Swap contributions
                    uint256 tempContribution = tempContributions[i];
                    tempContributions[i] = tempContributions[j];
                    tempContributions[j] = tempContribution;
                    
                    // Swap addresses
                    address tempAddr = tempAddresses[i];
                    tempAddresses[i] = tempAddresses[j];
                    tempAddresses[j] = tempAddr;
                    
                    // Swap counts
                    uint256 tempCount = tempCounts[i];
                    tempCounts[i] = tempCounts[j];
                    tempCounts[j] = tempCount;
                }
            }
        }
        
        // Return top N donors
        addresses = new address[](returnCount);
        contributions = new uint256[](returnCount);
        donationCounts = new uint256[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            addresses[i] = tempAddresses[i];
            contributions[i] = tempContributions[i];
            donationCounts[i] = tempCounts[i];
        }
        
        return (addresses, contributions, donationCounts);
    }
    
    /**
     * @dev Get detailed information about a specific donor
     * @param _donor Address of the donor
     * @return Donor information struct
     */
    function getDonorDetails(address _donor) external view returns (DonorInfo memory) {
        require(isDonor[_donor], "Address is not a donor");
        return donorInfo[_donor];
    }
    
    /**
     * @dev Get the rank of a specific donor (1 = highest)
     * @param _donor Address of the donor
     * @return rank Position in leaderboard (0 if not a donor)
     */
    function getDonorRank(address _donor) external view returns (uint256 rank) {
        if (!isDonor[_donor]) {
            return 0;
        }
        
        uint256 donorContribution = donorInfo[_donor].totalContributed;
        rank = 1;
        
        // Count how many donors have contributed more
        for (uint256 i = 0; i < donorAddresses.length; i++) {
            address otherDonor = donorAddresses[i];
            if (otherDonor != _donor && donorInfo[otherDonor].totalContributed > donorContribution) {
                rank++;
            }
        }
        
        return rank;
    }
    
    /**
     * @dev Get all donors with their full information
     * @return Array of all donor info structs
     */
    function getAllDonorsInfo() external view returns (DonorInfo[] memory) {
        DonorInfo[] memory allDonors = new DonorInfo[](donorAddresses.length);
        
        for (uint256 i = 0; i < donorAddresses.length; i++) {
            allDonors[i] = donorInfo[donorAddresses[i]];
        }
        
        return allDonors;
    }
    
    /**
     * @dev Get project leaderboard statistics
     * @return totalDonors Total number of unique donors
     * @return averageDonation Average donation amount
     * @return largestDonation Largest single donation
     * @return topDonorAddress Address of top donor
     */
    function getLeaderboardStats() external view returns (
        uint256 totalDonors,
        uint256 averageDonation,
        uint256 largestDonation,
        address topDonorAddress
    ) {
        totalDonors = donorAddresses.length;
        
        if (totalDonors == 0) {
            return (0, 0, 0, address(0));
        }
        
        averageDonation = totalDonations / totalDonors;
        largestDonation = 0;
        topDonorAddress = address(0);
        
        for (uint256 i = 0; i < donorAddresses.length; i++) {
            address donorAddr = donorAddresses[i];
            uint256 contribution = donorInfo[donorAddr].totalContributed;
            
            if (contribution > largestDonation) {
                largestDonation = contribution;
                topDonorAddress = donorAddr;
            }
        }
        
        return (totalDonors, averageDonation, largestDonation, topDonorAddress);
    }
    
    // ============================================
    // EXISTING VIEW FUNCTIONS
    // ============================================
    
    function getMilestoneCount() public view returns (uint256) {
        return milestones.length;
    }
    
    function getMilestone(uint256 _index) public view returns (
        string memory name,
        string memory description,
        uint256 amount,
        bool isCompleted,
        bool isVerified,
        uint256 completionTime,
        string memory verificationHash
    ) {
        require(_index < milestones.length, "Invalid milestone index");
        Milestone memory milestone = milestones[_index];
        return (
            milestone.name,
            milestone.description,
            milestone.amount,
            milestone.isCompleted,
            milestone.isVerified,
            milestone.completionTime,
            milestone.verificationHash
        );
    }
    
    function getAllMilestones() public view returns (Milestone[] memory) {
        return milestones;
    }
    
    function getCurrentMilestoneIndex() public view returns (uint256) {
        return currentMilestoneIndex;
    }
    
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    function getReleasedAmount() public view returns (uint256) {
        return releasedAmount;
    }
    
    function getRemainingAmount() public view returns (uint256) {
        return totalAmount - releasedAmount;
    }
    
    function getTotalDonations() public view returns (uint256) {
        return totalDonations;
    }
    
    function getDonorCount() public view returns (uint256) {
        return donorAddresses.length;
    }
    
    function getDonorContribution(address _donor) public view returns (uint256) {
        return donorInfo[_donor].totalContributed;
    }
    
    function getAllDonors() public view returns (address[] memory) {
        return donorAddresses;
    }
    
    function getFundingProgress() public view returns (uint256) {
        if (totalAmount == 0) return 0;
        return (totalDonations * 100) / totalAmount; // Returns percentage
    }
    
    // ============================================
    // MILESTONE MANAGEMENT FUNCTIONS
    // ============================================
    
    function completeMilestone(uint256 _milestoneIndex, string memory _verificationHash) 
        public 
        onlyDonorOrVerifier 
        contractActive 
    {
        require(_milestoneIndex < milestones.length, "Invalid milestone index");
        require(_milestoneIndex == currentMilestoneIndex, "Can only complete milestones in order");
        require(!milestones[_milestoneIndex].isCompleted, "Milestone already completed");
        require(bytes(_verificationHash).length > 0, "Verification hash required");
        
        milestones[_milestoneIndex].isCompleted = true;
        milestones[_milestoneIndex].completionTime = block.timestamp;
        milestones[_milestoneIndex].verificationHash = _verificationHash;
        
        emit MilestoneCompleted(_milestoneIndex, _verificationHash);
        
        // Move to next milestone
        currentMilestoneIndex++;
    }
    
    // Milestone verification (only verifier can do this)
    function verifyMilestone(uint256 _milestoneIndex) 
        public 
        onlyVerifier 
        contractActive 
    {
        require(_milestoneIndex < milestones.length, "Invalid milestone index");
        require(milestones[_milestoneIndex].isCompleted, "Milestone not completed yet");
        require(!milestones[_milestoneIndex].isVerified, "Milestone already verified");
        
        milestones[_milestoneIndex].isVerified = true;
        emit MilestoneVerified(_milestoneIndex);
        
        // Automatically release funds for verified milestone
        _releaseMilestoneFunds(_milestoneIndex);
    }
    
    // Internal function to release milestone funds
    function _releaseMilestoneFunds(uint256 _milestoneIndex) internal {
        require(milestones[_milestoneIndex].isVerified, "Milestone must be verified before release");
        require(address(this).balance >= milestones[_milestoneIndex].amount, "Insufficient contract balance");
        
        uint256 amount = milestones[_milestoneIndex].amount;
        releasedAmount += amount;
        
        // Transfer funds to recipient
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(_milestoneIndex, amount);
        
        // Check if all milestones are completed and verified
        if (_allMilestonesCompleted()) {
            contractState = ContractState.Completed;
            emit ContractCompleted();
        }
    }
    
    // Check if all milestones are completed and verified
    function _allMilestonesCompleted() internal view returns (bool) {
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].isVerified) {
                return false;
            }
        }
        return true;
    }
    
    // ============================================
    // DONATION FUNCTIONS - UPDATED
    // ============================================
    
    /**
     * @dev Internal function to process donations and update donor tracking
     */
    function _processDonation() internal {
        require(contractState == ContractState.Active, "Contract is not active");
        require(msg.value > 0, "Donation amount must be greater than 0");
        
        // If first-time donor, add to tracking
        if (!isDonor[msg.sender]) {
            donorAddresses.push(msg.sender);
            isDonor[msg.sender] = true;
            
            donorInfo[msg.sender] = DonorInfo({
                donorAddress: msg.sender,
                totalContributed: msg.value,
                donationCount: 1,
                lastDonationTime: block.timestamp,
                firstDonationTime: block.timestamp
            });
        } else {
            // Update existing donor info
            donorInfo[msg.sender].totalContributed += msg.value;
            donorInfo[msg.sender].donationCount += 1;
            donorInfo[msg.sender].lastDonationTime = block.timestamp;
        }
        
        // Update legacy mapping for backward compatibility
        donorContributions[msg.sender] += msg.value;
        totalDonations += msg.value;
        
        emit DonationReceived(
            msg.sender, 
            msg.value, 
            totalDonations,
            donorInfo[msg.sender].totalContributed
        );
    }
    
    receive() external payable {
        _processDonation();
    }
    
    function donate() external payable {
        _processDonation();
    }
    
    // ============================================
    // EMERGENCY FUNCTIONS
    // ============================================
    
    function cancelContract() public onlyDonor contractActive {
        contractState = ContractState.Cancelled;
        
        // Return remaining funds to donor
        uint256 remainingBalance = address(this).balance;
        if (remainingBalance > 0) {
            (bool success, ) = payable(donor).call{value: remainingBalance}("");
            require(success, "Transfer failed");
        }
        
        emit ContractCancelled();
    }
    
    // Withdraw excess funds (if donor sent more than required)
    function withdrawExcess() public onlyDonor {
        uint256 excess = address(this).balance - (totalAmount - releasedAmount);
        require(excess > 0, "No excess funds to withdraw");
        
        (bool success, ) = payable(donor).call{value: excess}("");
        require(success, "Transfer failed");
    }
}