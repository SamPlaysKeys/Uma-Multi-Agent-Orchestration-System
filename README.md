# 🐎 Umamusume Multi-Agent Orchestration System for OpenCode

A high-performance, *Umamusume: Pretty Derby*-themed multi-agent coordination architecture built for [OpenCode](https://opencode.ai).

Designed for hybrid local + cloud LLM routing, featuring specialized agent personalities, autonomous subagent delegation, dynamic model discovery, and an interactive Tracen Club Lounge round-table brainstorming environment.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Trainer([🧑‍🏫 Trainer]) -->|Mission Dispatch| Rudolf[👑 Symboli Rudolf\nLead Orchestrator / Primary]
    Trainer -->|Ideation & Banter| Lounge[☕ Tracen Club Lounge\nRound-Table Chat / Primary]
    Trainer -->|1-on-1 Solo Pairing| AnyUma[Any Uma Agent\nmode: all]

    subgraph "Core Squad (Subagents & Standalone)"
        Biwa[👓 Biwa Hayahide\nTriage & Bottlenecks\nGemini 3.5 Flash Lite / Local Decision]
        Golshi[🚢 Gold Ship\nFast File Scout\nLocal LM Studio Gemma 4B]
        SpeChan[🍠 Special Week\nCore Implementation & Tests\nGemini 4 Hydrogen]
        Creek[🍵 Super Creek\nDebugger & Caretaker\nClaude Sonnet 5.5]
        Tachyon[🧪 Agnes Tachyon\nResearch & Adversarial Review\nGemini 4 Carbon]
    end

    Rudolf --> Biwa
    Rudolf --> Golshi
    Rudolf --> SpeChan
    Rudolf --> Creek
    Rudolf --> Tachyon

    Lounge -->|Cameo / Drop-in| GuestUma[🐎 Guest Uma\ne.g. Mambo, Oguri, Turbo\nvia Nicknames & WebSearch]
    Lounge -->|Handoff / Dispatch| SpeChan
    Lounge -->|Handoff / Dispatch| Creek
```

---

## 🏇 The Roster

| Agent | OpenCode Mode | Default Model | Role & Specialty | Character Trait / Voice |
| :--- | :--- | :--- | :--- | :--- |
| **👑 `symboli`** | `primary` | `google-vertex/claude-sonnet-5-5@default` | Lead Orchestrator, Planner & Dispatcher | Dignified Student Council President ("The Emperor"), strategic wisdom, dry puns. |
| **☕ `tracen-lounge`** | `primary` | `google-vertex/claude-sonnet-5-5@default` | Ideation, Brainstorming & Architecture Round-Table | Dynamic group chat with all 6 Umas debating trade-offs, plus random cameos. |
| **👓 `biwa`** | `all` | `google-vertex/gemini-3.5-flash-lite` | Analytical Triage, Bottlenecks & Routing | Cool-headed, data-driven, fast complexity analysis. (Sensitive about head size). |
| **🚢 `golshi`** | `all` | `lmstudio/google/gemma-4-e4b` *(local)* | Lightning Scout (glob, grep, read, map) | High-speed read-only scout, chaotic, lateral hacks, yakisoba-loving trickster. |
| **🍠 `spe-chan`** | `all` | `google-vertex/gemini-4-hydrogen` | Core Implementation, Refactoring & Test Runner | Earnest workhorse, full write/shell access, gives 110%, carrot enthusiast. |
| **🍵 `super-creek`** | `all` | `google-vertex/claude-sonnet-5-5@default` | Debugging, Flaky Tests & Root-Cause Caretaker | Nurturing caretaker, surgical bug fixing, test suite resilience, prevents developer burnout. |
| **🧪 `tachyon`** | `all` | `google-vertex/gemini-4-carbon` | Deep Research, Library Docs & Adversarial Review | Eccentric mad scientist ("Trainer-kun"), edge-case analysis, bleeding-edge tech evaluation. |

---

## ☕ Tracen Club Lounge Features

1. **Natural Group Chat**:
   - Rather than a rigid roll-call, 2 to 4 girls jump in naturally where their domain expertise fits.
   - Rudolf does not force a formal summary every turn; she chats naturally and only synthesizes when asked or when things get out of hand.
2. **Guest Umas & Nickname Resolution**:
   - Address any Umamusume outside the squad (e.g. *"What would Mambo think?"* or *"Ask Rice"*).
   - The lounge uses `Uma_nicknames.md` to map community nicknames to canonical names (e.g., Mambo $\to$ Matikanetannhauser).
   - If lore or mannerisms are needed, it performs a real-time web search and has her jump into the conversation in character.
3. **Random Campus Drop-Ins (~15-20%)**:
   - Every time you join the lounge, there is a small chance an unexpected student (e.g., Oguri Cap eating snacks in the corner, Twin Turbo bursting through the door, or Nice Nature observing from the doorway) is already hanging out.

---

## 🛠️ Dynamic Model Discovery Skill (`model-roster`)

Located under `skills/model-roster/`:
- **`scripts/discover-models.py`**: Interrogates OpenCode's `/api/model` and LM Studio's `lms ps` to check tool-calling capabilities and RAM-loaded models.
- **`scripts/ask-biwa.py`**: Probes local decision servers (e.g. StartLux-Decision GGUFs on `:8090` or `:1234`). When no local engine is active, gracefully falls back to Cloud Biwa (`gemini-3.5-flash-lite`).

---

## 🚀 Quick Start / Installation

To sync these agents and skills into your local OpenCode environment:

```bash
./install.sh
```

Or manually copy:
- `agents/*.md` $\to$ `~/.config/opencode/agents/`
- `skills/model-roster/` $\to$ `~/.config/opencode/skills/model-roster/`

### Usage in OpenCode:
- Start mission orchestration:
  ```text
  /agent symboli
  ```
- Join the clubroom lounge:
  ```text
  /agent tracen-lounge
  ```
- Pair 1-on-1 with any girl:
  ```text
  /agent spe-chan
  /agent tachyon
  /agent super-creek
  /agent biwa
  /agent golshi
  ```
