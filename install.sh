#!/usr/bin/env bash
set -euo pipefail

OPENCODE_DIR="${HOME}/.config/opencode"
# Resolve real directory path even if install.sh itself is invoked through a symlink
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

MODE="symlink"
RUN_CONFIGURE=false

# Parse CLI options
while [[ $# -gt 0 ]]; do
  case "$1" in
    --copy|-c)
      MODE="copy"
      shift
      ;;
    --symlink|-s)
      MODE="symlink"
      shift
      ;;
    --configure|-i|--setup)
      RUN_CONFIGURE=true
      shift
      ;;
    --help|-h)
      echo "Usage: ./install.sh [--symlink | --copy] [--configure]"
      echo "  --symlink, -s     Link ~/.config/opencode agents & skills to this repo (default)"
      echo "  --copy, -c        Copy agents & skills as standalone files"
      echo "  --configure, -i   Launch interactive model configuration wizard"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./install.sh [--symlink | --copy]"
      exit 1
      ;;
  esac
done

echo "🐎 Installing Umamusume Multi-Agent Orchestration System into ${OPENCODE_DIR}..."
echo "📂 Source repository: ${SCRIPT_DIR}"
echo "⚙️  Installation mode: ${MODE}"

mkdir -p "${OPENCODE_DIR}/agents"
mkdir -p "${OPENCODE_DIR}/skills"
mkdir -p "${OPENCODE_DIR}/commands"

# Ensure Python helper scripts in the repo are executable
chmod +x "${SCRIPT_DIR}/skills/model-roster/scripts/"*.py 2>/dev/null || true
if [ -d "${SCRIPT_DIR}/scripts" ]; then
  chmod +x "${SCRIPT_DIR}/scripts/"*.py 2>/dev/null || true
fi

# Model configuration check / wizard
if [ "${RUN_CONFIGURE}" = true ]; then
  if command -v python3 >/dev/null 2>&1 && [ -f "${SCRIPT_DIR}/scripts/configure.py" ]; then
    python3 "${SCRIPT_DIR}/scripts/configure.py"
  else
    echo "⚠️ Python 3 is required to run the configuration wizard."
  fi
elif [ -f "${SCRIPT_DIR}/uma-config.yaml" ] && [ -f "${SCRIPT_DIR}/scripts/configure.py" ]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 "${SCRIPT_DIR}/scripts/configure.py" --apply
  fi
fi

# Deploy agents
echo ""
echo "--- Installing Agents ---"
for agent in "${SCRIPT_DIR}"/agents/*.md; do
  [ -f "$agent" ] || continue
  filename="$(basename "$agent")"
  target="${OPENCODE_DIR}/agents/${filename}"

  if [ "$MODE" = "symlink" ]; then
    rm -f "$target"
    ln -s "$agent" "$target"
    echo "🔗 Symlinked: agents/${filename} -> ${agent}"
  else
    rm -f "$target"
    cp -v "$agent" "$target"
  fi
done

# Deploy skills
echo ""
echo "--- Installing Skills ---"
for skill_dir in "${SCRIPT_DIR}"/skills/*; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  skill_target="${OPENCODE_DIR}/skills/${skill_name}"

  if [ "$MODE" = "symlink" ]; then
    rm -rf "$skill_target"
    ln -s "$skill_dir" "$skill_target"
    echo "🔗 Symlinked: skills/${skill_name} -> ${skill_dir}"
  else
    rm -rf "$skill_target"
    mkdir -p "$skill_target"
    cp -rv "${skill_dir}/"* "${skill_target}/"
    chmod +x "${skill_target}/scripts/"*.py 2>/dev/null || true
  fi
done

# Deploy commands
echo ""
echo "--- Installing Commands ---"
if [ -d "${SCRIPT_DIR}/commands" ]; then
  for cmd in "${SCRIPT_DIR}"/commands/*.md; do
    [ -f "$cmd" ] || continue
    cmd_name="$(basename "$cmd")"
    cmd_target="${OPENCODE_DIR}/commands/${cmd_name}"

    if [ "$MODE" = "symlink" ]; then
      rm -f "$cmd_target"
      ln -s "$cmd" "$cmd_target"
      echo "🔗 Symlinked: commands/${cmd_name} -> ${cmd}"
    else
      rm -f "$cmd_target"
      cp -v "$cmd" "$cmd_target"
    fi
  done
fi

echo ""
echo "✨ Installation complete in [${MODE}] mode!"
echo "Use '/help-uma-os' to see squad capabilities, '/agent symboli' for autonomous dispatch, or '/agent tracen-lounge' for clubroom brainstorming!"
