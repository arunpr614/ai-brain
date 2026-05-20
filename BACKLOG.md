# AI Brain — Backlog

| Field | Value |
|-------|--------|
| **Document version** | v7.6-backlog (D-16 PASS; Anthropic-529 root cause logged) |
| **Date** | 2026-05-20 |
| **Owner** | Arun |
| **Update cadence** | at every phase kickoff; whenever an item is promoted, deferred, or closed |
| **Revision** | v7.6 — 2026-05-20: D-16 PASSED — content-specific library-wide Ask end-to-end on cloud (8 chunks retrieved, right item at slot 1, Anthropic streamed in 4.48s, HTTP 200). Earlier "stuck on …" state diagnosed: **BUG-ANTHROPIC-OVERLOAD** added — Anthropic API intermittently returns HTTP 529 `overloaded_error`; `src/lib/llm/anthropic.ts:174,210` has no retry on 5xx, only on malformed JSON. Root cause for **BUG-ENRICH-UNREACHABLE-LOOP** also identified (same 529; "unreachable" log message is misleading). **BUG-RETRIEVE-ITEM** marked needs-revalidation — per-item scope was not retested today; the cosine numbers from #48 may have been an artefact of a generic-query embedding rather than a JOIN bug. **R-EMBED-QUALITY** down-scoped to P2 — content-specific queries surface the right item; only generic queries hit Hindi-transcript noise. v7.5 — 2026-05-20: Post-v0.6.1 ship carry-overs logged in §2. New entries: **R-EMBED-QUALITY** (gemini-embedding-001 768-dim mixed-language quality investigation), **BUG-RETRIEVE-ITEM** (per-item Ask 0-chunks bug; fix sketch ready, ≈30 min), **BUG-ENRICH-UNREACHABLE-LOOP** (enrich worker idle-loop observed during D-17 verification). All three target v0.6.2 scope decision (still pending). v7.4 — 2026-05-19: New phase **v0.7.0 Structured Calm Green visual refresh** queued after v0.6.2. Plan: `docs/plans/v0.7.0-structured-calm-green.md`. Spec: `DESIGN_STRUCTURED_CALM_GREEN.md` (made adoption-ready 2026-05-19 — 4 hard gates added, contrast pass complete, token-mapping table added). Original v0.7.0 GenLink renumbered to **v0.7.5**. Deferred from v0.7.0 to other phases: tertiary-rose (→ v0.8.0 SRS); self-hosted Newsreader (→ v1.0.0); citation-chip expansion animation (→ v0.7.x); `surface-dim`/`surface-bright` token use-cases (→ v0.7.1 or delete). v7.3 — 2026-05-19: Mac→Hetzner cutover (v0.6.0) shipped 2026-05-19. New active phase **v0.6.1 Cloud-Cleanup** opened — 20 tasks (T-1..T-20) addressing legacy LAN/Mac strings, 3 security-hygiene gaps, and the false privacy claim at first-run setup. Plan: `docs/plans/v0.6.1-cloud-cleanup.md`. Source audits: `.planning/legacy-feature-audit{,-v2}.md` (revision v2.1 re-rank). New deferred items added to §3 below: **CSP nonce wiring** (→ v0.6.3), **B2 off-site backup** (→ v0.6.2 dedicated phase), **Per-device tokens** (audit A+C — needs design doc first), **enrichment-worker 45-min unreachable-loop bug** (open behavior bug, not legacy-cleanup). Phase 11b (drop `BRAIN_LAN_TOKEN` fallback) deferred to v0.6.2 by design. v7.2 — 2026-05-15: Dual-lane phase ended; single-stream resumed on `main`. v0.5.6 (service-worker app shell, offline cold-launch for Library + Inbox + share-target) tagged. Next track: v0.6.0 cloud migration to Hetzner (Phase B = provider-agnostic LLM wrapper). New backlog item: **Ask + Settings offline shell** — out of scope for v0.5.6 by design (Ollama is laptop-only); revisit after Phase B reveals new origin caching strategy. Other v0.6.x candidates remain queued: Augmented Browsing (AUG-1..10), Knowledge Graph View (GRAPH-1..8), library-offline-from-DB (LIBOFF-1..12). v7.1 — 2026-05-12: v0.5.0 + v0.5.1 + v0.5.2 + v0.5.3 all SHIPPED. Two patch-tier features slotted into v0.6.x: Augmented Browsing + Knowledge Graph View. Plans at `docs/plans/v0.6.x-augmented-browsing.md` + `docs/plans/v0.6.x-graph-view.md`. Source: Recall.it v2 audit 2026-05-12 (`docs/research/recall-feature-audit-v2-2026-05-12.md`). §§ below last touched 2026-05-10 for the v0.5.0 pivot and reference superseded state — full backlog rewrite still pending. v7.0 revision history preserved below |

