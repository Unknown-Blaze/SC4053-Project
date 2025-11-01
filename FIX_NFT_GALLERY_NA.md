# 🔧 Fix NFT Gallery "N/A" Values - Quick Guide

## Problem
NFT Gallery shows "N/A" for Project, Milestone, and Amount instead of actual donation data.

## Root Cause
The backend wasn't properly parsing NFT metadata (either base64 or IPFS format).

## ✅ Solution (Already Applied!)

I've updated your `backend/routers/nft.py` to:
1. ✅ Parse both base64 AND IPFS metadata
2. ✅ Add detailed debug logging
3. ✅ Handle multiple IPFS gateways
4. ✅ Better error handling

---

## 🚀 Steps to Fix (5 Minutes)

### Step 1: Install Missing Dependencies

```powershell
cd backend
.\.venv\Scripts\pip install requests
```

*(ipfshttpclient and pillow already in requirements.txt)*

### Step 2: Restart Backend

```powershell
# Stop current backend (Ctrl+C)
uvicorn main:app --reload
```

### Step 3: Test NFT Gallery

1. Open frontend: http://localhost:5173
2. Navigate to NFT Gallery
3. **Watch the backend console** - you'll see detailed logs like:

```
📊 Address 0x99b1... owns 1 NFTs
🎫 Processing Token #7
   URI: data:application/json;base64,eyJ...
   ✅ Parsed base64 metadata
   📋 Attributes found: 7
      - Project: Clean Water Initiative
      - Milestone: Well Construction Phase 1
      - Donation Amount (ETH): 0.001
      - Tier: ⭐ Supporter
      - Donor: 0x99b1...
      - Transaction Hash: 0xf98...
      - Timestamp: 1730419200
✅ Successfully processed 1 certificates
```

### Step 4: Verify in Browser

The NFT card should now show:
- ✅ **Project:** Actual project name
- ✅ **Milestone:** Actual milestone name
- ✅ **Amount Donated:** Actual ETH amount
- ✅ **Token ID:** #7 (or your actual token ID)

---

## 🐛 Still Showing "N/A"? Debug Steps

### Check 1: Is There Actually an NFT?

Look at the top stats:
- **Certificates:** Should be > 0
- **Total Donated:** Should show ETH amount

If both are 0, you haven't minted any NFTs yet!

### Check 2: Backend Console Errors

When you load the NFT Gallery, check backend for:

**Good Output:**
```
✅ Parsed base64 metadata
📋 Attributes found: 7
```

**Bad Output:**
```
❌ Error parsing metadata: [error message]
⚠️ No attributes found in metadata
```

### Check 3: Test API Directly

Open in browser:
```
http://localhost:8000/nft/gallery/YOUR_WALLET_ADDRESS
```

Replace `YOUR_WALLET_ADDRESS` with your actual wallet (from the top right of NFT Gallery page).

**Expected Response:**
```json
{
  "success": true,
  "total_certificates": 1,
  "certificates": [
    {
      "token_id": 7,
      "name": "Donation Certificate - Project Name",
      "attributes": [
        {
          "trait_type": "Project",
          "value": "Clean Water Initiative"
        },
        {
          "trait_type": "Donation Amount (ETH)",
          "value": 0.001
        }
        // ... more attributes
      ]
    }
  ]
}
```

If `attributes` is empty `[]`, the NFT metadata is malformed.

### Check 4: Verify on Blockchain

If the API returns empty attributes, the issue is with the NFT itself:

1. Go to Sepolia Etherscan
2. Search for your NFT contract address
3. Check the `tokenURI` for your token ID
4. Verify the metadata is properly formatted

---

## 🎯 Most Likely Scenarios

### Scenario A: No NFT Minted Yet ⭐ Most Common

**Symptoms:**
- Certificates count: 0
- Total Donated: 0 ETH
- Empty gallery

**Solution:**
1. Make a donation to any project
2. Wait for transaction confirmation
3. Refresh NFT Gallery
4. Should now show your certificate!

### Scenario B: Old NFT with Bad Metadata

**Symptoms:**
- Certificates count: 1+
- But shows "N/A" for fields
- Backend logs show parsing errors

