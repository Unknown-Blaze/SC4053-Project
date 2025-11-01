# ⚡ IPFS Quick Start - 2 Minute Setup

## 🎯 Goal
Store NFT metadata on IPFS instead of base64 encoding

## 📋 Prerequisites
- ✅ Pinata account (free) - [Sign up here](https://pinata.cloud)
- ✅ 5 minutes of time

## 🚀 Setup Steps

### 1️⃣ Get Pinata API Keys (2 min)
1. Go to https://pinata.cloud
2. Sign up (free)
3. Click **API Keys** → **New Key**
4. Enable: `pinFileToIPFS` + `pinJSONToIPFS`
5. Copy **API Key** and **API Secret**

### 2️⃣ Install Dependencies (1 min)
```powershell
cd backend
.\.venv\Scripts\pip install ipfshttpclient requests pillow
```

### 3️⃣ Update Environment File (1 min)
Edit `backend\.env`:
```bash
# Add these lines:
IPFS_PROVIDER=pinata
PINATA_API_KEY=paste_your_api_key_here
PINATA_API_SECRET=paste_your_secret_here
USE_IPFS_NFT=true
```

### 4️⃣ Restart Backend (30 sec)
```powershell
cd backend
uvicorn main:app --reload
```

### 5️⃣ Test It! (1 min)
1. Make a donation through your frontend
2. Watch the backend console for:
   ```
   ✅ NFT metadata uploaded to IPFS: ipfs://Qm...
   Gateway URL: https://gateway.pinata.cloud/ipfs/Qm...
   ```
3. Visit the gateway URL → See your NFT metadata!

## ✅ That's It!

Your NFTs now have **permanent, decentralized metadata** on IPFS! 🎉

## 🔍 Verify It Worked

Check your NFT Gallery page:
- New certificates appear as usual
- But now metadata is on IPFS forever
- Check OpenSea/blockchain explorers - they'll show the metadata correctly

## ❓ What If It Fails?

Don't worry! The system automatically:
- ⚠️ Logs the error
- 🔄 Falls back to base64 encoding
- ✅ NFT still gets minted
- 🎯 Everything keeps working

## 📊 What Changed vs What Didn't

### ✅ Still Works Exactly the Same:
- User login
- Project creation
- Making donations
- Viewing NFT gallery
- All Firebase queries

### 🆕 What's Better:
- NFT metadata on IPFS (permanent!)
- Can be viewed on any IPFS gateway
- True decentralization
- Lower long-term costs

## 💰 Cost: $0
Pinata free tier:
- 1 GB storage = ~100,000 NFTs
- 100 GB bandwidth/month
- You'll be fine! 😊

## 🆘 Need Help?

**Full Guide:** See `IPFS_SETUP_GUIDE.md`

**Quick Troubleshoot:**
- Check API keys are correct
- Verify `USE_IPFS_NFT=true`
- Restart backend server
- Check console logs

---

**Next Level (Optional):**
- Enable project metadata: `USE_IPFS_PROJECTS=true`
- Enable certificate images: `USE_IPFS_IMAGES=true`

But start with just NFT metadata first! 🎯