> Single source of truth for work that is **not in the active phase plan** but is known-needed, nice-to-have, or idea-captured. Items promoted from here land in `BUILD_PLAN.md` under a phase heading. Items closed here get a strikethrough and a closing commit SHA.

---

## 1. Active phase — v0.6.1 Cloud-Cleanup *(opened 2026-05-19)*

### Current state (as of 2026-05-19)

**v0.6.0 Mac→Hetzner cutover SHIPPED 2026-05-19.** Hetzner brain.service serves `brain.arunp.in` exclusively. RUNNING_LOG entry #44.

**v0.6.1 Cloud-Cleanup is the active phase.** Plan: [`docs/plans/v0.6.1-cloud-cleanup.md`](./docs/plans/v0.6.1-cloud-cleanup.md). 20 tasks ordered by exploit-risk × effort. Source: `.planning/legacy-feature-audit.md` v1 + `.planning/legacy-feature-audit-v2.md` v2.1 (re-ranked).

**Single "do this week" pick:** T-1 — replace the false privacy claim at `src/app/setup/page.tsx:25`. Pure string change, deployed in 15 minutes; the only finding the user reads at first-run trust moment.

**T1 bundle (one PR, ~2–3 h):** T-2 `Secure` cookie · T-3 security headers · T-4 `cf-connecting-ip` log

**T2 bundle (one PR, ~half day):** T-5..T-19 — copy cleanups, route rename, env-var rename, Mac-side script fixes

**Release gate (T-20):** typecheck + lint + smoke green; tag `v0.6.1` on `main`.

**Out of scope here (deferred):**
- CSP nonce wiring → v0.6.3 (M-L effort, real UI breakage risk)
- B2 off-site backup → v0.6.2 (dedicated phase; D-18 carry-over)
- Per-device tokens (audit A+C) → TBD (auth architecture; needs design doc)
- `tsx` removal from Hetzner runtime → v0.6.3
- enrichment-worker `isAlive()` 45-min loop fix → open behavior bug, separate
- Chrome extension URL configurability → only if multi-deployment
- **Mac-side `better-sqlite3` ABI mismatch** → v0.6.3 (or open-bug). `npm run smoke` and unit tests fail on Mac because the local Node version (v26.0.0, NODE_MODULE_VERSION 147) has no matching `better-sqlite3` prebuilt binary, and `node_modules/better-sqlite3/lib/binding/` is missing. Pre-dates v0.6.1 (carry-over from cutover handover §1.5). Not a regression from any task in this phase. Cloud server is unaffected (Hetzner has its own working bindings). Fix likely requires `npm rebuild better-sqlite3` with matching native build tools, or pinning Node to a version with prebuilt binaries available. **Effort: S–M, depending on whether prebuilts exist for Node 26.** **Risk: low** (Mac dev convenience only; cloud is the source of truth).

---

## 1.archive — Prior phases

### v0.5.0 APK + Chrome extension (PIVOTED to Cloudflare Tunnel 2026-05-10)

### Current state (as of 2026-05-10)

v0.4.0 closed 2026-05-09 (tag `v0.4.0`). v0.5.0 began same day with the **LAN-only plan v1.3** (37 tasks, T-0..T-18 shipped). **PIVOTED 2026-05-10** at T-21 gate when user reported macOS firewall configuration was too complex; option menu resolved to Cloudflare **named tunnel** via user's `arunp.in` domain.

**Active plan v2.0 (Cloudflare Tunnel) — drafting in progress:**

- [`docs/plans/v0.5.0-CLOUDFLARE-RESEARCH.md`](./docs/plans/v0.5.0-CLOUDFLARE-RESEARCH.md) (R-CFT, 662 lines) — research spike; verdict PROCEED-WITH-CHANGES; major finding: quick tunnels block SSE, so pivoted to named tunnel.
- [`docs/plans/v0.5.0-CLOUDFLARE-RESEARCH-CRITIQUE.md`](./docs/plans/v0.5.0-CLOUDFLARE-RESEARCH-CRITIQUE.md) (425 lines) — 5 blockers + 4 HIGH + gaps; B-5 ALLOWED_ORIGINS fix absorbed in commit `279ec9c` ahead of plan v2.0.
- [`docs/plans/spikes/`](./docs/plans/spikes/) — 5 spike reports (SPIKE-001..005) written during DNS-propagation waiting window on 2026-05-10.
- **Plan v2.0 document pending** (Stage 3 of planning pipeline).
- DNS propagation for `arunp.in` (GoDaddy → Cloudflare) in flight at 2026-05-10 20:00; completion expected within 30 min.
- Next concrete user action: `brew install cloudflared` after DNS propagates.

