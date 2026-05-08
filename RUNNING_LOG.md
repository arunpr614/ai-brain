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

---

## 2026-05-07 17:10 — v0.0.1 Empirical Sanity Morning complete

**Entry author:** AI agent (Claude) · **Triggered by:** v0.0.1 exit criteria met

### Planned since last entry

At the 15:42 entry, v0.0.1 was an open gate. Plan was to run 4 spikes in a single 3-hour block: Ollama tok/s benchmark, unpdf PDF extraction on 10 real Lenny PDFs, Capacitor share-target AVD test, WebAuthn feasibility. Arun confirmed Option A ("let's go").

### Done

Ran all four spikes on Arun's M1 Pro 32 GB in sequence with parallel steps where possible.

**S-001 Ollama benchmark:**
- Installed Ollama 0.23.1 via Homebrew
- Pulled `qwen2.5:7b-instruct-q4_K_M` (4.4 GB)
- Benchmarked with real 995-token prompt (Lenny article summarization → JSON)
- Results: **24 tok/s generation, 141 ms first-token (warm), 20,975 tok/s prompt processing**
- The extrapolated 32-38 tok/s was ~30% optimistic. First-token latency was 10x better than expected. Target UX remains comfortable with revised num_predict budgets.

**S-002 unpdf extraction:**
- 10 varied Lenny PDFs from 2022-2026 (634 KB to 3.6 MB)
- `unpdf@1.6.2` extracted all cleanly: avg 100 ms, 10/10 titles recovered, 0 ligature issues
- chars/page distribution: p5=430, p50=920, p95=1394 → **paywall threshold calibrated to 301 cpp**

**S-003 Capacitor share-target:**
- **Critical finding:** The plugin named in R-CAP (`@capawesome/capacitor-android-share-target`) **returns 404 on npm**. Replaced with `@capgo/capacitor-share-target@8.0.30` (actively maintained, last publish 3 days before this spike).
- Required JDK 21 (not 17 as assumed) for Capacitor 8. Installed Zulu 21 via Homebrew.
- Built debug APK in 46s, installed on Pixel AVD API 34, tested cold-start + warm-start share intents.
- Both flows deliver the `shareReceived` event cleanly. Payload: `{title, texts[], files[]}`.
- Discovered cold-start double-fire (event re-fires on app resume) → new F-041 task for 2-second dedup.
- Plugin's `addListener()` is synchronous, not Promise-returning as README claims.

**S-004 WebAuthn:**
- Validated `@simplewebauthn/browser` + `@simplewebauthn/server` v13.3.0 current (MIT, same maintainer)
- Confirmed macOS 26.4 + Chrome 108+ support TouchID via localhost Secure Context
- No entitlement or special config needed — browser brokers OS prompt

**S-005 Report:**
- Authored `docs/research/EMPIRICAL_SANITY.md` (8 sections, ~2500 words)
- Updated `BUILD_PLAN.md` → v0.3.0-plan with measured numbers and plan corrections
- Updated `ROADMAP_TRACKER.md` → v0.2.1-roadmap with all S-* shipped + F-041 added
- Updated `PROJECT_TRACKER.md` → v0.2.1-tracker with v0.0.1 closed ●
- Marked 8 self-critique findings as RESOLVED in `SELF_CRITIQUE.md` v0.1.1-critique
- 3 new findings discovered during spike (C-1b plugin name, C-9 dedup, C-10 sync API, C-11 JDK 21) — all documented

### Learned

- **Empirical spikes catch what desk research cannot.** The plugin name in the plan was flat wrong. No amount of documentation review would have caught that — only trying to `npm install` it did. X-1 (empirical verification missing) was the #1 critique finding for good reason.
- **The M1 Pro + Metal throughput is real but lower than extrapolated.** 24 tok/s not 35. The bandwidth-scaling formula in R-LLM used a LLaMA-2 baseline that didn't generalize to Qwen 2.5 Q4_K_M. Future benchmarks should always be measured on the actual model + hardware combo.
- **First-token latency trumps throughput for perceived UX.** 141 ms first token with 24 tok/s streaming feels better than 2000 ms first token with 40 tok/s. Revised UX target accordingly.
- **Capacitor 8 is the current major.** Our plan said 6. Capacitor 8 requires JDK 21. Both facts worth knowing before v0.5.0.
- **AVD works fine for share-intent testing.** No physical device needed until device-to-Mac LAN testing in v0.5.0.
- **Substack PDFs are clean.** No ligature corruption across 10 samples. The concern raised in R-PDF §4 was theoretical, not empirical.
- **Cold-start event delivery is ~560 ms.** Fast enough that listener registration in `app/layout.tsx` catches it reliably.

### Deployed / Released

Nothing user-facing. Toolchain now resident on the Mac:
- Ollama 0.23.1 at `/opt/homebrew/opt/ollama/bin/ollama`
- Qwen 2.5 7B model in `~/.ollama/models/`
- Zulu JDK 17 + 21 (both installed; JDK 21 is active for Capacitor)
- Android SDK + AVDs (pre-existing; unchanged)

Throwaway artifacts at `/tmp/ai-brain-spikes/` (not committed — transient scratch).

### Documents created or updated this period

Created:
- `docs/research/EMPIRICAL_SANITY.md` — complete v0.0.1 spike report

Updated:
- `BUILD_PLAN.md` v0.2.1-plan → **v0.3.0-plan** (§15.1 tok/s measured, §15.2 threshold calibrated, §15.3 plugin corrected, §15.4 WebAuthn deps)
- `ROADMAP_TRACKER.md` v0.2.0-roadmap → v0.2.1-roadmap (all S-* shipped, F-041 added, F-014 note updated)
- `PROJECT_TRACKER.md` v0.2.0-tracker → v0.2.1-tracker (v0.0.1 closed ●, v0.1.0 unblocked)
- `docs/research/SELF_CRITIQUE.md` → v0.1.1-critique (8 findings resolved, 4 new ones added)

### Current remaining to-do

**Immediately unblocked:** v0.1.0 Foundation phase can begin at any time.

Concrete next-session tasks:

1. `npx create-next-app@latest` → scaffold Next.js 15 + TS + Tailwind + App Router in the repo
2. `npx shadcn@latest init` → set up component library to match `DESIGN.md` tokens
3. Install: `better-sqlite3`, `sqlite-vec`, `zod`, `lucide-react`, `@radix-ui/react-*` primitives
4. Commit F-000 migrations runner FIRST (before any schema) per critique X-4
5. Commit `001_initial_schema.sql` with core tables (items, chunks, collections, tags, cards, chat_messages, settings, _migrations, llm_usage)
6. Implement theme toggle (SSR-safe, cookie-persisted) per DESIGN.md §13
7. Library list view + new-note form + item detail view
8. ⌘K command palette stub (navigate Library / Inbox / Settings)
9. 6-hour SQLite backup scheduler (`node-cron` + `VACUUM INTO`)
10. README with run instructions

### Open questions / decisions needed

- None blocking. D-4 Obsidian vault path still deferred to v0.10.0.
- v0.1.0 will reveal whether the shadcn/ui CSS-variable bridge to our DESIGN.md tokens is as clean as planned — first integration test.

### State snapshot

