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
    
    Milestone[] public milestones;
    uint256 public currentMilestoneIndex;
    uint256 public totalAmount;
    uint256 public releasedAmount;
    uint256 public totalDonations; // Track total donations received
    
    // Donation tracking
    mapping(address => uint256) public donorContributions;
    address[] public donors;
    
    // Contract states
    enum ContractState { Active, Completed, Cancelled }
    ContractState public contractState;
    
    // Events
    event MilestoneCreated(uint256 indexed milestoneIndex, string name, uint256 amount);
    event MilestoneCompleted(uint256 indexed milestoneIndex, string verificationHash);
    event MilestoneVerified(uint256 indexed milestoneIndex);
    event FundsReleased(uint256 indexed milestoneIndex, uint256 amount);
    event DonationReceived(address indexed donor, uint256 amount, uint256 totalDonations);
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
    
    // View functions for milestone information
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
        return donors.length;
    }
    
    function getDonorContribution(address _donor) public view returns (uint256) {
        return donorContributions[_donor];
    }
    
    function getAllDonors() public view returns (address[] memory) {
        return donors;
    }
    
    function getFundingProgress() public view returns (uint256) {
        if (totalAmount == 0) return 0;
        return (totalDonations * 100) / totalAmount; // Returns percentage
    }
    
    // Milestone completion (can be called by recipient or verifier)
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
    
    // Emergency functions
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
    
    // Function to receive donations
    receive() external payable {
        require(contractState == ContractState.Active, "Contract is not active");
        require(msg.value > 0, "Donation amount must be greater than 0");
        
        // Track donation
        if (donorContributions[msg.sender] == 0) {
            donors.push(msg.sender); // Add new donor to list
        }
        donorContributions[msg.sender] += msg.value;
        totalDonations += msg.value;
        
        emit DonationReceived(msg.sender, msg.value, totalDonations);
    }
    
    // Function to donate with explicit call
    function donate() external payable {
        require(contractState == ContractState.Active, "Contract is not active");
        require(msg.value > 0, "Donation amount must be greater than 0");
        
        // Track donation
        if (donorContributions[msg.sender] == 0) {
            donors.push(msg.sender); // Add new donor to list
        }
        donorContributions[msg.sender] += msg.value;
        totalDonations += msg.value;
        
        emit DonationReceived(msg.sender, msg.value, totalDonations);
    }
}