**Archived under `docs/archive/v0.5.0-lan-approach/`:**

- v0.5.0-RESEARCH.md (R-0.5.0, LAN-era)
- v0.5.0-RESEARCH-CRITIQUE.md (LAN-era)
- v0.5.0-apk-extension.md (v1.3, final LAN-era plan)
- v0.5.0-apk-extension-REVIEW.md (cross-AI review of v1.1 → v1.1 patches)
- See `docs/archive/v0.5.0-lan-approach/README.md` for pivot rationale.

### Code that survives the pivot (shipped under v1.3, unchanged)

Bearer auth, proxy layered auth, rate limiter, Origin validation (update to named-tunnel origin landed in `279ec9c`), share-handler, dedup, capture endpoints (URL/PDF/note), reachability probe, offline page, QR scanner, keystore pipeline (T-19 + T-20), debug signingConfig in `android/app/build.gradle`.

### Code to delete per pivot (owned by future T-CF-* tasks)

- `src/lib/lan/mdns.ts` + `.test.ts` — T-CF-2
- `bonjour-service` npm dep — T-CF-2
- `src/instrumentation.ts` mDNS wiring — T-CF-2
- `android/app/src/main/res/xml/network_security_config.xml` — T-CF-3
- AndroidManifest `android:networkSecurityConfig` attribute — T-CF-3
- `src/lib/client/reachability-decision.ts` two-probe tree (simplify to single probe) — T-CF-6
- QR schema `ip=` parameter (replace with `url=`) — T-CF-4
- `share-handler.tsx` `getBrainUrl()` Preferences lookup (replace with hardcoded `https://brain.arunp.in`) — T-CF-2 or T-CF-12
- README "Android APK" section — T-CF-10

### Historical (v0.3.1 snapshot, for reference — all closed; see §5)

Full plan: [`docs/plans/v0.3.1-polish.md`](./docs/plans/v0.3.1-polish.md) (v2.0). Critique source: [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md).

### 1a. Polish (carried from v0.3.0)

| ID | Title | Source | Size | Severity | Notes |
|---|---|---|---|---|---|
| F-207 | Library bulk-select UI (multi-select + batch tag/collection/delete) | v0.3.0 scope | M | — | Backend primitives exist; plan §T-B-5. |
| B-301 | Title hyphenation post-processor | v0.3.0 QA finding | S | — | **Heuristic tightened per critique P-1**: fire only on `0 spaces && ≥ 2 hyphens`. |
| F-301 | Wire `CollectionEditor` into item detail | v0.3.0 partial | XS | — | Component exists at [`src/components/collection-editor.tsx`](./src/components/collection-editor.tsx). |
| F-302 | Inline tag editor on item detail | v0.3.1 polish | S | — | Reuse `addTagToItemAction` + `removeTagFromItemAction`. |

### 1b. Hardening (absorbed from 2026-05-08 self-critique)

| ID | Title | Critique ref | Severity | Track |
|---|---|---|---|---|
| F-042 | Bind Next dev server to `127.0.0.1` | A-1 | **P0** | §4A T-A-1 |
| F-043 | Session cookie expiry + `SameSite=Strict` | A-5 | P1 | §4A T-A-8 |
| F-044 | `globalThis` worker-boot guard (HMR-safe) | A-2 | P1 | §4A T-A-3 |
| F-045 | Periodic `sweepStaleClaims()` inside loop | A-3 | P1 | §4A T-A-4 |
| F-046 | Expose `attempts` on enrichment status endpoint | A-4 | P2 | §4A T-A-6 |
| F-047 | Log non-nodejs `instrumentation.ts` branch | A-11 | P2 | §4A T-A-5 |
| F-048 | Force `WAL` + `synchronous=NORMAL` per-connection | A-6 | P1 | §4A T-A-2 |
| F-034 | DB restore script + runbook (promoted from v0.10.0) | A-7 | P1 | §4A T-A-9 |
| F-049 | Exact-pin `sqlite-vec@0.1.6` before R-VEC | A-9 | P1 | §4A T-A-10 |
| F-050 | `data/errors.jsonl` rotation | A-10 | P2 | §4A T-A-11 |
| F-051 | Adopt `node:test` + `npm test` precedent | P-2 | P1 | §4A T-A-7 |
| F-052 | `scripts/smoke-v0.3.1.mjs` end-to-end smoke | P-4 | P1 | §4A T-A-13 |
| F-053 | Bulk actions revalidate `/collections/[id]` + `/settings/tags` | P-6 | P1 | §4B T-B-5b |
| F-054 | Release guard (clean tree + revert rehearsal) | P-12, M-4 | P1 | §4B T-B-6 |
| F-055 | Per-task `RUNNING_LOG.md` breadcrumbs | M-1 | P1 | Cross-cutting (append after every `T-*` commit) |
| F-056 | Refuse PIN overwrite without reset flag | A-12 | P2 | §4A T-A-12 |

