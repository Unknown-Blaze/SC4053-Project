# routers/donate.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
import time
from services.eth_client import w3
import json  # <-- Import json
import os    # <-- Import os

router = APIRouter()

# --- Pydantic Models (No Changes) ---
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

# --- FINAL, CORRECT function to load pre-compiled contract data from Hardhat ---
def load_contract_data(file_name: str, contract_name: str):
    """
    Loads contract ABI and bytecode from Hardhat's artifacts.
    :param file_name: The name of the .sol file (e.g., "Escrow")
    :param contract_name: The name of the contract inside the file (e.g., "Escrow")
    """
    current_dir = os.path.dirname(os.path.realpath(__file__))
    artifacts_path = os.path.join(
        os.path.dirname(current_dir), "artifacts", "contracts", f"{file_name}.sol", f"{contract_name}.json"
    )
    
    with open(artifacts_path, 'r') as f:
        data = json.load(f)
    return data['abi'], data['bytecode']

# --- Load the pre-compiled contract data on startup ---
ESCROW_ABI, ESCROW_BYTECODE = load_contract_data('Escrow', 'Escrow')

# --- All your endpoints below this line are correct and need no changes ---

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
                'value': str(w3.to_wei(milestone.amount, 'ether')),
                'nonce': current_nonce,
                'gas': 2000000,
                'gasPrice': w3.eth.gas_price
            })
            unsigned_transactions.append(tx)
            current_nonce += 1

        return {"unsigned_transactions": unsigned_transactions}
    except Exception as e:
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
        })
        return {"unsigned_transaction": tx}
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
        return {"unsigned_transaction": tx}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))