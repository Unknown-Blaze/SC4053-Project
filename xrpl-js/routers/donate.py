from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from xrpl.models import EscrowCancel, EscrowCreate, EscrowFinish
from xrpl.transaction.reliable_submission import submit_and_wait

from services.witness_ngo import ShamirSecretScheme
from services.xrpl_client import client

router = APIRouter()


class Milestone(BaseModel):
    task: str
    amount: int
    time: datetime


class MilestoneCheckpoint(BaseModel):
    task: str
    amount: str
    completion: int


class DonationRequest(BaseModel):
    # seed: str
    client: str
    recipient: str
    milestones: List[Milestone]


RIPPLE_EPOCH_OFFSET = 946684800


@router.post("/donate")
def donate(request: DonationRequest):
    try:
        escrows = []
        idx = 0

        for milestone in request.milestones:
            unix_ts = int(milestone.time.timestamp())
            ripple_ts = unix_ts - RIPPLE_EPOCH_OFFSET
            if ripple_ts <= 0:
                raise ValueError("Milestone time must be in the future.")
            create_tx = EscrowCreate(
                account=request.client.address,
                destination=request.recipient.address,
                amount=str(milestone.amount),
                finish_after=ripple_ts,
            )

            create_escrow_response = submit_and_wait(create_tx, client, request.client)

            seq = create_escrow_response.result["tx_json"]["Sequence"]
            escrows.append({"escrow_sequence": seq, "unlock_time": milestone.time})
            print(f"Escrow {idx+1} created for release after: {milestone.time}")
            idx += 1
        return escrows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify")
def verify(
    milestone_checkpoint: MilestoneCheckpoint,
    request: DonationRequest,
    create_escrow_response,
):
    shamir = ShamirSecretScheme()
    if shamir.verify(request.completion):
        finish_tx = EscrowFinish(
            account=request.client.address,
            owner=request.client.address,
            offer_sequence=create_escrow_response.result["tx_json"]["Sequence"],
        )

        submit_and_wait(finish_tx, client, request.client)
    else:
        cancel_tx = EscrowCancel(
            owner=request.recipient.address,
            offer_sequence=create_escrow_response.result["tx_json"]["Sequence"],
        )

        submit_and_wait(cancel_tx, client, request.client)
