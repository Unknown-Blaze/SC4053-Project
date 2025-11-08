"""Utility to convert a Firebase serviceAccountKey.json file to base64."""

from __future__ import annotations

import base64
import json
import os
import sys
from typing import Optional


def convert_service_account_to_base64(file_path: str = "serviceAccountKey.json") -> Optional[str]:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"Invalid JSON file: {file_path}")
        return None

    json_string = json.dumps(data, separators=(",", ":"))
    base64_string = base64.b64encode(json_string.encode("utf-8")).decode("utf-8")
    print(base64_string)
    return base64_string


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "serviceAccountKey.json"
    convert_service_account_to_base64(path)
