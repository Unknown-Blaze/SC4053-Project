#!/usr/bin/env python3
"""
Script to deploy the NGO_NFT contract to Ethereum network
"""

import os
import json
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
ETHEREUM_NODE_URL = os.getenv("ETHEREUM_NODE_URL")
NGO_PRIVATE_KEY = os.getenv("NGO_PRIVATE_KEY")

if not ETHEREUM_NODE_URL or not NGO_PRIVATE_KEY:
    raise ValueError("Missing required environment variables. Check your .env file")

# Connect to Ethereum
w3 = Web3(Web3.HTTPProvider(ETHEREUM_NODE_URL))

if not w3.is_connected():
    raise Exception("Failed to connect to Ethereum network")

print(f"✓ Connected to Ethereum network")
print(f"  Chain ID: {w3.eth.chain_id}")

# Load contract artifacts
def load_contract_data():
    """Load compiled contract ABI and bytecode"""
    artifacts_path = "artifacts/contracts/NFT.sol/NGO_NFT.json"
    
    if not os.path.exists(artifacts_path):
        raise FileNotFoundError(
            f"Contract artifacts not found at {artifacts_path}\n"
            "Please compile contracts first using: npx hardhat compile"
        )
    
    with open(artifacts_path, 'r') as f:
        data = json.load(f)
    
    return data['abi'], data['bytecode']

# Deploy contract
def deploy_contract():
    """Deploy the NFT contract"""
    print("\n📝 Loading contract artifacts...")
    abi, bytecode = load_contract_data()
    
    # Ensure bytecode has 0x prefix
    if not bytecode.startswith('0x'):
        bytecode = '0x' + bytecode
    
    print("✓ Contract artifacts loaded")
    
    # Get deployer account
    account = w3.eth.account.from_key(NGO_PRIVATE_KEY)
    print(f"\n👤 Deployer address: {account.address}")
    
    # Check balance
    balance = w3.eth.get_balance(account.address)
    balance_eth = w3.from_wei(balance, 'ether')
    print(f"💰 Balance: {balance_eth} ETH")
    
    if balance == 0:
        print("\n❌ Insufficient balance. Please fund your wallet with test ETH")
        print("   Get Sepolia ETH from: https://sepoliafaucet.com/")
        return None
    
    # Create contract instance
    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    
    # Get current nonce
    nonce = w3.eth.get_transaction_count(account.address)
    print(f"\n🔢 Current nonce: {nonce}")
    
    # Build deployment transaction
    print("\n🚀 Building deployment transaction...")
    
    try:
        # IMPORTANT: Pass the deployer address as initialOwner parameter
        constructor_args = (account.address,)  # initialOwner parameter
        
        # Estimate gas
        print(f"   Constructor arguments: initialOwner={account.address}")
        gas_estimate = Contract.constructor(*constructor_args).estimate_gas({
            'from': account.address
        })
        print(f"   Estimated gas: {gas_estimate}")
        
        # Build transaction
        transaction = Contract.constructor(*constructor_args).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': int(gas_estimate * 1.2),  # Add 20% buffer
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        # Sign transaction
        print("✍️  Signing transaction...")
        signed_txn = account.sign_transaction(transaction)
        
        # Send transaction
        print("📤 Sending transaction...")
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        print(f"   Transaction hash: {w3.to_hex(tx_hash)}")
        
        # Wait for receipt
        print("⏳ Waiting for confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        if tx_receipt['status'] == 1:
            contract_address = tx_receipt['contractAddress']
            print(f"\n✅ Contract deployed successfully!")
            print(f"   Contract address: {contract_address}")
            print(f"   Block number: {tx_receipt['blockNumber']}")
            print(f"   Gas used: {tx_receipt['gasUsed']}")
            
            # Calculate total cost
            gas_used = tx_receipt['gasUsed']
            gas_price = transaction['gasPrice']
            total_cost_wei = gas_used * gas_price
            total_cost_eth = w3.from_wei(total_cost_wei, 'ether')
            print(f"   Total cost: {total_cost_eth} ETH")
            
            # Save contract address to file
            with open('.nft_contract_address', 'w') as f:
                f.write(contract_address)
            
            print(f"\n📋 Next steps:")
            print(f"   1. Add this to your .env file:")
            print(f"      NFT_CONTRACT_ADDRESS={contract_address}")
            print(f"   2. Update routers/nft.py with the contract address")
            print(f"   3. Verify contract on Etherscan (optional):")
            print(f"      https://sepolia.etherscan.io/address/{contract_address}")
            print(f"   4. Test minting an NFT")
            
            # Display verification command
            print(f"\n🔍 To verify on Etherscan:")
            print(f"   npx hardhat verify --network sepolia {contract_address} {account.address}")
            
            return contract_address
        else:
            print("\n❌ Transaction failed!")
            print(f"   Transaction receipt: {tx_receipt}")
            return None
            
    except Exception as e:
        print(f"\n❌ Deployment failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("  NGO NFT Contract Deployment")
    print("=" * 60)
    
    contract_address = deploy_contract()
    
    if contract_address:
        print("\n" + "=" * 60)
        print("  Deployment Complete! 🎉")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("  Deployment Failed")
        print("=" * 60)