# routers/nft.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.eth_client import w3
import json  # <-- Import json
import os    # <-- Import os

router = APIRouter()

# --- Pydantic Models and Helper (No Changes) ---
class MintRequest(BaseModel):
    recipient_address: str
    token_uri: str

def get_ngo_private_key():
    pk = os.getenv("NGO_PRIVATE_KEY")
    if not pk:
        raise ValueError("NGO_PRIVATE_KEY not found in .env file")
    return pk

# --- FINAL, CORRECT function to load pre-compiled contract data from Hardhat ---
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
NFT_CONTRACT_ADDRESS = "YOUR_DEPLOYED_NFT_CONTRACT_ADDRESS"
NFT_ABI, _ = load_contract_data('NFT', 'NGO_NFT')

# --- All your endpoints below this line are correct and need no changes ---

@router.post("/mint")
def mint_token(request: MintRequest):
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
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        return {
            "status": "success",
            "transaction_hash": w3.to_hex(tx_hash),
            "contract_address": NFT_CONTRACT_ADDRESS
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tokens")
def get_tokens(account_address: str):
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