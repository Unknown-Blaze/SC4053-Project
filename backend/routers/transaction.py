from fastapi import APIRouter, HTTPException
from services.eth_client import w3
import requests
import os

router = APIRouter()

# Get the Etherscan API key from environment variables
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")

# Updated: Sepolia v2 Etherscan endpoint
ETHERSCAN_API_URL = "https://api.etherscan.io/v2/api"

@router.get("/latest-transactions")
def get_latest_transactions(address: str):
    """
    Fetches the latest 10 transactions for a given Ethereum address
    using the Etherscan Sepolia v2 API.
    """

    # --- 1. Validate Address ---
    if not w3.is_checksum_address(address):
        try:
            address = w3.to_checksum_address(address)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Ethereum address provided: {address}. Must be a valid 42-character hex string."
            )

    # --- 2. Validate API Key ---
    if not ETHERSCAN_API_KEY:
        raise HTTPException(status_code=500, detail="Etherscan API key is not configured on the server.")

    # --- 3. Prepare API Call Parameters ---
    params = {
        "chainid": 11155111,  # Sepolia Testnet chain ID
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": 10,  # Fetch the latest 10 transactions
        "sort": "desc",
        "apikey": ETHERSCAN_API_KEY,
    }

    # --- 4. Call Etherscan API ---
    try:
        response = requests.get(ETHERSCAN_API_URL, params=params)
        response.raise_for_status()
        data = response.json()

        # v2 API may return data under "data" or "result"
        result = data.get("result") or data.get("data", [])

        # --- 5. Format Successful Response ---
        if data.get("status") == "1" or isinstance(result, list):
            formatted_transactions = []
            for tx in result:
                # Debug: Print transaction status fields
                print(f"Transaction {tx.get('hash', 'unknown')}: isError={tx.get('isError')}, txreceipt_status={tx.get('txreceipt_status')}")
                
                # Only include successful transactions (status = 1)
                if tx.get('isError') == '0' and tx.get('txreceipt_status') == '1':
                    formatted_transactions.append({
                        'hash': tx.get('hash'),
                        'from': tx.get('from'),
                        'to': tx.get('to'),
                        'value_ether': w3.from_wei(int(tx.get('value', 0)), 'ether'),
                        'blockNumber': tx.get('blockNumber'),
                        'timeStamp': tx.get('timeStamp')
                    })
            return {"transactions": formatted_transactions}

        # --- 6. Handle No Transactions ---
        elif data.get("status") == "0" and "No transactions" in data.get("message", ""):
            return {"transactions": []}

        # --- 7. Handle API Error ---
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Etherscan API error: {data.get('message')} - {data.get('result')}"
            )

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to Etherscan API: {e}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
