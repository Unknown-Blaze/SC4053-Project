from fastapi import APIRouter
from xrpl.models.requests import AccountTx
from constants import NGO_WALLET_ADDRESS # Make sure this is correctly defined
from xrpl.asyncio.clients import AsyncJsonRpcClient

router = APIRouter()

@router.get("/latest-transactions")
async def listen_for_transactions(latest_tx_hash: str | None = None): # Added default None
    # Use your shared client instance if available, or create one
    client = AsyncJsonRpcClient("https://s.altnet.rippletest.net:51234")

    try:
        req = AccountTx(
            account=NGO_WALLET_ADDRESS,
            ledger_index_min=-1, # Use -1 for unvalidated, or specific ledger indexes
            ledger_index_max=-1, # Use -1 for unvalidated, or specific ledger indexes
            limit=5, # Fetch a bit more to ensure we find the last_tx_hash if it's slightly older
            binary=False,
            forward=False, # Newest first
        )
        response = await client.request(req) # Use your shared async client
        
        txs = response.result.get("transactions", [])

        # If no transaction hash exists (first transaction), return all.
        if not latest_tx_hash:
            return txs
        new_txs = []

        # If a transaction history exists, just iterate till you find the latest transaction hash from the frontend whilst polling.
        for num, tx in enumerate(txs):
            if tx[num]['hash'] == latest_tx_hash:
                break
            new_txs.append(tx)
        return new_txs

    except Exception as e:
        print(f"Error fetching latest transactions from XRPL: {e}")
        # Consider raising HTTPException for client-side error handling
        # raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")
        return [] # Return empty on exception