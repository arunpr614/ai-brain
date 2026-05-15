# AI Brain: Systems and integrations (handover — 2026-05-14)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 14, 2026 |
| **Previous version** | [Handover_docs_12_05_2026/02_Systems_and_Integrations.md](../Handover_docs_12_05_2026/02_Systems_and_Integrations.md) (v1.0) |
| **Baseline** | [Handover_docs_12_05_2026/](../Handover_docs_12_05_2026/) (**v1**) |

> **For the next agent:** This file maps every code surface each lane touched + the runtime/external systems involved. Use it before merging to predict where conflicts could surface, and after merging to validate everything still binds together.

## 1. Runtime stack (current — pre-collapse, pre-v0.6.0 cutover)

| Layer | Technology | Where it runs |
|-------|------------|---------------|
| Node.js | 20.x | Mac (dev + prod) |
| Next.js | 15 (app router) | Mac, port 3000 |
| Database | better-sqlite3 11.x + sqlite-vec extension | Mac, `data/*.sqlite` |
| LLM (Ask + enrich) | Ollama qwen2.5:7b | Mac, port 11434 |
| Embeddings | Ollama nomic-embed-text | Mac, port 11434 |
| Tunnel | Cloudflare Named Tunnel `brain.arunp.in` | cloudflared launchd service on Mac |
| Android client | Capacitor 8 APK | sideloaded on Pixel + AVD |
| Browser client | Chrome MV3 extension | Chrome (any) |
| Service worker | `public/sw.js` (app-shell precache) | served from Next.js root | **NEW from Lane L v0.5.6** |
| Offline outbox | IndexedDB via `src/lib/outbox/` | client (browser + APK) | **NEW from Lane L v0.5.5** |

## 2. Components / services

Per-lane code surfaces — what files each lane touched. After the merge, all of these coexist in `main`.

### 2.1 Lane C surface (4 commits, mostly docs)

| Component | Role | External APIs | Persistent state |
|-----------|------|---------------|------------------|
| `Handover_docs/Handover_docs_12_05_2026/` | Baseline handover package (10 files) | none | none |
| `Handover_docs/Handover_docs_14_05_2026_LANE/` | This package + `HANDOVER.md` | none | none |
| `docs/plans/v0.6.0-cloud-migration.md` | Implementation plan v1.0 (50 tasks) | none | none |
| `docs/plans/v0.6.0-cloud-migration-RESEARCH-PROGRAM.md` | Research scope | none | none |
| `docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md` | Cutover mechanics | none | none |
| `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md` | Lane contract | none | none |
| `docs/plans/LANE-L-BOOTSTRAP.md` | Lane L kickoff doc | none | none |
| `docs/research/ai-provider-matrix.md` | Anthropic vs Gemini vs OpenAI matrix | none | none |
| `docs/research/openrouter-provider-evaluation.md` | OR evaluation (1700+ words) | none | none |
| `docs/research/embedding-strategy.md` | Embedding provider lock | none | none |
| `docs/research/enrichment-flow.md` | Daily batch flow design | none | none |
| `docs/research/budget-hosts.md` + `budget-hosts-v2-under-5.md` | Budget host research | none | none |
| `docs/research/cloud-host-matrix.md` | Cloud host matrix | none | none |
| `docs/research/v0.6.0-cost-summary.md` | Cost rollup ($5.85/mo) | none | none |
| `docs/research/free-tier-architecture-redesign.md` + 2 hybrid + critique docs | Free-tier exploration (rejected) | none | none |
| `docs/research/privacy-threat-delta.md` | S-8 privacy posture | none | none |
| `docs/research/brain-usage-baseline.md` | S-1 usage data | none | none |
| `RUNNING_LOG.md` | +3 [Lane C] entries | none | append-only |
| Hetzner CX23 box `204.168.155.44` | Hardened, idle, no services running | none | filesystem only |

### 2.2 Lane L surface (51 commits, code + plans + releases)

