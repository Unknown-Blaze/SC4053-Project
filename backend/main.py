# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import solcx # <--- ADD THIS LINE

# --- ADD THIS LINE ---
# Explicitly set the compiler version. This must be done BEFORE routers are imported.
# This forces the application to use the version you installed.
solcx.set_solc_version('0.8.20')
# ---------------------

from routers import donate, nft, transaction, wallet, projects

app = FastAPI(
    title="Ethereum Wallet API",
    description="API to create Ethereum wallets and send donations on an Ethereum Testnet",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(wallet.router, prefix="/wallet", tags=["Ethereum Wallet"])
app.include_router(transaction.router, prefix="/transaction", tags=["Ethereum Transactions"])
app.include_router(donate.router, prefix="/donate", tags=["Ethereum Donations"])
app.include_router(nft.router, prefix="/nft", tags=["Ethereum NFTs"])
app.include_router(projects.router, prefix="/projects", tags=["Charity Projects"])