**Solution:**
1. Make a NEW donation (mints new NFT with correct metadata)
2. New NFT should display correctly
3. Old NFT might still show "N/A" (can't fix without re-minting)

### Scenario C: IPFS Timeout

**Symptoms:**
- Backend logs show "IPFS fetch timeout"
- Slow loading

**Solution:**
1. The code now tries multiple gateways
2. Wait a bit longer (up to 30 seconds)
3. Or disable IPFS temporarily: `USE_IPFS_NFT=false`

---

## 🔬 Advanced Debugging

### Enable Maximum Logging

The updated code already has verbose logging. Check your backend console when loading the gallery.

### Manual Metadata Check

```powershell
# Start Python in backend directory
cd backend
.\.venv\Scripts\python

# Run this:
from services.eth_client import w3
from routers.nft import NFT_ABI, NFT_CONTRACT_ADDRESS
import json
import base64

# Replace with your values
wallet = "0x99b1080004758b9913fd888454c446b757672175"
nft_address = w3.to_checksum_address(NFT_CONTRACT_ADDRESS)

# Load contract
nft_contract = w3.eth.contract(address=nft_address, abi=NFT_ABI)

# Check balance
balance = nft_contract.functions.balanceOf(wallet).call()
print(f"Balance: {balance}")

# If balance > 0, get token
if balance > 0:
    token_id = nft_contract.functions.tokenOfOwnerByIndex(wallet, 0).call()
    print(f"Token ID: {token_id}")
    
    uri = nft_contract.functions.tokenURI(token_id).call()
    print(f"URI: {uri[:100]}...")
    
    # Parse metadata
    if uri.startswith("data:application/json;base64,"):
        json_data = uri.split(",")[1]
        decoded = base64.b64decode(json_data).decode('utf-8')
        metadata = json.loads(decoded)
        print(json.dumps(metadata, indent=2))
```

This will show you exactly what metadata is stored in the NFT.

---

## ✅ Expected Results After Fix

### NFT Gallery Should Show:

```
┌─────────────────────────────────────┐
│      Donation Certificate           │
│           ⭐ Supporter              │
├─────────────────────────────────────┤
│                                     │
│  Project                            │
│  Clean Water Initiative             │
│                                     │
│  Milestone                          │
│  Well Construction Phase 1          │
│                                     │
│  Amount Donated                     │
│  0.001 ETH                          │
│                                     │
│  Token ID                           │
│  #7                                 │
│                                     │
│  [View on Etherscan →]              │
│                                     │
└─────────────────────────────────────┘
```

### Stats Should Show:

```
Overall Tier: ⭐ Supporter
Total Donated: 0.001 ETH
Projects Supported: 1
Certificates: 1
```

---

## 🆘 Quick Troubleshooting Checklist

- [ ] Dependencies installed: `pip install requests`
- [ ] Backend restarted
- [ ] Checked backend console for logs
- [ ] Tested `/nft/gallery/{address}` endpoint
- [ ] Verified wallet address is correct
- [ ] Confirmed NFT actually exists (balance > 0)
- [ ] Made new donation to test with fresh NFT
- [ ] Cleared browser cache
- [ ] Tried different browser

---

## 📞 Still Not Working?

### Share These Debugging Details:

1. **Backend Console Output** when loading NFT Gallery
2. **API Response** from `http://localhost:8000/nft/gallery/{address}`
3. **Wallet Address** you're using
4. **NFT Contract Address** from your .env
5. **Number of NFTs** the wallet should have

### Common Fixes:

| Problem | Solution |
|---------|----------|
| "Import requests not found" | Run: `pip install requests` |
| Empty gallery | Make a donation first! |
| Slow loading | IPFS timeout - wait or disable |
| "N/A" on old NFTs | Make new donation - old ones might have bad metadata |
| All stats show 0 | No NFTs minted yet |

---

## 🎉 Success!

Once working, every NFT will show:
- ✅ Real project name
- ✅ Real milestone
- ✅ Actual donation amount
- ✅ Proper tier badge
- ✅ Link to Etherscan

Both **base64** and **IPFS** NFTs will work perfectly! 🎊

---

*Last Updated: 2025-11-01*
*If you see "N/A" after following this guide, check the backend console logs - they'll tell you exactly what's wrong!*
