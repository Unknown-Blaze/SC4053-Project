# compile_contracts.py

import json
import os
import sys
from solcx import compile_source, set_solc_version, install_solc

# --- Configuration ---
CONTRACTS_DIR = "contracts"
BUILD_DIR = "build/contracts"
SOLC_VERSION = "0.8.20"

def compile_all_contracts():
    """
    Finds all .sol files, compiles them, and saves their ABI and Bytecode
    to JSON files in the build directory.
    """
    try:
        print(f"Setting solc version to {SOLC_VERSION}...")
        # This will set the version, or install it if it's missing.
        install_solc(SOLC_VERSION, show_progress=True)
        set_solc_version(SOLC_VERSION, silent=True)
        print("Solc version set successfully.")
    except Exception as e:
        print(f"Fatal error setting solc version: {e}", file=sys.stderr)
        sys.exit(1)

    # --- NEW, MORE ROBUST PATH CONSTRUCTION ---
    # Get the absolute path of the directory containing this script (the 'backend' dir)
    backend_dir = os.path.dirname(os.path.realpath(__file__))
    # Get the project root directory (one level up)
    project_root = os.path.dirname(backend_dir)
    # Construct the absolute path to the node_modules directory
    node_modules_path = os.path.join(project_root, "frontend", "node_modules")
    # Normalize the path to resolve any '..' and use correct separators for the OS
    node_modules_path = os.path.normpath(node_modules_path)

    # --- ADDED A CHECK to make sure the path exists ---
    if not os.path.isdir(node_modules_path):
        print(f"\nFATAL ERROR: The required directory was not found at '{node_modules_path}'", file=sys.stderr)
        print("Please make sure you have run 'npm install' inside your 'frontend' directory.", file=sys.stderr)
        sys.exit(1)
        
    import_remappings = [
        f"@openzeppelin/={node_modules_path}/@openzeppelin/"
    ]
    print(f"Using import remapping: {import_remappings[0]}")

    # --- Create the build directory if it doesn't exist ---
    os.makedirs(BUILD_DIR, exist_ok=True)
    print(f"Build directory '{BUILD_DIR}' is ready.")

    # --- Find and compile all .sol files ---
    for filename in os.listdir(CONTRACTS_DIR):
        if filename.endswith(".sol"):
            contract_path = os.path.join(CONTRACTS_DIR, filename)
            contract_name = filename.split('.')[0]
            print(f"\nCompiling {contract_path}...")

            with open(contract_path, 'r') as f:
                source = f.read()

            try:
                compiled_sol = compile_source(
                    source,
                    output_values=['abi', 'bin'],
                    import_remappings=import_remappings
                )

                # Determine which contract to extract from this source.
                # Prefer the first contract declared in the file contents.
                import re
                declared_name_match = re.search(r"^[\t ]*contract\s+([A-Za-z_][A-Za-z0-9_]*)\b", source, flags=re.MULTILINE)
                declared_name = declared_name_match.group(1) if declared_name_match else None

                contract_keys = list(compiled_sol.keys())
                preferred_key = None
                if declared_name:
                    preferred_key = next((k for k in contract_keys if k.endswith(f":{declared_name}")), None)
                if preferred_key is None:
                    preferred_key = next((k for k in contract_keys if k.endswith(f":{contract_name}")), None)
                if preferred_key is None:
                    if len(contract_keys) == 1:
                        preferred_key = contract_keys[0]
                    else:
                        preferred_key = contract_keys[0]
                        expected = declared_name or contract_name
                        print(f"  => Warning: expected contract '{expected}' not found; using '{preferred_key.split(':', 1)[1]}'")

                contract_interface = compiled_sol[preferred_key]
                actual_name = preferred_key.split(':', 1)[1]

                output_data = {
                    'abi': contract_interface['abi'],
                    'bytecode': contract_interface['bin']
                }

                output_filename = os.path.join(BUILD_DIR, f"{actual_name}.json")
                with open(output_filename, 'w') as f:
                    json.dump(output_data, f, indent=4)

                print(f"  => Success! Output saved to {output_filename}")

            except Exception as e:
                print(f"  => ERROR compiling {filename}: {e}", file=sys.stderr)
                sys.exit(1)

    print("\nAll contracts compiled successfully.")

if __name__ == "__main__":
    compile_all_contracts()