from fastapi import APIRouter, HTTPException
from web3 import Web3

router = APIRouter()
w3 = Web3()

@router.post("/create")
def create_wallet():
    try:
        account = w3.eth.account.create()
        return {
            "ethereum_wallet": {
                "address": account.address,
                "private_key": w3.to_hex(account.key),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))