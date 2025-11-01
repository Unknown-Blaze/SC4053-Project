from web3 import Web3

# Replace with your Infura or Alchemy Sepolia endpoint
INFURA_URL = "https://sepolia.infura.io/v3/38066dfb93954a2cbb7aed144e5dd81b"

def get_balance(wallet_address: str):
    web3 = Web3(Web3.HTTPProvider(INFURA_URL))
    if not web3.is_connected():
        raise Exception("Failed to connect to Ethereum network")

    # ✅ Convert to checksum address
    wallet_address = web3.to_checksum_address(wallet_address)

    balance_wei = web3.eth.get_balance(wallet_address)
    balance_eth = web3.from_wei(balance_wei, 'ether')
    return balance_eth

if __name__ == "__main__":
    address = input("Enter wallet address: ").strip()
    try:
        balance = get_balance(address)
        print(f"\nWallet: {address}\nBalance: {balance:.6f} ETH")
    except Exception as e:
        print("Error:", e)

# https://sepolia-faucet.pk910.de/#/