### 1c. Deliberately deferred from critique to v0.4.0+

| Critique ref | Why deferred |
|---|---|
| A-8 (FTS5 LIKE fallback cleanup) | Revisit when hybrid search stresses FTS5 in v0.4.0 |
| P-11 (BACKLOG.md §5 archive rotation) | Not urgent before §5 has > ~20 closed items |
| P-5 (plan provenance nits) | Cosmetic; folded into v2.0 plan header |
| M-3 (cross-AI review) | Run if `gsd-review` is available; otherwise user spot-checks |

---

## 2. Research spikes queued

| ID | Question | Blocks | Priority | Plan |
|---|---|---|---|---|
| ~~R-VEC~~ | ~~sqlite-vec perf at 10k+ chunks on M1 Pro~~ | ~~v0.4.0~~ | — | **Closed 2026-05-08 GREEN** — see §5 |
| R-FSRS | SRS algorithm choice (SM-2 / FSRS) | v0.8.0 | P1 | — |
| R-CLUSTER | Topic clustering (JS vs Python vs LLM-only) | v0.6.0 | P2 | — |
| R-YT | yt-dlp reliability on YouTube auto-subs | v0.10.0 | P2 | — |
| R-WHISPER | whisper.cpp vs faster-whisper on M1 Pro | v0.10.0 | P2 | — |
| R-EMBED-QUALITY | `gemini-embedding-001` at 768-dim returns irrelevant high-cosine matches on **generic** English queries against a mixed-language library (Hindi YouTube transcripts + Uber receipt at sim 0.84+ for "what is this about?"). **Down-scoped 2026-05-20:** D-16 retest with content-specific query ("What does Ruben Hassid say about AI learning?") returned the right item at slot 1 — embedding pipeline is fine for content-specific queries. Concern is now scoped to generic-query UX only. Decide: add rerank/hybrid step downstream of vec0, accept the ceiling, or coach users toward content-specific phrasing. Evidence: RUNNING_LOG #48 + #50. | v0.7.x? | P2 | — |

### Open bugs (surfaced post-v0.6.1 ship)

