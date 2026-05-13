# M1 — Architecture

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/01_Architecture.md`
**Baseline:** full — stands alone
**Scope:** pre-v0.6.0 (current prod) + post-v0.6.0 (target) + **the new offline outbox layer (lane L, v0.6.x)**
**Applies to:** both lanes
**Status:** COMPLETE (documentation)

> **For the next agent:** AI Brain has THREE architectural states to keep in your head: (1) **pre-v0.6.0** = what runs on the Mac today. (2) **post-v0.6.0** = the target Hetzner cloud architecture. Lane C is migrating between these. (3) **v0.6.x offline mode** = a fully orthogonal Lane L feature that adds a per-device IDB outbox for shares that can't immediately reach the server. The offline mode survives the v0.6.0 cutover unchanged because it speaks to `/api/capture/{url,note,pdf}` and those endpoints carry over. When code and docs disagree, code wins — flagged inline with `**(SoT: code)**`.

---

## 1. One-paragraph summary

AI Brain is a **local-first personal knowledge app** combining Recall.it (article/link save, search) and Knowly (Q&A against your library) into one tool. Built with Next.js 16, better-sqlite3, sqlite-vec, and Ollama for local LLM/embeddings. Two clients: a Capacitor Android APK and a Chrome MV3 extension, both authenticated via a shared-secret bearer token and reachable over a Cloudflare Named Tunnel (`brain.arunp.in`). Single user. No multi-tenancy. As of v0.5.5 the APK ships with a per-device IDB outbox so shares survive offline, server-down, and tunnel-down conditions; queued items drain on connectivity-regain / app-foreground / 30s tick. Lane C is in parallel preparing to move the backend from Mac to Hetzner Helsinki (v0.6.0 cloud).

## 2. Tech stack (pre-v0.6.0 — current prod, unchanged from v4 baseline)

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 20.x | `.nvmrc` not enforced; user runs system node |
| Framework | Next.js | 16.x (app router) | standalone build for APK + local dev |
| UI | React | 19.2.4 | Radix + shadcn; Inter/JetBrains Mono self-hosted |
| DB | SQLite (better-sqlite3) | 11.x | WAL mode, ~180 KB live |
| Vector | sqlite-vec extension | 0.1.9 | 768-dim `chunks_vec` virtual table |
| LLM (Ask) | Ollama (qwen3:8b) | local | SSE streaming via `/api/ask/stream` |
| LLM (enrich) | Ollama (qwen3:8b) | local | one-shot; queue in `enrichment_jobs` |
| Embeddings | Ollama (`nomic-embed-text`) | local | 768-dim, 137M params |
| Auth | Bearer token | custom | 32-byte hex, rotatable via `/settings/lan-info` |
| Android | Capacitor | 8.3.3 | APK sideloaded; WebView over tunnel |
| Chrome | MV3 extension | — | host permissions bypass CORS; Vite + @crxjs |
| Tunnel | Cloudflare Named Tunnel | cloudflared 2024.x | `brain.arunp.in` → `http://127.0.0.1:3000` |
| Backup | Node-internal every 6h → `data/backups/` | — | `src/db/client.ts` scheduler |
| Host | Mac (M1 Pro / 32GB / 455GB free) | — | `npm run start` + launchd cloudflared daemon |

## 3. v0.6.x offline mode additions (NEW this session — Lane L)

### 3.1 What it is

A per-device IndexedDB outbox + JS retry orchestrator that intercepts every Android share-target intent (URL, note, PDF) and guarantees the share is captured even when offline / Mac asleep / cloudflared down / 5xx. Every queued item retries on:

