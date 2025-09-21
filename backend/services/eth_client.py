import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

ETHEREUM_NODE_URL = os.getenv("ETHEREUM_NODE_URL")

if not ETHEREUM_NODE_URL:
    raise ValueError("ETHEREUM_NODE_URL not found in .env file")

w3 = Web3(Web3.HTTPProvider(ETHEREUM_NODE_URL))

def is_connected():
    return w3.is_connected()