- **BUG-ANTHROPIC-OVERLOAD** *(NEW 2026-05-20, P1)* — Anthropic API returns HTTP 529 `overloaded_error` intermittently from Hetzner (confirmed: 1× 529 + 2× 200 across 3 retries during D-16 verification window). When it hits during a streaming Ask request, `src/lib/llm/anthropic.ts:210` throws `LLMError`; the SSE pipeline emits an `error` frame but the UI hangs on "…" instead of surfacing the error or retrying. Same problem in non-stream path at `src/lib/llm/anthropic.ts:174`. **Fix sketch:** wrap the `if (!res.ok)` block to retry on 529/503/429 with exponential backoff (e.g., 500ms → 2s → 5s, max 3 attempts; respect `Retry-After` header if present). Surface a user-facing "Anthropic is overloaded, try again" if all retries fail. Add tests for retry-then-succeed and retry-then-fail. **Side effect:** this likely also resolves BUG-ENRICH-UNREACHABLE-LOOP for transient 529s. Effort: ≈45–60 min including tests + retry-policy decision. Target: v0.6.2.
- **BUG-RETRIEVE-ITEM** *(needs revalidation)* — Per-item Ask reportedly returns 0 chunks for generic queries (RUNNING_LOG #48 evidence). **Not retested 2026-05-20** — D-16 ran at *library* scope, not item scope. The 0-chunks finding may be a real JOIN bug OR an artefact of generic-query embedding noise (which D-16 confirmed is a real phenomenon). Before treating as a bug to fix: rerun the 3-config probe from #48 with a content-specific query at item scope. If item scope still returns 0 chunks for content-specific queries, the JOIN fix at `src/lib/retrieve/index.ts:99-114` is justified. If it returns chunks, this is a UX issue (coach generic queries) not a bug. Effort: 15 min revalidation + 30 min fix if confirmed. Target: v0.6.2.
- **BUG-ENRICH-UNREACHABLE-LOOP** — `[enrich] LLM provider unreachable; backing off 30000ms` repeats every 1–10 min on Hetzner brain.service. **Root cause confirmed 2026-05-20:** the worker is hitting Anthropic 529 (same as BUG-ANTHROPIC-OVERLOAD) and the error wrapper mislabels 529 as "unreachable." Two-part fix: (a) retry-on-529 in adapter (covered by BUG-ANTHROPIC-OVERLOAD); (b) idle-path log spam — worker shouldn't log "unreachable" every 30s when the library has no eligible items. Pre-existing per backlog §1 "enrichment-worker `isAlive()` 45-min loop fix → open behavior bug, separate." Effort: S (after BUG-ANTHROPIC-OVERLOAD lands).

---

## 3. Open self-critique findings

25 of 35 findings from [`docs/research/SELF_CRITIQUE.md`](./docs/research/SELF_CRITIQUE.md) remain open. Address opportunistically per phase rather than as a dedicated sprint — capture fix commit SHAs in that file, not here.

---

## 4. Ideas / seeds (not scheduled)

| ID | Idea | Notes |
|---|---|---|
| I-01 | Auto-collection suggestion from enrichment tags | Would sit behind a user toggle; needs R-CLUSTER first. |
| I-02 | Per-item "regenerate enrichment" button | Already safe: `enrichItem` is idempotent. UI work only. |
| I-03 | Export Obsidian vault directly (not just zip) | Requires D-4 (Obsidian vault path) — still open. |
| GEMMA-1 | On-device Android summarization via Gemma 4 E4B (or MediaPipe LLM Inference) | Closes the offline-mode unenriched-capture gap exposed by `docs/plans/v0.6.x-offline-mode-apk.md`. **Revisit after** v0.6.x offline ships and dogfooding shows whether unenriched-offline-captures is annoying. Full evaluation: `docs/research/gemma-4-evaluation.md` §4. v0.8.x candidate. |
| GEMMA-2 | T5Gemma 2 structured-output spike (vs Qwen3-8B) | 1-hour low-risk: feed same enrichment prompts; compare JSON-adherence on tag/category/quote fields. Only worth doing if Qwen3 ever produces malformed JSON that breaks the pipeline. See `docs/research/gemma-4-evaluation.md` §3 row D-1. |
| ~~F-057~~ | ~~Audit `sqlite-vec` resolved version on install~~ | **Closed 2026-05-08** under v0.4.0 T-0 (`e8f104a`): pinned to 0.1.9 with explicit overrides for all five platform sub-packages. `npm ls` shows `sqlite-vec-darwin-arm64@0.1.9 overridden`. |

---

## 5. Recently closed

Rotated 2026-05-09 under v0.5.0 T-0. Prior closure sets:

- **v0.4.0 Ask (RAG)** — 21 tasks (T-0..T-19) + T-20 tracker update → [`docs/archive/BACKLOG_ARCHIVE_2026-05-09.md`](./docs/archive/BACKLOG_ARCHIVE_2026-05-09.md)
- **v0.3.1 Polish + Hardening + R-VEC spike + F-057** → [`docs/archive/BACKLOG_ARCHIVE_2026-05.md`](./docs/archive/BACKLOG_ARCHIVE_2026-05.md)

New v0.5.0 closures accumulate below as tasks land (rule of thumb: rotate when this section crosses ~20 items).

### v0.5.0 closures (in progress)

_None yet — T-0 rotation is this commit._

---

## 6. Update rules

1. **Promote:** when an item enters an active phase plan, move its row into that phase's `BUILD_PLAN.md` section and leave a one-line breadcrumb here with a `→ promoted to v0.X.Y` note.
2. **Close:** strike through the row and add closing commit SHA, e.g. `~~F-302~~ Inline tag editor (closed abc1234)`. Move closed items into §5 at next phase rollover.
3. **Defer:** if a planned item is bumped to a later phase, record the new target version and the reason in a nested bullet.
4. **Never delete rows** — history matters for retrospectives.
