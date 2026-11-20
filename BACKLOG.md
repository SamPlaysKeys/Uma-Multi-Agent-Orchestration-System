# 🍵 Tracen Academy — Ideas & Feature Backlog

*Maintained by Super Creek and the Tracen Squad.*  
*A warm, cozy place to store Trainer's ideas, inspirations, and upcoming improvements so nothing gets lost or forgotten!*

---

## 📌 Active / In Consideration

### 1. TUI Custom Home Logo
- **Status**: Staged / Blocked upstream
- **Detail**: Staged the `UmaCode` ASCII art banner in `plugin/src/banner.ts`. Awaiting OpenCode V2 upstream merge of the `home.logo` slot (tracked in upstream issue #51916).
- **Next steps**: When the slot is available, register `{ replace: "home.logo", render: ... }` in `plugin/src/tui.tsx`.

### 2. Secret Gold Ship Quote Utilization Plan
- **Status**: Reserved
- **Detail**: 20 rich, canonical Gold Ship quotes and banter lines are curated in `data/goldship-quotes.json`. Kept completely separate from ambient dialogue for Trainer's special plan.
- **Next steps**: Implement according to Trainer's secret design when ready.

### 3. Footer Flavor Text Only While Idle
- **Status**: Decided approach, needs research ([issue #1](https://github.com/SamPlaysKeys/Uma-Multi-Agent-Orchestration-System/issues/1))
- **Detail**: The campus flavor remark in `prompt.footer.status` makes OpenCode shorten its own status messages. Chosen fix: show flavor text only while the session status is idle (`~`), and render nothing while it is busy.
- **Research needed**:
  - [ ] Does the V2 TUI plugin context (`@opencode/plugin/dist/tui/context.d.ts`) expose session busy/idle state to a slot `render`?
  - [ ] Can a plugin replace built-in status text, or can it only append to slots? (Only matters if we later want custom in-character status messages.)
- **Next steps**: Answer the research questions, then update `plugin/src/tui.tsx` to render flavor text only when idle.

---

## 💡 Upcoming Ideas & Brainstorms

*Trainer, whenever you have an idea or inspiration, add it here or mention it to me and I'll make sure it's written down neatly!*

- [ ] **"Night Owl" flavor text**: When work is being done and local time is after 9PM, swap the campus flavor remarks for late-night ones (e.g. Super Creek insisting on warm milk and bedtime, Gold Ship still roaming the dark campus, Rudolf burning the midnight oil on council paperwork).
  - Needs a dedicated `NIGHT_OWL_ACTIVITIES` pool in `plugin/src/banner.ts` and a local-time check in `plugin/src/tui.tsx`.
  - **Interacts with item 3**: that item hides flavor text while the session is busy, but this idea wants night remarks while work is happening. Decide whether Night Owl text is exempt from the idle-only rule, or whether it ties into the custom status message replacement. That depends on the item 3 research.
  - Open details: exact cutoff (9PM start, and when does it end? e.g. 5AM) and whether the time check should use the system timezone.
- [ ] *(Idea slot — ready for Trainer's notes)*

---

## ✅ Completed Milestones

- [x] **Local Model Overrides Decoupling**: Configuration moved to `~/.config/opencode/opencode.jsonc` with automated backup rotation. Tracked `agents/*.md` in Git remain pristine and provider-agnostic.
- [x] **Local LM Studio Decision Engine Integration**: Integrated `/v1/decisions` on `http://127.0.0.1:1234` with auto-detected `d1-3b` model and graceful cloud fallback (`skills/model-roster/scripts/ask-biwa.py`).
- [x] **`opencode-uma-os` OpenCode V2 Plugin**: Built TypeScript plugin hooking into `ctx.session.hook("context")` for dynamic campus cameos, explicit guest summoning, and 1-on-1 pairing focus protection.
- [x] **TUI Status & Campus Flavor Ticker**: Clean `🐎 Tracen Squad Ready` badge on home screen and gentle 25-second in-game training remarks during active sessions.
- [x] **Canonical Datasets**: 129 Umamusume with 299 indexed aliases (`data/uma_nicknames.json`), 15 cameo dossiers (`data/uma_cameos.json`), and 20 Gold Ship quotes (`data/goldship-quotes.json`).
