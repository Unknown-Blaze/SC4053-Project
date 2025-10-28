from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
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

class DonorInfo(BaseModel):
    address: str
    total_donated: float
    donation_count: int
    nft_minted: bool

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
        recipient_address = w3.to_checksum_address(request.eth_wallet_address)
        verifier_address = w3.to_checksum_address(request.verifier_address)
        
        print(f"DEBUG: Recipient address: '{recipient_address}'")
        print(f"DEBUG: Verifier address: '{verifier_address}'")
        
        print("DEBUG: Preparing milestone data")
        milestone_names = [m.name for m in request.milestones]
        milestone_descriptions = [m.description for m in request.milestones]
        milestone_amounts = [int(m.amount * 10**18) for m in request.milestones]
        
        print("DEBUG: Creating contract instance")
        contract = w3.eth.contract(abi=MULTI_MILESTONE_ABI, bytecode=MULTI_MILESTONE_BYTECODE)
        
        print("DEBUG: Getting chain ID and nonce")
        chain_id = w3.eth.chain_id
        nonce = w3.eth.get_transaction_count(recipient_address)
        
        print("DEBUG: Building constructor transaction")
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
            'gas': 3000000
        })
        
        print("DEBUG: Constructor transaction built successfully")
        
        # Clean up transaction for ethers.js compatibility
        constructor_tx.pop('gasPrice', None)
        constructor_tx.pop('maxFeePerGas', None)
        constructor_tx.pop('maxPriorityFeePerGas', None)
        
        if 'gas' in constructor_tx and isinstance(constructor_tx['gas'], int):
            constructor_tx['gas'] = hex(constructor_tx['gas'])
        
        print(f"DEBUG: Final transaction: {constructor_tx}")
        
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