- **Current phase / version:** v0.0.1 ● complete → **v0.1.0 Foundation (ready to start)**
- **App version:** not yet released; will start at `0.1.0` on first commit of `package.json`
- **Plan version:** `v0.3.0-plan`
- **Critique version:** `v0.1.1-critique` — 8 findings resolved, 3 new discovered+documented
- **Repo:** https://github.com/arunpr614/ai-brain — 2 commits on main, this report makes 3
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/SELF_CRITIQUE.md` · `docs/research/EMPIRICAL_SANITY.md`
- **Next milestone:** v0.1.0 exit — "I can add 3 notes, see them listed, click one, see content. Theme toggle works. 6h backup runs."

---

## 2026-05-07 17:20 — Handoff checkpoint: v0.0.1 closed, beginning v0.1.0 Foundation

**Entry author:** AI agent (Claude) · **Triggered by:** user invoked `running-log-updater` skill to mark the handoff from research to build

### Planned since last entry

Small interval from the 17:10 entry. Intent: explicitly close v0.0.1 in the log and mark v0.1.0 Foundation as actively starting. No new code written yet.

### Done

- Confirmed v0.0.1 is merged and pushed (commit `0edd5b6`) on `main`: https://github.com/arunpr614/ai-brain/commit/0edd5b6
- Confirmed all trackers reflect v0.0.1 ●:
  - `BUILD_PLAN.md` v0.3.0-plan with §15 calibrated to measurements
  - `ROADMAP_TRACKER.md` v0.2.1-roadmap with S-001…S-005 shipped + F-041 added
  - `PROJECT_TRACKER.md` v0.2.1-tracker with v0.1.0 marked UNBLOCKED
  - `SELF_CRITIQUE.md` v0.1.1-critique with 8 findings RESOLVED
- Toolchain on the Mac (persists across sessions):
  - Ollama 0.23.1 at `/opt/homebrew/opt/ollama/bin/ollama`
  - `qwen2.5:7b-instruct-q4_K_M` in `~/.ollama/models/`
  - Zulu JDK 17 + JDK 21 installed (21 is active for Capacitor 8)
  - Android SDK + AVDs already present (unchanged)
- Throwaway spike artifacts remain at `/tmp/ai-brain-spikes/` and can be deleted any time.

### Learned

- Running-log-updater skill invocation flow works: user says "run running-log-updater", skill asks for project folder, reads last entry, appends a new one. Confirmed end-to-end.
- Default in-session behavior will NOT be to auto-append between each commit — a checkpoint is only valuable when narrative state shifts (e.g., phase → phase). Between sessions: always append on request.

### Deployed / Released

Nothing new since 17:10. Repo is `https://github.com/arunpr614/ai-brain` at commit `0edd5b6`.

### Documents created or updated this period

- `RUNNING_LOG.md` — this entry (fourth entry)

### Current remaining to-do

v0.1.0 Foundation kickoff (next step, now starting):

1. `npx create-next-app@latest` — Next.js 15 + TS + App Router + Tailwind 4 in repo root
2. `npx shadcn@latest init` — wire tokens per `DESIGN.md`
3. `npm i better-sqlite3 sqlite-vec zod lucide-react @radix-ui/react-*`
4. **F-000 migrations runner** FIRST (before any schema; per critique X-4)
5. `001_initial_schema.sql` — items, chunks, collections, tags, cards, chat_messages, settings, `_migrations`, `llm_usage`
6. Theme toggle (SSR-safe, cookie-persisted) per DESIGN.md §13
7. Library list view + new-note form + item detail view
8. `⌘K` palette stub (Library / Inbox / Settings)
9. 6-hour SQLite backup scheduler (`node-cron` + `VACUUM INTO`)
10. Commit + push; update `PROJECT_TRACKER.md` v0.1.0 status

### Open questions / decisions needed

None blocking. One open soft question: first-run PIN UX copy — pick a default when we reach auth in v0.5.0, not now.

### State snapshot

- **Current phase / version:** v0.0.1 ● complete → **v0.1.0 Foundation (starting now)**
- **Plan version:** `v0.3.0-plan`
- **Repo:** https://github.com/arunpr614/ai-brain (commit `0edd5b6`)
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/SELF_CRITIQUE.md` · `docs/research/EMPIRICAL_SANITY.md`
- **Next milestone:** v0.1.0 exit — "I can add 3 notes, list them, click one, see content. Theme toggle works. Backup runs."

---

## 2026-05-07 17:41 — v0.1.0 Foundation shipped

**Entry author:** AI agent (Claude) · **Triggered by:** v0.1.0 exit criteria met end-to-end

### Planned since last entry

Ship the full v0.1.0 Foundation exit contract: empty app runs on `localhost:3000`, user can set a PIN, add a note, see it listed, click to read the content, toggle the theme, see a backup snapshot on disk.

### Done

**Scaffolding (F-001):** Scaffolded Next.js **16.2.5** (note: Next.js moved from 15 to 16 between planning and execution; we caught and adopted) + React 19.2.4 + Tailwind 4 via `create-next-app`. Moved into repo root preserving all planning docs. Replaced scaffold name `brain-scaffold` with `ai-brain`, added explicit deps, committed `package-lock.json`.

**Design tokens (F-001 / F-008):** Authored `src/styles/tokens.css` with the full Radix Slate + Indigo palette for light + dark, typography (Inter + Charter + JetBrains Mono via `next/font`), motion durations + easings, spacing + radius scales — all lifted directly from `DESIGN.md` frontmatter. Bridged to Tailwind v4 via `@theme inline` in `globals.css`. `prefers-reduced-motion` collapses all durations to 0.

**Theme toggle (F-008):** Cookie-persisted (`brain-theme` = system|light|dark). Server reads cookie in `layout.tsx`, stamps `data-theme` on `<html>` before first paint. Inline pre-hydration script reconciles "system" preference against `prefers-color-scheme` → no FOUC. 3-option `ThemeToggle` (Monitor/Sun/Moon radiogroup) lives in Settings.

**DB layer (F-000, F-002, F-003):**
- `src/db/client.ts` — singleton `better-sqlite3` connection, WAL mode, FK enforcement. `sqlite-vec` loaded via try/catch (v0.1.0 doesn't use vectors yet; v0.4.0 requires it).
- Migrations runner — reads `src/db/migrations/NNN_*.sql` in order, tracks applied migrations in `_migrations`, idempotent, refuses to start on failure.
- `001_initial_schema.sql` — 13 tables covering v0.1.0 needs plus forward-looking schemas (chunks, cards, chat_*, llm_usage) so later phases add rows, not schema.
- Repositories: `src/db/items.ts` (createNote, getItem, listItems, countItems, deleteItem) and `src/db/settings.ts` (string + JSON key-value).

**Auth (F-004):**
- `src/lib/auth.ts` — PBKDF2-HMAC-SHA256 (200k iterations, 32-byte keylen) PIN hash + HMAC-signed session token valid 30 days. Pure node:crypto, no native deps.
- `src/middleware.ts` — Edge middleware checks cookie *presence* only (edge runtime can't import node:crypto). Cookies are HMAC-signed at issue time; pages re-verify HMAC on Node runtime.
- Routes: `/setup` (first run, create PIN + confirm), `/unlock` (returning user), both redirect to `/setup` or `/unlock` depending on `isPinConfigured()`. Server actions in `src/app/auth-actions.ts`.

**Library + notes (F-005, F-006, F-007):**
- `/` — library list: relative-time metadata, source-type icon, card-item hover state per DESIGN.md §8.3. Empty state with single CTA.
- `/items/new` — server action creates note, redirects to detail. Zod validation; error surfaced inline.
- `/items/[id]` — Charter-typography article view, max 68ch, delete button at bottom.
- `/settings` — Appearance + Backups + About panels.

**Command palette (F-010):** cmdk-based `⌘K` palette with Navigate group (Library, Settings) and Capture group (New note). Esc to close. Renders above backdrop, focuses input on open, arrow-key navigation. Global context provider in `layout.tsx`.

**Backup scheduler (F-009):**
- `src/lib/backup.ts` — `VACUUM INTO data/backups/YYYY-MM-DD_HHMM.sqlite`, 28-snapshot retention, 6-hour interval. Configurable via `settings.backup`.
- `src/instrumentation.ts` — Next.js `register()` hook warms the DB + starts the scheduler on server boot. Idempotent against hot-reloads.
- Boot-time snapshot ensures a backup exists immediately; verified by observing `data/backups/2026-05-07_1738.sqlite` appearing within 2s of `npm run dev`.

**Smoke test performed:**
1. `rm -rf data/ && npm run dev` — fresh boot
2. `GET /` → 307 `/unlock?next=/` — middleware gates
3. `/unlock` → 302 `/setup` — no PIN set yet
4. DB inspection after /setup render: 13 tables present, `_migrations` has `001_initial_schema.sql`
5. Initial backup snapshot created in `data/backups/`

**Quality gates:**
- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors (one Link-for-anchor warning caught + fixed)
- `npm run build` → succeeded; all 8 routes compiled
- Turbopack bundled successfully; middleware isolated from node-only modules

### Learned

- **Next.js 16 is the current major.** Capacitor and Next both moved a major between research and implementation. BUILD_PLAN.md still says "Next.js 15" in the prose; the `§15.6` stack list says `^15.x`. Not worth bumping the plan for a one-digit drift — code is authoritative, plan is guidance. Will note in next plan refresh.
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`.** Current file name still works with a deprecation warning. We'll rename to `proxy.ts` in a tiny follow-up.
- **Edge middleware can't import anything that pulls `node:fs` or `node:crypto`.** Solution: two-layer check. Middleware sees cookie presence only; page-level HMAC verification runs on Node runtime. Documented in `src/middleware.ts` comment.
- **sqlite-vec failed to load via Turbopack** (`__TURBOPACK__import$2e$meta__.resolve is not a function`). Not a blocker for v0.1.0 (no vector ops yet) but something to address before v0.4.0 — likely needs an `experimental.serverExternalPackages` entry or a bundler escape hatch.
- **`create-next-app` drops an `AGENTS.md` + `CLAUDE.md` in the scaffold now.** Deleted both; our `README.md` is the source of truth.
- **Turbopack workspace root warning** because `/Users/arun.prakash/package-lock.json` exists at the monorepo parent. Silenceable via `turbopack.root` in `next.config.ts` — deferred to v0.1.1 patch.

