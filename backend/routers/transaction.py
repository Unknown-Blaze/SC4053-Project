# routers/transaction.py

from fastapi import APIRouter, HTTPException
from services.eth_client import w3
from constants import NGO_WALLET_ADDRESS
import requests
import os

router = APIRouter()

# Get the Etherscan API key from environment variables
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")
# We will use the Sepolia testnet API endpoint
ETHERSCAN_API_URL = "https://api-sepolia.etherscan.io/api"

@router.get("/latest-transactions")
def get_latest_transactions(address: str = NGO_WALLET_ADDRESS):
    """
    Fetches the latest 10 transactions for a given Ethereum address
    using the Etherscan API.
    """
    # --- 1. Input Validation ---
    # Check if the provided address is a valid Ethereum checksum address.
    if not w3.is_checksum_address(address):
        # If not, try to convert it. This handles cases where the address has no checksum (e.g., all lowercase).
        try:
            address = w3.to_checksum_address(address)
        # If conversion fails, it's not a valid Ethereum address.
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Ethereum address provided: {address}. Address must be a valid 42-character hex string."
            )

    if not ETHERSCAN_API_KEY:
        raise HTTPException(status_code=500, detail="Etherscan API key is not configured on the server.")

    # --- 2. API Call to Etherscan ---
    params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": 10,  # We only want the 10 latest transactions
        "sort": "desc", # Sort by descending to get the latest first
        "apikey": ETHERSCAN_API_KEY,
    }

    try:
        response = requests.get(ETHERSCAN_API_URL, params=params)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        data = response.json()

        if data["status"] == "1":
            # --- 3. Format the Response ---
            formatted_transactions = []
            for tx in data["result"]:
                formatted_transactions.append({
                    'hash': tx.get('hash'),
                    'from': tx.get('from'),
                    'to': tx.get('to'),
                    # Convert the value from Wei (the smallest unit) to Ether
                    'value_ether': w3.from_wei(int(tx.get('value', 0)), 'ether'),
                    'blockNumber': tx.get('blockNumber'),
                    'timeStamp': tx.get('timeStamp')
                })
            return {"transactions": formatted_transactions}
        elif data["status"] == "0" and data["message"] == "No transactions found":
            return {"transactions": []}
        else:
            # Handle other Etherscan API errors
            raise HTTPException(status_code=500, detail=f"Etherscan API error: {data.get('message')} - {data.get('result')}")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to Etherscan API: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))