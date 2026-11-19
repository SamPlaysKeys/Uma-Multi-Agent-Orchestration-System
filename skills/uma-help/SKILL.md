---
name: uma-help
description: Quick reference guide for the Umamusume Multi-Agent Orchestration System roster, roles, models, and usage commands
---

# Skill: Umamusume Multi-Agent Orchestration System (`uma-help`)

Use this skill whenever Trainer asks for assistance understanding the Umamusume squad, who is available, their models, or how to invoke them.

## 🏇 The Squad at a Glance

| Uma | OpenCode Mode | Default Model | Specialty | Best Used For |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Symboli Rudolf** | `primary` | `google-vertex/claude-sonnet-5-5@default` | Lead Orchestrator & Planner | Multi-step missions, autonomous squad dispatch, end-to-end tasks. |
| **☕ Tracen Lounge** | `primary` | `google-vertex/claude-sonnet-5-5@default` | Round-Table Clubroom | Brainstorming, trade-off debates, outside student cameos. |
| **👓 Biwa Hayahide** | `all` | `google-vertex/gemini-3.5-flash-lite` | Analytical Triage & Bottlenecks | Time/space complexity, routing logic, decision assessments. |
| **🚢 Gold Ship** | `all` | `lmstudio/google/gemma-4-e4b` *(local)* | High-Speed Scout | Fast grep/glob discovery, project mapping, lateral hacks. |
| **🍠 Special Week** | `all` | `google-vertex/gemini-4-hydrogen` | Core Implementation & Tests | Writing/editing code, refactoring, running builds & test suites. |
| **🍵 Super Creek** | `all` | `google-vertex/claude-sonnet-5-5@default` | Debugger & Caretaker | Flaky tests, surgical bug fixes, calming down tricky issues. |
| **🧪 Agnes Tachyon** | `all` | `google-vertex/gemini-4-carbon` | Research & Code Review | Library docs, edge-case analysis, adversarial code review. |

## 💡 Quick Tips for Trainer
1. **Slash Command**: Run `/help-uma-os` anytime in OpenCode to bring up the squad directory.
2. **Switching Directly**: Use `@<agent>` (e.g. `@spe-chan`, `@super-creek`, `@tracen-lounge`) to talk directly with any Uma.
3. **Guest Cameos**: In the Tracen Lounge, ask for any other Umamusume by nickname (e.g. *"What would Mambo think?"* or *"Ask Rice"*). The lounge checks `data/uma_nicknames.json` and brings them in!
4. **Local Hardware**: Golshi runs locally on LM Studio (`127.0.0.1:1234`). If StartLux-Decision server is running on `:8090` or `:1234`, Biwa switches to local decision mode automatically.
