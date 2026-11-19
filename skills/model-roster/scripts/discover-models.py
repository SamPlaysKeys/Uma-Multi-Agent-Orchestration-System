#!/usr/bin/env python3
"""
discover-models.py
Discovers active models in OpenCode and LM Studio, noting tool capabilities and loaded state.
"""

import json
import subprocess
import sys
import urllib.request
import urllib.error

def get_opencode_models():
    try:
        proc = subprocess.run(
            ["opencode", "api", "get", "/api/model"],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(proc.stdout)
        models = data.get("data", []) if isinstance(data, dict) else data
        return models
    except Exception as e:
        return []

def get_lmstudio_loaded():
    loaded = []
    # Try lms ps first
    try:
        proc = subprocess.run(
            ["/Users/sfadmin/.lmstudio/bin/lms", "ps"],
            capture_output=True,
            text=True,
            check=True
        )
        for line in proc.stdout.splitlines():
            line = line.strip()
            if line and not line.startswith("IDENTIFIER") and not line.startswith("-"):
                parts = line.split()
                if parts:
                    loaded.append(parts[0])
    except Exception:
        pass
    return loaded

def main():
    json_mode = "--json" in sys.argv
    models = get_opencode_models()
    loaded_lms = get_lmstudio_loaded()

    by_provider = {}
    for m in models:
        p = m.get("providerID", "unknown")
        by_provider.setdefault(p, []).append(m)

    if json_mode:
        summary = {
            "total_models": len(models),
            "providers": {
                p: {
                    "count": len(p_models),
                    "models": [
                        {
                            "id": f"{p}/{m.get('modelID', m.get('id'))}",
                            "name": m.get("name"),
                            "tools": m.get("capabilities", {}).get("tools", True),
                        }
                        for m in p_models
                    ]
                }
                for p, p_models in sorted(by_provider.items())
            },
            "lmstudio_loaded": loaded_lms,
        }
        print(json.dumps(summary, indent=2))
        return

    print("=== OpenCode Available Models ===")
    print(f"Total models discovered: {len(models)}")
    for p, p_models in sorted(by_provider.items()):
        print(f"\nProvider: {p} ({len(p_models)} models)")
        for m in p_models:
            mid = m.get("modelID", m.get("id"))
            tools = m.get("capabilities", {}).get("tools", True)
            tool_flag = "[tools: OK]" if tools else "[tools: NO]"
            loaded_flag = " (LOADED in RAM)" if mid in loaded_lms else ""
            print(f"  - {p}/{mid} {tool_flag}{loaded_flag}")

    if loaded_lms:
        print(f"\nCurrently loaded in LM Studio: {', '.join(loaded_lms)}")
    else:
        print("\nLM Studio: server online, no models currently loaded in RAM.")

if __name__ == "__main__":
    main()
