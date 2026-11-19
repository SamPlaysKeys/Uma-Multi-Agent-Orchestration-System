#!/usr/bin/env bash
set -euo pipefail

OPENCODE_DIR="${HOME}/.config/opencode"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🐎 Installing Umamusume Multi-Agent Orchestration System into ${OPENCODE_DIR}..."

mkdir -p "${OPENCODE_DIR}/agents"
mkdir -p "${OPENCODE_DIR}/skills/model-roster/scripts"

# Copy agents
for agent in "${SCRIPT_DIR}"/agents/*.md; do
  [ -f "$agent" ] || continue
  cp -v "$agent" "${OPENCODE_DIR}/agents/"
done

# Copy skills
cp -rv "${SCRIPT_DIR}/skills/model-roster/"* "${OPENCODE_DIR}/skills/model-roster/"
chmod +x "${OPENCODE_DIR}/skills/model-roster/scripts/"*.py

echo "✨ All agents and skills successfully deployed to OpenCode!"
echo "Use '/agent symboli' for autonomous dispatch, or '/agent tracen-lounge' for clubroom brainstorming!"