@router.get("/project/{contract_address}/donors")
async def get_project_donors(contract_address: str, limit: int = 10):
    """
    Get top donors for a specific project by analyzing the contract's events
    """
    try:
        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Get all donation events (assuming you have a Donated event in your contract)
        # This is a simplified version - you'll need to adjust based on your contract events
        
        # For now, we'll return a structure that can be populated from frontend
        # or you can implement event filtering here
        
        return {
            "success": True,
            "contract_address": checksum_address,
            "top_donors": [],  # Will be populated by analyzing events
            "message": "Use frontend to track donations or implement event filtering"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get donors: {str(e)}")

@router.get("/project/{contract_address}/details")
async def get_project_details(contract_address: str):
    """
    Get detailed information about a project including milestones and donation stats
    """
    try:
        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Get milestone count
        try:
            milestone_count = contract.functions.getMilestoneCount().call()
        except:
            milestone_count = 0
        
        # Get recipient and verifier
        try:
            recipient = contract.functions.recipient().call()
            verifier = contract.functions.verifier().call()
        except:
            recipient = None
            verifier = None
        
        milestones = []
        total_raised = 0
        total_goal = 0
        
        for i in range(milestone_count):
            try:
                milestone = contract.functions.getMilestone(i).call()
                # milestone structure: (name, description, amount, amountRaised, completed, released)
                milestone_data = {
                    "index": i,
                    "name": milestone[0],
                    "description": milestone[1],
                    "amount": w3.from_wei(milestone[2], 'ether'),
                    "amount_raised": w3.from_wei(milestone[3], 'ether'),
                    "completed": milestone[4],
                    "released": milestone[5]
                }
                milestones.append(milestone_data)
                total_raised += milestone[3]
                total_goal += milestone[2]
            except Exception as e:
                print(f"Error getting milestone {i}: {e}")
        
        return {
            "success": True,
            "contract_address": checksum_address,
            "recipient": recipient,
            "verifier": verifier,
            "milestones": milestones,
            "total_raised_wei": total_raised,
            "total_raised_eth": w3.from_wei(total_raised, 'ether'),
            "total_goal_wei": total_goal,
            "total_goal_eth": w3.from_wei(total_goal, 'ether'),
            "progress_percentage": (total_raised / total_goal * 100) if total_goal > 0 else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project details: {str(e)}")

@router.post("/project/{contract_address}/donate")
async def prepare_donation(
    contract_address: str,
    milestone_index: int,
    donor_address: str,
    amount_eth: float
):
    """
    Prepare a donation transaction for the frontend to sign with MetaMask
    """
    try:
        checksum_contract = w3.to_checksum_address(contract_address)
        checksum_donor = w3.to_checksum_address(donor_address)
        contract = w3.eth.contract(address=checksum_contract, abi=MULTI_MILESTONE_ABI)
        
        amount_wei = w3.to_wei(amount_eth, 'ether')
        
        # Build the transaction
        tx = contract.functions.donate(milestone_index).build_transaction({
            'from': checksum_donor,
            'value': amount_wei,
            'nonce': w3.eth.get_transaction_count(checksum_donor),
            'chainId': w3.eth.chain_id,
            'gas': 300000
        })
        
        # Clean up for ethers.js
        tx.pop('gasPrice', None)
        tx.pop('maxFeePerGas', None)
        tx.pop('maxPriorityFeePerGas', None)
        
        if 'gas' in tx and isinstance(tx['gas'], int):
            tx['gas'] = hex(tx['gas'])
        
        return {
            "success": True,
            "message": "Donation transaction prepared",
            "unsigned_transaction": tx,
            "amount_eth": amount_eth,
            "milestone_index": milestone_index
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to prepare donation: {str(e)}")

@router.post("/project/{contract_address}/mint-nft")
async def request_donation_nft(
    contract_address: str,
    donor_address: str,
    milestone_index: int
):
    """
    Request an NFT to be minted for a donation.
    This should be called after a successful donation.
    """
    try:
        from routers.nft import mint_donation_nft, MintDonationNFTRequest
        
        checksum_contract = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_contract, abi=MULTI_MILESTONE_ABI)
        
        # Get milestone details
        milestone = contract.functions.getMilestone(milestone_index).call()
        milestone_name = milestone[0]
        
        # Get project name (you might want to store this differently)
        project_name = f"Project at {checksum_contract[:10]}..."
        
        # Get donation amount from events or calculate from milestone
        donation_amount = w3.from_wei(milestone[3], 'ether')  # This is total raised, not individual
        
        # Create NFT minting request
        mint_request = MintDonationNFTRequest(
            recipient_address=donor_address,
            project_name=project_name,
            donation_amount=donation_amount,
            project_contract_address=contract_address,
            milestone_name=milestone_name
        )
        
        # Call the NFT minting function
        result = mint_donation_nft(mint_request)
        
        return {
            "success": True,
            "message": "NFT minted successfully as proof of donation",
            "nft_details": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mint NFT: {str(e)}")

@router.get("/project/{contract_address}/leaderboard")
async def get_project_leaderboard(contract_address: str, limit: int = 10):
    """
    Get the top donors leaderboard for a project
    """
    try:
        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Get top donors from contract
        top_donors = contract.functions.getTopDonors(limit).call()
        addresses, amounts, donation_counts = top_donors
        
        leaderboard = []
        for i in range(len(addresses)):
            leaderboard.append({
                "rank": i + 1,
                "address": addresses[i],
                "total_donated_wei": amounts[i],
                "total_donated_eth": w3.from_wei(amounts[i], 'ether'),
                "donation_count": donation_counts[i],
                "shortened_address": f"{addresses[i][:6]}...{addresses[i][-4:]}"
            })
        
        return {
            "success": True,
            "contract_address": checksum_address,
            "leaderboard": leaderboard,
            "total_shown": len(leaderboard)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get leaderboard: {str(e)}")

@router.get("/project/{contract_address}/stats")
async def get_project_stats(contract_address: str):
    """
    Get comprehensive statistics for a project
    """
    try:
        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Get project stats
        stats = contract.functions.getProjectStats().call()
        total_raised, total_goal, completed_milestones, total_milestones, total_donors = stats
        
        return {
            "success": True,
            "contract_address": checksum_address,
            "stats": {
                "total_raised_wei": total_raised,
                "total_raised_eth": w3.from_wei(total_raised, 'ether'),
                "total_goal_wei": total_goal,
                "total_goal_eth": w3.from_wei(total_goal, 'ether'),
                "progress_percentage": (total_raised / total_goal * 100) if total_goal > 0 else 0,
                "completed_milestones": completed_milestones,
                "total_milestones": total_milestones,
                "total_donors": total_donors,
                "completion_rate": (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project stats: {str(e)}")

@router.get("/donor/{address}/profile")
async def get_donor_profile(address: str):
    """
    Get donor profile across all their donations and NFTs
    """
    try:
        from routers.nft import get_donor_stats
        
        checksum_address = w3.to_checksum_address(address)
        
        # Get NFT stats
        nft_stats = get_donor_stats(checksum_address)
        
        return {
            "success": True,
            "donor_address": checksum_address,
            "profile": nft_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get donor profile: {str(e)}")