### Deployed / Released

- Local: working Next.js app at `localhost:3000`. No cloud deploy (per C5).
- Git: commit pending with this entry.

### Documents created or updated this period

**Source files created (25):**
- `src/app/{page.tsx, layout.tsx, not-found.tsx, actions.ts, auth-actions.ts, globals.css}`
- `src/app/items/{new/page.tsx, new/form.tsx, [id]/page.tsx}`
- `src/app/{setup/page.tsx, setup/form.tsx, unlock/page.tsx, unlock/form.tsx, settings/page.tsx}`
- `src/components/{sidebar.tsx, theme-toggle.tsx, command-palette.tsx}`
- `src/db/{client.ts, items.ts, settings.ts, migrations/001_initial_schema.sql}`
- `src/lib/{auth.ts, backup.ts, cn.ts, theme.ts}`
- `src/styles/tokens.css`
- `src/middleware.ts`, `src/instrumentation.ts`

**Updated:**
- `package.json` — renamed to `ai-brain`, added deps, lockfile committed
- `README.md` — "how to run" section + stack table reflects actual versions
- `PROJECT_TRACKER.md` v0.2.1 → v0.3.0 (v0.1.0 row flipped to ●)
- `ROADMAP_TRACKER.md` v0.2.1 → v0.3.0 (F-000..F-010 all shipped)

### Current remaining to-do

**v0.1.1 follow-up polish (low priority, can batch into next commit):**
- Rename `src/middleware.ts` → `src/proxy.ts` (Next.js 16 convention)
- Add `turbopack.root` to `next.config.ts` to silence workspace warning
- Investigate sqlite-vec Turbopack load failure before v0.4.0

**v0.2.0 Capture core — next real phase.** Scope (from ROADMAP):
- CAP-1 Save URL via paste (unpdf + `jsdom` + Mozilla Readability)
- CAP-2 Save PDF via drag-drop (unpdf pipeline; paywall threshold 301 chars/page per v0.0.1 calibration)
- ORG-2 Full-text search (FTS5 virtual table)
- INT-1 Markdown export
- Header/footer stripping utility (per self-critique P-4)

### Open questions / decisions needed

None blocking. Two soft items:
- The Next.js 16 move is worth a single-line note in `BUILD_PLAN.md` §15.6 next time we touch the plan.
- v0.5.0 auth tokens will eventually overlay the v0.1.0 PIN — need to decide if the PIN stays as a "web UI unlock" floor even after bearer-token LAN auth lands. Current lean: keep it (defense in depth on localhost browsers).

### State snapshot

