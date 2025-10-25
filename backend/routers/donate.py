# routers/donate.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
import time
from services.eth_client import w3
import json
import os

router = APIRouter()

# --- (Models and load_contract_data are correct) ---
class Milestone(BaseModel):
    task: str
    amount: float
    time: datetime

class PrepareDonationRequest(BaseModel):
    donor_address: str
    recipient_address: str
    milestones: List[Milestone]

class PrepareEscrowActionRequest(BaseModel):
    donor_address: str
    escrow_contract_address: str

def load_contract_data(file_name: str, contract_name: str):
    current_dir = os.path.dirname(os.path.realpath(__file__))
    artifacts_path = os.path.join(
        os.path.dirname(current_dir), "artifacts", "contracts", f"{file_name}.sol", f"{contract_name}.json"
    )
    with open(artifacts_path, 'r') as f:
        data = json.load(f)
    # Hardhat JSON structure has 'abi' and 'bytecode' directly
    return data['abi'], data['bytecode']

ESCROW_ABI, ESCROW_BYTECODE = load_contract_data('Escrow', 'Escrow')


# --- Helper function to convert tx for ethers.js ---
def convert_tx_for_ethers(tx):
    """Converts a web3.py tx dict to an ethers.js v6 compatible dict."""
    ethers_tx = {
        "from": tx["from"],
        "to": tx.get("to") if tx.get("to") else None,
        "value": hex(tx.get("value", 0)), # Use 0 if value is missing
        "nonce": hex(tx["nonce"]),
        "gasLimit": hex(tx["gas"]), # Rename 'gas'
        "gasPrice": hex(tx["gasPrice"]),
        "data": tx["data"]
    }
    if "chainId" in tx:
        ethers_tx["chainId"] = hex(tx["chainId"])
    return ethers_tx


@router.post("/prepare_donation")
def prepare_donation(request: PrepareDonationRequest):
    try:
        unsigned_transactions = []
        current_nonce = w3.eth.get_transaction_count(w3.to_checksum_address(request.donor_address))

        for milestone in request.milestones:
            unlock_timestamp = int(milestone.time.timestamp())
            if unlock_timestamp <= time.time():
                raise ValueError("Milestone time must be in the future.")

            Escrow = w3.eth.contract(abi=ESCROW_ABI, bytecode=ESCROW_BYTECODE)
            
            tx = Escrow.constructor(
                w3.to_checksum_address(request.recipient_address),
                unlock_timestamp
            ).build_transaction({
                'from': w3.to_checksum_address(request.donor_address),
                'value': w3.to_wei(milestone.amount, 'ether'),
                'nonce': current_nonce,
                'gas': 2000000,
                'gasPrice': w3.eth.gas_price
            })
            
            # Convert and append
            ethers_tx = convert_tx_for_ethers(tx)
            unsigned_transactions.append(ethers_tx)
            
            current_nonce += 1
        
        print(f"Sending to frontend: {unsigned_transactions}")
        return {"unsigned_transactions": unsigned_transactions}
    except Exception as e:
        print(f"Error in /prepare_donation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prepare_release_escrow")
def prepare_release_escrow(request: PrepareEscrowActionRequest):
    try:
        escrow_contract = w3.eth.contract(address=w3.to_checksum_address(request.escrow_contract_address), abi=ESCROW_ABI)
        tx = escrow_contract.functions.release().build_transaction({
            'from': w3.to_checksum_address(request.donor_address),
            'nonce': w3.eth.get_transaction_count(w3.to_checksum_address(request.donor_address)),
            'gas': 100000,
            'gasPrice': w3.eth.gas_price
            # 'value' is 0 for this call, which is fine
        })
        
        # --- FIX ---
        # Convert the transaction before returning
        ethers_tx = convert_tx_for_ethers(tx)
        return {"unsigned_transaction": ethers_tx}
        # --- END FIX ---
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prepare_cancel_escrow")
def prepare_cancel_escrow(request: PrepareEscrowActionRequest):
    try:
        escrow_contract = w3.eth.contract(address=w3.to_checksum_address(request.escrow_contract_address), abi=ESCROW_ABI)
        tx = escrow_contract.functions.cancel().build_transaction({
            'from': w3.to_checksum_address(request.donor_address),
            'nonce': w3.eth.get_transaction_count(w3.to_checksum_address(request.donor_address)),
            'gas': 100000,
            'gasPrice': w3.eth.gas_price
        })

        # --- FIX ---
        # Convert the transaction before returning
        ethers_tx = convert_tx_for_ethers(tx)
        return {"unsigned_transaction": ethers_tx}
        # --- END FIX ---
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))