from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import os
from web3 import Web3
from eth_account import Account
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()

# Load contract data
def load_contract_data(file_name: str, contract_name: str):
    current_dir = os.path.dirname(os.path.realpath(__file__))
    artifacts_path = os.path.join(
        os.path.dirname(current_dir), "build", "contracts", f"{contract_name}.json"
    )
    with open(artifacts_path, 'r') as f:
        data = json.load(f)
    return data['abi'], data['bytecode']

# Load MultiMilestoneEscrow contract
MULTI_MILESTONE_ABI, MULTI_MILESTONE_BYTECODE = load_contract_data('MultiMilestoneEscrow', 'MultiMilestoneEscrow')

# Web3 setup
ETHEREUM_NODE_URL = os.getenv("ETHEREUM_NODE_URL")
if not ETHEREUM_NODE_URL:
    raise ValueError("ETHEREUM_NODE_URL environment variable is required")
w3 = Web3(Web3.HTTPProvider(ETHEREUM_NODE_URL))

# Private key for contract deployment (should be from environment)
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
if not PRIVATE_KEY:
    raise ValueError("PRIVATE_KEY environment variable is required")

# Create account from private key
account = Account.from_key(PRIVATE_KEY)

class MilestoneData(BaseModel):
    name: str
    description: str
    amount: float  # Amount in ETH

class CreateProjectRequest(BaseModel):
    name: str
    description: str
    contact_email: str
    eth_wallet_address: str
    milestones: List[MilestoneData]
    ngoName: str
    verifier_address: str  # Address of the verifier (NGO admin)

class ProjectResponse(BaseModel):
    project_id: str
    contract_address: str
    transaction_hash: str
    total_amount_eth: float
    milestone_count: int
    status: str

@router.post("/create-project", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """
    Create a new charity project and deploy the MultiMilestoneEscrow contract
    """
    try:
        # Validate inputs
        if not request.milestones:
            raise HTTPException(status_code=400, detail="At least one milestone is required")
        
        if not w3.is_address(request.eth_wallet_address):
            raise HTTPException(status_code=400, detail="Invalid recipient wallet address")
        
        if not w3.is_address(request.verifier_address):
            raise HTTPException(status_code=400, detail="Invalid verifier address")
        
        # Convert addresses to checksum format
        recipient_address = w3.to_checksum_address(request.eth_wallet_address)
        verifier_address = w3.to_checksum_address(request.verifier_address)
        
        # Prepare milestone data for contract
        milestone_names = [m.name for m in request.milestones]
        milestone_descriptions = [m.description for m in request.milestones]
        milestone_amounts = [int(m.amount * 10**18) for m in request.milestones]  # Convert to wei
        
        # Calculate total amount
        total_amount_eth = sum(m.amount for m in request.milestones)
        
        # Deploy the contract
        contract = w3.eth.contract(abi=MULTI_MILESTONE_ABI, bytecode=MULTI_MILESTONE_BYTECODE)
        
        # Build constructor transaction
        constructor_tx = contract.constructor(
            recipient_address,  # recipient (checksum)
            verifier_address,   # verifier (checksum)
            milestone_names,
            milestone_descriptions,
            milestone_amounts
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 2000000,  # Sufficient gas for deployment
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send transaction
        signed_tx = w3.eth.account.sign_transaction(constructor_tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for transaction receipt
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        contract_address = tx_receipt.contractAddress
        
        if not contract_address:
            raise HTTPException(status_code=500, detail="Contract deployment failed")
        
        # Generate project ID (using timestamp + contract address)
        project_id = f"proj_{int(time.time())}_{contract_address[-8:]}"
        
        return ProjectResponse(
            project_id=project_id,
            contract_address=contract_address,
            transaction_hash=tx_hash.hex(),
            total_amount_eth=total_amount_eth,
            milestone_count=len(request.milestones),
            status="deployed"
        )
        
    except Exception as e:
        print(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.get("/project/{contract_address}")
async def get_project_info(contract_address: str):
    """
    Get project information from the deployed contract
    """
    try:
        if not w3.is_address(contract_address):
            raise HTTPException(status_code=400, detail="Invalid contract address")
        
        # Convert to checksum address
        checksum_address = w3.to_checksum_address(contract_address)
        
        # Create contract instance
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Get contract information
        donor = contract.functions.donor().call()
        recipient = contract.functions.recipient().call()
        verifier = contract.functions.verifier().call()
        total_amount = contract.functions.totalAmount().call()
        total_donations = contract.functions.getTotalDonations().call()
        donor_count = contract.functions.getDonorCount().call()
        funding_progress = contract.functions.getFundingProgress().call()
        milestone_count = contract.functions.getMilestoneCount().call()
        current_milestone = contract.functions.getCurrentMilestoneIndex().call()
        contract_state = contract.functions.contractState().call()
        
        # Get all milestones
        milestones = []
        for i in range(milestone_count):
            milestone = contract.functions.getMilestone(i).call()
            milestones.append({
                "index": i,
                "name": milestone[0],
                "description": milestone[1],
                "amount": milestone[2],
                "isCompleted": milestone[3],
                "isVerified": milestone[4],
                "completionTime": milestone[5],
                "verificationHash": milestone[6]
            })
        
        return {
            "contract_address": contract_address,
            "donor": donor,
            "recipient": recipient,
            "verifier": verifier,
            "total_amount_wei": total_amount,
            "total_amount_eth": w3.from_wei(total_amount, 'ether'),
            "total_donations_wei": total_donations,
            "total_donations_eth": w3.from_wei(total_donations, 'ether'),
            "donor_count": donor_count,
            "funding_progress": funding_progress,
            "milestone_count": milestone_count,
            "current_milestone": current_milestone,
            "contract_state": contract_state,
            "milestones": milestones
        }
        
    except Exception as e:
        print(f"Error getting project info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get project info: {str(e)}")

@router.post("/project/{contract_address}/complete-milestone")
async def complete_milestone(contract_address: str, milestone_index: int, verification_hash: str):
    """
    Complete a milestone (called by NGO)
    """
    try:
        if not w3.is_address(contract_address):
            raise HTTPException(status_code=400, detail="Invalid contract address")
        
        # Convert to checksum address
        checksum_address = w3.to_checksum_address(contract_address)
        
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Build transaction
        tx = contract.functions.completeMilestone(milestone_index, verification_hash).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        return {"transaction_hash": tx_hash.hex(), "status": "pending"}
        
    except Exception as e:
        print(f"Error completing milestone: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete milestone: {str(e)}")

@router.post("/project/{contract_address}/verify-milestone")
async def verify_milestone(contract_address: str, milestone_index: int):
    """
    Verify a milestone (called by verifier)
    """
    try:
        if not w3.is_address(contract_address):
            raise HTTPException(status_code=400, detail="Invalid contract address")
        
        # Convert to checksum address
        checksum_address = w3.to_checksum_address(contract_address)
        
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Build transaction
        tx = contract.functions.verifyMilestone(milestone_index).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        return {"transaction_hash": tx_hash.hex(), "status": "pending"}
        
    except Exception as e:
        print(f"Error verifying milestone: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to verify milestone: {str(e)}")