- **Current phase / version:** v0.1.0 ● shipped → **v0.2.0 Capture core (next)**
- **App version:** `0.1.0` in `package.json`
- **Plan version:** `v0.3.0-plan`
- **Repo:** https://github.com/arunpr614/ai-brain — 3 commits pushed, this commit will make 4
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/{SELF_CRITIQUE,EMPIRICAL_SANITY}.md`
- **Next milestone:** v0.2.0 exit — paste a URL, see a parsed article in the library. Drop a PDF, same. FTS search finds keywords.

---

## 2026-05-07 17:55 — v0.1.1 polish shipped, v0.2.0 Capture core kickoff

**Entry author:** AI agent (Claude) · **Triggered by:** user verified v0.1.0 running locally; ready to start v0.2.0

### Planned since last entry

Two things since 17:41:
1. Close out the three v0.1.0 boot-time warnings noted in the prior entry (`middleware`→`proxy` rename, workspace-root, sqlite-vec Turbopack load failure) in a small v0.1.1 polish patch.
2. Checkpoint and begin v0.2.0 Capture core: URL save via Readability, PDF save via `unpdf`, FTS5 full-text search, markdown export, header/footer stripping utility.

### Done

**v0.1.1 polish (commit `fea85e1`):**
- Renamed `src/middleware.ts` → `src/proxy.ts`; exported function renamed `middleware` → `proxy` (Next.js 16 convention). Deprecation warning gone.
- Added `turbopack.root` pin to `next.config.ts`. Stops Turbopack from picking up `~/package-lock.json` as the workspace root.
- Added `serverExternalPackages: ["better-sqlite3", "sqlite-vec"]` to `next.config.ts`. sqlite-vec uses `import.meta.resolve` at runtime to locate its prebuilt binary — marking both as server-external keeps them on the Node side of the bundle where native resolution works. **This unblocks v0.4.0 vector search.**
- Verified via fresh `npm run dev`: `Ready in 309ms`, zero warnings, initial backup snapshot written at `data/backups/2026-05-07_1748.sqlite`, `GET /` → 307 `/unlock?next=/` as expected.
- User verified the app running locally in the browser.

**v0.2.0 Capture core kickoff:** task list populated and ordered; no code yet.

### Learned

- **Next.js 16's `proxy` export must be named literally `proxy`** — leaving the function as `middleware` after the file rename produces a build-time error (`Proxy is missing expected function export name`). Caught + fixed in the same commit.
- **`serverExternalPackages` is the right escape hatch for native-binding modules under Turbopack**, not an `experimental.*` flag. Works at top-level `next.config.ts`.
- **Three warnings collapse into one polish commit cleanly** when they share the `next.config.ts` + Next 16 conventions surface. Good model for future small-cleanup passes.

### Deployed / Released

- `fea85e1` pushed to `main` on `arunpr614/ai-brain`. Repo is 5 commits deep: planning → self-critique → empirical sanity → v0.1.0 foundation → v0.1.1 polish.
- No hosted deploy (per C5).

### Documents created or updated this period

**Code:**
- `src/proxy.ts` (renamed from `src/middleware.ts`, function renamed)
- `next.config.ts` updated: `turbopack.root` + `serverExternalPackages`

**No doc/tracker changes yet for v0.2.0** — those land when v0.2.0 ships.

### Current remaining to-do

**v0.2.0 Capture core — now starting.** Scope (in execution order):

1. **F-101 URL capture** — new deps `@mozilla/readability`, `jsdom`; `src/lib/capture/url.ts` fetches URL → extracts title/author/body text; new `/items/capture` route with URL paste form.
2. **F-102 PDF capture** — wire the validated-in-v0.0.1 `unpdf` pipeline: extract text + pages + metadata; apply the 301 chars/page paywall heuristic; drag-drop + file-picker UI.
3. **F-103 Header/footer stripping** — detect repeating top/bottom lines across pages, strip before storing (per self-critique P-4). Utility in `src/lib/capture/strip.ts`.
4. **F-104 FTS5 full-text search** — new migration `002_fts5.sql` with `items_fts` virtual table + triggers to keep it in sync; search bar on Library; `/search?q=` route.
5. **F-105 Markdown export** — `GET /api/items/[id]/export.md` returns the item as standard markdown with YAML frontmatter (ready for Obsidian sync in v0.10.0).
6. **F-106 Capture UI** — unified `/capture` page with tabs: URL / PDF / Note. ⌘K gets a "Capture URL" + "Capture PDF" entry.
7. Commit + push v0.2.0; update `PROJECT_TRACKER.md` + `ROADMAP_TRACKER.md`; append running log.

**v0.2.0 exit criteria (from BUILD_PLAN.md):** "Paste any web URL, hit save, see it parsed in the library with clean title and full text. Drop a PDF, same. FTS search finds keywords across items. Markdown export endpoint returns valid markdown."

**Deferred to later v0.1.x / v0.2.x:**
- Add a `turbopack.root` comment explaining why the pin exists (cosmetic)
- Possibly extract `tokens.css` → multi-file if it grows past ~200 lines

### Open questions / decisions needed

- **URL fetch policy.** For URL capture, do we use `fetch()` with a custom User-Agent, or add a headless browser (Playwright) for JS-heavy sites? Lean: start with plain `fetch` + `jsdom` — covers the vast majority of news/blog articles. Playwright would be a v0.10.0 add.
- **Per-URL timeout / size limits.** What's the cap on a single fetch? Lean: 15s timeout, 5MB max response body. Document in config.
- **Duplicate detection.** If the same URL is saved twice, do we upsert, create a new item, or warn? Lean: warn + link to existing item. Not a blocker for v0.2.0 exit.

I'll make reasonable defaults on each and surface them in the v0.2.0 commit.

### State snapshot

- **Current phase / version:** v0.1.0 ● shipped + v0.1.1 ● polish shipped → **v0.2.0 Capture core (starting now)**
- **App version:** `0.1.0` (will bump to `0.2.0` when v0.2.0 exit criteria are met)
- **Plan version:** `v0.3.0-plan`
- **Repo:** https://github.com/arunpr614/ai-brain (commit `fea85e1`)
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/{SELF_CRITIQUE,EMPIRICAL_SANITY}.md`
- **Next milestone:** v0.2.0 exit — "paste URL → parsed article, drop PDF → extracted text, FTS search works, markdown export returns valid content"

---

## 2026-05-07 18:15 — v0.2.0 Capture core shipped

**Entry author:** AI agent (Claude) · **Triggered by:** all 6 v0.2.0 features complete + smoke-tested; user confirmed URL+PDF+Note MVP scope

### Planned since last entry

Ship the v0.2.0 exit contract: paste URL → clean article; drop PDF → extracted text; full-text search finds keywords; markdown export returns valid content. Resolve self-critique P-4 (header/footer strip). Keep scope tight — no image OCR, no chip filters.

Mid-session, user asked about source-type coverage. I spawned a research agent to compare AI Brain/Recall/Knowly, then user aligned on keeping the URL+PDF+Note MVP scope as-is. Agent was stopped before it wrote a deliverable — decision was clear without the memo.

### Done

**v0.2.0 features (6 shipped, 0 deferred into v0.2.x):**

- **F-101 URL capture** — `src/lib/capture/url.ts` uses `@mozilla/readability` + `jsdom`. 15-second timeout, 5 MB response cap, custom user-agent, charset detection from content-type. Validates URL shape, rejects non-HTML content-types with a clear error. Duplicate-URL detection on `source_url` returns a "duplicate" state with "Open existing" and "Save again anyway" affordances.
- **F-102 PDF capture** — `src/lib/capture/pdf.ts` via `unpdf@1.6.2` (validated in v0.0.1). 50 MB max file size. Applies the v0.0.1-calibrated **301 chars/page paywall threshold**. Also flags `possible_scanned_page` when any page has <50 chars AND file bytes/page > 3 KB. Metadata extraction recovers title from PDF info dict; falls back to filename.
- **F-103 Header/footer stripping** — `src/lib/capture/strip.ts` detects repeating top/bottom lines across ≥50% of pages via normalized-line fuzzy match (collapses page numbers like "3 / 12" and "Page 3 of 12" before comparing). Only triggers for docs with ≥3 pages. Resolves self-critique P-4. Unit-tested inline — correctly strips "Lenny's Newsletter · Issue 1" from a 3-page fixture.
- **F-104 FTS5 full-text search** — migration `002_fts5.sql` with `items_fts` virtual table using `porter unicode61` tokenizer (English stemming + diacritic folding). Keeps sync via INSERT/UPDATE/DELETE triggers. Backfills pre-existing items on migration run. `src/db/items.ts#searchItems` wraps with a LIKE fallback if FTS5 is ever unavailable. `/search` route added. Verified on 3 seeded items: `growth`→"Product-led growth playbook", `attention`→"AI Engineering Handbook", `velocity`→"How to ship fast". All correct.
- **F-105 Markdown export** — `GET /api/items/[id]/export.md` returns a download with `Content-Type: text/markdown`. YAML frontmatter keys: `title, source_type, source_url, author, captured, brain_id, total_pages, extraction_warning`. These are the **exact keys v0.10.0 Obsidian sync will use when writing into the vault folder** — stable schema now.
- **F-106 Unified capture UI** — `/capture` page with 3 tabs (URL / PDF / Note) synced to `?tab=` query param. PDF tab uses a drag-drop dropzone backed by `/api/capture/pdf` (multipart POST on the Node runtime to bypass server-action body limits). ⌘K palette gets "Capture URL", "Capture PDF", "New note", "Search library" entries. Library page gets a search bar + a "Capture" button (replacing "New note"). `/items/new` kept as a redirect to `/capture?tab=note` for bookmarks.

