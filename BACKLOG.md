# 🍵 Tracen Academy — Ideas & Feature Backlog

*Maintained by Super Creek and the Tracen Squad.*  
*A warm, cozy place to store Trainer's ideas, inspirations, and upcoming improvements so nothing gets lost or forgotten!*

---

## 🚨 URGENT — Public-repo hygiene (S6)

- **Status**: Urgent follow-up (repo is public — do not defer)
- **Detail**: Hardcoded local user paths and machine-specific repo paths are present in tracked files and need a dedicated scrub pass:
  - `agents/symboli.md` (lines `34`, `88`, `94`): `/Users/sfadmin/.config/opencode/skills/model-roster/scripts/...`
  - `skills/model-roster/SKILL.md` (lines `24`, `26`, `37`, `40`): `/Users/sfadmin/.config/opencode/skills/model-roster/scripts/...`
  - `skills/model-roster/scripts/discover-models.py` (line `32`): `/Users/sfadmin/.lmstudio/bin/lms`
  - `agents/tracen-lounge.md` (lines `80`, `83`): `~/Dev/Personal Projects/Uma-Multi-Agent-Orchestration-System/...`
  - *(Audit note: checked tracked repo for `ts.net` hostnames and GCP project IDs — none found in tracked files; only present in local untracked `~/.config/opencode/opencode.jsonc`.)*
