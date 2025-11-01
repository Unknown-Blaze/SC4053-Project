"""
Quick test script to verify the /projects/all endpoint works
Run this after starting your backend with: uvicorn main:app --reload
"""
import requests
import json

# Test the new endpoint
try:
    response = requests.get('http://127.0.0.1:8000/projects/all')
    data = response.json()
    
    print("=" * 60)
    print("✅ Backend API Response:")
    print("=" * 60)
    print(json.dumps(data, indent=2))
    print("=" * 60)
    
    if data.get('success'):
        print(f"\n✅ SUCCESS! Found {data.get('count', 0)} projects")
        
        for project in data.get('projects', []):
            print(f"\n📦 Project: {project.get('name')}")
            if 'ipfs_metadata_hash' in project:
                print(f"   ✅ IPFS Hash: {project['ipfs_metadata_hash']}")
                print(f"   🌐 IPFS URL: {project['ipfs_url']}")
            else:
                print(f"   ⚠️  No IPFS metadata yet")
    else:
        print("\n❌ API returned success=false")
        
except requests.exceptions.ConnectionError:
    print("❌ Backend not running!")
    print("   Start it with: cd backend && uvicorn main:app --reload")
except Exception as e:
    print(f"❌ Error: {e}")
