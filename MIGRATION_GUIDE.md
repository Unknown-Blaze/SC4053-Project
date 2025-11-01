# 🔄 Firebase to IPFS Migration Guide

## Complete Step-by-Step Migration for Static Content

This guide will help you migrate your **existing Firebase static data** to IPFS while keeping your application running.

---

## 📊 Current State Analysis

### What's Currently in Firebase

Based on your codebase:

```
Firebase (Firestore):
├─ users/
│  ├─ User profiles (✅ KEEP - needs queries/updates)
│  └─ Wallet addresses (✅ KEEP - frequently accessed)
│
├─ charity_projects/
│  ├─ Project metadata (🔄 MIGRATE to IPFS)
│  │  • name, description
│  │  • milestones
│  │  • contact_email
│  │  • ngoName
│  ├─ Contract info (✅ KEEP - for indexing)
│  │  • contract_address
│  │  • transaction_hash
│  │  • status
│  └─ IPFS reference (🆕 ADD after migration)
│     • ipfs_metadata_hash
│
└─ (No NFT data - already on blockchain)
```

---

## 🎯 Migration Strategy: 3 Phases

### **Phase 1: New Content to IPFS** ⭐ (Do This First)
- All NEW NFTs → IPFS
- All NEW projects → IPFS (optional)
- Keep Firebase for indexing
- Zero downtime

### **Phase 2: Migrate Existing Projects** (Optional)
- Upload existing project data to IPFS
- Add IPFS hashes to Firestore
- Keep both for redundancy

### **Phase 3: Migrate Existing NFTs** (Advanced)
- Re-mint or update existing NFTs
- Point to IPFS metadata
- Requires gas fees

---

## 🚀 Phase 1: Enable IPFS for New Content (5 Minutes)

### Step 1: Install Dependencies

```powershell
cd backend
.\.venv\Scripts\pip install ipfshttpclient requests pillow
```

### Step 2: Get IPFS Provider Keys