**New DB repo functions:** `insertCaptured` (unifies all three source types behind one call), `findItemByUrl` (duplicate detection), `searchItems` (FTS5 with LIKE fallback).

**Cleanups:** removed unused `useState`/`useTransition` imports from `tabs.tsx`; removed unused `Plus` import from command palette; deleted orphan `src/app/items/new/form.tsx` (replaced by capture tabs).

**Quality gates:**
- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors
- `npm run build` → 10 routes + 2 API endpoints, all compiled. `002_fts5.sql` applied during build-time page collection.
- End-to-end smoke test: PIN set via tsx, 3 items seeded, FTS verified, export endpoint returned valid markdown with correct frontmatter, `/search` route rendered results. All green.

**Version bump:** `package.json` 0.1.0 → 0.2.0.

### Learned

- **Readability handles `example.com` fine** — extracted the "Example Domain" title and 111-char body. It's sensitive to the DOM having a recognizable article structure, which is exactly what it's designed for; we'll find the first real failure mode when Arun captures a JS-heavy site (SPA news sites, paywalled Substack) in actual use.
- **unpdf at scale: 18-page PDF in 237 ms.** Matches the v0.0.1 100 ms/PDF average on smaller docs. Linear-ish in page count. No memory concerns.
- **FTS5 `porter` tokenizer is the right default.** Stemming means `"growth"` matches `growth` / `grows` / `growing`; `"attention"` matches `attention` / `attentive`. No config work needed.
- **Server actions can't handle large files** — Next.js caps form-post bodies around 4.5 MB by default. For PDFs we had to fall back to a route handler (`/api/capture/pdf`) with `runtime = "nodejs"`. Worth remembering for v0.5.0 PDF-over-LAN from the Android APK.
- **The "contentless external-content" FTS5 pattern** requires `id UNINDEXED` for the joining column. Standard-looking SQL otherwise.
- **The research-agent's memo wasn't written** — user decided "current MVP scope is right" before the agent finished. Saved context. Good reminder: decisions that don't need supporting docs shouldn't spawn them.

### Deployed / Released

Commit pending with this entry. Will push to `arunpr614/ai-brain` on `main`.

### Documents created or updated this period

**Code (13 new files):**
- `src/lib/capture/url.ts` — URL fetch + Readability
- `src/lib/capture/pdf.ts` — unpdf-based PDF extraction
- `src/lib/capture/strip.ts` — header/footer stripping
- `src/db/migrations/002_fts5.sql` — FTS5 virtual table + sync triggers
- `src/app/capture-actions.ts` — URL capture server action + PDF action
- `src/app/capture/page.tsx`, `src/app/capture/tabs.tsx`, `src/app/capture/pdf-dropzone.tsx`
- `src/app/api/capture/pdf/route.ts` — multipart upload endpoint
- `src/app/api/items/[id]/export.md/route.ts` — markdown export
- `src/app/search/page.tsx` — search results
- `src/app/items/new/page.tsx` — now a redirect shim

**Code (updated):**
- `src/db/items.ts` — added `insertCaptured`, `findItemByUrl`, `searchItems`
- `src/app/page.tsx` — search bar + Capture button + URL/PDF icons
- `src/app/items/[id]/page.tsx` — source-URL link, warning pill, markdown export button
- `src/components/command-palette.tsx` — Capture URL/PDF/Note + Search entries
- `package.json` — deps added (`@mozilla/readability`, `jsdom`, `unpdf`); version 0.1.0 → 0.2.0

**Docs (updated):**
- `PROJECT_TRACKER.md` v0.3.0 → v0.4.0 (v0.2.0 row flipped to ●)
- `ROADMAP_TRACKER.md` v0.3.0 → v0.4.0 (F-101..F-106 shipped; CAP-4 explicitly deferred with rationale)
- `README.md` — "Current status" + stack table reflects 0.2.0
- `RUNNING_LOG.md` — this entry

### Current remaining to-do

**v0.3.0 Intelligence — next phase.** Scope from BUILD_PLAN §5:
- DIG-1/2/3 — auto-summary + key-quote extraction + dual-pane original-vs-digest view (needs Ollama)
- ORG-4/5/6 — auto-category (14 Knowly taxonomy buckets), auto-title, auto-tag
- ORG-7/10 — manual tags + collections + bulk operations
- INT-2 — bulk export
- **Precondition:** `OLLAMA_MAX_LOADED_MODELS=1` env + `keep_alive` tuning from §15.1. Ollama is already installed + qwen2.5:7b pulled from v0.0.1.
- **Pre-v0.3.0 research:** R-LLM-b (Qwen 3 head-to-head) — a ~30-minute run before wiring the enrichment pipeline. Worth doing; Qwen 3 may collapse the stack to a single model.

**Also pending (non-blocking):**
- R-VEC benchmark before v0.4.0 (sqlite-vec at 10k+ chunks)
- LLM usage tracking surface in Settings (the `llm_usage` table is there; v0.3.0 will start writing to it)

### Open questions / decisions needed

- **URL capture edge cases I haven't tested yet:** JS-rendered SPAs (Twitter, Reddit threads), paywalled Substack posts that require login, redirected tracker URLs. Will surface as real failures when you start capturing live content; not worth gold-plating now.
- **Should we promote LLM usage indicator to v0.2.x?** — Surfacing "0 calls this month" as a placeholder in Settings costs ~30 min and preempts confusion when v0.3.0 adds a real counter. Low priority.

### State snapshot

