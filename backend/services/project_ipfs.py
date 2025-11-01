# services/project_ipfs.py

"""
IPFS integration for project metadata storage
"""

from typing import Dict, Any, List, Optional
from services.ipfs_client import get_ipfs_client
import json


def upload_project_metadata(
    name: str,
    description: str,
    ngo_name: str,
    contact_email: str,
    milestones: List[Dict[str, Any]],
    eth_wallet_address: str,
    additional_data: Optional[Dict[str, Any]] = None
) -> str:
    """
    Upload project metadata to IPFS
    
    Returns:
        IPFS hash (CID) of the uploaded metadata
    """
    ipfs_client = get_ipfs_client()
    
    # Create comprehensive project metadata
    metadata = {
        "name": name,
        "description": description,
        "ngoName": ngo_name,
        "contactEmail": contact_email,
        "ethWalletAddress": eth_wallet_address,
        "milestones": milestones,
        "version": "1.0",
        "schema": "nGoDonate-project-metadata-v1"
    }
    
    # Add any additional data
    if additional_data:
        metadata.update(additional_data)
    
    # Upload to IPFS
    ipfs_hash = ipfs_client.upload_json(
        data=metadata,
        filename=f"project_{name.replace(' ', '_')}.json"
    )
    
    print(f"✅ Project metadata uploaded to IPFS: ipfs://{ipfs_hash}")
    print(f"   Gateway URL: {ipfs_client.get_url(ipfs_hash)}")
    
    return ipfs_hash


def fetch_project_metadata(ipfs_hash: str) -> Dict[str, Any]:
    """
    Fetch project metadata from IPFS
    
    Args:
        ipfs_hash: IPFS CID of the project metadata
        
    Returns:
        Project metadata dictionary
    """
    ipfs_client = get_ipfs_client()
    return ipfs_client.fetch_json(ipfs_hash)


def upload_milestone_verification(
    project_name: str,
    milestone_name: str,
    verification_data: Dict[str, Any],
    documents: Optional[List[bytes]] = None
) -> str:
    """
    Upload milestone verification data to IPFS
    
    Args:
        project_name: Name of the project
        milestone_name: Name of the milestone
        verification_data: Verification details (reports, photos, etc.)
        documents: Optional list of document bytes to upload
        
    Returns:
        IPFS hash of verification data
    """
    ipfs_client = get_ipfs_client()
    
    # Upload any documents first
    document_hashes = []
    if documents:
        for idx, doc_bytes in enumerate(documents):
            doc_hash = ipfs_client.upload_file(
                file_content=doc_bytes,
                filename=f"verification_doc_{idx}.pdf",
                content_type="application/pdf"
            )
            document_hashes.append(f"ipfs://{doc_hash}")
    
    # Create verification metadata
    verification_metadata = {
        "projectName": project_name,
        "milestoneName": milestone_name,
        "verificationData": verification_data,
        "documents": document_hashes,
        "timestamp": verification_data.get("timestamp"),
        "verifier": verification_data.get("verifier"),
        "schema": "nGoDonate-milestone-verification-v1"
    }
    
    # Upload verification metadata
    verification_hash = ipfs_client.upload_json(
        data=verification_metadata,
        filename=f"verification_{milestone_name.replace(' ', '_')}.json"
    )
    
    print(f"✅ Milestone verification uploaded to IPFS: ipfs://{verification_hash}")
    
    return verification_hash
