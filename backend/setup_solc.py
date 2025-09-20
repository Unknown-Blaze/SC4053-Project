# setup_solc.py
import solcx
import sys

def install_solc():
    try:
        # Find a compatible version (e.g., 0.8.20 which matches your contracts)
        # You can list available versions with: solcx.get_installable_solc_versions()
        version_to_install = '0.8.20'
        print(f"Attempting to install solc version: {version_to_install}...")
        
        solcx.install_solc(version_to_install)
        
        print(f"\nSuccessfully installed solc v{version_to_install}")
        print("You can now start your FastAPI server with 'uvicorn main:app --reload'")
        
    except Exception as e:
        print(f"\nAn error occurred: {e}", file=sys.stderr)
        print("Please ensure you have an active internet connection.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    install_solc()