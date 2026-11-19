#!/usr/bin/env bash
set -euo pipefail

OPENCODE_DIR="${HOME}/.config/opencode"
# Resolve real directory path even if install.sh itself is invoked through a symlink
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

MODE="symlink"

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
    --help|-h)
      echo "Usage: ./install.sh [--symlink | --copy]"
      echo "  --symlink, -s  Link ~/.config/opencode agents & skills to this repo (default)"
      echo "  --copy, -c     Copy agents & skills as standalone files"
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

# Ensure Python helper scripts in the repo are executable
chmod +x "${SCRIPT_DIR}/skills/model-roster/scripts/"*.py 2>/dev/null || true
if [ -d "${SCRIPT_DIR}/scripts" ]; then
  chmod +x "${SCRIPT_DIR}/scripts/"*.py 2>/dev/null || true
fi

# Deploy agents
echo ""
echo "--- Installing Agents ---"
for agent in "${SCRIPT_DIR}"/agents/*.md; do
  [ -f "$agent" ] || continue
  filename="$(basename "$agent")"
  target="${OPENCODE_DIR}/agents/${filename}"

  if [ "$MODE" = "symlink" ]; then
    # Remove existing file/symlink if present
    rm -f "$target"
    ln -s "$agent" "$target"
    echo "🔗 Symlinked: ${filename} -> ${agent}"
  else
    rm -f "$target"
    cp -v "$agent" "$target"
  fi
done

# Deploy skills
echo ""
echo "--- Installing Skills ---"
skill_src="${SCRIPT_DIR}/skills/model-roster"
skill_target="${OPENCODE_DIR}/skills/model-roster"

if [ -d "$skill_src" ]; then
  if [ "$MODE" = "symlink" ]; then
    rm -rf "$skill_target"
    ln -s "$skill_src" "$skill_target"
    echo "🔗 Symlinked: model-roster -> ${skill_src}"
  else
    rm -rf "$skill_target"
    mkdir -p "$skill_target"
    cp -rv "${skill_src}/"* "${skill_target}/"
    chmod +x "${skill_target}/scripts/"*.py 2>/dev/null || true
  fi
fi

echo ""
echo "✨ Installation complete in [${MODE}] mode!"
echo "Use '/agent symboli' for autonomous dispatch, or '/agent tracen-lounge' for clubroom brainstorming!"