**Option A: Pinata (Recommended)**
1. Sign up at [https://pinata.cloud](https://pinata.cloud)
2. Go to API Keys → New Key
3. Enable: `pinFileToIPFS` + `pinJSONToIPFS`
4. Copy API Key and Secret

**Option B: Web3.Storage**
1. Sign up at [https://web3.storage](https://web3.storage)
2. Get API token from dashboard

### Step 3: Configure Environment

Edit `backend/.env`:

```bash
# IPFS Configuration
IPFS_PROVIDER=pinata
PINATA_API_KEY=your_api_key_here
PINATA_API_SECRET=your_api_secret_here

# Enable for new NFTs (REQUIRED for gallery to work)
USE_IPFS_NFT=true

# Enable for new projects (OPTIONAL)
USE_IPFS_PROJECTS=false

# Enable certificate images (OPTIONAL - slower)
USE_IPFS_IMAGES=false
```

### Step 4: Restart Backend

```powershell
cd backend
uvicorn main:app --reload
```

### Step 5: Test with New Donation

1. Make a donation through your frontend
2. Check backend console for:
   ```
   ✅ NFT metadata uploaded to IPFS: ipfs://Qm...
   Gateway URL: https://gateway.pinata.cloud/ipfs/Qm...
   ```
3. Visit gateway URL to verify
4. Check NFT Gallery - should now show proper data (not N/A)

✅ **Done! All new NFTs now use IPFS!**

---

## 📦 Phase 2: Migrate Existing Projects to IPFS

### Step 2.1: Create Migration Script

Create `backend/migrate_projects_to_ipfs.py`:

```python
import os
import sys
from dotenv import load_dotenv
from services.ipfs_client import get_ipfs_client
from services.project_ipfs import upload_project_metadata
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment
load_dotenv()

# Initialize Firebase (you'll need to add firebase_admin to requirements.txt)
# cred = credentials.Certificate("path/to/serviceAccountKey.json")
# firebase_admin.initialize_app(cred)
# db = firestore.client()

def migrate_projects():
    """
    Migrate existing projects from Firebase to IPFS
    """
    print("🚀 Starting project migration to IPFS...")
    
    # Get IPFS client
    ipfs_client = get_ipfs_client()
    
    # Fetch all projects from Firestore
    projects_ref = db.collection('charity_projects')
    projects = projects_ref.stream()
    
    migrated_count = 0
    error_count = 0
    
    for project_doc in projects:
        project_id = project_doc.id
        project_data = project_doc.to_dict()
        
        # Skip if already migrated
        if project_data.get('ipfs_metadata_hash'):
            print(f"⏭️  Skipping {project_data.get('name')} - already migrated")
            continue
        
        try:
            print(f"📤 Uploading {project_data.get('name')} to IPFS...")
            
            # Upload project metadata to IPFS
            ipfs_hash = upload_project_metadata(
                name=project_data.get('name', ''),
                description=project_data.get('description', ''),
                ngo_name=project_data.get('ngoName', ''),
                contact_email=project_data.get('contact_email', ''),
                milestones=project_data.get('milestones', []),
                eth_wallet_address=project_data.get('eth_wallet_address', ''),
                additional_data={
                    'contract_address': project_data.get('contract_address', ''),
                    'transaction_hash': project_data.get('transaction_hash', ''),
                    'created_at': project_data.get('created_at', ''),
                    'status': project_data.get('status', '')
                }
            )
            
            # Update Firestore with IPFS hash
            projects_ref.document(project_id).update({
                'ipfs_metadata_hash': ipfs_hash,
                'ipfs_metadata_uri': f'ipfs://{ipfs_hash}',
                'migrated_to_ipfs': True,
                'migration_date': firestore.SERVER_TIMESTAMP
            })
            
            print(f"✅ Migrated {project_data.get('name')}")
            print(f"   IPFS Hash: {ipfs_hash}")
            print(f"   Gateway: https://gateway.pinata.cloud/ipfs/{ipfs_hash}")
            
            migrated_count += 1
            
        except Exception as e:
            print(f"❌ Error migrating {project_data.get('name')}: {e}")
            error_count += 1
            continue
    
    print("\n" + "="*50)
    print(f"✅ Successfully migrated: {migrated_count} projects")
    print(f"❌ Failed: {error_count} projects")
    print("="*50)

if __name__ == "__main__":
    # Uncomment when ready to run
    # migrate_projects()
    print("⚠️  Migration script ready. Uncomment migrate_projects() to run.")
```

### Step 2.2: Install Firebase Admin SDK (if using Firebase)

```powershell
.\.venv\Scripts\pip install firebase-admin
```

### Step 2.3: Run Migration (Dry Run First)

```powershell
cd backend
.\.venv\Scripts\python migrate_projects_to_ipfs.py
```

### Step 2.4: Verify Migration

1. Check Pinata dashboard - see uploaded files
2. Query Firestore - documents should have `ipfs_metadata_hash`
3. Test fetching from IPFS gateway

---

## 🎨 Phase 3: Migrate Existing NFT Metadata (Advanced)

### ⚠️ Important Considerations

**Challenges:**
- NFTs already minted with base64 metadata
- Can't change existing token URIs (they're immutable)
- Would require re-minting (costs gas)

**Options:**

#### **Option A: Leave Existing NFTs As-Is** ✅ Recommended
- Keep existing NFTs with base64
- All NEW NFTs use IPFS
- No gas costs
- No risk
- Gallery works with both

#### **Option B: Update NFT Contract (if you have updateTokenURI)**

If your NFT contract has an `updateTokenURI` function:

```python
# backend/migrate_nfts_to_ipfs.py

from web3 import Web3
from services.eth_client import w3
from services.ipfs_client import get_ipfs_client
import json
import base64
import os

def migrate_nft_metadata_to_ipfs(token_id: int, nft_contract):
    """
    Migrate a single NFT's metadata from base64 to IPFS
    """
    try:
        # Get current token URI
        token_uri = nft_contract.functions.tokenURI(token_id).call()
        
        # Skip if already IPFS
        if token_uri.startswith("ipfs://"):
            print(f"Token #{token_id} already on IPFS")
            return None
        
        # Parse base64 metadata
        if token_uri.startswith("data:application/json;base64,"):
            json_data = token_uri.split(",")[1]
            decoded = base64.b64decode(json_data).decode('utf-8')
            metadata = json.loads(decoded)
            
            # Upload to IPFS
            ipfs_client = get_ipfs_client()
            ipfs_hash = ipfs_client.upload_json(
                data=metadata,
                filename=f"nft_token_{token_id}.json"
            )
            
            ipfs_uri = f"ipfs://{ipfs_hash}"
            print(f"✅ Token #{token_id} migrated to IPFS: {ipfs_uri}")
            
            # Return new URI for manual update
            # (requires contract owner to call updateTokenURI)
            return ipfs_uri
        
        return None
        
    except Exception as e:
        print(f"❌ Error migrating token #{token_id}: {e}")
        return None

# Usage:
# migrate_nft_metadata_to_ipfs(token_id=7, nft_contract=your_contract)
```

#### **Option C: Deploy New NFT Contract**
- Deploy new contract with IPFS support
- Airdrop equivalent NFTs to holders
- Mark old contract as deprecated
- Expensive and complex

---

## 🔍 Troubleshooting the NFT Gallery "N/A" Issue

### Why You're Seeing "N/A"

Based on the screenshot, here are the likely causes:

1. **No NFTs Minted Yet**
   - The wallet has 1 certificate but metadata might not be parsed
   
2. **Metadata Parsing Failed**
   - Base64 decode error
   - IPFS fetch timeout
   - Network issue

3. **Attributes Not Set Correctly**
   - NFT was minted but metadata is incomplete

### Debugging Steps

#### Step 1: Check Backend Logs

When you visit the NFT Gallery, check your backend console. You should see:

```
📊 Address 0x... owns X NFTs
🎫 Processing Token #7
   URI: data:application/json;base64,... or ipfs://...
   ✅ Parsed base64 metadata or ✅ Fetched from IPFS
   📋 Attributes found: 7
      - Project: Project Name
      - Milestone: Milestone Name
      - Donation Amount (ETH): 0.001
      - Tier: ⭐ Supporter
      - Donor: 0x...
      - Transaction Hash: 0x...
      - Timestamp: 1234567890
```

If you see errors here, that's your problem!

#### Step 2: Test NFT Endpoint Directly

Open browser to:
```
http://localhost:8000/nft/gallery/YOUR_WALLET_ADDRESS
```

Check the response JSON - do the attributes show up?

#### Step 3: Verify NFT on Blockchain

```powershell
# In Python console
from services.eth_client import w3
import json
import base64

nft_address = "YOUR_NFT_CONTRACT_ADDRESS"
wallet = "YOUR_WALLET_ADDRESS"

# Load contract (you need ABI)
# nft_contract = w3.eth.contract(address=nft_address, abi=NFT_ABI)

# Check balance
# balance = nft_contract.functions.balanceOf(wallet).call()
# print(f"Balance: {balance}")

# Get token URI
# token_id = 7  # From your screenshot
# uri = nft_contract.functions.tokenURI(token_id).call()
# print(f"URI: {uri}")

# If base64, decode it
# if uri.startswith("data:application/json;base64,"):
#     json_data = uri.split(",")[1]
#     decoded = base64.b64decode(json_data).decode('utf-8')
#     print(json.loads(decoded))
```

---

## ✅ Quick Fix for Your Current Issue

The updated backend code I provided should fix your "N/A" issue. Here's what changed:

### What I Fixed:

1. **Added IPFS Support** to `/nft/gallery/{address}` endpoint
2. **Added Detailed Logging** to debug metadata parsing
3. **Added Fallback Gateways** if primary IPFS fetch fails
4. **Better Error Handling** for malformed metadata

### To Apply the Fix:

1. ✅ Code already updated in `backend/routers/nft.py`
2. Restart backend: `uvicorn main:app --reload`
3. Visit NFT Gallery page
4. Check backend console for detailed logs
5. Should now show proper values instead of "N/A"

### If Still Showing "N/A":

The issue is likely that **no NFT has been minted yet** OR the NFT was minted before the metadata fix. Try:

1. Make a fresh donation (mint new NFT)
2. Check if NEW NFT shows proper data
3. Old NFTs might still show "N/A" if metadata was malformed

---

## 📋 Migration Checklist

### Immediate (5 min)
- [✓] Updated backend code for IPFS + base64 support
- [ ] Install dependencies: `pip install ipfshttpclient requests pillow`
- [ ] Get Pinata API keys
- [ ] Add keys to `.env`
- [ ] Set `USE_IPFS_NFT=true`
- [ ] Restart backend
- [ ] Test with new donation

### Short-term (1 day)
- [ ] Verify NFT Gallery shows proper data
- [ ] Test multiple donations
- [ ] Check IPFS gateway URLs work
- [ ] Monitor Pinata dashboard

### Medium-term (1 week - Optional)
- [ ] Enable `USE_IPFS_PROJECTS=true`
- [ ] Migrate existing projects to IPFS
- [ ] Add IPFS hashes to Firestore
- [ ] Verify project data loads correctly

### Long-term (Future - Optional)
- [ ] Consider migrating old NFTs
- [ ] Implement image generation
- [ ] Add redundant IPFS providers
- [ ] Plan full decentralization

---

## 🎯 Summary

**What to Do Right Now:**

1. ✅ Backend code already updated
2. Install: `pip install ipfshttpclient requests pillow`
3. Get Pinata keys from https://pinata.cloud
4. Add to `.env`: `USE_IPFS_NFT=true`
5. Restart backend
6. Make a new donation
7. Check NFT Gallery - should show proper data!

**Migration Status:**

| Content Type | Current State | Action Required |
|--------------|---------------|-----------------|
| **New NFTs** | Base64 (old) | ✅ Enable IPFS (done) |
| **Old NFTs** | Base64 | ⏭️ Leave as-is (works) |
| **New Projects** | Firebase only | ⚠️ Optional: Enable IPFS |
| **Old Projects** | Firebase only | ⏭️ Optional: Migrate script |
| **User Data** | Firebase | ✅ Keep in Firebase |

Your NFT Gallery will work with **BOTH** base64 and IPFS NFTs automatically! 🎉

---

*Need help? Check the detailed logs in your backend console when accessing the NFT Gallery.*
