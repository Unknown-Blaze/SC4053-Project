# services/ipfs_client.py

"""
IPFS Client Service for decentralized storage
Supports multiple IPFS providers: Local node, Pinata, Web3.Storage, NFT.Storage
"""

import os
import json
import requests
from typing import Dict, Any, Optional, Union
from io import BytesIO
from PIL import Image
import base64

class IPFSClient:
    """
    Unified IPFS client that supports multiple providers
    """
    
    def __init__(self, provider: str = "pinata"):
        """
        Initialize IPFS client with specified provider
        
        Args:
            provider: 'pinata', 'web3storage', 'nftstorage', or 'local'
        """
        self.provider = provider.lower()
        
        # Provider configurations
        if self.provider == "pinata":
            self.api_key = os.getenv("PINATA_API_KEY")
            self.api_secret = os.getenv("PINATA_API_SECRET")
            self.base_url = "https://api.pinata.cloud"
            self.gateway_url = "https://gateway.pinata.cloud/ipfs"
            
        elif self.provider == "web3storage":
            self.api_token = os.getenv("WEB3_STORAGE_TOKEN")
            self.base_url = "https://api.web3.storage"
            self.gateway_url = "https://w3s.link/ipfs"
            
        elif self.provider == "nftstorage":
            self.api_token = os.getenv("NFT_STORAGE_TOKEN")
            self.base_url = "https://api.nft.storage"
            self.gateway_url = "https://nftstorage.link/ipfs"
            
        elif self.provider == "local":
            # Local IPFS node (requires running IPFS daemon)
            self.api_url = os.getenv("IPFS_API_URL", "/ip4/127.0.0.1/tcp/5001")
            self.gateway_url = os.getenv("IPFS_GATEWAY_URL", "http://127.0.0.1:8080/ipfs")
            
        else:
            raise ValueError(f"Unsupported IPFS provider: {provider}")
    
    def upload_json(self, data: Dict[str, Any], filename: str = "metadata.json") -> str:
        """
        Upload JSON data to IPFS
        
        Args:
            data: Dictionary to upload as JSON
            filename: Name for the file
            
        Returns:
            IPFS hash (CID)
        """
        if self.provider == "pinata":
            return self._upload_json_pinata(data, filename)
        elif self.provider == "web3storage":
            return self._upload_json_web3storage(data, filename)
        elif self.provider == "nftstorage":
            return self._upload_json_nftstorage(data, filename)
        elif self.provider == "local":
            return self._upload_json_local(data, filename)
    
    def upload_file(self, file_content: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
        """
        Upload file bytes to IPFS
        
        Args:
            file_content: File content as bytes
            filename: Name for the file
            content_type: MIME type
            
        Returns:
            IPFS hash (CID)
        """
        if self.provider == "pinata":
            return self._upload_file_pinata(file_content, filename, content_type)
        elif self.provider == "web3storage":
            return self._upload_file_web3storage(file_content, filename, content_type)
        elif self.provider == "nftstorage":
            return self._upload_file_nftstorage(file_content, filename, content_type)
        elif self.provider == "local":
            return self._upload_file_local(file_content, filename)
    
    def get_url(self, ipfs_hash: str) -> str:
        """
        Get IPFS URL for a hash
        
        Args:
            ipfs_hash: IPFS CID
            
        Returns:
            Full URL to access the content
        """
        # Remove ipfs:// prefix if present
        ipfs_hash = ipfs_hash.replace("ipfs://", "")
        return f"{self.gateway_url}/{ipfs_hash}"
    
    def fetch_json(self, ipfs_hash: str) -> Dict[str, Any]:
        """
        Fetch JSON data from IPFS
        
        Args:
            ipfs_hash: IPFS CID
            
        Returns:
            JSON data as dictionary
        """
        url = self.get_url(ipfs_hash)
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()
    
    # Pinata-specific methods
    def _upload_json_pinata(self, data: Dict[str, Any], filename: str) -> str:
        """Upload JSON to Pinata"""
        url = f"{self.base_url}/pinning/pinJSONToIPFS"
        headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret,
            "Content-Type": "application/json"
        }
        
        payload = {
            "pinataContent": data,
            "pinataMetadata": {
                "name": filename
            }
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result["IpfsHash"]
    
    def _upload_file_pinata(self, file_content: bytes, filename: str, content_type: str) -> str:
        """Upload file to Pinata"""
        url = f"{self.base_url}/pinning/pinFileToIPFS"
        headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret
        }
        
        files = {
            "file": (filename, BytesIO(file_content), content_type)
        }
        
        response = requests.post(url, files=files, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result["IpfsHash"]
    
    # Web3.Storage methods
    def _upload_json_web3storage(self, data: Dict[str, Any], filename: str) -> str:
        """Upload JSON to Web3.Storage"""
        url = f"{self.base_url}/upload"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        files = {
            "file": (filename, json.dumps(data).encode(), "application/json")
        }
        
        response = requests.post(url, files=files, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result["cid"]
    
    def _upload_file_web3storage(self, file_content: bytes, filename: str, content_type: str) -> str:
        """Upload file to Web3.Storage"""
        url = f"{self.base_url}/upload"
        headers = {
            "Authorization": f"Bearer {self.api_token}"
        }
        
        files = {
            "file": (filename, BytesIO(file_content), content_type)
        }
        
        response = requests.post(url, files=files, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result["cid"]
    
    # NFT.Storage methods
    def _upload_json_nftstorage(self, data: Dict[str, Any], filename: str) -> str:
        """Upload JSON to NFT.Storage"""
        url = f"{self.base_url}/upload"
        headers = {
            "Authorization": f"Bearer {self.api_token}"
        }
        
        files = {
            "file": (filename, json.dumps(data).encode(), "application/json")
        }
        
        response = requests.post(url, files=files, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result["value"]["cid"]
    
    def _upload_file_nftstorage(self, file_content: bytes, filename: str, content_type: str) -> str:
        """Upload file to NFT.Storage"""
        url = f"{self.base_url}/upload"
        headers = {
            "Authorization": f"Bearer {self.api_token}"
        }
        
        files = {
            "file": (filename, BytesIO(file_content), content_type)
        }
        
        response = requests.post(url, files=files, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result["value"]["cid"]
    
    # Local IPFS node methods
    def _upload_json_local(self, data: Dict[str, Any], filename: str) -> str:
        """Upload JSON to local IPFS node"""
        try:
            import ipfshttpclient
            client = ipfshttpclient.connect(self.api_url)
            result = client.add_json(data)
            return result
        except Exception as e:
            raise Exception(f"Local IPFS upload failed: {str(e)}")
    
    def _upload_file_local(self, file_content: bytes, filename: str) -> str:
        """Upload file to local IPFS node"""
        try:
            import ipfshttpclient
            client = ipfshttpclient.connect(self.api_url)
            result = client.add_bytes(file_content)
            return result
        except Exception as e:
            raise Exception(f"Local IPFS upload failed: {str(e)}")


# Helper function to generate certificate images
def generate_certificate_image(
    project_name: str,
    donor_address: str,
    amount: float,
    tier: str,
    tier_emoji: str
) -> bytes:
    """
    Generate a simple certificate image using PIL
    Returns image bytes (PNG format)
    """
    # Create a simple certificate image
    img_width, img_height = 800, 600
    img = Image.new('RGB', (img_width, img_height), color=(240, 248, 255))
    
    # In production, you'd use ImageDraw to add text, logos, etc.
    # For now, return a simple colored image
    # You can enhance this with proper certificate design
    
    # Convert to bytes
    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes.getvalue()


# Singleton instance
_ipfs_client: Optional[IPFSClient] = None

def get_ipfs_client() -> IPFSClient:
    """Get or create IPFS client singleton"""
    global _ipfs_client
    if _ipfs_client is None:
        provider = os.getenv("IPFS_PROVIDER", "pinata")
        _ipfs_client = IPFSClient(provider=provider)
    return _ipfs_client