1. `@capacitor/network` `networkStatusChange` to connected
2. `visibilitychange` event when the WebView returns to foreground (Capacitor share-target's app-resume fires this)
3. 30s in-app interval (only ticks while WebView is unfrozen)
4. User-driven "Sync now" button on `/inbox`

Out of scope by design: **background drain when the app is closed**. The Brain WebView gets frozen by Android within ~30s of background. v0.7.x WorkManager closes that gap (see `docs/plans/v0.7.x-offline-workmanager-roadmap.md`).

### 3.2 Component map

| Module | Purpose | LOC | Tests | SoT |
|---|---|---|---|---|
| `src/lib/outbox/types.ts` | OutboxEntry discriminated union (`url \| note \| pdf`) | 64 | (typed by storage tests) | code |
| `src/lib/outbox/storage.ts` | `idb`-backed CRUD, init lifecycle, QuotaWarning pre-flight | 196 | 23 | code |
| `src/lib/outbox/dedup.ts` | per-kind content_hash + URL normalize incl. YouTube canonicalization | 179 | 32 | code |
| `src/lib/outbox/backoff.ts` | exponential schedule + jitter + 1-hr cap + Retry-After parser | 104 | 14 | code |
| `src/lib/outbox/classify.ts` | maps ProbeOutcome → Disposition (synced/transient/stuck) | 137 | 17 | code |
| `src/lib/outbox/sync-worker.ts` | orchestrator: snapshot read, classify, applyDisposition, write | 210 | 19 | code |
| `src/lib/outbox/sha256-worker.ts` | Web Worker for PDF SHA-256 (off main thread) | 110 | 6 | code |
| `src/lib/outbox/pdf-hash.ts` | main-thread driver with Worker + inline fallback | 116 | 5 | code |
| `src/lib/outbox/pdf-storage.ts` | Capacitor Filesystem write/read/delete for PDF bytes | 179 | 11 | code |
| `src/lib/outbox/transport.ts` | per-kind fetch wrappers + multipart for PDF | 209 | 11 | code |
| `src/lib/outbox/triggers.ts` | Capacitor Network listener + visibilitychange + 30s tick | 141 | (manual) | code |
| `src/lib/outbox/notifications.ts` | 0→≥1 stuck transition notification + 30s debounce | 188 | 14 | code |
| `src/lib/outbox/toast.ts` | zero-dep position:fixed DOM toast for "Saved offline" | 89 | (manual) | code |
| `src/lib/auth/api-version.ts` | server-side `X-Brain-Client-Api: 1` validator | 43 | 6 | code |
| `src/components/outbox-badge.tsx` | sidebar nav-bar pill (queued + stuck count) | 105 | (manual) | code |
| `src/app/inbox/inbox-client.tsx` | grouped /inbox UI with Retry/Discard/Sync-now + a11y | 272 | (manual) | code |
| `src/app/inbox/page.tsx` | server-component thin wrapper for `<InboxClient />` | 15 | (manual) | code |
| `src/app/debug/quota/quota-probe.tsx` | OFFLINE-PRE device probe (storage/SW/Worker availability) | 280 | (manual) | code |
| `src/app/debug/quota/page.tsx` | server-component wrapper for the probe | 45 | (manual) | code |
| `src/lib/capture/youtube-url.ts` | extracted pure URL helpers (no jsdom) | 38 | (transitive via dedup tests) | code |

**Total:** ~3500 LOC of source + ~3500 LOC of tests + matrix + plans.

### 3.3 Data flow

```mermaid
graph TB
    subgraph apk[Android APK — Capacitor 8 WebView]
        SHARE[Capacitor share-target<br/>plugin]
        HANDLER[share-handler.tsx]
        OUTBOX[(IndexedDB<br/>brain-outbox)]
        FS[(App-private filesystem<br/>outbox-pdfs/)]
        WORKER[Web Worker<br/>sha256-worker.ts]
        TRIGGERS[triggers.ts<br/>foreground / network / 30s]
        SYNC[sync-worker.ts<br/>orchestrator]
        TRANSPORT[transport.ts<br/>kind-multiplexer]
        NOTIF[notifications.ts<br/>local-notifications plugin]
        BADGE[outbox-badge.tsx]
        INBOX[/inbox client/]
    end

    subgraph mac[Mac server / future Hetzner]
        ROUTES[/api/capture/url<br/>/api/capture/note<br/>/api/capture/pdf]
        VERSION[api-version.ts<br/>X-Brain-Client-Api check]
        CAPTURE[capture pipeline<br/>readability / unpdf / innertube]
        ITEMS[(SQLite items)]
    end

    SHARE --> HANDLER
    HANDLER -->|hash + dedup| OUTBOX
    HANDLER -->|PDF bytes| FS
    HANDLER -->|PDF bytes| WORKER
    WORKER -->|hex digest| HANDLER

    TRIGGERS -->|drainOnce| SYNC
    SYNC -->|listByStatus queued| OUTBOX
    SYNC --> TRANSPORT
    TRANSPORT -->|reads bytes for PDF| FS
    TRANSPORT -->|fetch + JSON parse| ROUTES
    ROUTES --> VERSION
    VERSION -->|accept or 422 version_mismatch| CAPTURE
    CAPTURE --> ITEMS
    SYNC -->|update row state| OUTBOX
    SYNC -->|on stuck count change| NOTIF

    OUTBOX --> BADGE
    OUTBOX --> INBOX
    INBOX -->|Sync now| SYNC
```

### 3.4 Lifecycle invariants

1. **Outbox-init resolves BEFORE share-handler listener attaches.** `src/components/share-handler.tsx` uses an explicit Promise gate (plan v3 §5.10 / B-5 race fix). Cold-start shares land at a ready outbox.
2. **Snapshot semantics in syncOnce.** `listByStatus(db, 'queued')` is called once at trigger time. Items enqueued during the run join the next cycle, not the current snapshot. (plan v3 §5.8 / C-4)
3. **`attempts` resets to 0 on `synced`.** (plan v3 §4.3 / B-7)
4. **`synced` rows retained indefinitely** until user discard (plan v3 §4.4). PDF bytes ARE deleted on sync — only metadata row remains, which is small.
5. **PDF bytes on filesystem, not IDB.** `src/lib/outbox/pdf-storage.ts` writes to `Directory.Data/outbox-pdfs/<rowId>__<safeName>` (plan v3 §5.1).
6. **Quota pre-flight at usage/quota > 0.95.** `putEntry` throws `QuotaWarning`; share-handler catches → "Storage almost full" toast (plan v3 §5.9 / C-3).
7. **`X-Brain-Client-Api: 1` header on every outbox POST.** Missing = accept (back-compat). Mismatch = 422 with `code: version_mismatch` → row goes stuck:version_mismatch with "Update Brain" copy (plan v3 §5.5).

### 3.5 Status state machine

```
                                   ┌─────────────┐
            (silent no-op)         │             │
        ┌─────────────────────────►│  duplicate  │ (auto-deleted after 1 hr)
        │                          │             │
        │                          └─────────────┘
        │
[enqueue] ──► queued ──► [classify=transient] ──► queued (next_retry_at += backoff)
                  │
                  ├───► [classify=synced]    ──► synced  (attempts=0; PDF file deleted; retained until discard)
                  │
                  └───► [classify=stuck]     ──► stuck   (notification fires on 0→≥1 transition)
                                                  │
                                                  ├───► [user Retry] ──► queued (next_retry_at = now)
                                                  │
                                                  └───► [user Discard] ──► (deleted from IDB + filesystem)
```

`pending` from earlier drafts of plan v3 was dropped. **Five outbox states total: queued / synced / stuck / duplicate / `pending` is internal-only.** Per plan §10 v3 / C-6 — UI shows only 4 states.

## 4. Tech stack (post-v0.6.0 — target, unchanged from v4 baseline)

| Layer | Change | New choice | Source spike |
|---|---|---|---|
| Host | Mac → cloud VM | Hetzner CX23 Helsinki (€4.99 + €0.55 IPv4 = ~$5.59/mo) | `docs/research/budget-hosts.md` |
| LLM (Ask) | Ollama → Anthropic | Claude Sonnet 4.6 via realtime streaming | `docs/research/ai-provider-matrix.md` |
| LLM (enrich) | Ollama → Anthropic | Claude Haiku 4.5 via Batch API (daily 3 AM UTC) | `docs/research/enrichment-flow.md` |
| Embeddings | Ollama → Gemini | Google `text-embedding-004` free tier | `docs/research/embedding-strategy.md` |
| Backup | Local-only → Backblaze B2 | cron + rclone, gpg-encrypted client-side | `docs/plans/spikes/v0.6.0-cloud-migration/S-7-MIGRATION-RUNBOOK.md` |
| Enrichment trigger | Auto on capture → daily batch + manual button | node-cron + Batch API | S-3 |

**Unchanged:** Next.js, SQLite schema, bearer auth, Cloudflare tunnel (same `brain.arunp.in`), APK + extension. **Critically: the offline-mode contract on the three capture routes (X-Brain-Client-Api header + Origin validation + bearer) MUST be preserved by Lane C through the v0.6.0 cutover.**

## 5. System topology diagram (full)

```mermaid
graph TB
    subgraph clients[Clients]
        APK[Android APK<br/>Capacitor 8.3.3<br/>v0.5.5 with outbox]
        EXT[Chrome MV3<br/>Extension<br/>v0.5.1]
        WEB[Browser<br/>direct URL]
    end

    subgraph apk_internal[APK internal v0.5.5]
        OUTBOX[(IDB outbox<br/>brain-outbox)]
        FS[(Filesystem<br/>outbox-pdfs/)]
        TRIGGERS[Triggers]
    end

    subgraph cloudflare[Cloudflare]
        TUNNEL[Named tunnel<br/>brain.arunp.in]
    end

    subgraph mac[Mac M1 Pro — current prod]
        NEXT[Next.js 16<br/>app router]
        PROXY[proxy.ts<br/>bearer + version check]
        ROUTES[/api/capture/*]
        SQLITE[(SQLite + sqlite-vec)]
        OLLAMA[Ollama local<br/>qwen3:8b + nomic-embed-text]
        BACKUPS[(data/backups/)]
    end

    subgraph hetzner[Hetzner Helsinki — POST v0.6.0]
        NEXT_CLOUD[Next.js 16<br/>same code]
        ANTHROPIC[Anthropic API<br/>Sonnet 4.6 + Haiku 4.5]
        GEMINI[Gemini API<br/>text-embedding-004]
        SQLITE_CLOUD[(SQLite + sqlite-vec)]
        B2[(Backblaze B2<br/>gpg-encrypted)]
    end

    APK -->|share-handler| OUTBOX
    APK -->|PDF bytes| FS
    OUTBOX --> TRIGGERS
    TRIGGERS -->|fetch with X-Brain-Client-Api| TUNNEL
    EXT -->|fetch with bearer| TUNNEL
    WEB -->|cookie session| TUNNEL

    TUNNEL -.->|current| NEXT
    TUNNEL -.->|post-v0.6.0| NEXT_CLOUD

    NEXT --> PROXY
    PROXY --> ROUTES
    ROUTES --> SQLITE
    ROUTES --> OLLAMA
    NEXT --> BACKUPS

    NEXT_CLOUD --> ANTHROPIC
    NEXT_CLOUD --> GEMINI
    NEXT_CLOUD --> SQLITE_CLOUD
    SQLITE_CLOUD -.->|nightly cron| B2
```

## 6. Source-of-truth (SoT) reconciliation

| Topic | Doc claim | Code reality | SoT |
|---|---|---|---|
| Outbox states | plan v3 §4.3 lists 5 statuses | `OutboxStatus` type at `src/lib/outbox/types.ts:18` exposes 4 (`queued/synced/stuck/duplicate`); `pending` was dropped | **code** |
| URL canonicalization | plan v3 §5.2 says "strips utm_*, fbclid, gclid, ref, source, fragments" | `STRIP_PARAM_NAMES` at `src/lib/outbox/dedup.ts:42` adds `mc_eid`, `mc_cid`, `_hsenc`, `_hsmi`, `ck_subscriber_id` | **code** (broader) |
| Backoff math | plan v3 §5.3 schedule says "attempt 9+ → +3600s" | `baseDelayMs` at `src/lib/outbox/backoff.ts:36` matches the table; the pure-exponential math would only hit cap at attempt 10 — code clamps at 9 explicitly per plan literal | matches |
| YouTube dedup | plan v3 §5.2 calls only generic param-stripping | `normalizeUrlForDedup` at `src/lib/outbox/dedup.ts:55-58` short-circuits any recognized YouTube variant to canonical watch?v= form first | **code** (closes a gap plan didn't call out) |
| Web Worker bundling | plan v3 §5.2 assumes Worker available | `pdf-hash.ts:31-58` has explicit inline-fallback path; OFFLINE-PRE probe at `/debug/quota` measures availability | **code** (probe-driven) |
| `package.json` version | v3 plan §13.2 says "0.5.5 patch tag" was REMOVED; correct text is "no git tag" | `package.json` shows version 0.5.5; no git tag created | matches |
| `@capacitor/app` plugin | plan v3 §7 commit 6 lists `@capacitor/network` only | code uses `visibilitychange` browser fallback for foreground; `@capacitor/app` not installed | matches (intentional defer) |
| YouTube URL parsing | `src/lib/capture/youtube.ts` was the canonical place | Pure helpers extracted to `src/lib/capture/youtube-url.ts` after `4a6548a` build fix; `youtube.ts` re-exports for back-compat | **code** |

## 7. Branch topology

| Branch | Purpose | Latest commit | Ahead of `origin/main` | Status |
|---|---|---|---|---|
| `main` | Trunk | (last known: `cee808c` v0.5.1 ship) | 0 | static; awaiting Lane L push + merge |
| `lane-c/v0.6.0-cloud` | Lane C cloud migration | (last known: `60481fb` per v4 baseline) | unknown — fetch + check | Lane C unchanged this session |
| `lane-l/feature-work` | Lane L feature development | `4a6548a` (today's last commit) | **+40 commits** (16 unpushed) | active; offline mode complete |

**Catch-up command for the next agent:**
```bash
git fetch origin
git log origin/main..HEAD --oneline | head -20   # what your lane has uncommitted to main
git log HEAD..origin/main --oneline | head       # what main has that you don't (rebase if any)
```

## 8. What's NOT in this architecture

- **No iOS.** Capacitor supports it; no iOS target in scope.
- **No multi-device sync.** Single Pixel + single Mac. Outbox is per-device IDB.
- **No background drain when app closed.** v0.7.x WorkManager. See M9 + roadmap doc.
- **No notification action buttons.** Tap-only routes to `/inbox` via `notification.extra.route`.
- **No conflict resolution.** First-writer-wins on server dedup; same-URL-twice-offline collapses at server.
- **No outbox encryption-at-rest.** Android app-private storage handles isolation.
- **No Service Worker / Workbox path.** OFFLINE-1A spike rejected Workbox on schema-ownership grounds (v0.7.x WorkManager bridge needs to read the same IDB schema from native).

## 9. Cross-references

- `docs/plans/v0.6.x-offline-mode-apk.md` v3 — driver of the offline architecture
- `docs/plans/v0.7.x-offline-workmanager-roadmap.md` — what v0.7.x adds on top
- `docs/research/offline-queue-prior-art.md` — why we rejected Workbox / redux-offline / background-runner
- `RUNNING_LOG.md` 31st entry — narrative of the 16 commits
- M2 (Systems and Integrations) — the 3 new Capacitor plugins this layer added
- M4 (Roadmap) — OFFLINE-* status table
