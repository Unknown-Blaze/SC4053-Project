import os
import sys
from dotenv import load_dotenv
from services.ipfs_client import get_ipfs_client
from services.project_ipfs import upload_project_metadata

# Load environment
load_dotenv()

# Try to initialize Firebase
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    # Check if Firebase is already initialized
    if not firebase_admin._apps:
        # Try to initialize with service account key
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✅ Firebase initialized with service account key")
        else:
            print("⚠️  FIREBASE_SERVICE_ACCOUNT_PATH not set or file not found")
            print("   Please set FIREBASE_SERVICE_ACCOUNT_PATH in .env")
            print("   Example: FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json")
            sys.exit(1)
    else:
        db = firestore.client()
        print("✅ Firebase already initialized")
        
except ImportError:
    print("❌ firebase-admin not installed")
    print("   Run: pip install firebase-admin")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error initializing Firebase: {e}")
    print("   Make sure your FIREBASE_SERVICE_ACCOUNT_PATH is correct")
    sys.exit(1)

def migrate_projects():
    """
    Migrate existing projects from Firebase to IPFS
    """
    print("🚀 Starting project migration to IPFS...")
    
    # Get IPFS client
    ipfs_client = get_ipfs_client()
    
    # Fetch all projects from Firestore
    projects_ref = db.collection('charity_projects')
    projects = projects_ref.stream()
    
    migrated_count = 0
    error_count = 0
    
    for project_doc in projects:
        project_id = project_doc.id
        project_data = project_doc.to_dict()
        
        # Skip if already migrated
        if project_data.get('ipfs_metadata_hash'):
            print(f"⏭️  Skipping {project_data.get('name')} - already migrated")
            continue
        
        try:
            print(f"📤 Uploading {project_data.get('name')} to IPFS...")
            
            # Upload project metadata to IPFS
            ipfs_hash = upload_project_metadata(
                name=project_data.get('name', ''),
                description=project_data.get('description', ''),
                ngo_name=project_data.get('ngoName', ''),
                contact_email=project_data.get('contact_email', ''),
                milestones=project_data.get('milestones', []),
                eth_wallet_address=project_data.get('eth_wallet_address', ''),
                additional_data={
                    'contract_address': project_data.get('contract_address', ''),
                    'transaction_hash': project_data.get('transaction_hash', ''),
                    'created_at': project_data.get('created_at', ''),
                    'status': project_data.get('status', '')
                }
            )
            
            # Update Firestore with IPFS hash
            projects_ref.document(project_id).update({
                'ipfs_metadata_hash': ipfs_hash,
                'ipfs_metadata_uri': f'ipfs://{ipfs_hash}',
                'migrated_to_ipfs': True,
                'migration_date': firestore.SERVER_TIMESTAMP
            })
            
            print(f"✅ Migrated {project_data.get('name')}")
            print(f"   IPFS Hash: {ipfs_hash}")
            print(f"   Gateway: https://gateway.pinata.cloud/ipfs/{ipfs_hash}")
            
            migrated_count += 1
            
        except Exception as e:
            print(f"❌ Error migrating {project_data.get('name')}: {e}")
            error_count += 1
            continue
    
    print("\n" + "="*50)
    print(f"✅ Successfully migrated: {migrated_count} projects")
    print(f"❌ Failed: {error_count} projects")
    print("="*50)

if __name__ == "__main__":
    # Uncomment when ready to run
    migrate_projects()
    print("⚠️  Migration script ready. Uncomment migrate_projects() to run.")