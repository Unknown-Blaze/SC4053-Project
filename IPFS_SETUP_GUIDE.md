# 🚀 IPFS Integration Setup Guide

This guide will help you set up IPFS for decentralized storage of NFT metadata and project data.

## 📋 Quick Start Summary

**What's Changed:**
- ✅ NFT metadata can now be stored on IPFS (instead of base64)
- ✅ Project metadata can optionally be stored on IPFS
- ✅ Automatic fallback to base64 if IPFS fails
- ✅ Firebase still used for querying/indexing
- ✅ Multiple IPFS providers supported (Pinata, Web3.Storage, NFT.Storage, Local)

---

## 🎯 Phase 1: NFT Metadata to IPFS (EASIEST)

### Step 1: Choose an IPFS Provider

**Recommended: Pinata** (Free tier: 1GB storage, 100GB bandwidth/month)

#### Option A: Pinata (Easiest for beginners)

1. Go to [https://pinata.cloud](https://pinata.cloud)
2. Create a free account
3. Go to **API Keys** → **New Key**
4. Enable permissions: `pinFileToIPFS`, `pinJSONToIPFS`
5. Copy your `API Key` and `API Secret`

#### Option B: Web3.Storage (Alternative)

1. Go to [https://web3.storage](https://web3.storage)
2. Sign up with email or GitHub
3. Get your API token from dashboard
4. Free tier: Unlimited storage!

#### Option C: NFT.Storage (NFT-specific)

1. Go to [https://nft.storage](https://nft.storage)
2. Sign up with email or GitHub
3. Get your API token
4. Free tier: Unlimited for NFT data!

### Step 2: Install Dependencies

```bash
cd backend
pip install ipfshttpclient requests pillow
```

Or if using the requirements.txt:

```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

Edit your `backend/.env` file:

```bash
# Choose your provider
IPFS_PROVIDER=pinata

# Add your Pinata credentials
PINATA_API_KEY=your_actual_api_key_here
PINATA_API_SECRET=your_actual_secret_here

# Enable IPFS for NFTs
USE_IPFS_NFT=true

# Optional: Enable for projects (Phase 2)
USE_IPFS_PROJECTS=false

# Optional: Enable certificate image generation
USE_IPFS_IMAGES=false
```

### Step 4: Test NFT Minting

1. Restart your backend server:
   ```bash
   uvicorn main:app --reload
   ```

2. Make a donation to a project

3. Check the backend console for:
   ```
   ✅ NFT metadata uploaded to IPFS: ipfs://Qm...
   Gateway URL: https://gateway.pinata.cloud/ipfs/Qm...
   ```

4. Visit the gateway URL to verify your NFT metadata is live!

---

## 🎯 Phase 2: Project Metadata to IPFS (OPTIONAL)

### Step 1: Enable in Environment

```bash
# In backend/.env
USE_IPFS_PROJECTS=true
```

### Step 2: Create a New Project

When you create a project via the frontend, the backend will now:
1. ✅ Upload project metadata to IPFS
2. ✅ Store IPFS hash in Firestore (for querying)
3. ✅ Include IPFS hash in response

### Step 3: Verify

Check the backend console:
```
✅ Project metadata uploaded to IPFS: ipfs://Qm...
Gateway URL: https://gateway.pinata.cloud/ipfs/Qm...
```

The Firestore document will now have:
```json
{
  "name": "Project Name",
  "contract_address": "0x...",
  "ipfs_metadata_hash": "Qm...",
  "ipfs_metadata_uri": "ipfs://Qm..."
}
```

---

## 🔧 Advanced: Local IPFS Node

### Install IPFS Desktop

1. Download from [https://docs.ipfs.tech/install/ipfs-desktop/](https://docs.ipfs.tech/install/ipfs-desktop/)
2. Install and run IPFS Desktop
3. It will start the IPFS daemon automatically

### Configure for Local Node

```bash
# In backend/.env
IPFS_PROVIDER=local
IPFS_API_URL=/ip4/127.0.0.1/tcp/5001
IPFS_GATEWAY_URL=http://127.0.0.1:8080/ipfs
```

### Install Python IPFS Client

```bash
pip install ipfshttpclient
```

---

## 📊 Architecture Overview

### Current Hybrid Setup

```
┌─────────────────────────────────────────┐
│         Your Application Stack          │
├─────────────────────────────────────────┤
│                                         │
│  Frontend (React)                       │
│    ↓                                    │
│  Backend (FastAPI)                      │
│    ↓                                    │
│  ┌──────────────┬──────────────────┐   │
│  │   Firebase   │      IPFS        │   │
│  │  (Firestore) │   (Pinata/etc)   │   │
│  └──────────────┴──────────────────┘   │
│       ↓                  ↓              │
│  • User profiles   • NFT metadata       │
│  • Project list    • Project metadata   │
│  • Queries         • Static content     │
│  • Indexing        • Immutable data     │
│                                         │
└─────────────────────────────────────────┘
```

### What Goes Where?

| Data Type | Storage | Reason |
|-----------|---------|--------|
| User profiles | Firebase | Needs updates, queries |
| Project list | Firebase | Needs filtering, sorting |
| NFT metadata | **IPFS** ✅ | Immutable, permanent |
| NFT images | **IPFS** ✅ | Large files |
| Project metadata | **Both** 🔄 | IPFS (source), Firebase (index) |
| Transaction data | Blockchain | On-chain events |

---

## 🧪 Testing Checklist

### Test NFT IPFS Integration

- [ ] Create a donation
- [ ] Check backend logs for IPFS upload confirmation
- [ ] Visit IPFS gateway URL
- [ ] Verify metadata JSON loads
- [ ] Check NFT appears in your gallery
- [ ] Verify tokenURI points to IPFS

### Test Project IPFS Integration

- [ ] Enable `USE_IPFS_PROJECTS=true`
- [ ] Create a new project
- [ ] Check backend logs for IPFS upload
- [ ] Visit gateway URL to see metadata
- [ ] Verify Firestore has `ipfs_metadata_hash`
- [ ] Confirm project still displays correctly

---

## 🐛 Troubleshooting

### "IPFS upload failed" in logs

**Cause:** Invalid API credentials or network issue

**Solution:**
1. Verify your API keys in `.env`
2. Check internet connection
3. Try a different IPFS provider
4. The system will fallback to base64 automatically

### "Import ipfshttpclient could not be resolved"

**Cause:** Package not installed

**Solution:**
```bash
pip install ipfshttpclient
```

### NFT metadata shows "ipfs://QmYourImageHashHere"

**Cause:** Placeholder image not replaced

**Solution:**
- Enable `USE_IPFS_IMAGES=true` to generate real images
- Or manually upload an image and replace the placeholder

### Gateway URL not loading

**Cause:** IPFS propagation delay or gateway issue

**Solution:**
- Wait 30-60 seconds for propagation
- Try a different gateway:
  - `https://ipfs.io/ipfs/{hash}`
  - `https://cloudflare-ipfs.com/ipfs/{hash}`
  - `https://dweb.link/ipfs/{hash}`

---

## 💰 Cost Comparison

### Pinata Free Tier
- Storage: 1 GB
- Bandwidth: 100 GB/month
- Requests: Unlimited
- **Cost:** Free
- **Good for:** Testing, small projects

### Web3.Storage
- Storage: Unlimited
- Bandwidth: Unlimited
- **Cost:** Free (sponsored by Protocol Labs)
- **Good for:** Production use

### NFT.Storage
- Storage: Unlimited (for NFT data)
- Bandwidth: Unlimited
- **Cost:** Free (sponsored by Protocol Labs & Filecoin)
- **Good for:** NFT-heavy applications

---

## 🎓 Next Steps

1. ✅ **Start with NFT metadata** (easiest win)
2. ⚠️ **Test thoroughly** with donations
3. 🚀 **Enable project metadata** when ready
4. 🎨 **Add custom certificate images** (optional)
5. 📈 **Monitor IPFS usage** in provider dashboard
6. 🔄 **Plan migration** of existing NFTs to IPFS

---

## 📚 Additional Resources

- [IPFS Documentation](https://docs.ipfs.tech/)
- [Pinata Docs](https://docs.pinata.cloud/)
- [Web3.Storage Docs](https://web3.storage/docs/)
- [NFT.Storage Docs](https://nft.storage/docs/)
- [NFT Metadata Standards](https://docs.opensea.io/docs/metadata-standards)

---

## 🆘 Need Help?

If you encounter issues:

1. Check backend console logs for detailed errors
2. Verify your `.env` configuration
3. Test with a different IPFS provider
4. The system will gracefully fallback to base64 if IPFS fails

**Remember:** Firebase is still handling queries and user data. IPFS is only for immutable content (NFT metadata, project snapshots). This hybrid approach gives you the best of both worlds! 🎉
