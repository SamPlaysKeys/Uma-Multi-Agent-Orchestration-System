---
description: Display the Umamusume Multi-Agent roster, roles, models, and usage guide
---

Please present a warm, clear overview of the Umamusume Multi-Agent Orchestration System for Trainer.

List all available girls, their roles, default models, and how to invoke them:

1. **👑 Symboli Rudolf (`/agent symboli` or `@symboli`)**:
   - Role: Lead Orchestrator, Planner & Mission Dispatcher
   - Model: `google-vertex/claude-sonnet-5-5@default`
   - Best for: Full autonomous feature implementation, multi-step tasks, coordinating the squad.
2. **☕ Tracen Club Lounge (`/agent tracen-lounge` or `@tracen-lounge`)**:
   - Role: Brainstorming, Architecture & Dynamic Round-Table
   - Model: `google-vertex/claude-sonnet-5-5@default`
   - Best for: Open-ended ideation, debating trade-offs, getting diverse perspectives, guest cameos (e.g. Mambo, Oguri, Turbo).
3. **👓 Biwa Hayahide (`/agent biwa` or `@biwa`)**:
   - Role: Analytical Triage, Bottleneck Review & Routing
   - Model: `google-vertex/gemini-3.5-flash-lite` (or local StartLux Decision engine if active)
   - Best for: Fast complexity assessment, algorithmic bottleneck analysis, decision trees.
4. **🚢 Gold Ship (`/agent golshi` or `@golshi`)**:
   - Role: Lightning File Scout & Symbol Mapper
   - Model: `lmstudio/google/gemma-4-e4b` (Local LM Studio)
   - Best for: Ultra-fast read-only glob/grep file searching, lateral shortcut ideas.
5. **🍠 Special Week (`/agent spe-chan` or `@spe-chan`)**:
   - Role: Core Implementation, Refactoring & Test Runner
   - Model: `google-vertex/gemini-4-hydrogen`
   - Best for: Writing code, editing files, refactoring, running builds/tests with 110% energy.
6. **🍵 Super Creek (`/agent super-creek` or `@super-creek`)**:
   - Role: Debugger, Root-Cause Investigator & Caretaker
   - Model: `google-vertex/claude-sonnet-5-5@default`
   - Best for: Tricky bugs, flaky tests, environment issues, calming down stressful debugging sessions.
7. **🧪 Agnes Tachyon (`/agent tachyon` or `@tachyon`)**:
   - Role: Deep Research, Library Verification & Adversarial Review
   - Model: `google-vertex/gemini-4-carbon`
   - Best for: Edge-case analysis, testing experimental APIs, thorough architectural code review.

Also remind Trainer of quick interaction tips:
- How to switch agents (`/agent <name>` or `@<name>`)
- How to ask for outside Umas in the lounge (e.g., *"What would Mambo think?"*)
- How model discovery works (`skills/model-roster`)

Deliver this with warmth and encouragement for Trainer!
