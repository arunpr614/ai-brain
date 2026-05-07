# AI Brain — Running Log

**Purpose:** Append-only project journal. Each entry narrates progress since the previous entry for an AI-agent audience. Read top-to-bottom to reconstruct the project journey.

**Rule:** never edit or delete prior entries. Append new entries below with `## <date>` headings. Corrections to earlier claims are made in the next entry, not by rewriting history.

**Related docs:**
- `BUILD_PLAN.md` — phased architecture + roadmap (prose)
- `ROADMAP_TRACKER.md` — feature sequencing by version
- `PROJECT_TRACKER.md` — tactical status board
- `DESIGN.md` — design tokens (getdesign.md spec)
- `DESIGN_SYSTEM.md` — UX contract + acceptance checklist
- `FEATURE_INVENTORY.md` — Recall + Knowly feature catalog (source of truth for what to build)
- `STRATEGY.md` — historical strategy memo (pre-reopen)
- `PROJECT_CLOSURE.md` — historical; project was closed, then re-opened 2026-05-07
- `docs/research/` — research spike outputs

---

## 2026-05-07 14:00 — Project re-opened; planning scaffolding + design + research spikes

**Entry author:** AI agent (Claude) · **Triggered by:** user requested running-log creation after a full planning day

### Planned since last entry

