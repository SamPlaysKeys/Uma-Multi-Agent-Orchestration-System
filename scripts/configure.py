#!/usr/bin/env python3
"""
scripts/configure.py
UMA OS Model Configuration & Interactive Setup Wizard

Manages model assignments for the Umamusume agent roster by decoupling
personas from specific endpoints via uma-config.yaml.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("⚠️ PyYAML is required. Run: pip install pyyaml")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "uma-config.yaml"
AGENTS_DIR = BASE_DIR / "agents"
OPENCODE_CONFIG_PATH = Path.home() / ".config" / "opencode" / "opencode.jsonc"
OPENCODE_CONFIG_PATH_FALLBACK = Path.home() / ".config" / "opencode" / "opencode.json"

# Map of agent names to their markdown filenames
AGENT_FILES = {
    "symboli": "symboli.md",
    "tracen-lounge": "tracen-lounge.md",
    "biwa": "biwa.md",
    "golshi": "golshi.md",
    "spe-chan": "spe-chan.md",
    "super-creek": "super-creek.md",
    "tachyon": "tachyon.md",
}

AGENT_DISPLAY = {
    "symboli": "👑 Symboli Rudolf",
    "tracen-lounge": "☕ Tracen Lounge",
    "biwa": "👓 Biwa Hayahide",
    "golshi": "🚢 Gold Ship",
    "spe-chan": "🍠 Special Week",
    "super-creek": "🍵 Super Creek",
    "tachyon": "🧪 Agnes Tachyon",
}


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        print(f"❌ Configuration file not found at {CONFIG_PATH}")
        sys.exit(1)
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_config(config: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.dump(config, f, sort_keys=False, default_flow_style=False, allow_unicode=True)


def get_opencode_models() -> list:
    """Interrogates OpenCode API for available models."""
    try:
        proc = subprocess.run(
            ["opencode", "api", "get", "/api/model"],
            capture_output=True,
            text=True,
            timeout=8,
            check=True,
        )
        data = json.loads(proc.stdout)
        models = data.get("data", []) if isinstance(data, dict) else data
        return models if isinstance(models, list) else []
    except Exception:
        return []


def resolve_agent_models(config: dict) -> dict:
    """Computes the final model ID for each agent based on preset + overrides."""
    active_preset = config.get("active_preset", "google-vertex")
    presets = config.get("presets", {})
    tier_mapping = config.get("agent_tiers", {})
    custom_overrides = config.get("custom_agent_models", {}) or {}

    preset_tiers = presets.get(active_preset, {})

    resolved = {}
    for agent_id, file_name in AGENT_FILES.items():
        # Check explicit custom override first
        if custom_overrides.get(agent_id):
            resolved[agent_id] = custom_overrides[agent_id]
            continue

        # Fallback to capability tier in active preset
        tier = tier_mapping.get(agent_id, "workhorse")
        model = preset_tiers.get(tier)
        if not model:
            # Fallback to any model defined in the preset
            model = next(iter(preset_tiers.values()), "opencode/big-pickle")
        resolved[agent_id] = model

    return resolved


def get_opencode_config_path() -> Path:
    if OPENCODE_CONFIG_PATH.exists():
        return OPENCODE_CONFIG_PATH
    if OPENCODE_CONFIG_PATH_FALLBACK.exists():
        return OPENCODE_CONFIG_PATH_FALLBACK
    return OPENCODE_CONFIG_PATH


def update_opencode_jsonc(resolved_models: dict) -> bool:
    """Updates the 'agents' block in ~/.config/opencode/opencode.jsonc.
    
    Preserves all other config (schema, model, default_agent, providers, plugins, etc.).
    Creates a timestamped backup before modifying an existing file.
    """
    target_path = get_opencode_config_path()
    if not target_path.exists():
        target_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "$schema": "https://opencode.ai/config.json",
            "agents": {}
        }
    else:
        text = target_path.read_text(encoding="utf-8")
        # Strip comments for parsing if needed or parse standard JSON
        clean_text = re.sub(r"^\s*//.*$", "", text, flags=re.MULTILINE)
        clean_text = re.sub(r"/\*.*?\*/", "", clean_text, flags=re.DOTALL)
        try:
            data = json.loads(clean_text)
        except Exception:
            # Fallback to empty structure if invalid
            data = {}

    if "agents" not in data or not isinstance(data["agents"], dict):
        data["agents"] = {}

    changed = False
    for agent_id, model_id in resolved_models.items():
        if agent_id not in data["agents"]:
            data["agents"][agent_id] = {}
        if data["agents"][agent_id].get("model") != model_id:
            data["agents"][agent_id]["model"] = model_id
            changed = True

    if changed:
        # Create a backup before writing changes
        if target_path.exists():
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = target_path.parent / f"{target_path.name}.bak.{timestamp}"
            shutil.copy2(target_path, backup_path)

        target_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    return changed


def apply_configuration(config: dict, quiet: bool = False, update_markdown: bool = False):
    """Applies the resolved models from config into opencode.jsonc and optionally markdown files."""
    resolved = resolve_agent_models(config)
    preset_name = config.get("active_preset", "custom")

    if not quiet:
        print(f"\n🐎 [UMA OS] Applying Model Configuration (Preset: {preset_name})")
        print("=" * 65)

    jsonc_updated = update_opencode_jsonc(resolved)
    cfg_path = get_opencode_config_path()

    updated_count = 0
    if update_markdown:
        for agent_id, model_id in resolved.items():
            if update_agent_markdown(agent_id, model_id):
                updated_count += 1

    if not quiet:
        for agent_id, model_id in resolved.items():
            display = AGENT_DISPLAY.get(agent_id, agent_id)
            tier = config.get("agent_tiers", {}).get(agent_id, "default")
            print(f" ✓ {display:<22} ({tier:<12}) -> {model_id}")

        print("=" * 65)
        print(f"✅ Local OpenCode config synced: {cfg_path}")
        if update_markdown:
            print(f"📝 {updated_count} markdown frontmatter files updated in repo.")
        else:
            print(f"🛡️  Git repo markdown files untouched (local overrides in opencode.jsonc active).\n")


def display_current_roster(config: dict):
    resolved = resolve_agent_models(config)
    preset_name = config.get("active_preset", "custom")
    print(f"\n📋 Current UMA OS Squad Configuration (Active Preset: {preset_name}):")
    print("-" * 65)
    for agent_id, model_id in resolved.items():
        display = AGENT_DISPLAY.get(agent_id, agent_id)
        tier = config.get("agent_tiers", {}).get(agent_id, "default")
        print(f"  {display:<22} [{tier:<12}]: {model_id}")
    print("-" * 65 + "\n")


def list_opencode_models():
    models = get_opencode_models()
    if not models:
        print("⚠️ Could not detect running models via OpenCode API (`opencode api get /api/model`).")
        print("Make sure OpenCode is running or configured with provider API keys.")
        return

    by_provider = {}
    for m in models:
        p = m.get("providerID", "unknown")
        by_provider.setdefault(p, []).append(m)

    print(f"\n🔍 Detected {len(models)} OpenCode models across {len(by_provider)} providers:")
    for p, p_models in sorted(by_provider.items()):
        print(f"\n📁 Provider: {p} ({len(p_models)} models)")
        for m in p_models[:8]:
            mid = m.get("modelID", m.get("id"))
            tools = "✓ tools" if m.get("capabilities", {}).get("tools", True) else "✗ no tools"
            print(f"   - {p}/{mid} ({tools})")
        if len(p_models) > 8:
            print(f"   ... and {len(p_models) - 8} more.")
    print()


def interactive_wizard():
    print("""
    =======================================================
       🐎 UMA OS — Interactive Model Configuration Wizard 🐎
    =======================================================
    "Welcome to the track, Trainer! Let's get every member
     of the squad equipped with the perfect model substrate."
    """)

    config = load_config()
    display_current_roster(config)

    # Check live models
    live_models = get_opencode_models()
    live_providers = sorted({m.get("providerID", "unknown") for m in live_models}) if live_models else []

    if live_providers:
        print(f"⚡ Live OpenCode Providers Detected: {', '.join(live_providers)}\n")

    presets = list(config.get("presets", {}).keys())

    print("Choose an action:")
    print("  [1] Select a Provider Preset (Aperture, Anthropic, OpenAI, Vertex, Gemini, OpenRouter, etc.)")
    print("  [2] Set ONE single model for the entire squad (e.g. anthropic/claude-3-7-sonnet)")
    print("  [3] Customize a specific Umamusume's model")
    print("  [4] Inspect detected OpenCode models")
    print("  [5] Sync active preset to local ~/.config/opencode/opencode.jsonc")
    print("  [0] Exit without changes")

    choice = input("\nSelect [0-5]: ").strip()

    if choice == "1":
        print("\nAvailable Provider Presets:")
        for idx, p in enumerate(presets, 1):
            marker = " (ACTIVE)" if p == config.get("active_preset") else ""
            print(f"  [{idx}] {p}{marker}")

        p_choice = input(f"\nSelect preset [1-{len(presets)}]: ").strip()
        try:
            p_idx = int(p_choice) - 1
            if 0 <= p_idx < len(presets):
                selected_preset = presets[p_idx]
                config["active_preset"] = selected_preset
                save_config(config)
                print(f"\n✓ Switched active preset to: {selected_preset}")
                apply_configuration(config)
            else:
                print("Invalid selection.")
        except ValueError:
            print("Invalid input.")

    elif choice == "2":
        print("\nSet a single model identifier for all agents.")
        if live_models:
            print("Tip: Here are some detected models in your environment:")
            sample = [f"{m.get('providerID')}/{m.get('modelID', m.get('id'))}" for m in live_models[:5]]
            for s in sample:
                print(f"   • {s}")
        model_str = input("\nEnter full model ID (e.g. anthropic/claude-3-7-sonnet): ").strip()
        if model_str:
            # Create or update custom preset
            if "custom" not in config["presets"]:
                config["presets"]["custom"] = {}
            for tier in config.get("tier_definitions", {}):
                config["presets"]["custom"][tier] = model_str
            config["active_preset"] = "custom"
            # Clear individual overrides so all girls take this single model
            config["custom_agent_models"] = {k: None for k in AGENT_FILES}
            save_config(config)
            print(f"\n✓ Set all agents to: {model_str}")
            apply_configuration(config)

    elif choice == "3":
        print("\nWhich Umamusume would you like to customize?")
        agent_list = list(AGENT_FILES.keys())
        for idx, a in enumerate(agent_list, 1):
            print(f"  [{idx}] {AGENT_DISPLAY.get(a, a)}")
        a_choice = input(f"\nSelect girl [1-{len(agent_list)}]: ").strip()
        try:
            a_idx = int(a_choice) - 1
            if 0 <= a_idx < len(agent_list):
                target_agent = agent_list[a_idx]
                print(f"\nCurrent override for {target_agent}: {config.get('custom_agent_models', {}).get(target_agent)}")
                new_model = input("Enter new model ID (or type 'reset' to follow preset): ").strip()
                if "custom_agent_models" not in config:
                    config["custom_agent_models"] = {}

                if new_model.lower() in ("reset", "none", ""):
                    config["custom_agent_models"][target_agent] = None
                    print(f"✓ Reset {target_agent} to follow active preset.")
                else:
                    config["custom_agent_models"][target_agent] = new_model
                    print(f"✓ Overrode {target_agent} with {new_model}")

                save_config(config)
                apply_configuration(config)
            else:
                print("Invalid selection.")
        except ValueError:
            print("Invalid input.")

    elif choice == "4":
        list_opencode_models()
        # Offer loop back
        input("Press Enter to return to wizard...")
        interactive_wizard()

    elif choice == "5":
        apply_configuration(config)

    elif choice == "0":
        print("Exiting wizard. Gambatte, Trainer!")
        return
    else:
        print("Unknown selection.")


def main():
    parser = argparse.ArgumentParser(description="UMA OS Model Configuration & Wizard")
    parser.add_argument("--apply", action="store_true", help="Apply current uma-config.yaml to ~/.config/opencode/opencode.jsonc")
    parser.add_argument("--update-markdown", action="store_true", help="Also modify model: fields in agents/*.md in the Git repo")
    parser.add_argument("--preset", type=str, help="Switch active preset and apply")
    parser.add_argument("--single-model", type=str, help="Set all agents to a single model string")
    parser.add_argument("--show", action="store_true", help="Display current agent model mappings")
    parser.add_argument("--list-models", action="store_true", help="List models discovered via OpenCode API")

    args = parser.parse_args()

    # If no flags passed, launch interactive wizard
    if len(sys.argv) == 1:
        interactive_wizard()
        return

    config = load_config()

    if args.list_models:
        list_opencode_models()
        return

    if args.show:
        display_current_roster(config)
        return

    if args.preset:
        presets = config.get("presets", {})
        preset_name = args.preset
        # Aliases
        aliases = {
            "aperture-openai-compatible": "aperture",
            "tailscale": "aperture",
            "aperture-tailscale": "aperture",
            "vertex": "google-vertex",
            "gemini": "google-gemini",
        }
        if preset_name in aliases:
            preset_name = aliases[preset_name]

        if preset_name not in presets:
            print(f"❌ Unknown preset '{args.preset}'. Available presets: {', '.join(presets.keys())}")
            sys.exit(1)
        config["active_preset"] = preset_name
        save_config(config)
        print(f"✓ Switched active preset to '{preset_name}'")
        apply_configuration(config, update_markdown=args.update_markdown)
        return

    if args.single_model:
        model_str = args.single_model.strip()
        if "custom" not in config["presets"]:
            config["presets"]["custom"] = {}
        for tier in config.get("tier_definitions", {}):
            config["presets"]["custom"][tier] = model_str
        config["active_preset"] = "custom"
        config["custom_agent_models"] = {k: None for k in AGENT_FILES}
        save_config(config)
        print(f"✓ Set all agents to '{model_str}'")
        apply_configuration(config, update_markdown=args.update_markdown)
        return

    if args.apply:
        apply_configuration(config, update_markdown=args.update_markdown)
        return


if __name__ == "__main__":
    main()
