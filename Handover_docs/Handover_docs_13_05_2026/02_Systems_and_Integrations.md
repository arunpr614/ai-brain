# M2 — Systems and Integrations

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/02_Systems_and_Integrations.md`
**Baseline:** full
**Scope:** external systems + Capacitor plugins + npm deps Brain depends on
**Applies to:** both lanes
**Status:** COMPLETE (documentation)

> **For the next agent:** the integration footprint grew this session by 3 client-side Capacitor plugins (`@capacitor/network`, `@capacitor/local-notifications`, `idb`) and a devDep (`fake-indexeddb`). External providers are unchanged since v4 baseline. **Lane L:** all new deps this session are client-side only — they ship in the APK, not the server. **Lane C:** none of the new deps affect cloud cutover; they have no server interaction beyond hitting the existing capture routes.

---

## 1. Integration matrix

| System | Status | What it provides | Who uses it | Lane |
|---|---|---|---|---|
| **Cloudflare Named Tunnel** | **ACTIVE** (since v0.5.0) | HTTPS entry point `brain.arunp.in` | All clients | shared (Lane C migrates; Lane L doesn't touch) |
| **GitHub** (`arunpr614`) | **ACTIVE** (repo only) | Source hosting | Both agents | shared |
| **Anthropic (Messages + Batch API)** | **INCOMING** (v0.6.0; account/key TBD) | LLM for Ask + enrichment | Lane C | Lane C owns integration |
| **Google Gemini API** | **INCOMING** (v0.6.0; account/key TBD) | Text embeddings | Lane C | Lane C owns integration |
| **Backblaze B2** | **INCOMING** (v0.6.0; account/key TBD) | Encrypted backup storage | Lane C | Lane C owns integration |
| **Hetzner Cloud** | **INCOMING** (v0.6.0, server provisioned at v4 baseline) | VM hosting | Lane C | Lane C owns; SSH still blocked at K-1 |
| **Ollama (local)** | **ACTIVE → DEPRECATED post-v0.6.0** | LLM + embeddings on Mac | Both | retained as fallback |

**No new external integrations this session.** All new surface is client-side or in-process server logic.

## 2. Capacitor plugins (APK)

| Plugin | Version | Purpose | Added | Required at runtime |
|---|---|---|---|---|
| `@capacitor/android` | 8.3.3 | Capacitor base | v0.5.0 | yes (build) |
| `@capacitor/cli` | 8.3.3 | Capacitor base | v0.5.0 | yes (build) |
| `@capacitor/core` | 8.3.3 | Capacitor base | v0.5.0 | yes |
| `@capacitor/preferences` | 8.0.1 | Encrypted KV for `brain_token` | v0.5.0 | yes (bearer token storage) |
| `@capacitor/filesystem` | 8.1.2 | App-private file IO; PDF read + outbox-pdfs/ write | v0.5.4 (added) / **v0.6.x (now in outbox path)** | yes (PDF capture + outbox-9) |
| `@capgo/capacitor-share-target` | 8.0.30 | Android share-intent receiver | v0.5.0 | yes |
| `@capacitor/network` | **8.0.1** | networkStatusChange listener for retry triggers | **v0.6.x (NEW this session)** | yes (offline triggers) |
| `@capacitor/local-notifications` | **8.1.0** | Stuck-state notification + tap routing | **v0.6.x (NEW this session)** | yes (offline notifications) |

**Plugins NOT installed (deliberate):**

| Plugin | Why not | Re-evaluate when |
|---|---|---|
| `@capacitor/app` | Triggers.ts uses `visibilitychange` browser-event fallback; works on Android resume | If manual matrix shows visibilitychange misses Android resume events |
| `@capacitor-community/background-runner` | Doesn't survive app close; same constraint as plain WebView | v0.7.x WorkManager kickoff |
| `@capacitor/push-notifications` | Out of v0.6.x scope; v0.7.x candidate for instant-sync push-wake | v0.7.x roadmap |

## 3. npm dependencies (full inventory)

### 3.1 Runtime deps (incl. new this session)

| Package | Version | Used by | Added |
|---|---|---|---|
| `next` | 16.2.5 | server + client framework | v0.0.x |
| `react` | 19.2.4 | UI | v0.0.x |
| `react-dom` | 19.2.4 | UI | v0.0.x |
| `better-sqlite3` | 11.10.0 | DB driver | v0.0.x |
| `sqlite-vec` | 0.1.9 | vector index | v0.2.0 |
| `unpdf` | 1.6.2 | server PDF text extract | v0.5.0 |
| `jsdom` | 29.1.1 | server article extraction | v0.0.x |
| `@mozilla/readability` | 0.6.0 | server article extraction | v0.0.x |
| `jszip` | 3.10.1 | server library export | v0.3.x |
| `qrcode` | 1.5.4 | server QR for /settings/lan-info | v0.5.0 |
| `qrcode-terminal` | 0.12.0 | smoke-test ergonomics | v0.5.0 |
| `jsqr` | 1.4.0 | client QR scanner | v0.5.0 |
| `class-variance-authority` | 0.7.1 | UI utility | v0.0.x |
| `clsx` | 2.1.1 | UI utility | v0.0.x |
| `cmdk` | 1.1.1 | command palette | v0.3.x |
| `lucide-react` | 0.460.0 | icons | v0.0.x |
| `tailwind-merge` | 2.5.5 | UI utility | v0.0.x |
| `zod` | 3.24.1 | validation | v0.0.x |
| `@radix-ui/react-dialog` | 1.1.15 | UI primitive | v0.0.x |
| `@radix-ui/react-slot` | 1.2.3 | UI primitive | v0.0.x |
| `@radix-ui/react-tooltip` | 1.2.8 | UI primitive | v0.0.x |
| Capacitor plugins | (see §2) | APK | varies |
| **`idb`** | **8.0.3** | **outbox IDB wrapper (1.19 KB brotli)** | **v0.6.x (NEW)** |

### 3.2 Dev deps (incl. new this session)

| Package | Version | Used by | Added |
|---|---|---|---|
| `typescript` | 5.x | typecheck | v0.0.x |
| `tsx` | 4.19.2 | run TS via node | v0.0.x |
| `eslint` | 9.x | lint | v0.0.x |
| `eslint-config-next` | 16.2.5 | lint preset | v0.0.x |
| `tailwindcss` | 4.x | styling | v0.0.x |
| `@tailwindcss/postcss` | 4.x | styling | v0.0.x |
| `@types/*` | varies | type defs | v0.0.x |
| **`fake-indexeddb`** | **6.2.5** | **outbox storage tests under node:test** | **v0.6.x (NEW)** |

### 3.3 Dependency total

- Pre-session: **31 runtime deps + ~12 devDeps** (per v4 baseline §3.x)
- Post-session: **34 runtime + 13 devDeps** (added 3 incl. `idb` + 2 Capacitor plugins; added 1 devDep `fake-indexeddb`)

**`npm audit` warnings during install:** "4 vulnerabilities (3 moderate, 1 high)" — same flag as v4 baseline noted (carried over). Has not been investigated. **Action item M9 §3.5** to do this before merge to main.

## 4. Server-side integrations (changed this session)

### 4.1 `X-Brain-Client-Api` header validation (NEW)

| Field | Value |
|---|---|
| Module | `src/lib/auth/api-version.ts` |
| Header name | `x-brain-client-api` (lowercase per HTTP/2 norms) |
| Current expected | `1` (constant `EXPECTED_CLIENT_API`) |
| Routes that validate | `/api/capture/url`, `/api/capture/note`, `/api/capture/pdf` |
| Missing-header behavior | **Accept** (back-compat for Chrome extension + pre-OFFLINE-4 APK) |
| Mismatch behavior | 422 with body `{ code: 'version_mismatch', message: 'Update Brain to sync these items.', expected: 1, received: <header value> }` |
| Tests | `src/lib/auth/api-version.test.ts` (6 tests) |

**When to bump `EXPECTED_CLIENT_API`:** only when a breaking change requires re-encoding outbox entries. This is rare. Bumping moves all v0.5.5 APK installs into stuck:version_mismatch state immediately, which surfaces "Update Brain" copy in the inbox — by design.

**Lane C concern:** during v0.6.0 cloud cutover, `src/lib/auth/api-version.ts` must transfer to the cloud verbatim. Bumping the version mid-cutover is allowed if Lane C deems it necessary for the cloud schema, but the user should be told to expect "all currently-queued offline items will go stuck:version_mismatch — re-share after APK update."

### 4.2 Three capture-route insertions

Each of `src/app/api/capture/{url,note,pdf}/route.ts` got 2 lines:

```typescript
import { checkClientApiVersion } from "@/lib/auth/api-version";
// ...inside POST handler, immediately after Origin validation:
const versionReject = checkClientApiVersion(req);
if (versionReject) return versionReject;
```

No other server-side changes this session.

## 5. Data-storage surfaces

| Surface | Where | Owner | Lifecycle |
|---|---|---|---|
| **SQLite (server)** | `data/brain.sqlite` (or cloud equivalent post-v0.6.0) | server | persistent; backed up |
| **Vector index** | `data/brain.sqlite-vec` (sqlite-vec virtual table) | server | persistent; rebuildable from items |
| **Backup snapshots** | `data/backups/` (Mac); → Backblaze B2 (Hetzner post-v0.6.0) | server | every 6h auto |
| **Errors log** | `data/errors.jsonl` (5 MB cap) | server | append-only; rotating |
| **APK bearer token** | Capacitor `@capacitor/preferences` key `brain_token` | APK | per-device; rotated when QR re-scanned |
| **APK IDB outbox (NEW)** | IndexedDB `brain-outbox` store `outbox` (3 indexes) | APK | per-device; persisted via `navigator.storage.persist()` |
| **APK PDF blobs (NEW)** | Capacitor `Filesystem.Directory.Data/outbox-pdfs/<rowId>__<safeName>` | APK | per-device; deleted on sync or discard |
| **Chrome extension token** | `chrome.storage.sync` | extension | per-browser-profile |
| **Theme cookie** | `brain-theme` (Next.js cookie) | browser | per-browser |
| **PIN session cookie** | `brain-session` (HMAC-signed) | browser/WebView | rotates per session |

## 6. Threat-model adjacencies (offline-mode delta)

The offline-mode shipment introduced two new server-relevant surfaces:

1. **Filesystem PDF storage on the APK.** `/data/data/com.arunprakash.brain/files/outbox-pdfs/` is app-private (no other Android app can read it without root). PDF bytes deleted on successful sync per plan §4.4. Worst case: a stolen unlocked phone exposes pending-share PDFs. Same threat model as the rest of the APK (PIN-protected at app launch, not at filesystem level).
2. **`X-Brain-Client-Api` header.** Adds one header check to the capture routes; back-compat-permissive on missing header. Does not change the auth surface (bearer token still required); does not introduce a new secret.

No new server-stored data, no new third-party calls, no new auth flows. The offline mode is a pure client-side resilience layer over existing endpoints.

## 7. Cross-references

- M3 (Secrets) — env vars; the new `EXPECTED_CLIENT_API` is a **constant in code**, not an env var, so M3 doesn't change for it
- M1 §3 — outbox component map (where each new module lives)
- M4 — OFFLINE-* roadmap status
- M8 — known issues for the new outbox surface