- **Remediation plan**:
  - Replace hardcoded user/repo paths with `~/`, environment variables (`$HOME` / `Path.home()`), or repo-relative paths (note: OpenCode `shell` permission strings do not expand `~` or `$HOME`, so check `agents/symboli.md:34` carefully when scoping the glob).
  - **History decision needed**: Since these paths already exist in git history on `origin`, Trainer / Symboli Rudolf need to decide whether git history rewriting is wanted (usually unnecessary for non-secret local paths, but needs an explicit decision).
  - Use the `scrub` skill and `betterleaks` to verify the cleanup pass.

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
- **Status**: Feasible (ready to implement) ([issue #1](https://github.com/SamPlaysKeys/Uma-Multi-Agent-Orchestration-System/issues/1))
- **Detail**: The campus flavor remark in `prompt.footer.status` makes OpenCode shorten its own status messages. Chosen fix: show flavor text only while the session status is idle (`~`), and render nothing while it is busy.
- **Research findings**:
  - [x] Does the V2 TUI plugin context (`@opencode/plugin/dist/tui/context.d.ts`) expose session busy/idle state to a slot `render`? — **Yes** (verified by Agnes Tachyon): `prompt.footer.status` passes `{ sessionID, mode, showDetails }` to `render(input)`, and `context.data.session.status(sessionID)` returns `"idle" | "running"`. This confirms the idle-only footer is feasible.
  - [ ] Can a plugin replace built-in status text, or can it only append to slots? (Only matters if we later want custom in-character status messages.)
- **Next steps**: Update `plugin/src/tui.tsx` to render flavor text only when `context.data.session.status(input.sessionID) === "idle"` (when `input.sessionID` is present).

---

## 💡 Upcoming Ideas & Brainstorms

*Trainer, whenever you have an idea or inspiration, add it here or mention it to me and I'll make sure it's written down neatly!*

- [ ] **"Night Owl" flavor text**: When work is being done and local time is after 9PM, swap the campus flavor remarks for late-night ones (e.g. Super Creek insisting on warm milk and bedtime, Gold Ship still roaming the dark campus, Rudolf burning the midnight oil on council paperwork).
  - **Pool-ready schema**: `data/campus-activities.json` already uses a `{ "pools": { "default": [...] } }` schema, so implementing Night Owl only requires adding a `night_owl` pool in `data/campus-activities.json` and a local-time check in `plugin/src/tui.tsx`.
  - **Interacts with item 3**: that item hides flavor text while the session is busy, but this idea wants night remarks while work is happening. Decide whether Night Owl text is exempt from the idle-only rule, or whether it ties into the custom status message replacement. That depends on the item 3 research.
  - Open details: exact cutoff (9PM start, and when does it end? e.g. 5AM) and whether the time check should use the system timezone.
- [ ] **npm plugin packaging (`prepack` data copy & S5 polish)**: Only needed if `opencode-uma-os` is ever published to npm (`opencode plugin add opencode-uma-os`).
  - **Why this is deferred**: Today the plugin resolves `data/*.json` relative to the repository root (`../../data`). This keeps a single source of truth for repo-local / `./install.sh` installs, alongside `tracen-lounge.md` and the `Uma_nicknames.md` CI workflow. Nothing is broken, so no action is needed until we publish.
  - **What's needed for an npm release (including S5 findings)**:
    - [ ] Add a `prepack` / build copy step that copies `../data/uma_cameos.json`, `../data/uma_nicknames.json`, and `../data/campus-activities.json` (and `../data/goldship-quotes.json` if needed) into a gitignored `plugin/data/` directory.
    - [ ] Add `"files"` (including `dist/` and `plugin/data/`) and `"types"` export conditions in `plugin/package.json`. Currently `./tui` points at raw `./src/tui.tsx` (so only a Bun/`@opentui/solid` host loads it), and `tsc` emits an unreferenced `dist/tui.jsx` — decide whether to pre-compile with Solid or ship `src/tui.tsx` explicitly in `"files"`.
    - [ ] Update the root/data resolution in `plugin/src/data.ts` to check `./data` (packaged inside `plugin/`) first, then fall back to `../../data` (repo root). Repo-local installs keep working unchanged.
    - [ ] Review `plugin/package.json` runtime dependencies and exports against the `@opencode/plugin` packaging guidelines. `@opencode/plugin` is injected by the OpenCode host, so it should not be bundled as a runtime dependency.
- [ ] **Slash-joined names over-stripped in `stripNonProseForMatching` (S3)**: The path regex `[\w.-]+(?:\/[\w.@+-]+)+` strips slash-separated Uma names in prose (e.g., `'Teio/Urara/Kitasan'` strips to blank, `'Oguri Cap/Rice Shower'` becomes `'Oguri   Shower'`). Fix idea: require a leading `./`, `~/`, or `/`, or require at least 2 path-like segments/extensions before stripping.
- [ ] **Automated plugin test suite (S4)**: Promote the Node/Bun smoke checks into `plugin/test/`, add a `"test"` script to `plugin/package.json`, and include an assertion covering `ALIAS_STOPWORDS` coverage for single-word cameo terms.
- [ ] **Tachyon runner containment (accepted risk)**: In `agents/tachyon.md`, `node`, `bun run`/`bun test`, `npm run`/`npm test`, `tsc`, `npx tsc`, and `python3` can still write files or make network calls from within executed scripts (`edit: deny` only blocks editor tools). Read-only behavior for these runners is currently an accepted-risk convention; real containment would require an OS sandbox or disposable worktree.
- [ ] **Flexible per-agent model assignment**: Trainer wants model assignment to be more flexible later, with an easy way to swap a single agent's model or tier (e.g., a cost-aware tier such as `researcher`: standard vs. premium, per-agent override without editing presets, possibly a CLI flag on `scripts/configure.py`), and revisit `gemini-4-carbon` for Tachyon if its cost/benefit changes.
- [ ] *(Idea slot — ready for Trainer's notes)*

---

## ✅ Completed Milestones

- [x] **Local Model Overrides Decoupling**: Configuration moved to `~/.config/opencode/opencode.jsonc` with automated backup rotation. Tracked `agents/*.md` in Git remain pristine and provider-agnostic.
- [x] **Local LM Studio Decision Engine Integration**: Integrated `/v1/decisions` on `http://127.0.0.1:1234` with auto-detected `d1-3b` model and graceful cloud fallback (`skills/model-roster/scripts/ask-biwa.py`).
- [x] **`opencode-uma-os` OpenCode V2 Plugin**: Built TypeScript plugin hooking into `ctx.session.hook("context")` for dynamic campus cameos, explicit guest summoning, and 1-on-1 pairing focus protection.
- [x] **TUI Status & Campus Flavor Ticker**: Clean `🐎 Tracen Squad Ready` badge on home screen and gentle 25-second in-game training remarks during active sessions.
- [x] **Campus Activities Data File & Weighted Gacha Pulls**: Extracted flavor lines into pool-ready `data/campus-activities.json`, shared hardened data resolution in `plugin/src/data.ts`, and added non-repeating weighted pulls with defensive validation and `banner.ts` fallback.
- [x] **Canonical Datasets**: 129 Umamusume with 299 indexed aliases (`data/uma_nicknames.json`), 25 cameo dossiers (`data/uma_cameos.json`), and 20 Gold Ship quotes (`data/goldship-quotes.json`).
- [x] **Cameo Roster Expansion & Drop-In Weights**: Wiki-verified the original cameo dossiers, grew `data/uma_cameos.json` from 15 to 25 characters (Digitan, Bakushin, Kitasan, Dia, Finemo, Eishin, Curren, Bourbon, Seiun Sky, Air Groove), and added per-character `weight` values (10/6/3) for gacha-style weighted drop-ins.
- [x] **Cameo False-Trigger Mitigation & Digitan Soft Alias**: Added code/URL/path stripping, English-word nickname guards, longest-span cross-dataset resolution, TUI Solid reactivity & timer cleanup, and Agnes Digital's 5% `soft_aliases` trigger.
- [x] **Cameo Mononym Stop-List Gating**: Extended the explicit-invocation guard (`@Name`, `bring in`/`ask`/`call`) to ambiguous single-word cameo mononyms and aliases (`rice`, `cafe`, `nature`, `turbo`, `groove`, `dia`, `cyborg`, `empress`) while keeping full multi-word names active.
- [x] **Plugin Hardening & Tachyon Review Guards**: Bounded `stripNonProseForMatching` against ReDoS (`MAX_MATCH_CHARS` + `\S{200,}` collapse), memoized soft-alias rolls once per turn, expanded `ALIAS_STOPWORDS` for common names/dev terms, and hardened `agents/tachyon.md` `git branch`, `--output`, `bun`, and `find` permission guards.
- [x] **Tachyon researcher preset pinned to Sonnet 5.5**: Updated `uma-config.yaml` `presets.google-vertex.researcher` (and `README.md`) from `google-vertex/gemini-4-carbon` to `google-vertex/claude-sonnet-5-5@default`.
