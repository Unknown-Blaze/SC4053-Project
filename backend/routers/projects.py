from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
import json
from services.eth_client import w3

router = APIRouter()

# Load contract data
def load_contract_data(file_name: str, contract_name: str):
    """Load contract ABI and bytecode from Hardhat artifacts"""
    current_dir = os.path.dirname(os.path.realpath(__file__))
    artifacts_path = os.path.join(
        os.path.dirname(current_dir), "artifacts", "contracts", f"{file_name}.sol", f"{contract_name}.json"
    )
    with open(artifacts_path, 'r') as f:
        data = json.load(f)
    
    # Ensure bytecode has 0x prefix
    bytecode = data['bytecode']
    if not bytecode.startswith('0x'):
        bytecode = '0x' + bytecode
    
    return data['abi'], bytecode

# Load MultiMilestoneEscrow contract
MULTI_MILESTONE_ABI, MULTI_MILESTONE_BYTECODE = load_contract_data("MultiMilestoneEscrow", "MultiMilestoneEscrow")

# Pydantic models
class MilestoneRequest(BaseModel):
    name: str
    description: str
    amount: float

class CreateProjectRequest(BaseModel):
    name: str
    description: str
    contact_email: str
    eth_wallet_address: str
    milestones: List[MilestoneRequest]
    ngoName: str
    verifier_address: str

@router.post("/create-project")
async def create_project(request: CreateProjectRequest):
    """
    Create a new charity project and return unsigned transaction for MetaMask signing
    The NGO's wallet will pay for gas fees.
    """
    try:
        print(f"DEBUG: Starting project creation for {request.name}")
        
        # Validate inputs
        if not request.milestones:
            raise HTTPException(status_code=400, detail="At least one milestone is required")
        
        if not w3.is_address(request.eth_wallet_address):
            raise HTTPException(status_code=400, detail="Invalid recipient wallet address")
        
        if not w3.is_address(request.verifier_address):
            raise HTTPException(status_code=400, detail="Invalid verifier address")
        
        print("DEBUG: Converting addresses to checksum format")
        # Convert addresses to checksum format
        recipient_address = w3.to_checksum_address(request.eth_wallet_address)
        verifier_address = w3.to_checksum_address(request.verifier_address)
        
        # Debug logging
        print(f"DEBUG: Recipient address: '{recipient_address}'")
        print(f"DEBUG: Verifier address: '{verifier_address}'")
        
        print("DEBUG: Preparing milestone data")
        # Prepare milestone data for contract
        milestone_names = [m.name for m in request.milestones]
        milestone_descriptions = [m.description for m in request.milestones]
        milestone_amounts = [int(m.amount * 10**18) for m in request.milestones]  # Convert to wei
        
        print("DEBUG: Creating contract instance")
        # Create contract instance
        contract = w3.eth.contract(abi=MULTI_MILESTONE_ABI, bytecode=MULTI_MILESTONE_BYTECODE)
        
        print("DEBUG: Getting chain ID and nonce")
        # Get chain ID and nonce
        chain_id = w3.eth.chain_id
        nonce = w3.eth.get_transaction_count(recipient_address)
        
        print("DEBUG: Building constructor transaction")
        # Build constructor transaction
        constructor_tx = contract.constructor(
            recipient_address,
            verifier_address,
            milestone_names,
            milestone_descriptions,
            milestone_amounts
        ).build_transaction({
            'from': recipient_address,
            'nonce': nonce,
            'chainId': chain_id,
            'gas': 3000000  # Increased for safety
        })
        
        print("DEBUG: Constructor transaction built successfully")
        print(f"DEBUG: Transaction data field length: {len(constructor_tx.get('data', ''))}")
        
        # Clean up transaction for ethers.js compatibility
        # Remove gasPrice if present (let MetaMask handle gas)
        constructor_tx.pop('gasPrice', None)
        constructor_tx.pop('maxFeePerGas', None)
        constructor_tx.pop('maxPriorityFeePerGas', None)
        
        # Ensure gas is a hex string for ethers.js
        if 'gas' in constructor_tx and isinstance(constructor_tx['gas'], int):
            constructor_tx['gas'] = hex(constructor_tx['gas'])
        
        print(f"DEBUG: Final transaction: {constructor_tx}")
        
        # Return the unsigned transaction for frontend to sign with MetaMask
        return {
            "success": True,
            "message": "Contract deployment transaction prepared",
            "unsigned_transaction": constructor_tx,
            "contract_abi": MULTI_MILESTONE_ABI,
            "milestone_data": {
                "names": milestone_names,
                "descriptions": milestone_descriptions,
                "amounts": milestone_amounts
            }
        }
        
    except Exception as e:
        print(f"Error creating project: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")