# routers/nft.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.eth_client import w3
from typing import List, Optional
import json
import os
import base64

router = APIRouter()

# --- Pydantic Models ---
class MintRequest(BaseModel):
    recipient_address: str
    token_uri: str

class MintDonationNFTRequest(BaseModel):
    recipient_address: str
    project_name: str
    milestone_name: str
    donation_amount: float
    project_contract_address: str
    transaction_hash: str

def get_platform_private_key():
    pk = os.getenv("NGO_PRIVATE_KEY")
    if not pk:
        raise ValueError("NGO_PRIVATE_KEY not found in .env file")
    return pk

def load_contract_data(file_name: str, contract_name: str):
    """
    Loads contract ABI and bytecode from Hardhat's artifacts.
    :param file_name: The name of the .sol file (e.g., "NFT")
    :param contract_name: The name of the contract inside the file (e.g., "NGO_NFT")
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

# --- Helper function to create NFT metadata ---
def create_nft_metadata(project_name: str, milestone_name: str, donation_amount: float, donor_address: str, tx_hash: str):
    """
    Creates NFT metadata JSON for a donation certificate
    In production, you would upload this to IPFS and return the IPFS URI
    """
    # Determine tier based on amount
    if donation_amount >= 1.0:
        tier = "Platinum"
        tier_emoji = "💎"
    elif donation_amount >= 0.5:
        tier = "Gold"
        tier_emoji = "🥇"
    elif donation_amount >= 0.1:
        tier = "Silver"
        tier_emoji = "🥈"
    elif donation_amount >= 0.01:
        tier = "Bronze"
        tier_emoji = "🥉"
    else:
        tier = "Supporter"
        tier_emoji = "⭐"
    
    metadata = {
        "name": f"Donation Certificate - {project_name}",
        "description": f"Certificate of donation to {project_name}. Donated {donation_amount} ETH. Thank you for your contribution!",
        "image": "ipfs://QmYourImageHashHere",  # Replace with actual certificate image
        "attributes": [
            {"trait_type": "Project", "value": project_name},
            {"trait_type": "Milestone", "value": milestone_name},
            {"trait_type": "Donation Amount (ETH)", "value": donation_amount},
            {"trait_type": "Tier", "value": f"{tier_emoji} {tier}"},
            {"trait_type": "Donor", "value": donor_address},
            {"trait_type": "Transaction Hash", "value": tx_hash},
            {"trait_type": "Timestamp", "value": str(w3.eth.get_block('latest')['timestamp'])}
        ]
    }
    
    # Convert to base64 data URI (temporary solution until IPFS is set up)
    metadata_json = json.dumps(metadata)
    metadata_base64 = base64.b64encode(metadata_json.encode()).decode()
    return f"data:application/json;base64,{metadata_base64}"

# --- ENDPOINTS ---

@router.post("/mint")
def mint_token(request: MintRequest):
    """
    Basic NFT minting endpoint (for manual minting)
    """
    try:
        ngo_private_key = get_platform_private_key()
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

@router.post("/mint-donation-certificate")
def mint_donation_certificate(request: MintDonationNFTRequest):
    """
    Mint an NFT certificate for a donation
    Called after a successful donation to create proof of contribution
    """
    try:
        # Validate addresses
        if not w3.is_address(request.recipient_address):
            raise HTTPException(status_code=400, detail="Invalid recipient address")

        if not w3.is_address(request.project_contract_address):
            raise HTTPException(status_code=400, detail="Invalid project contract address")

        # Create metadata with donation details
        token_uri = create_nft_metadata(
            request.project_name,
            request.milestone_name,
            request.donation_amount,
            request.recipient_address,
            request.transaction_hash
        )

        # Load NGO account
        ngo_private_key = get_platform_private_key()
        ngo_account = w3.eth.account.from_key(ngo_private_key)
        nft_contract = w3.eth.contract(
            address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS),
            abi=NFT_ABI
        )

        # Estimate gas dynamically
        estimated_gas = nft_contract.functions.safeMint(
            w3.to_checksum_address(request.recipient_address),
            token_uri
        ).estimate_gas({'from': ngo_account.address})

        # Build transaction (add 20% buffer)
        tx = nft_contract.functions.safeMint(
            w3.to_checksum_address(request.recipient_address),
            token_uri
        ).build_transaction({
            'from': ngo_account.address,
            'nonce': w3.eth.get_transaction_count(ngo_account.address),
            'gas': int(estimated_gas * 1.2),
            'gasPrice': w3.eth.gas_price
        })

        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=ngo_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        return {
            "success": True,
            "message": "Donation certificate NFT minted successfully",
            "nft_transaction_hash": w3.to_hex(tx_hash),
            "nft_contract_address": NFT_CONTRACT_ADDRESS,
            "token_uri": token_uri,
            "donation_details": {
                "project": request.project_name,
                "milestone": request.milestone_name,
                "amount": request.donation_amount,
                "original_tx": request.transaction_hash
            }
        }

    except Exception as e:
        print(f"Error minting donation NFT: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to mint NFT: {str(e)}")

@router.get("/gallery/{address}")
def get_nft_gallery(address: str):
    """
    Get all NFT certificates owned by an address (for gallery display)
    """
    try:
        checksum_address = w3.to_checksum_address(address)
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        
        # Get balance
        balance = nft_contract.functions.balanceOf(checksum_address).call()
        print(f"Balance: {balance}")

        certificates = []
        for i in range(balance):
            try:
                # Get token ID
                token_id = nft_contract.functions.tokenOfOwnerByIndex(checksum_address, i).call()
                
                # Get token URI
                token_uri = nft_contract.functions.tokenURI(token_id).call()
                
                # Parse metadata if it's a data URI
                metadata = None
                if token_uri.startswith("data:application/json;base64,"):
                    try:
                        json_data = token_uri.split(",")[1]
                        decoded = base64.b64decode(json_data).decode('utf-8')
                        metadata = json.loads(decoded)
                    except Exception as e:
                        print(f"Error parsing metadata for token {token_id}: {e}")
                        metadata = None
                print(f"Metadata : {metadata}")
                
                # Format certificate data
                certificate = {
                    "token_id": token_id,
                    "token_uri": token_uri,
                    "name": metadata.get("name") if metadata else f"Certificate #{token_id}",
                    "description": metadata.get("description") if metadata else "",
                    "image": metadata.get("image") if metadata else "",
                    "attributes": metadata.get("attributes", []) if metadata else []
                }
                
                print(f"Certificate : {certificate}")
                certificates.append(certificate)
            except Exception as e:
                print(f"Error processing token {i}: {e}")
                continue
        
        print(f"All Certificates : {certificates}")
        return {
            "success": True,
            "address": checksum_address,
            "total_certificates": balance,
            "certificates": certificates,
            "nft_contract": NFT_CONTRACT_ADDRESS
        }
    except Exception as e:
        print(f"Error getting NFT gallery: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{address}")
def get_donor_stats(address: str):
    """
    Get donation statistics based on NFT certificates owned
    """
    try:
        checksum_address = w3.to_checksum_address(address)
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        
        balance = nft_contract.functions.balanceOf(checksum_address).call()
        
        total_donated = 0.0
        projects_supported = set()
        donation_count = 0
        tier_counts = {"Platinum": 0, "Gold": 0, "Silver": 0, "Bronze": 0, "Supporter": 0}
        
        for i in range(balance):
            try:
                token_id = nft_contract.functions.tokenOfOwnerByIndex(checksum_address, i).call()
                token_uri = nft_contract.functions.tokenURI(token_id).call()
                
                # Parse metadata
                if token_uri.startswith("data:application/json;base64,"):
                    json_data = token_uri.split(",")[1]
                    decoded = base64.b64decode(json_data).decode('utf-8')
                    metadata = json.loads(decoded)
                    
                    # Extract stats from attributes
                    for attr in metadata.get("attributes", []):
                        if attr.get("trait_type") == "Donation Amount (ETH)":
                            total_donated += float(attr.get("value", 0))
                            donation_count += 1
                        elif attr.get("trait_type") == "Project":
                            projects_supported.add(attr.get("value"))
                        elif attr.get("trait_type") == "Tier":
                            tier_value = attr.get("value", "")
                            for tier in tier_counts.keys():
                                if tier in tier_value:
                                    tier_counts[tier] += 1
                                    break
            except Exception as e:
                print(f"Error processing token {i} for stats: {e}")
                continue
        
        # Determine overall tier based on total donated
        if total_donated >= 1.0:
            overall_tier = "💎 Platinum"
        elif total_donated >= 0.5:
            overall_tier = "🥇 Gold"
        elif total_donated >= 0.1:
            overall_tier = "🥈 Silver"
        elif total_donated >= 0.01:
            overall_tier = "🥉 Bronze"
        else:
            overall_tier = "⭐ Supporter"
        
        return {
            "success": True,
            "address": checksum_address,
            "stats": {
                "total_nfts": balance,
                "total_donated_eth": round(total_donated, 6),
                "projects_supported": len(projects_supported),
                "donation_count": donation_count,
                "overall_tier": overall_tier,
                "tier_breakdown": tier_counts,
                "projects_list": list(projects_supported)
            }
        }
    except Exception as e:
        print(f"Error getting donor stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tokens")
def get_tokens(account_address: str):
    """
    Legacy endpoint - Get basic token info
    """
    try:
        nft_contract = w3.eth.contract(address=w3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)
        balance = nft_contract.functions.balanceOf(w3.to_checksum_address(account_address)).call()
        tokens = []
        
        for i in range(balance):
            token_id = nft_contract.functions.tokenOfOwnerByIndex(w3.to_checksum_address(account_address), i).call()
            token_uri = nft_contract.functions.tokenURI(token_id).call()
            tokens.append({"token_id": token_id, "token_uri": token_uri})
        
        return {"tokens": tokens}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/contract-info")
def get_contract_info():
    """
    Get NFT contract information
    """
    try:
        return {
            "success": True,
            "nft_contract_address": NFT_CONTRACT_ADDRESS,
            "network": "Sepolia Testnet",
            "explorer_url": f"https://sepolia.etherscan.io/address/{NFT_CONTRACT_ADDRESS}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))