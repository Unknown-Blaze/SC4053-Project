# routers/nft.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.eth_client import w3
from typing import List, Optional
import json
import os

router = APIRouter()

# --- Pydantic Models ---
class MintRequest(BaseModel):
    recipient_address: str
    token_uri: str

class NFTMetadata(BaseModel):
    token_id: int
    token_uri: str
    owner: str
    project_name: Optional[str] = None
    donation_amount: Optional[float] = None
    timestamp: Optional[int] = None

class MintDonationNFTRequest(BaseModel):
    recipient_address: str
    project_name: str
    donation_amount: float
    project_contract_address: str
    milestone_name: str

def get_ngo_private_key():
    pk = os.getenv("NGO_PRIVATE_KEY")
    if not pk:
        raise ValueError("NGO_PRIVATE_KEY not found in .env file")
    return pk

def load_contract_data(file_name: str, contract_name: str):
    """
    Loads contract ABI and bytecode from Hardhat's artifacts.
    """
    current_dir = os.path.dirname(os.path.realpath(__file__))
    artifacts_path = os.path.join(
        os.path.dirname(current_dir), "artifacts", "contracts", f"{file_name}.sol", f"{contract_name}.json"
    )
    
    with open(artifacts_path, 'r') as f:
        data = json.load(f)
    return data['abi'], data['bytecode']

# --- Load the pre-compiled contract data on startup ---
NFT_CONTRACT_ADDRESS = os.getenv("NFT_CONTRACT_ADDRESS", "YOUR_DEPLOYED_NFT_CONTRACT_ADDRESS")
NFT_ABI, _ = load_contract_data('NFT', 'NGO_NFT')

# --- IPFS Helper (you can use Pinata, Infura, or local IPFS) ---
def create_nft_metadata(project_name: str, donation_amount: float, milestone_name: str, donor_address: str):
    """
    Creates NFT metadata JSON. In production, upload this to IPFS and return the URI.
    For now, returns a data URI or you can implement IPFS upload.
    """
    metadata = {
        "name": f"Donation Certificate - {project_name}",
        "description": f"Certificate of donation to {project_name}. Donated {donation_amount} ETH for milestone: {milestone_name}",
        "image": "ipfs://YOUR_IMAGE_HASH_HERE",  # Replace with actual image
        "attributes": [
            {"trait_type": "Project", "value": project_name},
            {"trait_type": "Donation Amount (ETH)", "value": donation_amount},
            {"trait_type": "Milestone", "value": milestone_name},
            {"trait_type": "Donor", "value": donor_address},
            {"trait_type": "Timestamp", "value": str(w3.eth.get_block('latest')['timestamp'])}
        ]
    }
    
    # In production, upload to IPFS and return ipfs://... URI
    # For now, return a JSON string or mock URI
    return f"data:application/json;base64,{json.dumps(metadata)}"

# --- Endpoints ---