This is the first entry. "Last entry" corresponds to the state immediately before the project was re-opened on 2026-05-07. That baseline: the folder was explicitly *closed* per `PROJECT_CLOSURE.md` (dated 2026-05-07, branch D — "don't build"). Only `STRATEGY.md`, `FEATURE_INVENTORY.md`, and `PROJECT_CLOSURE.md` existed. The closure doc captured four candidate paths (A: 4-week MVP from scratch; B: fork Hoarder/Karakeep; C: single novel primitive; D: don't build). User previously picked D.

On 2026-05-07 user flipped the decision: build the app, but under hard new constraints — **100% local-first, no cloud, sideloadable Android APK, combine all Recall.it + Knowly features thoughtfully, keep version numbers, research first, work from a to-do list**. Name locked to **Brain** initially, then upgraded to **AI Brain** (repo `arunpr614/ai-brain`, public).

Planned outcomes for this session:

1. Author a detailed phased build plan covering all Recall+Knowly features.
2. Research and author a UX/design framework document with both light and dark themes.
3. Stand up project and roadmap trackers so ideas stay sequenced.
4. Kick off the blocking research spikes before writing code.
5. Author a `DESIGN.md` conforming to the `getdesign.md` spec (token-first design contract for AI agents).
6. Create this running log and a reusable skill for future updates.

### Done

**Planning artifacts (sibling folder `Arun_AI_Recall_App/`):**

- `BUILD_PLAN.md` v0.1.1-plan — 14 sections: hard constraints, architecture (laptop = brain, APK = thin-client over LAN), stack (Next.js 15 + better-sqlite3 + sqlite-vec + Ollama + Capacitor 6), 10 phases from v0.1.0 to v0.10.0, feature parity matrix (47 features, 36 shipping pre-v1.0.0, 11 deferred), 4-month cumulative estimate, 9 research spikes, LAN auth posture, risks & kill-switches, directory layout, configurable 6-hour backup policy, design system reference. User-facing decisions (app name, seed corpus, credit UX, backup cadence) resolved in `§12`.
- `DESIGN_SYSTEM.md` v0.1.0-design — operational UX contract. Philosophy = **Structured Calm** (Notion-calm + Linear-keyboard layered). Full Radix Slate + Indigo token set (light + dark), Inter + Charter + JetBrains Mono self-hosted typography, shadcn/ui + Radix Primitives + Lucide component stack, 3-tier elevation, motion rules (80ms/120ms/150ms/300ms), desktop sidebar + mobile bottom-nav IA, 8 per-feature UX sections (capture/organize/consume/ask/generate/review/explore/integrate), accessibility non-negotiables, acceptance checklist for every new screen.
- `PROJECT_TRACKER.md` v0.1.0-tracker — phase status board (all phases `○` except Planning `◐`), 9 research spikes with priority, 4 open decisions, risks watchlist, metrics to track post-v0.1.0.
- `ROADMAP_TRACKER.md` v0.1.0-roadmap — every feature placed in a version lane with lifecycle states (`future → backlog → planned → in-progress → shipped`); deferred items (e.g., Lenny-seed FUT-1) with explicit reopen triggers; dependency + sequencing rationale.
- `DESIGN.md` v0.1.0 — YAML frontmatter with full token set + components table (~70 components defined), then 9 canonical prose sections per the `getdesign.md` spec (Visual Theme, Colors, Typography, Components, Layout, Elevation, Do's/Don'ts, Responsive, Agent Prompt Guide). Deliberately extended with **both light and dark tokens** in frontmatter (the spec's Notion example flagged dark-mode as a known gap).
- `RUNNING_LOG.md` (this file) — append-only project journal.

**Research spikes — 4 kicked off in parallel; 3 of 4 complete at time of writing:**

- `docs/research/lan-auth.md` (R-AUTH, **complete**) — v0.5.0: static bearer token + env-driven LAN binding toggle + auto-generation on first run (one paste from terminal into APK `local.properties`). v0.10.0: QR pairing + Tailscale + TouchID. Dropped options A, B, F, G. Prior art (Home Assistant, Syncthing, Immich) validated the path.
- `docs/research/pdf-extraction.md` (R-PDF, **complete**) — Primary: `unpdf` v1.6.2 (pure TS, unjs ecosystem, built-in metadata, page-count first-class). Fallback: poppler `pdftotext` for two-column arxiv PDFs. `pdf-parse` abandoned; `pdf2json` quality issues. Substack paywall-truncation detectable via `chars-per-page` density check. OCR deferred to future R-OCR phase with `tesseract.js` v7.
- `docs/research/android-share.md` (R-CAP, **complete**) — Plugin: `@capawesome/capacitor-android-share-target` (Robin Genz / capawesome team, maintained, Android 14/15-safe). Intent-filter XML covers `text/plain` + `application/pdf` + `image/*` + `SEND_MULTIPLE`. Cold-start gotcha: also call `ShareTarget.getLastShareData()` in `app/layout.tsx`. AVD testing via `10.0.2.2:3000` alias + `adb shell am start`. Debug keystore + `adb install` sufficient; no App-Link signing ceremony needed. Kotlin fallback sketched (~60 LOC, 3 files).
- `docs/research/llm-sizing.md` (R-LLM, **pending**) — still running in the background.

**Auto-memory stored (so future sessions inherit context):**

- `project_ai_brain.md` — project context, constraints, stack, roadmap
- `user_non_technical_full_ai_assist.md` — full AI-assisted codegen, plain-language explanations
- `reference_mac_hardware.md` — MacBook Pro 16" 2021, M1 Pro, 32 GB, 455 GB free
- Entries added to `MEMORY.md`

**Reusable skill:**

- `~/.claude/skills/running-log-updater/SKILL.md` — skill that always asks the user for the project folder, locates the `RUNNING_LOG.md`, confirms before writing, then appends a structured entry via the Step-4 schema.

### Learned

- **"Structured Calm" as a design philosophy** — hybrid of Things 3 / Reflect / Mem ambient calm as resting state with Linear / Raycast command-surface density as the power layer (`⌘K`). Maps cleanly to all 8 feature categories without layout changes between modes. Derived from a UX-research agent that surveyed Readwise Reader, Obsidian, Notion, Mem, Reflect, Recall.it, Knowly, NotebookLM, Linear, Raycast, Arc, Things 3, Bear, iA Writer.
- **Single-file SQLite with `sqlite-vec` removes the whole "separate vector DB" question** for a personal-scale library — portable, backupable with `cp`, no operational surface.
- **M1 Pro 32 GB is a comfortable LLM ceiling** — Qwen 2.5 7B (q4_K_M) for quality work + Llama 3.2 3B for speed + `nomic-embed-text` for embeddings all fit with slack. No need for API fallback in the default path; API fallback stays opt-in.
- **Android share-sheet integration is the pivotal mobile feature** — without it, the APK is almost pointless. Confirmed the `capawesome` plugin is the right bet and covers Android 14's implicit-intent restrictions cleanly.
- **Substack PDFs silently truncate on paywalls** (prior memory reinforced by R-PDF) — must detect via `totalPages` vs `chars-per-page` density at ingest.
- **Credit UX (Knowly's visible counter) is purely a margin-protection pattern** and has zero place in a local-first app with no inference cost — explicitly dropped.
- **Lenny-seed import is FUT-1, not v0.2.0** — user wants a clean-baseline build, not a pre-loaded corpus. Tooling already exists in `../Lenny_Export/Knowly_import/` if we revisit.
- **getdesign.md spec** — 9 canonical sections, YAML frontmatter carries all tokens + component entries, prose sections reference tokens via `{...}` placeholders. Format is explicitly AI-agent-oriented so codegen can resolve tokens mechanically.
- **Four options dropped for LAN auth:** A (localhost-only blocks mobile), B (open bind, no auth), F (SSH tunnel too technical), G (self-signed TLS too complex pre-v1.0).

### Deployed / Released

Nothing deployed. Zero code written. Zero commits made. No GitHub repo initialized yet. All work lives as markdown in `Initiatives/Arun_AI_Projects/Arun_AI_Recall_App/`.

### Documents created or updated this period

**Created (all in `Initiatives/Arun_AI_Projects/Arun_AI_Recall_App/`):**
- `BUILD_PLAN.md` — phased architecture + roadmap
- `DESIGN_SYSTEM.md` — UX contract
- `DESIGN.md` — getdesign.md-spec design tokens + components
- `PROJECT_TRACKER.md` — tactical status
- `ROADMAP_TRACKER.md` — feature sequencing
- `RUNNING_LOG.md` — this journal
- `docs/research/lan-auth.md` — R-AUTH output
- `docs/research/pdf-extraction.md` — R-PDF output
- `docs/research/android-share.md` — R-CAP output

**Updated:**
- `BUILD_PLAN.md` v0.1.0-plan → v0.1.1-plan (name change Brain → Brain, no-seed, backup configurable, credit UX dropped)

**Created outside the project folder (auto-memory + skill):**
- `~/.claude/projects/.../memory/project_ai_brain.md`
- `~/.claude/projects/.../memory/user_non_technical_full_ai_assist.md`
- `~/.claude/projects/.../memory/reference_mac_hardware.md`
- `~/.claude/projects/.../memory/MEMORY.md` (appended 3 index lines)
- `~/.claude/skills/running-log-updater/SKILL.md`

### Current remaining to-do

Blocking before v0.1.0 code starts:

1. **R-LLM** research spike lands (in flight) — model choices + `ollama pull` list + disk budget check vs 455 GB free.
2. Synthesize all 4 research outputs into `BUILD_PLAN.md` as concrete dependency choices (plugin names, npm versions, env variables, Ollama tags). A short "§15 Locked-in decisions" section.
3. Move `PROJECT_TRACKER.md` Planning row to `●` and v0.1.0 row to `◐` once all R-* P0 complete.
4. Initialize `arunpr614/ai-brain` **public** GitHub repo and push planning + design + research docs as commit 1 — only after user says go.
5. Scaffold v0.1.0: Next.js 15 + Tailwind 4 + shadcn/ui, SQLite schema, theme toggle, library list, `⌘K` palette stub, backup scheduler (6h default). Exit criteria in `BUILD_PLAN.md` §5 → v0.1.0.

Deferred research (non-blocking for v0.1.0–v0.3.0):

- R-VEC (sqlite-vec perf at 10k+ chunks) — blocks v0.4.0
- R-FSRS (SRS algorithm) — blocks v0.8.0
- R-CLUSTER (topic clustering) — blocks v0.6.0
- R-YT (yt-dlp reliability) — blocks v0.10.0
- R-WHISPER (whisper.cpp vs faster-whisper) — blocks v0.10.0

### Open questions / decisions needed

1. **D-4 Obsidian vault path** — new vault, existing vault, or none. Needed before v0.10.0. Not urgent.
2. Confirm GitHub repo creation ceremony — user said public, on `arunpr614`. Ready when user says go.
3. After R-LLM lands, the final decision on **model set to `ollama pull` on day 1** — likely Qwen 2.5 7B + Llama 3.2 3B + `nomic-embed-text`, confirm against R-LLM benchmarks.
4. First-run PIN vs no PIN on the Mac web UI (separate from LAN token). R-AUTH recommended a PIN with future TouchID path; user hasn't explicitly weighed in.

### State snapshot

- **Current phase / version:** Planning (`◐`) → v0.1.0 Foundation (next)
- **App version:** not yet released; `package.json#version` will start at `0.1.0` when scaffolding lands
- **Plan version:** `v0.1.1-plan`
- **Design doc version:** `v0.1.0-design` (DESIGN_SYSTEM.md) + `v0.1.0` (DESIGN.md)
- **Active trackers:** `BUILD_PLAN.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md`
- **Research progress:** 3 of 4 P0 spikes complete (R-AUTH, R-PDF, R-CAP); R-LLM in flight
- **Next milestone:** all P0 research spikes done → synthesize decisions into BUILD_PLAN → init `arunpr614/ai-brain` public repo → v0.1.0 scaffolding kickoff

---

## 2026-05-07 15:42 — Research complete, GitHub live, self-critique + remediations locked

**Entry author:** AI agent (Claude) · **Triggered by:** user "Yes. Commit and update the running log" after reviewing self-critique findings

### Planned since last entry

At the previous entry (14:00), R-LLM was still running and the repo was uninitialized. The plan was:

1. Finish R-LLM spike → synthesize all 4 research outputs into `BUILD_PLAN.md §15` (concrete deps, Ollama tags, intent filters, env vars).
2. Initialize `arunpr614/ai-brain` as a **public** GitHub repo and push planning docs as commit 1.
3. Begin scaffolding v0.1.0.

Mid-session, the user additionally requested:

4. Create `DESIGN.md` conforming to the getdesign.md spec as a token-first design contract (distinct from the operational `DESIGN_SYSTEM.md`).
5. Stand up an append-only `RUNNING_LOG.md` + a reusable `running-log-updater` skill.
6. Perform a self-critique on all 4 research spikes and produce a structured report.

Acted on all six in this session.

### Done

**Planning / Design docs authored (all committed in repo `arunpr614/ai-brain`):**

- `DESIGN.md` v0.1.0 — YAML frontmatter carrying both light + dark token sets, ~70 component definitions (Inter + Charter + JetBrains Mono; Radix Slate + Indigo), plus 9 canonical prose sections per the getdesign.md spec including an Agent Prompt Guide.
- `RUNNING_LOG.md` — this file. Created with first entry at 14:00; this is the second entry.
- `docs/research/SELF_CRITIQUE.md` v0.1.0-critique — adversarial review. 35 findings across R-LLM (8), R-CAP (8), R-PDF (7), R-AUTH (8), plus 8 cross-cutting. Severity-labeled 🟥/🟧/🟨. Prioritized remediation plan organized by phase gate. Aggregate research grade: **B−** (honest reasoning, empirically unverified).
- `BUILD_PLAN.md` bumped to v0.2.1-plan — inserted **v0.0.1 Empirical Sanity Morning** phase (3-hour gate before v0.1.0 begins), expanded v0.5.0 with self-critique remediations.
- `ROADMAP_TRACKER.md` bumped to v0.2.0-roadmap — added v0.0.1 gate, added F-000 migrations runner to v0.1.0, added F-035..F-040 to v0.5.0.
- `PROJECT_TRACKER.md` bumped to v0.2.0-tracker — Planning phase closed; all 4 P0 research rows flipped to complete; self-critique row added; v0.5.0 scope flagged as expanded.

**Research spikes — all 4 P0 complete:**
- R-LLM (`llm-sizing.md`) — qwen2.5:7b-instruct-q4_K_M primary + 14b on demand + nomic-embed + phi3.5 fallback. Llama 3.3 70B ruled out (would need ~44 GB). Disk: ~17.7 GB. Extrapolated tok/s figures (first-token <2 s, generation ~32-38 tok/s).
- R-PDF (`pdf-extraction.md`) — `unpdf` v1.6.2 primary + poppler `pdftotext` fallback. Paywall-truncation guard via chars-per-page density heuristic.
- R-CAP (`android-share.md`) — `@capawesome/capacitor-android-share-target` v6.x. Intent filters for text/plain, application/pdf, image/*, SEND_MULTIPLE. Cold-start gotcha via `getLastShareData()` in root layout.
- R-AUTH (`lan-auth.md`) — static bearer token + `BRAIN_BIND` env toggle for v0.5.0; QR pairing + Tailscale + WebAuthn for v0.10.0 hardening.

**GitHub repo initialized and pushed:**
- Repo: https://github.com/arunpr614/ai-brain (public, on `arunpr614`)
- First commit: `b869d90 docs: initial planning, design, and research — v0.2.0-plan` (16 files: 9 planning docs + LICENSE + README + .gitignore + 4 research spikes)
- Local working copy relocated: `Initiatives/Arun_AI_Projects/Arun_AI_Recall_App/` → `Initiatives/Arun_AI_Projects/ai-brain/` (old path retains copies as backup)

**Skill + memory:**
- `~/.claude/skills/running-log-updater/SKILL.md` — reusable skill that asks for project folder, confirms target `RUNNING_LOG.md`, then appends an entry using the Step-4 schema. Skill is registered and appeared in available-skills list this session.
- Memory updated: `project_ai_brain.md` reflects new working-copy path + first commit SHA.

**User decisions captured this session:**
- Q1: empirical sanity morning approved (3 hours OK, open to more).
- Q2: mDNS promoted into v0.5.0 (+2h).
- Q3: WebAuthn/TouchID added as v0.5.0 stretch (+1h).
- Q4: $10/month API cost cap approved. Explanation provided: buys roughly 1,000 Haiku chat queries OR 125 Sonnet GenPage regenerations per month; default path is local Ollama at $0, cap exists as a runaway-bill safeguard.
- Q5: delegated to agent. Decision: **keep v0.5.0 tight, document café-mode as a known limitation**, Tailscale stays a v0.10.0+ optional day-2 add. Rationale: (a) preserves "100% local, no third-party auth" posture for v0.5.0, (b) v0.5.0 already expanded with mDNS + WebAuthn, (c) Tailscale is zero-code-change to enable later.

**Remediations applied to the plan (not deferred):**

| Source critique finding | Landing location |
|---|---|
| X-1 empirical verification | New v0.0.1 phase |
| X-4 migrations pattern | `BUILD_PLAN.md §15.5` + F-000 in roadmap |
| X-3 API cost cap | `BUILD_PLAN.md §15.1` with $10/month default + live usage indicator |
| A-1 token rotation | v0.5.0 F-037 script `scripts/rotate-token.sh` |
| A-2 rate limiter | v0.5.0 F-016 — 10 failed attempts per IP per minute |
| A-3 CSRF / Origin | v0.5.0 F-036 — SameSite=Strict, Origin allowlist |
| A-4 mDNS `brain.local` | v0.5.0 F-035 (promoted from v0.10.0) |
| A-5 WebAuthn / TouchID | v0.5.0 F-040 stretch (promoted from v0.10.0) |
| A-6 café mode | documented v0.5.0 limitation; Tailscale stays v0.10.0+ |
| A-8 QR libraries | v0.5.0 F-038; added `qrcode` + `qrcode-terminal` to deps |
| C-5 WebView heap | v0.5.0 F-039 — native file stream via `CapacitorHttp` |

### Learned

- **Research rigor gap:** the agent-authored spikes reasoned soundly but performed zero empirical checks on Arun's actual Mac. Aggregate grade from the self-critique: B−. The honest step is a 3-hour measurement morning before writing production code. This is now a formal gate.
- **$10 cost framing matters:** raw "$10 cap" was abstract; the "1,000 Haiku queries or 125 Sonnet GenPages" translation made the tradeoff legible. Future cost/budget conversations should always translate dollars into actions.
- **Scope expansions trade off against other phases:** the user's willingness to add ~3 hours to v0.5.0 (mDNS + WebAuthn + touches) comes at zero timeline cost because v0.5.0 was previously underscoped on hardening (rate limiting, CSRF, token rotation were all absent from the original plan).
- **Qwen 3 was dismissed as "too new" in R-LLM despite being 13 months old** — flagged in critique L-6, scheduled for re-spike R-LLM-b before v0.3.0.
- **The running-log-updater skill loaded correctly in-session** — appearing in the available-skills list immediately after file creation. This means subsequent sessions/conversations will trigger it on phrases like "log progress" automatically.

### Deployed / Released

- GitHub repo `arunpr614/ai-brain` — **live, public**. https://github.com/arunpr614/ai-brain
- First commit `b869d90` pushed to `main`.
- No application deployed (per constraint C5, no deploy until v1.0.0).

### Documents created or updated this period

Created:
- `docs/research/llm-sizing.md` (R-LLM)
- `docs/research/SELF_CRITIQUE.md` (adversarial review of all 4 spikes)
- `README.md` (repo root)
- `LICENSE` (MIT)
- `.gitignore`

Updated:
- `BUILD_PLAN.md` v0.2.0-plan → v0.2.1-plan (v0.0.1 gate, v0.5.0 scope, §15 cost cap + migrations)
- `ROADMAP_TRACKER.md` v0.1.0-roadmap → v0.2.0-roadmap (v0.0.1 lane, F-000, F-035–F-040)
- `PROJECT_TRACKER.md` v0.1.0-tracker → v0.2.0-tracker (Planning → ●, v0.0.1 row, R-* complete)

Created outside the repo:
- `~/.claude/skills/running-log-updater/SKILL.md`
- Auto-memory updated (`project_ai_brain.md` — working-copy path, first commit SHA)

### Current remaining to-do

Next planned work, in order:

1. **Run v0.0.1 Empirical Sanity Morning** (3 hours on Arun's Mac)
   - Measure Qwen 2.5 7B tok/s → validate L-1 hypothesis
   - Extract 10 Lenny PDFs with `unpdf` → validate P-1 / calibrate P-2 heuristic
   - Scaffold throwaway Capacitor APK + AVD share test → validate C-2 / C-4
   - Test WebAuthn platform auth locally → unblock F-040
   - Write `docs/research/EMPIRICAL_SANITY.md`
2. If any measurement invalidates a §15 decision, update `BUILD_PLAN.md` before v0.1.0.
3. Start **v0.1.0 Foundation**: Next.js 15 + Tailwind 4 + shadcn/ui scaffold, SQLite schema, migrations runner (F-000), theme toggle, library list, `⌘K` palette stub, 6h backup scheduler.

Remaining research (non-blocking for v0.1.0–v0.3.0):

- R-LLM-b (Qwen 3 head-to-head vs Qwen 2.5) — before v0.3.0
- R-VEC (sqlite-vec perf at 10k+ chunks) — before v0.4.0
- R-FSRS (SRS algorithm choice) — before v0.8.0
- R-CLUSTER (topic clustering) — before v0.6.0
- R-YT (yt-dlp reliability) — before v0.10.0
- R-WHISPER (whisper.cpp vs faster-whisper) — before v0.10.0
- R-OCR (tesseract.js pipeline) — if / when scanned PDFs arrive

### Open questions / decisions needed

- **D-4 Obsidian vault path** — still open; only needed before v0.10.0.
- Will the v0.0.1 sanity morning happen in one sitting or split across evenings? (Time-boxing affects whether to block v0.1.0 start.)
- After v0.0.1, confirm whether Qwen 3 is worth the R-LLM-b mini-spike or if we stick with Qwen 2.5 7B for v0.3.0.

### State snapshot

- **Current phase / version:** Planning (`●` complete) → v0.0.1 Empirical Sanity (`○` next, blocking gate) → v0.1.0 Foundation
- **App version:** not yet released; `package.json` to start at `0.1.0` when scaffolded
- **Plan version:** `v0.2.1-plan`
- **Design doc version:** `v0.1.0-design` (DESIGN_SYSTEM) + `v0.1.0` (DESIGN) — unchanged
- **Critique version:** `v0.1.0-critique` — 25 open findings across phase gates
- **Repo:** https://github.com/arunpr614/ai-brain (public, main at `b869d90` + local follow-up commit for this self-critique wave)
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/SELF_CRITIQUE.md`
- **Next milestone:** v0.0.1 Empirical Sanity Morning — run and document before any v0.1.0 code.
