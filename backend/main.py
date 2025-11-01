# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import solcx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Initialize Firebase ---
try:
    import firebase_admin
    from firebase_admin import credentials
    
    # Check if Firebase is already initialized
    if not firebase_admin._apps:
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', './serviceAccountKey.json')
        
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized successfully")
        else:
            print(f"⚠️  Firebase service account not found at: {service_account_path}")
            print("   /projects/all endpoint will not work without Firebase credentials")
except ImportError:
    print("⚠️  firebase-admin not installed. Some endpoints may not work.")
except Exception as e:
    print(f"⚠️  Firebase initialization failed: {e}")
# --------------------------

# Explicitly set the compiler version. This must be done BEFORE routers are imported.
# This forces the application to use the version you installed.
solcx.set_solc_version('0.8.20')

from routers import nft, transaction, wallet, projects

app = FastAPI(
    title="Ethereum Wallet API",
    description="API to create Ethereum wallets and send donations on an Ethereum Testnet",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(wallet.router, prefix="/wallet", tags=["Ethereum Wallet"])
app.include_router(transaction.router, prefix="/transaction", tags=["Ethereum Transactions"])
app.include_router(nft.router, prefix="/nft", tags=["Ethereum NFTs"])
app.include_router(projects.router, prefix="/projects", tags=["Charity Projects"])