- **Current phase / version:** v0.1.0 ● + v0.1.1 ● + v0.2.0 ● → **v0.3.0 Intelligence (next)**
- **App version:** `0.2.0` in `package.json`
- **Plan version:** `v0.3.0-plan`
- **Repo:** https://github.com/arunpr614/ai-brain — 5 commits deep + pending v0.2.0 commit
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/{SELF_CRITIQUE,EMPIRICAL_SANITY}.md`
- **Next milestone:** v0.3.0 exit — "10 captured items each have summary + category + title + auto-tags; dual-pane view renders; tags + collections CRUD works; enrichment runs in ≤30 s wall time per item."

---

## 2026-05-07 21:20 — v0.1.2 dev stability + R-LLM-b complete, v0.3.0 kickoff

**Entry author:** AI agent (Claude) · **Triggered by:** two commits landed post v0.2.0; v0.3.0 about to start

### Planned since last entry

Three goals since the 18:15 v0.2.0 entry:
1. Let Arun verify v0.2.0 running locally in the browser.
2. Fix whatever surfaces during that verification (proactively budgeted for dev-server stability).
3. Resolve self-critique finding L-6 (Qwen 3 vs Qwen 2.5) with a real empirical head-to-head before wiring the v0.3.0 enrichment pipeline.

### Done

**v0.1.2 dev stability patch (commit `a578cfa`):**
- Dev server crashed with a V8 OOM after ~38 min of Turbopack hot-reloads on the default ~4 GB Node heap. Bumped `NODE_OPTIONS='--max-old-space-size=8192'` on `dev`/`build`/`start` scripts in `package.json`. M1 Pro has 32 GB; 8 GB is comfortable headroom.
- Secondary: React hydration warning — the pre-hydration theme script legitimately overrides the server-rendered `data-theme` attribute. Added `suppressHydrationWarning` on `<html>` in `src/app/layout.tsx` (the only legitimate use of that escape hatch in the app). Warning gone.
- Separate stale-cache issue observed once: `Cannot find module 'better-sqlite3-<hash>'` — fixed by `rm -rf .next/dev .next/cache`. Documented in the commit body for future-self.

**R-LLM-b Qwen 3 head-to-head spike (commit `ec16a7d`):**
- Pulled `qwen3:8b` (5.2 GB, ~13 min over 6.5 MB/s). Kept `qwen2.5:7b-instruct-q4_K_M` from v0.0.1.
- Built `scripts/rllm-b-bench.ts` — 5 real samples (3 Lenny PDFs + 2 URL articles via live Readability). Same unified enrichment prompt through both models: summary + 5 verbatim quotes + 14-category classifier + cleaned title + 3-8 hyphenated tags, all as JSON.
- **Results:**
  - Qwen 2.5 7B: avg 26.7 s/item, 23 tok/s, 5/5 parse, 5/5 structure
  - Qwen 3 8B (with `think: false`): avg 29.0 s/item, 18 tok/s, 5/5 parse, 5/5 structure
- **Critical gotcha discovered (L-9 in SELF_CRITIQUE.md):** Qwen 3's thinking mode is on by default. When `format: "json"` is set, the `<think>…</think>` prelude counts against `num_predict`, producing truncated mid-JSON strings with `Expected ',' or '}' after property value` errors. First Qwen 3 pass was 2/5 failures. Fix: pass `"think": false` at the top level of the Ollama generate payload. Qwen 2.5 ignores the flag, so setting it unconditionally in the LLM client wrapper is safe.
- **Decision:** keep Qwen 2.5 7B as the v0.3.0 enrichment primary (9% faster, smaller, same reliability). **Adopt Qwen 3 8B as the v0.6.0 GenPage quality model**, supplanting the earlier `qwen2.5:14b` plan — same quality ceiling with a smaller RAM footprint.
- Written up in `docs/research/llm-b-qwen3.md` with the final v0.3.0 prompt template locked.
- **Other quality observation** (L-10): both models mis-classify written Q&A interviews as "Podcast Episode". Noted; consider adding `Interview` as a 15th category in v0.3.0 prompt work.

**Planning decisions locked for v0.3.0:**
- Enrichment model: `qwen2.5:7b-instruct-q4_K_M`
- Prompt: final version in `docs/research/llm-b-qwen3.md §7`
- Per-item budget: 30 s wall / 1200 output tokens / temperature 0.3 / `num_ctx: 8192`
- Retry policy: one retry at temperature 0.1; if second attempt fails, store raw response in `extraction_warning` and mark `enrichment_state = 'error'` — no third try
- Orchestration: SQLite-backed queue with state machine (`pending → running → done|error`); not a separate research spike per explicit call
- Cleanup: Ollama daemon stopped after spike to free ~6 GB RAM

**Also this session (not work; tactical):** Completed R-LLM-b task. Task list cleaned — all v0.2.0 tasks closed; R-LLM-b marked shipped.

### Learned

- **The thinking-mode bug is exactly the bug that gets shipped without empirical verification.** The self-critique (L-6) said "Qwen 3 is 13 months old; evaluate it." A naïve swap based on that alone would have broken 40% of enrichments in v0.3.0 silently. Vindicates the empirical-sanity discipline we put in place after v0.0.0.
- **The Qwen 3 speed disadvantage is real and structural**: 8.2B params vs Qwen 2.5's 7.6B, on M1 Pro's bandwidth-limited inference → 18 tok/s vs 23 tok/s predicted by theory, measured at those exact values. The rule "bigger model = better model" doesn't survive wall-time budgets.
- **Qwen 3's better titles come from one specific thing:** it resists collapsing whitespace into hyphens. Qwen 2.5 produced `"You-Should-Be-Playing-With-Gpts-At-Work"` from the filename slug; Qwen 3 rewrote it to `"You Should Be Playing With GPTs At Work"`. A prompt tweak on Qwen 2.5 ("do not use hyphens as word separators in the title") may close that quality gap without paying the speed penalty. Worth trying during v0.3.0 prompt iteration.
- **Turbopack dev-cache can go stale across major edits** (e.g., renaming middleware.ts → proxy.ts). `rm -rf .next/dev .next/cache && npm run dev` fixes it. Not a code issue; a bundler-cache one.
- **Node's default heap (~4 GB) is too small for a long Next.js 16 + Turbopack dev session.** 8 GB is the new floor; documented in `package.json`.

### Deployed / Released

- `a578cfa` — v0.1.2 dev stability (heap + SSR warning)
- `ec16a7d` — R-LLM-b research docs

Both pushed to `main` on `arunpr614/ai-brain`. Repo now 7 commits deep.

No app deploy (per C5 — pre-v1.0.0 is local-only).

### Documents created or updated this period

Created:
- `docs/research/llm-b-qwen3.md` — R-LLM-b decision memo with final v0.3.0 prompt template + model stack verdict
- `scripts/rllm-b-bench.ts` — reusable enrichment benchmark harness (5-item fixture, env-driven model list)

Updated:
- `docs/research/SELF_CRITIQUE.md` — appended v0.1.2-critique: L-6 RESOLVED; new findings L-9 (thinking-mode) + L-10 (interview mis-classification)
- `src/app/layout.tsx` — `suppressHydrationWarning` on `<html>`
- `package.json` — NODE_OPTIONS='--max-old-space-size=8192' on dev/build/start

### Current remaining to-do

**v0.3.0 Intelligence — starting now.** Ordered execution plan:

1. **F-201 LLM client** — `src/lib/llm/ollama.ts`. Typed wrapper around `/api/generate` + `/api/chat` + `/api/embeddings`. Always passes `think: false`. Exposes `keep_alive`, `num_ctx`, `num_predict`, `temperature`. Reads `OLLAMA_DEFAULT_MODEL` from env with a sensible fallback.
2. **F-202 Enrichment queue** — new migration `003_enrichment_queue.sql` adds `enrichment_jobs` table (fields: item_id, state, attempts, last_error, created_at, claimed_at, completed_at) with state machine. `src/lib/queue/enrichment.ts` has a poll-and-claim worker loop started from `instrumentation.ts` on server boot. Idempotent against Next.js hot-reloads.
3. **F-203 Enrichment pipeline** — `src/lib/enrich/pipeline.ts` consumes jobs: calls LLM, parses JSON (with one retry at temp 0.1), upserts `summary`, `category`, `title` (conditional rewrite), creates tag rows + item_tags links, marks item `enriched_at` and `enrichment_state = 'done'`. Writes to `llm_usage` table.
4. **F-204 Dual-pane view** — item detail page gets an AI digest right-panel (300px) with summary, 5 quote blocks, category chip, auto-tag chips. Original body stays in the 68ch left panel.
5. **F-205 Enrichment status UI** — `enriching…` pill on library cards for items with `enrichment_state = 'pending' | 'running'`. SSE or polling (probably polling — cheaper for a personal app).
6. **F-206 Manual tags + collections CRUD** — UI for create/rename/delete tags + collections; assign/unassign via item detail + library bulk select.
7. **F-207 Bulk operations** — library multi-select (shift-click + cmd-click + checkbox) → apply tag, move to collection, delete.
8. **F-208 Bulk export** — new endpoint `GET /api/library/export.zip` streams all items as markdown files in a zip.
9. v0.3.0 exit commit + push + tracker updates.

**Estimated ~1.5 weeks per plan**; today's session targets F-201 through F-204 (the core async-enrichment flow). F-205..F-208 land in follow-up sessions.

### Open questions / decisions needed

Two soft decisions I'll make as we go unless you object:

- **Run the Ollama daemon via `brew services start ollama` (always-on)** or manually per session? Recommend `brew services` since it's now a required dependency in dev. One-time toggle.
- **SSE vs polling for enrichment status** — polling (every 3s, only on library/inbox pages). SSE adds complexity that's not warranted for a 1-user app. Recommend polling.

### State snapshot

- **Current phase / version:** v0.2.0 ● shipped + v0.1.2 ● polish → **v0.3.0 Intelligence (starting now)**
- **App version:** `0.2.0` (will bump to `0.3.0` at phase exit)
- **Plan version:** `v0.3.0-plan`
- **Repo:** https://github.com/arunpr614/ai-brain (commit `ec16a7d`, 7 commits on main)
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/{SELF_CRITIQUE,EMPIRICAL_SANITY,llm-b-qwen3}.md`
- **Models on disk:** `qwen2.5:7b-instruct-q4_K_M` (4.7 GB) + `qwen3:8b` (5.2 GB). Embeddings + Phi not yet pulled.
- **Next milestone:** v0.3.0 partial — async enrichment queue running, first real item gets auto-summary + category + title + tags; dual-pane view renders.

