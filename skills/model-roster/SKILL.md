---
name: model-roster
description: Discovers live models across OpenCode providers (Google Vertex, local LM Studio, Aperture, Free) and checks for StartLux / System One decision servers for Biwa Hayahide triage
---

# Skill: Model Roster & Decision Server Discovery

This skill provides inspection tools to check live model availability and query decision servers before delegating work.

## When to Use
- **Model Discovery**: Before choosing or overriding model IDs for subagents, check which models are currently connected, loaded, and tool-capable.
- **Decision Engine Check**: When Symboli or Trainer needs fast triage, check whether a local StartLux-Decision or System One engine is running on `127.0.0.1:8090` (or `STARTLUX_URL`) using `scripts/ask-biwa.py`. If not running, fall back directly to the `biwa` subagent on `google-vertex/gemini-3.5-flash-lite`.

## Scripts

### 1. `scripts/discover-models.py`
Queries OpenCode's `/api/model` endpoint and LM Studio's local status to report:
- Active providers and their model counts
- Tool-capable vs tool-disabled models
- Currently loaded models in LM Studio (`lms ps`)

**Usage:**
```bash
python3 /Users/sfadmin/.config/opencode/skills/model-roster/scripts/discover-models.py
# Or with JSON output:
python3 /Users/sfadmin/.config/opencode/skills/model-roster/scripts/discover-models.py --json
```

### 2. `scripts/ask-biwa.py`
Sends a typed question payload (`choice`, `noul`, or `score`) to `POST /v1/systemone` or `POST /v1/decisions`.
- **Exit code 0**: Server responded successfully with JSON answers.
- **Exit code 2**: Decision server is unavailable/unreachable. Fall back to the `biwa` subagent on Vertex.

**Usage:**
```bash
# Check if decision server is reachable:
python3 /Users/sfadmin/.config/opencode/skills/model-roster/scripts/ask-biwa.py --check

# Ask a choice decision:
python3 /Users/sfadmin/.config/opencode/skills/model-roster/scripts/ask-biwa.py \
  --state '{"task": "Search code for auth tokens"}' \
  --question '{"agent": {"type": "choice", "instructions": "Which subagent?", "criteria": {"golshi": "Code search", "spe-chan": "Code changes"}}}'
```

## Recommended Squad Defaults
| Agent | Role | Default Model | Fallback Override |
|---|---|---|---|
| `symboli` | Lead Orchestrator | `google-vertex/claude-sonnet-5-5@default` | `google-vertex/gemini-4-carbon` |
| `biwa` | Triage / Strategist | `google-vertex/gemini-3.5-flash-lite` | System One on `:8090` |
| `golshi` | Scout (read-only) | `lmstudio/google/gemma-4-e4b` | `google-vertex/gemini-3.8-flash` |
| `spe-chan` | Implementer | `google-vertex/gemini-4-hydrogen` | `google-vertex/claude-sonnet-5-5@default` |
| `super-creek` | Debugger / Fixes | `google-vertex/claude-sonnet-5-5@default` | `google-vertex/gemini-4-carbon` |
| `tachyon` | Researcher / Reviewer | `google-vertex/gemini-4-carbon` | `google-vertex/claude-opus-5-5@default` |
