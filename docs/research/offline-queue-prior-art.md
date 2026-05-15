# Offline Queue — Prior Art Spike (OFFLINE-1A)

**Date:** 2026-05-13
**Author:** Lane L (AI agent)
**Plan:** `docs/plans/v0.6.x-offline-mode-apk.md` v3.0, commit OFFLINE-1A
**Predecessor:** OFFLINE-PRE (`/debug/quota` route shipped in `a5aeb38`; not yet run on device — see §6 conditional outcomes)

> **Verdict (TL;DR):** roll-own with `idb` (~1.19 KB brotli wrapper) is the recommended primary. **Workbox `Queue` is rejected as primary** even if Service Workers are available, because v3 plan §4.10 needs the v0.7.x WorkManager bridge to read a schema we own. `redux-offline` and Capacitor `background-runner` are both eliminated for objective reasons (archive, missing capability). This decision is **not contingent on OFFLINE-PRE** results — see §6.

---

## §1. Candidates evaluated

| Library | Status |
|---|---|
| **`idb`** (Jake Archibald's IndexedDB wrapper) | candidate — primary recommendation |
| **`workbox-background-sync`** (Google) | candidate — conditionally viable, rejected on architecture grounds |
| **`@redux-offline/redux-offline`** | **eliminated** — archived 2026-04-01, last release 2020-05-21, requires Redux (not in stack) |
| **`@capacitor/background-runner`** (official Capacitor plugin) | **eliminated as outbox primary** — does NOT execute when app is fully closed; only backgrounded. Same constraint as plain WebView. **Tracked in §5 as v0.7.x reference** for the WorkManager replacement evaluation. |
| **`@capacitor-community/background-runner`** | repository 404 in 2026-05; appears renamed/superseded by the official Capacitor plugin above. Eliminated. |

Sources: each library's official docs / npm page / GitHub readme, fetched 2026-05-13.

---

## §2. `idb` (primary recommendation)

### What it is

> "Tiny (~1.19 kB brotli'd) library that mostly mirrors the IndexedDB API, but with small improvements" — Jake Archibald.

Wraps the native IDB API in promises with a strongly-typed `DBSchema` interface for compile-time safety on store names, key paths, and indexes.

### Fit for v3 plan

| v3 requirement | `idb` fit |
|---|---|
| TypeScript schema (§4.3 discriminated union) | Strong — `DBSchema` enforces store name + key + value type |
| Versioned migrations | Built-in — `openDB(name, version, { upgrade })` |
| Atomic transactions | Built-in — `db.transaction([stores], 'readwrite')` |
| Indexes (by status, created_at, content_hash) | First-class — `store.createIndex('by_status', 'status')` |
| Tests via `fake-indexeddb` | Compatible — `idb` is just promises over native IDB |
| Bundle cost | 1.19 KB brotli — negligible |
| TS support | Fully typed |
| Maintenance | 195 commits, 7.3k★, active in 2026 |

### Mapping to plan §7 commits

- **OFFLINE-1B** uses `openDB('brain-outbox', 1, { upgrade })` to create the `outbox` store + three indexes.
- **OFFLINE-2** dedup keys query `store.index('by_content_hash').get(...)`.
- **OFFLINE-3** sync-worker iterates queued entries via `store.index('by_status').iterate('queued')`.

No abstraction layer above `idb` is needed — the wrapper is already minimal. Plan §4.3 schema lands directly as a `DBSchema` interface.

### Trade-offs accepted

- We write our own retry/backoff/dedup logic. ~150–250 LOC across three files (`storage.ts`, `dedup.ts`, `backoff.ts`, `classify.ts`).
- We own the IDB schema → no v0.7.x WorkManager (§4.10) compatibility risk.
- No automatic queue-replay-on-SW-startup — we trigger replay explicitly from `triggers.ts` (§5.4 / OFFLINE-4).

### Cost estimate

~250 LOC implementation + ~200 LOC tests across OFFLINE-1B / OFFLINE-2 / OFFLINE-3. Well-scoped per the v3 commit table.

---

## §3. `workbox-background-sync` (rejected)

### What it offers

A `Queue` class that persists failed requests to an IDB store managed internally and replays them on Service Worker startup or via the BackgroundSync API where available. Intended primary use is to wrap `fetch` interception inside a Service Worker.

### Why it fails the v3 architecture even if Service Workers are available

**Reason 1 — schema ownership for v0.7.x WorkManager bridge (§4.10).** The v3 plan commits to an Option A → Option C upgrade where a native Kotlin worker reads the same IDB outbox the WebView writes. If Workbox owns the schema, the v0.7.x WorkManager either has to (a) reverse-engineer Workbox's internal `StorableRequest` format and per-version migrations, or (b) duplicate every entry into a parallel store we own. Both are worse than just owning the schema from day one. Plan §4.10 explicitly states "the v3 outbox schema and orchestrator are reused unchanged when WorkManager lands — no schema migration on the Option A → C transition." Workbox makes that promise impossible to keep.

**Reason 2 — share-handler model is "we have a payload, send it later," not "intercept fetch."** Workbox's strength is route-based interception: register a route, let SW catch failed `fetch()`, queue it. Our share-handler already has the payload in JS by the time it decides to enqueue (post-dedup, post-storage-pre-flight). We'd be calling `queue.pushRequest({ request })` directly — using maybe 30% of Workbox's surface and inheriting 100% of its dependency footprint and SW-binding constraints.

**Reason 3 — captive-portal classifier (v3 §5.3 B-3 fix) is non-trivial in Workbox.** The plan requires that a 200-OK response with non-JSON body is classified as transient (captive portal proxies). Workbox's default Queue treats any successful HTTP response as success and removes the request from the queue. We'd have to subclass and override `onSync` to inspect response bodies. At that point we've reimplemented 80% of `sync-worker.ts` inside a Workbox extension.

**Reason 4 — the LOC savings would be marginal.** Workbox replaces roughly the orchestration loop and the IDB persistence (~80 LOC of `sync-worker.ts` + `storage.ts`). It does NOT replace dedup, classifier, backoff math, status state machine, or Web Worker SHA256 — those are >70% of the offline code by line count.

### When Workbox would be the right answer

If we were building a generic "wrap all `fetch()` and retry on failure" feature for a PWA — i.e., the typical Workbox use case — the answer would flip. But our share-handler is a single, well-defined enqueue point with kind-specific dedup keys and status semantics that aren't expressible in Workbox's request-centric model.

### What this means for OFFLINE-PRE Q5/G5

- **If OFFLINE-PRE confirms Service Workers ARE available in Capacitor WebView:** Workbox is still rejected per the four reasons above. Q5 from v2 §11 ("If the spike concludes Workbox bg-sync covers ~70% of the use case, are you OK adopting it?") is now answered NO regardless. The v3 §0.1 default of "OFFLINE-PRE spike resolves first" is satisfied by this spike's reasoning, not by SW availability data.
- **If OFFLINE-PRE confirms Service Workers are NOT available:** Workbox was already eliminated by missing capability. Both branches converge on the same answer.

---

## §4. `@redux-offline/redux-offline` (eliminated)

| Criterion | Verdict |
|---|---|
| Maintenance | Archived 2026-04-01; read-only on GitHub |
| Last release | v2.6.0, 2020-05-21 (~6 years stale) |
| Stack fit | Requires Redux; Brain has no Redux store |
| TS support | Loose; written against pre-modern Redux types |

Eliminated. Not evaluated further.

---

## §5. `@capacitor/background-runner` (eliminated as outbox primary; tracked for v0.7.x)

### What it does

Capacitor official plugin (different from the community variant whose repo 404'd). Provides a custom headless JS environment for code that runs while the app is **backgrounded**. NOT the same as code that runs while the app is **closed**.

### Why it doesn't fix the v3 problem

Plan §3.1 (rewritten in v3 for honesty): the WebView freezes within ~30s of leaving foreground. We need code that runs while the app is closed/frozen. `background-runner`'s docs explicitly state:

> Works while app is **backgrounded only** — "not long lived" and "state is not maintained between calls" — Cannot execute when app is fully closed.

This delivers the same guarantees as plain WebView with timer-based retries. It does NOT deliver the subway story that v0.7.x WorkManager promises.

### Other constraints if we did adopt it

- Android: 15-min minimum periodic interval (same as WorkManager limit).
- Custom JS runtime — cannot import our existing `idb` / fetch-based code without conditional builds.
- iOS: ~30 sec runtime per invocation; not relevant for Brain (no iOS target) but explains why the plugin is general-purpose, not for our use case.

### v0.7.x relevance

Tracked in plan §4.10 as a candidate for the WorkManager bridge **plugin layer** — not as a replacement for WorkManager. If the v0.7.x design lands on "Capacitor plugin that exposes a Kotlin WorkManager worker to JS," the `background-runner` plugin's bridge architecture is one of two reference implementations to compare against (the other being a hand-rolled Capacitor plugin). Decision deferred to v0.7.x.

---

## §6. Conditional verdict map (vs OFFLINE-PRE results)

OFFLINE-PRE will eventually return four data points (storage quota, persist granted, SW available, Worker available). For the OFFLINE-1A decision specifically:

| OFFLINE-PRE outcome | Effect on this spike |
|---|---|
| SW available | Workbox is conditionally viable per capability — but rejected on architecture (§3). Verdict unchanged. |
| SW not available | Workbox eliminated by capability. Verdict unchanged. |
| Quota ≥ 100 MB | PDF in MVP; `idb`-backed outbox stores PDF metadata + filesystem path. |
| Quota < 100 MB | PDF dropped from MVP per plan §8.1; `idb`-backed outbox handles URL+note only. Verdict on library choice unchanged. |
| Worker available | SHA256 strategy = Web Worker per plan §5.2. |
| Worker not available | SHA256 strategy falls back to `(file_name, file_size)` dedup tuple. Library choice unchanged. |

**Net:** the library choice is independent of OFFLINE-PRE outcomes. The plan stays unblocked for OFFLINE-1B (storage layer) regardless of when the device probe runs. The probe results refine MVP scope and SHA256 implementation detail — not the dependency footprint.

---

## §7. Recommendation

1. **Adopt `idb` as the only new dependency** for the outbox storage layer. Add to `package.json` in OFFLINE-1B (commit 3 per v3 §7).
2. **Reject Workbox** for the four reasons in §3. Q5 from v2 §11 (Workbox adoption) is closed; remove from §11 of v3 plan in a follow-up edit.
3. **Reject `background-runner`** as outbox primary; keep as v0.7.x WorkManager-bridge reference candidate (already tracked in §4.10).
4. **Drop `redux-offline`** without further consideration.

Total external dependencies added through OFFLINE-1B: 1 (`idb`).
Plus through OFFLINE-4: `@capacitor/network`. Plus through OFFLINE-8: `@capacitor/local-notifications`. Total new npm deps for v0.6.x offline mode: 3.

---

## §8. What this spike did NOT evaluate

- **Service Worker direct usage (no Workbox).** A custom Service Worker registered in `public/sw.js` that intercepts share-handler POSTs and queues them is theoretically viable if SW is available. Rejected because: (a) same schema-ownership concern as Workbox (the SW would own its own state), (b) Capacitor WebViews have inconsistent SW lifecycle behavior, (c) doesn't survive app close any better than the in-WebView solution. Not worth the complexity.
- **Native Capacitor plugin written from scratch** (a Kotlin-side outbox). That IS the v0.7.x design and is explicitly out of scope for v0.6.x per plan §4.1.
- **`localForage`.** Higher-level wrapper around IDB / WebSQL / localStorage. Eliminated implicitly: we're targeting Android Chrome WebView only, IDB is universally available, the WebSQL fallback is dead weight. `idb` is the leaner choice.

---

## §9. Follow-up edits to v3 plan

After this spike, the following surgical edits should land in `docs/plans/v0.6.x-offline-mode-apk.md`:

1. §11 — remove "Workbox bg-sync adoption" from residual confirmation list (now closed by this spike).
2. §0.1 row Q5 — update from "OFFLINE-PRE spike resolves" to "OFFLINE-1A spike rejected Workbox on schema-ownership grounds; capability check moot."
3. §14 — note that the OFFLINE-1A row's deliverable IS this document; commit links to `docs/research/offline-queue-prior-art.md`.

These are deferred to a single follow-up commit so this spike commit stays a pure docs deliverable.