| Component | Role | External APIs | Persistent state |
|-----------|------|---------------|------------------|
| `src/lib/outbox/` (new dir) | IndexedDB outbox: schema, dedup, classifier, backoff, types, triggers | none (client-only) | IndexedDB `brain-outbox` store |
| `src/lib/queue/sync-worker.ts` (new) | Outbox orchestrator | `/api/capture/url`, `/api/items` | none |
| `src/lib/queue/enrichment-worker.ts` (modified +18 lines) | Enrichment queue | Ollama | `enrichment_jobs` table |
| `src/app/inbox/` (new) | Outbox UI page + nav badge | `/api/items` | reads outbox |
| `src/app/api/health/route.ts` (modified) | Health endpoint | none | none |
| `src/lib/sw/registration.ts` (new) | Service worker registration | none | navigator.serviceWorker |
| `public/sw.js` (new) | App-shell service worker | none | CacheStorage `brain-app-shell-v1` |
| `public/offline.html` (new) | Offline fallback page | none | static |
| `src/proxy.ts` (modified) | `/sw.js` auth bypass | none | none |
| `extension/` (multiple files modified) | Chrome MV3 extension polish | none | extension storage |
| `android/` (gradle + capacitor sync output) | APK build pipeline | none | n/a |
| `scripts/` (CDP inspector, smoke tests) | Dev tooling | Chrome DevTools Protocol | none |
| `src/db/migrations/008_*.sql` and earlier | DB schema | sqlite | DB schema |
| `src/db/migrations/009_edges.sql` (UNTRACKED in `stash@{3}`) | Graph view edges table | sqlite | DB schema |
| `docs/plans/v0.5.6-app-shell-sw*.md` | v0.5.6 plan (4 versions) | none | none |
| `docs/plans/v0.6.x-augmented-browsing.md` (v1+v2) | AB plan | none | none |
| `docs/plans/v0.6.x-graph-view.md` (v1, v2 pending) | Graph view plan | none | none |
| `docs/plans/v0.6.x-offline-mode-apk.md` (v1+v2+v3) | Offline plan | none | none |
| `docs/plans/v0.7.x-offline-workmanager-roadmap.md` | v0.7.x roadmap | none | none |
| `docs/research/automate-webview-devtools-from-claude-code.md` + 5 others | Lane L research | none | none |
| `package.json` (version bumps) | v0.5.4 → v0.5.5 → v0.5.6 | none | none |
| `CHANGELOG.md` | Release notes | none | none |
| `Handover_docs/Handover_docs_13_05_2026/` (Lane L's own snapshot) | Lane L handover | none | none |
| `RUNNING_LOG.md` | +N entries from Lane L work | none | append-only |

## 3. External services matrix (post-collapse, pre-v0.6.0 cutover — unchanged from baseline)

| Service | Purpose | Config / secret names |
|---------|---------|----------------------|
| Cloudflare | Named Tunnel `brain.arunp.in` → Mac:3000 | `~/.cloudflared/<tunnel-id>.json`, `~/.cloudflared/config.yml` |
| Ollama (local) | Local LLM + embeddings | `OLLAMA_HOST` (default `http://localhost:11434`), `OLLAMA_DEFAULT_MODEL` |
| Hetzner Cloud | CX23 Helsinki VM (idle) | SSH key `~/.ssh/ai_brain_hetzner`; root password rotated, sshd hardened |

> Secret names only — never paste values. See [`03_Secrets_and_Configuration.md`](./03_Secrets_and_Configuration.md).

## 4. New external services introduced by v0.6.0 plan (committed but not yet wired)

These are documented in `docs/plans/v0.6.0-cloud-migration.md` (committed in `c2a71a4`). They are **not active** — the plan is in draft, awaiting Stage 4 review.

| Service | Purpose | Config / secret names | Status |
|---------|---------|----------------------|--------|
| Anthropic API | Haiku 4.5 batch enrichment + Sonnet 4.6 streaming Ask | `ANTHROPIC_API_KEY` | Account not yet created |
| OpenRouter | Standby for Anthropic; future model swap target | `OPENROUTER_API_KEY` | User has key; not yet set in `.env` |
| Google AI Studio | Gemini text-embedding-004 (free tier) | `GEMINI_API_KEY` | Not yet created |
| Backblaze B2 | gpg-encrypted SQLite backups | `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME` | Not yet created |

> All "Status: not yet created" items are Phase D-1..D-5 tasks in the v0.6.0 plan.

## 5. API surfaces / internal contracts

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/api/capture/url` | Bearer | Article + YouTube capture; touched by Lane L outbox |
| `POST` | `/api/ask/stream` | Bearer | SSE streaming; will switch from Ollama to Anthropic in Phase B |
| `POST` | `/api/items/[id]/enrich` | Bearer | Manual "Enrich now" trigger; Lane L modified body, Phase C will add factory call |
| `GET` | `/api/health` | None (public) | Lightweight; touched by Lane L (`fix(proxy): allow /sw.js to bypass auth gate`) |
| `GET` | `/sw.js` | None (public) | Service worker; new from Lane L v0.5.6 |
| `GET` | `/inbox` | Bearer | Outbox UI; new from Lane L v0.5.5 |
| `GET` | `/settings/lan-info` | Bearer | Bearer + tunnel info; QR pairing |

After the merge, all of these need to keep working. Validation steps in [`07_Deployment_and_Operations.md §4`](./07_Deployment_and_Operations.md).

## 6. Optional / ancillary components

| Component | Role | Required? |
|-----------|------|-----------|
| `scripts/cdp-inspector.ts` | CDP automation for WebView debugging (Lane L) | Optional (dev-only) |
| `Recall_import/` (separate dir) | One-shot Lenny PDF importer (already used) | Archive (1,116 PDFs imported 2026-04-25) |
| `SwiftBar/brain-health.30s.sh` | Mac menu-bar health monitor | Optional; symlink, currently in `stash@{1}` |

## 7. Cross-links

- [`01_Architecture.md`](./01_Architecture.md) — branch topology and divergence
- [`03_Secrets_and_Configuration.md`](./03_Secrets_and_Configuration.md) — secret names referenced above
- [`Handover_docs_12_05_2026/02_Systems_and_Integrations.md`](../Handover_docs_12_05_2026/02_Systems_and_Integrations.md) — pre-Lane-L baseline