@router.post("/mint")
def mint_token(request: MintRequest):
    """
    Generic NFT minting endpoint (original functionality)
    """
    try:
        ngo_private_key = get_ngo_private_key()
        ngo_account = w3.eth.account.from_key(ngo_private_key)
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        
        tx = nft_contract.functions.safeMint(
            w3.to_checksum_address(request.recipient_address),
            request.token_uri
        ).build_transaction({
            'from': ngo_account.address,
            'nonce': w3.eth.get_transaction_count(ngo_account.address),
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=ngo_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "status": "success",
            "transaction_hash": w3.to_hex(tx_hash),
            "contract_address": NFT_CONTRACT_ADDRESS
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mint-donation-nft")
def mint_donation_nft(request: MintDonationNFTRequest):
    """
    Mints an NFT as proof of donation to a specific project milestone.
    This creates a certificate NFT with donation details.
    """
    try:
        # Create metadata with donation info
        token_uri = create_nft_metadata(
            request.project_name,
            request.donation_amount,
            request.milestone_name,
            request.recipient_address
        )
        
        # Mint the NFT
        ngo_private_key = get_ngo_private_key()
        ngo_account = w3.eth.account.from_key(ngo_private_key)
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        
        tx = nft_contract.functions.safeMint(
            w3.to_checksum_address(request.recipient_address),
            token_uri
        ).build_transaction({
            'from': ngo_account.address,
            'nonce': w3.eth.get_transaction_count(ngo_account.address),
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=ngo_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "status": "success",
            "message": "Donation NFT minted successfully",
            "transaction_hash": w3.to_hex(tx_hash),
            "contract_address": NFT_CONTRACT_ADDRESS,
            "token_uri": token_uri
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mint donation NFT: {str(e)}")

@router.get("/tokens/{address}")
def get_user_nfts(address: str):
    """
    Gets all NFTs owned by a specific address (for gallery display)
    """
    try:
        checksum_address = w3.to_checksum_address(address)
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        
        balance = nft_contract.functions.balanceOf(checksum_address).call()
        tokens = []
        
        for i in range(balance):
            token_id = nft_contract.functions.tokenOfOwnerByIndex(checksum_address, i).call()
            token_uri = nft_contract.functions.tokenURI(token_id).call()
            
            # Parse metadata if it's a data URI
            metadata = None
            if token_uri.startswith("data:application/json"):
                try:
                    import base64
                    json_data = token_uri.split(",")[1]
                    decoded = base64.b64decode(json_data).decode('utf-8')
                    metadata = json.loads(decoded)
                except:
                    pass
            
            tokens.append({
                "token_id": token_id,
                "token_uri": token_uri,
                "owner": checksum_address,
                "metadata": metadata
            })
        
        return {
            "success": True,
            "count": balance,
            "tokens": tokens
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gallery/{address}")
def get_nft_gallery(address: str):
    """
    Enhanced gallery endpoint with formatted donation certificates
    """
    try:
        checksum_address = w3.to_checksum_address(address)
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        
        balance = nft_contract.functions.balanceOf(checksum_address).call()
        certificates = []
        
        for i in range(balance):
            token_id = nft_contract.functions.tokenOfOwnerByIndex(checksum_address, i).call()
            token_uri = nft_contract.functions.tokenURI(token_id).call()
            
            # Parse metadata
            metadata = None
            if token_uri.startswith("data:application/json"):
                try:
                    import base64
                    json_data = token_uri.split(",")[1]
                    decoded = base64.b64decode(json_data).decode('utf-8')
                    metadata = json.loads(decoded)
                except:
                    pass
            
            # Format for gallery display
            certificate = {
                "token_id": token_id,
                "name": metadata.get("name") if metadata else f"Certificate #{token_id}",
                "description": metadata.get("description") if metadata else "",
                "image": metadata.get("image") if metadata else "",
                "attributes": metadata.get("attributes", []) if metadata else []
            }
            
            certificates.append(certificate)
        
        return {
            "success": True,
            "address": checksum_address,
            "total_certificates": balance,
            "certificates": certificates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{address}")
def get_donor_stats(address: str):
    """
    Get donation statistics for a donor based on their NFTs
    """
    try:
        checksum_address = w3.to_checksum_address(address)
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        
        balance = nft_contract.functions.balanceOf(checksum_address).call()
        
        total_donated = 0.0
        projects_supported = set()
        milestones_completed = 0
        
        for i in range(balance):
            token_id = nft_contract.functions.tokenOfOwnerByIndex(checksum_address, i).call()
            token_uri = nft_contract.functions.tokenURI(token_id).call()
            
            if token_uri.startswith("data:application/json"):
                try:
                    import base64
                    json_data = token_uri.split(",")[1]
                    decoded = base64.b64decode(json_data).decode('utf-8')
                    metadata = json.loads(decoded)
                    
                    # Extract stats from attributes
                    for attr in metadata.get("attributes", []):
                        if attr.get("trait_type") == "Donation Amount (ETH)":
                            total_donated += float(attr.get("value", 0))
                        elif attr.get("trait_type") == "Project":
                            projects_supported.add(attr.get("value"))
                        elif attr.get("trait_type") == "Milestone":
                            milestones_completed += 1
                except:
                    pass
        
        return {
            "success": True,
            "address": checksum_address,
            "stats": {
                "total_nfts": balance,
                "total_donated_eth": total_donated,
                "projects_supported": len(projects_supported),
                "milestones_completed": milestones_completed,
                "projects_list": list(projects_supported)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Legacy endpoint for backwards compatibility
@router.get("/tokens")
def get_tokens(account_address: str):
    """
    Legacy endpoint - redirects to new format
    """
    return get_user_nfts(account_address)