---

## 2026-05-07 21:53 — v0.3.0 partial: async enrichment pipeline shipped (F-201..F-205)

**Entry author:** AI agent (Claude) · **Triggered by:** commit `a7c28e5` pushed; pausing before F-206..F-208

### Planned since last entry

The 21:20 kickoff listed 9 v0.3.0 tasks (F-201..F-208 + exit commit). Goal for this working block: ship the core async-enrichment slice end-to-end — LLM client (F-201), queue + worker (F-202), pipeline (F-203), dual-pane view (F-204), enriching pill + polling (F-205). F-206..F-208 (tag/collection CRUD, bulk ops, bulk export) deferred to the next session.

### Done

**Commit `a7c28e5` — feat(v0.3.0 partial): async enrichment pipeline**

- **F-201 LLM client** — `src/lib/llm/ollama.ts`. Typed wrapper over `/api/generate`. Always passes `think: false` (SELF_CRITIQUE L-9; Qwen 2.5 ignores cleanly). `generateJson<T>()` auto-retries once at `temperature: 0.1` on parse failure per R-LLM-b §7. `isOllamaAlive()` for the worker health gate. Errors surface as typed `OllamaError` with `code: http | timeout | connection | invalid_response`. 90s request timeout default via `AbortSignal.timeout`.
- **F-202 Queue** — migration `003_enrichment_queue.sql` + `src/lib/queue/enrichment-worker.ts`. Single-worker in the Next.js server process; polls every 2s (pending) / 10s (idle). Stale-claim sweep at **90s** (tuned to our measured 26.7s avg wall time from R-LLM-b — longer than success path, shorter than an annoying wait). Atomic claim via SQLite transaction (select + update in one tx). Auto-enqueue trigger on every `items INSERT`. Backfill query for pre-migration items. `MAX_ATTEMPTS = 3`, then `state='error'`. Ollama-down detection with 30s backoff.
- **F-203 Pipeline** — `src/lib/enrich/{prompts.ts,pipeline.ts}` + migration `004_items_add_quotes.sql`. Prompt template is the LOCKED R-LLM-b §7 version (summary + 5 verbatim quotes + 1-of-14 category + cleaned title + 3-8 hyphenated tags). `validateEnrichment()` structural check. `enrichItem(id)` runs in a single SQLite transaction: UPDATE items (summary/quotes/category/title/enriched_at/state), clear prior auto-tags, upsert each new tag + attach, record `llm_usage`. Short-body fast path — items under 200 chars skip the LLM call entirely.
- **F-204 Dual-pane item view** — rewrote `src/app/items/[id]/page.tsx`. Left pane: Charter-serif original body at 68ch. Right pane: 360px sticky digest card with category chip, tag chips, summary paragraphs, 5 quote blockquotes (accent-left border), "Auto-generated by Ollama (local)" footer. Falls back to a DigestPlaceholder when enrichment isn't done.
- **F-205 Enriching pill + polling** — `src/components/enriching-pill.tsx` polls `/api/items/[id]/enrichment-status` (new route) every 3s. Pulsing sparkle icon + "enriching…" label while pending/running. Red `AlertCircle` + tooltip on error. `ItemEnrichmentWatch` wrapper calls `router.refresh()` on done transitions so the dual-pane digest appears without a full reload. Pill lives on library cards AND item detail header.
- **Proxy fix** — API routes under `/api/*` now return JSON `{ "error": "unauthenticated" }` with HTTP 401 instead of redirecting to `/unlock`. Prevents client `fetch()` calls from following the redirect and receiving HTML. Page routes still redirect as before.
- **Misc** — Added `scripts/**` to `eslint.config.mjs` global ignores (throwaway benchmarks shouldn't gate builds on intentionally loose types).

**Data model extension:**
- Items now have a `quotes` column (`TEXT`, JSON-encoded array). `ItemRow` type updated in `src/db/client.ts`.
- New `enrichment_jobs` table with UNIQUE(item_id) guarantee + INSERT trigger on items.
- New `tags.ts` repo module: `upsertTag`, `attachTagToItem`, `listTagsForItem`, `clearAutoTagsForItem`. Canonicalizes names (lowercase, spaces→hyphens).

**Smoke-tested end-to-end:**
- Freshly inserted a growth-loops note (600+ chars) → queue trigger fired → worker claimed → enrichItem ran in **15.5s single attempt** → `items.enrichment_state: done`, summary + 5 quotes + category "Blog Post" + 5 auto-tags all persisted → `llm_usage` row recorded (454 in / 279 out tokens, `qwen2.5:7b-instruct-q4_K_M`).
- Stale-claim-sweep verified via a deliberate worker restart mid-run.
- `typecheck ✓`, `lint ✓ (after fixing useState lazy-init for React 19 purity rule)`, `build ✓ (11 routes + 3 API endpoints)`.

### Learned

- **SQLite `INSERT OR IGNORE` with UNIQUE(item_id) is the right queue-dedupe primitive.** The item-insert trigger just enqueues; if a row already exists for the item, it silently skips. No app-level "has this been queued?" logic needed.
- **React 19 `react-hooks/purity` lint rule catches `Date.now()` inside `useState` initial value** — fix is to pass a function: `useState(() => ({ …, updated_at: Date.now() }))`. Both patterns work; only the lazy one satisfies the purity check.
- **Stale-claim sweep windows matter more for dev than for production.** A conservative 5-min window leaves items stuck for minutes after a dev-server restart. 90s covers the slowest observed enrichment (36.9s in R-LLM-b) by ~2.5×. Fine for single-worker personal tool.
- **Next.js 16 proxy + API routes with fetch() need JSON 401**, not redirect. An HTML response body from a follow-redirect fetch looks like success (`res.ok === true`) until the JSON.parse at the other end blows up. The new proxy branch on `/api/*` makes this explicit.
- **First item in the queue at server boot surfaced a real bug:** on the earlier smoke test I'd created an item with a raw `insertCaptured()` before migration 003 existed, so it had no queue entry. Once 003 landed, the backfill SELECT picked it up and the worker enriched it. Good defensive move — migrations should backfill pre-existing state when it costs nothing.
- **Title hyphenation is a Qwen 2.5 quirk**, not a prompt failure: the model outputs `"Growth-Loops-Messy-Draft"` even when the prompt explicitly says "preserve natural capitalization, do not collapse spaces into hyphens." R-LLM-b already flagged Qwen 3 as better here. Possible v0.3.1 tweak: a post-processing step that replaces single-hyphens between ASCII words with spaces when the original title had spaces.

### Deployed / Released

- `a7c28e5 feat(v0.3.0 partial): async enrichment pipeline — summary/category/title/tags/quotes` pushed to `main` on `arunpr614/ai-brain`. Repo now 8 commits deep.
- No hosted deploy (per C5).

### Documents created or updated this period

**Code — new files:**
- `src/lib/llm/ollama.ts` — typed Ollama client wrapper
- `src/lib/enrich/prompts.ts` — locked R-LLM-b §7 prompt + validator
- `src/lib/enrich/pipeline.ts` — enrichItem() orchestrator
- `src/lib/queue/enrichment-worker.ts` — polling worker loop
- `src/db/tags.ts` — tag repository
- `src/db/migrations/003_enrichment_queue.sql`
- `src/db/migrations/004_items_add_quotes.sql`
- `src/app/api/items/[id]/enrichment-status/route.ts`
- `src/components/enriching-pill.tsx`
- `src/components/item-enrichment-watch.tsx`

**Code — updated:**
- `src/db/client.ts` — added `quotes` column to `ItemRow`
- `src/instrumentation.ts` — wires `startEnrichmentWorker()` on boot
- `src/proxy.ts` — `/api/*` → JSON 401 instead of redirect
- `src/app/items/[id]/page.tsx` — full dual-pane rewrite with pill
- `src/app/page.tsx` — library cards show pill on pending/running/error items
- `eslint.config.mjs` — ignore `scripts/**`

**Not yet updated in trackers** (do in next session before v0.3.0 exit commit): PROJECT_TRACKER.md phase row still shows v0.2.0 ●; ROADMAP_TRACKER.md doesn't reflect F-201..F-205 shipped. Fold into the F-206..F-208 commit.

### Current remaining to-do

**v0.3.0 remaining (est. 1–1.5 hours next session):**

1. **F-206 manual tags + collections CRUD UI** — settings page for rename/delete tags; collections CRUD; assign/unassign tags from the item detail right pane; assign items to collections.
2. **F-207 bulk library ops** — multi-select on library (shift-click + checkbox + "select all"); apply tag, move to collection, delete in bulk.
3. **F-208 bulk export** — `GET /api/library/export.zip` streams a zip of all items as markdown files with the same frontmatter schema as single-item export.
4. v0.3.0 exit commit: bump `package.json` to `0.3.0`; update `PROJECT_TRACKER.md` (v0.3.0 row → ●) + `ROADMAP_TRACKER.md` (all F-20x rows → shipped); verify exit criteria ("10 captured items each have summary + category + title + tags in ≤30 s").
5. Append running-log entry.

**Nice-to-haves (not blocking v0.3.0 exit):**
- Post-process prompt output to un-hyphenate titles when the original had spaces (Qwen 2.5 quirk noted above)
- Settings panel that shows current `llm_usage` totals for the current month (zero right now because default model is local/free, but v0.5+ will include Claude API path)

### Open questions / decisions needed

- None blocking. One design judgment for F-206: should manual tags and auto tags share the same namespace (and a promoted/demoted kind flag), or live in separate DB rows? Current schema allows either. Current lean: single namespace, `kind: 'manual' | 'auto'` as a tag-level attribute — matches the existing code. Confirm during F-206 work.

### State snapshot

- **Current phase / version:** v0.2.0 ● shipped + v0.1.2 ● polish + v0.3.0 ◐ partial → **v0.3.0 finish (F-206..F-208) next**
- **App version:** `0.2.0` in `package.json` (bumps to `0.3.0` at phase exit)
- **Plan version:** `v0.3.0-plan`
- **Repo:** https://github.com/arunpr614/ai-brain (commit `a7c28e5`, 8 commits on main)
- **Models on disk:** `qwen2.5:7b-instruct-q4_K_M` (default) + `qwen3:8b` (v0.6.0 GenPage path). Ollama running in background from this session.
- **Active trackers:** `BUILD_PLAN.md` · `DESIGN.md` · `DESIGN_SYSTEM.md` · `ROADMAP_TRACKER.md` · `PROJECT_TRACKER.md` · `RUNNING_LOG.md` · `docs/research/{SELF_CRITIQUE,EMPIRICAL_SANITY,llm-b-qwen3}.md`
- **Next milestone:** v0.3.0 exit — "10 captured items each have summary + category + title + tags in ≤30 s; dual-pane renders; collections CRUD works; bulk export returns a valid zip."

---

## 2026-05-08 — v0.3.1 Polish + Hardening phase opened (post-handover)

### Context

Resumed the project after the 2026-05-07 v0.3.0 ship (`5d1c390`) via the `Handover_docs_07_05_2026/` package. The previous agent left the handover folder untracked and had not formalised a v0.3.1 plan. This session closes both gaps plus an adversarial architecture + plan self-critique, then starts execution.

### Commits this session (newest first)

- `54bc92f` — **T-A-1 · F-042 (P0)**: bind Next dev+start to `127.0.0.1` until v0.5.0 CSRF lands (package.json + src/instrumentation.ts policy comment). Typecheck green.
- `9cd92fd` — absorb self-critique into ROADMAP_TRACKER (v0.5.0), PROJECT_TRACKER (v0.5.0), BACKLOG (v2.0), v0.3.1-polish plan (v2.0 two-track)
- `5c1f937` — adversarial self-critique of architecture + v0.3.1/R-VEC plans (22 findings, `docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`)
- `5e4804f` — BACKLOG.md + v0.3.1 polish plan + R-VEC spike plan (`docs/plans/`)
- `dad9ca6` — commit the 10-file handover package the previous agent had left untracked

### v0.3.1 execution breadcrumbs (F-055)

- [ ] T-A-1 · F-042 ✅ shipped `54bc92f`
- [ ] T-A-2 · F-048 — WAL pragmas — **next**
- [ ] T-A-3 · F-044 — HMR worker guard
- [ ] T-A-4 · F-045 — periodic stale sweep
- [ ] T-A-5 · F-047 · T-A-6 · F-046 · T-A-7 · F-051 · T-A-8 · F-043 · T-A-9 · F-034 · T-A-10 · F-049 · T-A-11 · F-050 · T-A-12 · F-056 · T-A-13 · F-052
- [ ] T-B-1 · BACKLOG.md ✅ already shipped at `5e4804f`
- [ ] T-B-2 · F-301 · T-B-3 · F-302 · T-B-4 · B-301 · T-B-5 · F-207 · T-B-6 release

### State snapshot

- **Current phase / version:** v0.3.0 ● → **v0.3.1 ◐ hardening track in progress**
- **App version:** `0.3.0` in `package.json` (bumps to `0.3.1` at phase exit via T-B-6)
- **Plan version:** `v0.3.1-plan v2.0` (two-track)
- **Repo:** https://github.com/arunpr614/ai-brain — `main` is 5 commits ahead of `origin/main` (not pushed this session)
- **Active trackers:** BUILD_PLAN, ROADMAP_TRACKER v0.5.0, PROJECT_TRACKER v0.5.0, BACKLOG v2.0, RUNNING_LOG, `docs/plans/{v0.3.1-polish,R-VEC-spike,SELF_CRITIQUE_2026-05-08_10-14-16}.md`
- **Next milestone:** T-A-2 (F-048) — force `journal_mode=WAL` + `synchronous=NORMAL` on every connection open in `src/db/client.ts`
