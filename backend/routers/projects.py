from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from services.eth_client import w3
from services.project_ipfs import upload_project_metadata

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

class MintNFTAfterDonationRequest(BaseModel):
    donor_address: str
    project_name: str
    milestone_name: str  
    donation_amount: float
    transaction_hash: str

@router.post("/create-project")
async def create_project(request: CreateProjectRequest):
    """
    Create a new charity project and return unsigned transaction for MetaMask signing
    The NGO's wallet will pay for gas fees.
    Optionally uploads project metadata to IPFS if enabled.
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
        milestone_amounts = [int(m.amount * 10**18) for m in request.milestones]
        
        # 🆕 IPFS INTEGRATION: Upload project metadata to IPFS (optional)
        ipfs_hash = None
        use_ipfs = os.getenv("USE_IPFS_PROJECTS", "false").lower() == "true"
        
        if use_ipfs:
            try:
                print("DEBUG: Uploading project metadata to IPFS...")
                ipfs_hash = upload_project_metadata(
                    name=request.name,
                    description=request.description,
                    ngo_name=request.ngoName,
                    contact_email=request.contact_email,
                    milestones=[{
                        "name": m.name,
                        "description": m.description,
                        "amount": m.amount
                    } for m in request.milestones],
                    eth_wallet_address=request.eth_wallet_address
                )
                print(f"✅ Project metadata uploaded to IPFS: ipfs://{ipfs_hash}")
            except Exception as ipfs_error:
                print(f"⚠️ IPFS upload failed (continuing without it): {str(ipfs_error)}")
                # Don't fail the entire request if IPFS upload fails
        
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
        response = {
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
        
        # 🆕 Add IPFS hash to response if available
        if ipfs_hash:
            response["ipfs_metadata_hash"] = ipfs_hash
            response["ipfs_metadata_uri"] = f"ipfs://{ipfs_hash}"
        
        return response
        
    except Exception as e:
        print(f"Error creating project: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.get("/all")
async def get_all_projects():
    """
    Get all projects from Firebase with IPFS metadata when available
    """
    try:
        from firebase_admin import firestore
        db = firestore.client()
        
        # Fetch all projects from Firebase
        projects_ref = db.collection('charity_projects')
        docs = projects_ref.stream()
        
        projects = []
        for doc in docs:
            project_data = doc.to_dict()
            project_data['id'] = doc.id
            
            # If project has IPFS metadata, optionally fetch and merge
            if 'ipfs_metadata_hash' in project_data and project_data['ipfs_metadata_hash']:
                ipfs_hash = project_data['ipfs_metadata_hash']
                project_data['ipfs_url'] = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
                
                # Optionally fetch IPFS data for verification
                # This is commented out to avoid slowing down the response
                # Uncomment if you want to verify IPFS data matches Firebase
                # try:
                #     from services.ipfs_client import fetch_from_ipfs
                #     ipfs_data = fetch_from_ipfs(ipfs_hash)
                #     project_data['ipfs_verified'] = True
                # except:
                #     project_data['ipfs_verified'] = False
            
            projects.append(project_data)
        
        return {
            "success": True,
            "count": len(projects),
            "projects": projects
        }
        
    except Exception as e:
        print(f"Error fetching projects: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

@router.get("/project/{contract_address}/details")
async def get_project_details(contract_address: str):
    """
    Get detailed information about a project including milestones and donation stats
    """
    try:
        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Get basic contract info
        recipient = contract.functions.recipient().call()
        verifier = contract.functions.verifier().call()
        total_donations = contract.functions.getTotalDonations().call()
        total_amount = contract.functions.totalAmount().call()
        donor_count = contract.functions.getDonorCount().call()
        
        # Get milestone count
        milestone_count = contract.functions.getMilestoneCount().call()
        
        milestones = []
        for i in range(milestone_count):
            milestone = contract.functions.getMilestone(i).call()
            milestone_data = {
                "index": i,
                "name": milestone[0],
                "description": milestone[1],
                "amount_wei": milestone[2],
                "amount_eth": w3.from_wei(milestone[2], 'ether'),
                "is_completed": milestone[3],
                "is_verified": milestone[4],
                "completion_time": milestone[5],
                "verification_hash": milestone[6]
            }
            milestones.append(milestone_data)
        
        return {
            "success": True,
            "contract_address": checksum_address,
            "recipient": recipient,
            "verifier": verifier,
            "total_donations_wei": total_donations,
            "total_donations_eth": float(w3.from_wei(total_donations, 'ether')),
            "total_goal_wei": total_amount,
            "total_goal_eth": float(w3.from_wei(total_amount, 'ether')),
            "progress_percentage": (total_donations / total_amount * 100) if total_amount > 0 else 0,
            "donor_count": donor_count,
            "milestones": milestones
        }
        
    except Exception as e:
        print(f"Error getting project details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get project details: {str(e)}")

@router.get("/project/{contract_address}/top-donors")
async def get_top_donors(contract_address: str, limit: int = 10):
    """
    Get top donors for a specific project
    """
    try:
        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        # Get all donors
        donor_count = contract.functions.getDonorCount().call()
        all_donors = contract.functions.getAllDonors().call()
        
        # Get contribution for each donor
        donor_data = []
        for donor_address in all_donors:
            contribution = contract.functions.getDonorContribution(donor_address).call()
            donor_data.append({
                "address": donor_address,
                "contribution_wei": contribution,
                "contribution_eth": float(w3.from_wei(contribution, 'ether')),
                "shortened_address": f"{donor_address[:6]}...{donor_address[-4:]}"
            })
        
        # Sort by contribution (descending)
        donor_data.sort(key=lambda x: x['contribution_wei'], reverse=True)
        
        # Limit results
        top_donors = donor_data[:limit]
        
        # Add rank
        for i, donor in enumerate(top_donors):
            donor['rank'] = i + 1
        
        return {
            "success": True,
            "contract_address": checksum_address,
            "total_donors": donor_count,
            "showing": len(top_donors),
            "top_donors": top_donors
        }
        
    except Exception as e:
        print(f"Error getting top donors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get top donors: {str(e)}")

@router.get("/project/{contract_address}/donor-rank/{donor_address}")
async def get_donor_rank(contract_address: str, donor_address: str):
    """
    Get a specific donor's rank in the project leaderboard
    """
    try:
        checksum_contract = w3.to_checksum_address(contract_address)
        checksum_donor = w3.to_checksum_address(donor_address)
        contract = w3.eth.contract(address=checksum_contract, abi=MULTI_MILESTONE_ABI)
        
        # Get donor's contribution
        donor_contribution = contract.functions.getDonorContribution(checksum_donor).call()
        
        if donor_contribution == 0:
            return {
                "success": True,
                "is_donor": False,
                "message": "Address has not donated to this project"
            }
        
        # Get all donors and their contributions
        all_donors = contract.functions.getAllDonors().call()
        
        rank = 1
        for other_donor in all_donors:
            if other_donor != checksum_donor:
                other_contribution = contract.functions.getDonorContribution(other_donor).call()
                if other_contribution > donor_contribution:
                    rank += 1
        
        return {
            "success": True,
            "is_donor": True,
            "donor_address": checksum_donor,
            "rank": rank,
            "contribution_wei": donor_contribution,
            "contribution_eth": float(w3.from_wei(donor_contribution, 'ether')),
            "total_donors": len(all_donors)
        }
        
    except Exception as e:
        print(f"Error getting donor rank: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get donor rank: {str(e)}")

@router.post("/project/{contract_address}/mint-certificate")
async def mint_certificate_after_donation(
    contract_address: str,
    request: MintNFTAfterDonationRequest
):
    """
    Mint an NFT certificate after a successful donation
    This endpoint is called by the frontend after donation transaction is confirmed
    """
    try:
        from routers.nft import mint_donation_certificate, MintDonationNFTRequest
        
        # Create NFT minting request with milestone name
        mint_request = MintDonationNFTRequest(
            recipient_address=request.donor_address,
            project_name=request.project_name,
            milestone_name=request.milestone_name,
            donation_amount=request.donation_amount,
            project_contract_address=contract_address,
            transaction_hash=request.transaction_hash
        )
        
        # Call the NFT minting function
        result = mint_donation_certificate(mint_request)
        
        return {
            "success": True,
            "message": "Donation certificate NFT minted successfully",
            "nft_details": result
        }
        
    except Exception as e:
        print(f"Error minting certificate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mint NFT certificate: {str(e)}")

@router.get("/project/{contract_address}/stats")
async def get_project_stats(contract_address: str):
    """
    Get comprehensive statistics for a project
    """
    try:
        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=MULTI_MILESTONE_ABI)
        
        total_donations = contract.functions.getTotalDonations().call()
        total_amount = contract.functions.totalAmount().call()
        donor_count = contract.functions.getDonorCount().call()
        funding_progress = contract.functions.getFundingProgress().call()
        
        # Count completed milestones
        milestone_count = contract.functions.getMilestoneCount().call()
        completed_milestones = 0
        
        for i in range(milestone_count):
            milestone = contract.functions.getMilestone(i).call()
            if milestone[4]:  # is_verified
                completed_milestones += 1
        
        return {
            "success": True,
            "contract_address": checksum_address,
            "stats": {
                "total_raised_wei": total_donations,
                "total_raised_eth": float(w3.from_wei(total_donations, 'ether')),
                "total_goal_wei": total_amount,
                "total_goal_eth": float(w3.from_wei(total_amount, 'ether')),
                "funding_progress_percentage": funding_progress,
                "total_donors": donor_count,
                "total_milestones": milestone_count,
                "completed_milestones": completed_milestones,
                "completion_rate": (completed_milestones / milestone_count * 100) if milestone_count > 0 else 0
            }
        }
        
    except Exception as e:
        print(f"Error getting project stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get project stats: {str(e)}")