# ✅ IPFS Integration Checklist

Use this checklist to track your IPFS integration progress.

## 📦 Phase 0: Preparation

- [ ] Read `QUICK_START_IPFS.md`
- [ ] Review `IPFS_ARCHITECTURE.md` to understand the system
- [ ] Backup your current `.env` file
- [ ] Ensure backend is working with Firebase currently

## 🔧 Phase 1: Setup (15 minutes)

### A. IPFS Provider Setup
- [ ] Create account on chosen provider:
  - [ ] Option A: [Pinata](https://pinata.cloud) (Recommended)
  - [ ] Option B: [Web3.Storage](https://web3.storage)
  - [ ] Option C: [NFT.Storage](https://nft.storage)
  - [ ] Option D: Local IPFS node
- [ ] Generate API keys/tokens
- [ ] Save credentials securely

### B. Backend Configuration
- [ ] Navigate to `backend/` directory
- [ ] Install dependencies:
  ```bash
  .\.venv\Scripts\pip install ipfshttpclient requests pillow
  ```
- [ ] Update `backend/.env` file:
  ```bash
  IPFS_PROVIDER=pinata
  PINATA_API_KEY=your_key_here
  PINATA_API_SECRET=your_secret_here
  USE_IPFS_NFT=true
  USE_IPFS_PROJECTS=false
  USE_IPFS_IMAGES=false
  ```
- [ ] Verify `.env` syntax (no quotes, no spaces around =)

### C. Verify Installation
- [ ] Check files exist:
  - [ ] `backend/services/ipfs_client.py`
  - [ ] `backend/services/project_ipfs.py`
- [ ] Verify imports in:
  - [ ] `backend/routers/nft.py`
  - [ ] `backend/routers/projects.py`

## 🧪 Phase 2: Testing (20 minutes)

### A. Start Backend
- [ ] Restart backend server:
  ```bash
  cd backend
  uvicorn main:app --reload
  ```
- [ ] Check for errors in console
- [ ] Verify server starts successfully on http://127.0.0.1:8000

### B. Test NFT Minting
- [ ] Open frontend in browser
- [ ] Log in as donor
- [ ] Navigate to a project
- [ ] Make a test donation (small amount)
- [ ] Wait for transaction confirmation

### C. Verify IPFS Upload
- [ ] Check backend console for:
  ```
  ✅ NFT metadata uploaded to IPFS: ipfs://Qm...
  Gateway URL: https://gateway.pinata.cloud/ipfs/Qm...
  ```
- [ ] Copy the gateway URL
- [ ] Open in browser
- [ ] Verify JSON metadata displays correctly
- [ ] Check metadata includes:
  - [ ] Project name
  - [ ] Donation amount
  - [ ] Tier (Bronze/Silver/Gold/Platinum)
  - [ ] Donor address
  - [ ] Transaction hash

### D. Verify NFT in Gallery
- [ ] Go to NFT Gallery page
- [ ] Find your new certificate
- [ ] Check it displays correctly
- [ ] Right-click → Inspect element
- [ ] Find tokenURI attribute
- [ ] Verify it starts with `ipfs://`

### E. Test Fallback Mechanism
- [ ] Temporarily set wrong API key in `.env`
- [ ] Restart backend
- [ ] Make another donation
- [ ] Check backend logs show:
  ```
  ⚠️ IPFS upload failed: ...
  Falling back to base64 encoding...
  ```
- [ ] Verify NFT still mints successfully
- [ ] Fix API key, restart backend

## 🎯 Phase 3: Production Readiness (30 minutes)

### A. Provider Dashboard
- [ ] Log into your IPFS provider dashboard
- [ ] Verify uploaded files appear
- [ ] Check storage usage
- [ ] Review bandwidth usage
- [ ] Verify files are pinned (won't be deleted)

### B. Test Multiple Scenarios
- [ ] Small donation (< 0.01 ETH) → Supporter tier
- [ ] Medium donation (0.1 ETH) → Silver tier
- [ ] Large donation (1.0 ETH) → Platinum tier
- [ ] Verify each creates unique IPFS hash
- [ ] Check all display in NFT gallery

### C. Verify IPFS Gateway Access
Test your IPFS hashes on multiple gateways:
- [ ] `https://gateway.pinata.cloud/ipfs/{hash}`
- [ ] `https://ipfs.io/ipfs/{hash}`
- [ ] `https://cloudflare-ipfs.com/ipfs/{hash}`
- [ ] `https://dweb.link/ipfs/{hash}`
- [ ] All should return the same JSON

### D. Cross-Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browser

## 📊 Phase 4: Optional Features

### A. Enable Project Metadata (Optional)
- [ ] Update `.env`: `USE_IPFS_PROJECTS=true`
- [ ] Restart backend
- [ ] Create a new project
- [ ] Verify IPFS upload in console
- [ ] Check Firestore has `ipfs_metadata_hash` field
- [ ] Visit IPFS gateway to see project metadata

### B. Enable Certificate Images (Optional)
⚠️ **Note:** This adds 2-3 seconds per NFT mint
- [ ] Update `.env`: `USE_IPFS_IMAGES=true`
- [ ] Restart backend
- [ ] Make a donation
- [ ] Wait for image generation + upload
- [ ] Verify certificate has real image URL
- [ ] Check image displays in NFT gallery

## 🔍 Phase 5: Monitoring & Optimization

### A. Monitor Usage
- [ ] Set up monitoring for IPFS provider:
  - [ ] Storage used
  - [ ] Bandwidth consumed
  - [ ] Number of requests
- [ ] Set up alerts if approaching limits
- [ ] Document typical usage patterns

### B. Performance Checks
- [ ] Measure average NFT minting time:
  - [ ] Without IPFS images: ~5-10 seconds ✅
  - [ ] With IPFS images: ~10-15 seconds ⚠️
- [ ] Test with slow internet connection
- [ ] Verify fallback works if IPFS is slow

### C. User Experience
- [ ] Ask test users for feedback
- [ ] Verify NFTs display correctly in:
  - [ ] Your NFT gallery
  - [ ] MetaMask wallet
  - [ ] OpenSea (if on testnet)
  - [ ] Other NFT viewers

## 📋 Phase 6: Documentation & Maintenance

### A. Document Your Setup
- [ ] Document which IPFS provider you chose
- [ ] Save API keys in secure location (password manager)
- [ ] Document any custom configurations
- [ ] Note any issues encountered + solutions

### B. Create Runbook
- [ ] How to rotate API keys
- [ ] How to switch IPFS providers
- [ ] How to verify IPFS uploads manually
- [ ] How to troubleshoot common errors

### C. Plan for Scale
- [ ] Calculate projected storage needs
- [ ] Determine if free tier is sufficient
- [ ] Plan upgrade path if needed
- [ ] Consider redundancy (multiple IPFS providers)

## 🚀 Phase 7: Future Enhancements

### A. Short-term (Next Month)
- [ ] Migrate existing NFTs to IPFS
- [ ] Implement batch IPFS uploads
- [ ] Add IPFS status indicator in UI
- [ ] Create admin dashboard for IPFS stats

### B. Long-term (Next Quarter)
- [ ] Explore The Graph for indexing
- [ ] Consider Filecoin for permanent storage
- [ ] Implement IPFS cluster for redundancy
- [ ] Add custom IPFS gateway

### C. Full Decentralization
- [ ] Move user profiles to smart contracts
- [ ] Implement wallet-only authentication
- [ ] Remove Firebase dependency
- [ ] Deploy to decentralized hosting (IPFS/Arweave)

## ✅ Success Criteria

You're ready for production when:
- [✓] All Phase 1-3 checkboxes completed
- [✓] At least 10 test NFTs minted successfully
- [✓] All IPFS uploads working consistently
- [✓] Fallback mechanism tested and working
- [✓] Team trained on the system
- [✓] Documentation complete

## 🆘 Troubleshooting Checklist

If something goes wrong:
- [ ] Check backend console for detailed errors
- [ ] Verify API keys in `.env` are correct
- [ ] Test API keys directly with Pinata API
- [ ] Check internet connectivity
- [ ] Verify dependencies installed correctly
- [ ] Restart backend server
- [ ] Check Pinata/provider dashboard for errors
- [ ] Review `IPFS_SETUP_GUIDE.md` troubleshooting section

## 📞 Support Resources

- [ ] Bookmark provider documentation:
  - Pinata: https://docs.pinata.cloud/
  - Web3.Storage: https://web3.storage/docs/
  - NFT.Storage: https://nft.storage/docs/
- [ ] Join IPFS community channels
- [ ] Save example IPFS hashes for testing
- [ ] Keep list of working IPFS gateways

## 🎉 Completion

Date Started: _______________
Date Completed: _______________
IPFS Provider Used: _______________
Total NFTs Minted: _______________
Total Storage Used: _______________

**Congratulations on implementing decentralized storage!** 🎊

---

*Print this checklist and check off items as you complete them.*
*Keep it as a reference for future deployments.*
