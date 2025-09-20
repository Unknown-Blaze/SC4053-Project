from fastapi import APIRouter
from xrpl.models.requests import AccountNFTs
from xrpl.models.transactions import NFTokenMint
from xrpl.transaction import XRPLReliableSubmissionException, submit_and_wait
from xrpl.utils import str_to_hex
from xrpl.wallet import Wallet

from services.xrpl_client import client

router = APIRouter()


@router.post("/mint")
def mint_token(seed, uri, flags, transfer_fee, taxon):
    """mint_token"""
    minter_wallet = Wallet.from_seed(seed)
    mint_tx = NFTokenMint(
        account=minter_wallet.address,
        uri=str_to_hex(uri),
        flags=int(flags),
        transfer_fee=int(transfer_fee),
        nftoken_taxon=int(taxon),
    )

    reply = ""
    try:
        response = submit_and_wait(mint_tx, client, minter_wallet)
        reply = response.result
    except XRPLReliableSubmissionException as e:
        reply = f"Submit failed: {e}"
    return reply


@router.get("/token")
def get_tokens(account):
    """get_tokens"""
    acct_nfts = AccountNFTs(account=account)

    response = client.request(acct_nfts)
    return response.result
