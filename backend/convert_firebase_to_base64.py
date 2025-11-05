# Convert serviceAccountKey.json to Base64 for Railway
# Run this script to get the base64 string to paste into Railway env vars

import json
import base64
import os

def convert_service_account_to_base64(file_path='serviceAccountKey.json'):
    """Convert Firebase service account JSON to base64 string"""
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        print(f"   Make sure {file_path} exists in the current directory")
        return None
    
    try:
        # Read the JSON file
        with open(file_path, 'r') as f:
            service_account_dict = json.load(f)
        
        # Convert to compact JSON string (no extra whitespace)
        json_string = json.dumps(service_account_dict, separators=(',', ':'))
        
        # Encode to base64
        base64_bytes = base64.b64encode(json_string.encode('utf-8'))
        base64_string = base64_bytes.decode('utf-8')
        
        # Print results
        print("=" * 80)
        print("✅ Successfully converted serviceAccountKey.json to base64!")
        print("=" * 80)
        print("\n📋 Copy the following value to Railway environment variables:")
        print("\nVariable name: FIREBASE_SERVICE_ACCOUNT_BASE64")
        print(f"\nVariable value:\n{base64_string}")
        print("\n" + "=" * 80)
        print("\n🔧 How to use in Railway:")
        print("1. Go to Railway dashboard → Your service → Variables")
        print("2. Click 'New Variable'")
        print("3. Name: FIREBASE_SERVICE_ACCOUNT_BASE64")
        print("4. Value: Paste the string above")
        print("5. Click 'Add'")
        print("\n" + "=" * 80)
        
        # Optionally save to a file
        output_file = 'firebase_base64.txt'
        with open(output_file, 'w') as f:
            f.write(base64_string)
        print(f"\n💾 Also saved to: {output_file}")
        
        return base64_string
        
    except json.JSONDecodeError:
        print(f"❌ Error: {file_path} is not valid JSON")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    import sys
    
    # Check if custom file path provided
    file_path = sys.argv[1] if len(sys.argv) > 1 else 'serviceAccountKey.json'
    
    print("\n🔐 Firebase Service Account to Base64 Converter")
    print("=" * 80)
    print(f"📁 Converting: {file_path}")
    print("=" * 80 + "\n")
    
    convert_service_account_to_base64(file_path)
