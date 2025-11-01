# Quick IPFS Setup Script
# Run this to quickly set up IPFS integration

Write-Host "🚀 nGoDonate IPFS Integration Setup" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if .env file exists
$envPath = "backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" $envPath
    Write-Host "✅ Created .env file from template`n" -ForegroundColor Green
} else {
    Write-Host "✅ Found existing .env file`n" -ForegroundColor Green
}

# Install Python dependencies
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Cyan
Set-Location backend
pip install ipfshttpclient requests pillow
Set-Location ..
Write-Host "✅ Dependencies installed`n" -ForegroundColor Green

# Prompt for IPFS provider choice
Write-Host "🔧 Choose your IPFS provider:" -ForegroundColor Cyan
Write-Host "  1. Pinata (Recommended - Easy setup)" -ForegroundColor White
Write-Host "  2. Web3.Storage (Unlimited storage)" -ForegroundColor White
Write-Host "  3. NFT.Storage (NFT-specific)" -ForegroundColor White
Write-Host "  4. Local IPFS Node (Advanced)" -ForegroundColor White
Write-Host "  5. Skip for now (use base64 fallback)`n" -ForegroundColor Yellow

$choice = Read-Host "Enter choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "`n🔑 Setting up Pinata..." -ForegroundColor Cyan
        Write-Host "   Get your free API keys at: https://pinata.cloud" -ForegroundColor Gray
        $apiKey = Read-Host "Enter Pinata API Key"
        $apiSecret = Read-Host "Enter Pinata API Secret"
        
        # Update .env file
        $envContent = Get-Content $envPath
        $envContent = $envContent -replace 'IPFS_PROVIDER=.*', 'IPFS_PROVIDER=pinata'
        $envContent = $envContent -replace 'PINATA_API_KEY=.*', "PINATA_API_KEY=$apiKey"
        $envContent = $envContent -replace 'PINATA_API_SECRET=.*', "PINATA_API_SECRET=$apiSecret"
        $envContent = $envContent -replace 'USE_IPFS_NFT=.*', 'USE_IPFS_NFT=true'
        $envContent | Set-Content $envPath
        
        Write-Host "✅ Pinata configured!`n" -ForegroundColor Green
    }
    "2" {
        Write-Host "`n🔑 Setting up Web3.Storage..." -ForegroundColor Cyan
        Write-Host "   Get your free token at: https://web3.storage" -ForegroundColor Gray
        $token = Read-Host "Enter Web3.Storage Token"
        
        $envContent = Get-Content $envPath
        $envContent = $envContent -replace 'IPFS_PROVIDER=.*', 'IPFS_PROVIDER=web3storage'
        $envContent = $envContent -replace '# WEB3_STORAGE_TOKEN=.*', "WEB3_STORAGE_TOKEN=$token"
        $envContent = $envContent -replace 'USE_IPFS_NFT=.*', 'USE_IPFS_NFT=true'
        $envContent | Set-Content $envPath
        
        Write-Host "✅ Web3.Storage configured!`n" -ForegroundColor Green
    }
    "3" {
        Write-Host "`n🔑 Setting up NFT.Storage..." -ForegroundColor Cyan
        Write-Host "   Get your free token at: https://nft.storage" -ForegroundColor Gray
        $token = Read-Host "Enter NFT.Storage Token"
        
        $envContent = Get-Content $envPath
        $envContent = $envContent -replace 'IPFS_PROVIDER=.*', 'IPFS_PROVIDER=nftstorage'
        $envContent = $envContent -replace '# NFT_STORAGE_TOKEN=.*', "NFT_STORAGE_TOKEN=$token"
        $envContent = $envContent -replace 'USE_IPFS_NFT=.*', 'USE_IPFS_NFT=true'
        $envContent | Set-Content $envPath
        
        Write-Host "✅ NFT.Storage configured!`n" -ForegroundColor Green
    }
    "4" {
        Write-Host "`n🔧 Setting up Local IPFS Node..." -ForegroundColor Cyan
        Write-Host "   Make sure IPFS Desktop is installed and running!" -ForegroundColor Yellow
        
        $envContent = Get-Content $envPath
        $envContent = $envContent -replace 'IPFS_PROVIDER=.*', 'IPFS_PROVIDER=local'
        $envContent = $envContent -replace 'USE_IPFS_NFT=.*', 'USE_IPFS_NFT=true'
        $envContent | Set-Content $envPath
        
        Write-Host "✅ Local IPFS configured!`n" -ForegroundColor Green
        Write-Host "⚠️  Remember to start IPFS daemon before testing!" -ForegroundColor Yellow
    }
    "5" {
        Write-Host "`n⏭️  Skipping IPFS setup. Using base64 fallback.`n" -ForegroundColor Yellow
    }
    default {
        Write-Host "`n❌ Invalid choice. Setup cancelled.`n" -ForegroundColor Red
        exit
    }
}

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ IPFS Integration Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review your backend\.env file" -ForegroundColor White
Write-Host "  2. Start your backend: cd backend; uvicorn main:app --reload" -ForegroundColor White
Write-Host "  3. Make a test donation to mint an NFT" -ForegroundColor White
Write-Host "  4. Check backend logs for IPFS upload confirmation" -ForegroundColor White
Write-Host "  5. Visit the IPFS gateway URL to verify`n" -ForegroundColor White

Write-Host "📚 For detailed guide, see: IPFS_SETUP_GUIDE.md`n" -ForegroundColor Gray

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
