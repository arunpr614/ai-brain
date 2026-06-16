# UX v2 A19 Final Staged Candidate Review

Created: 2026-06-16 20:48:00 IST
Branch: `codex/ai-brain-ux-v2-execution`
Review target: staged diff only, `git diff --cached`
Verdict: `REQUEST_CHANGES`

## Executive Verdict

Do not commit the staged candidate yet. A19 found two confirmed P1 blockers:

1. Sensitive private surfaces still accept any non-empty `brain-session` cookie instead of a verified session token.
2. Ask history can display and write to the wrong thread after route/query navigation because `AskClient` initializes state from props only once.

A20 must fix these blockers and rerun affected validation before commit consideration. A19 did not edit source/config/runtime files and did not mutate the A18 staged candidate.

## Staged Baseline

| Check | Result |
| --- | --- |
| Staged path count before review | 258 |
| Staged diff scale | 258 files, 15,854 insertions, 921 deletions |
| `git diff --cached --check` | Passed |
| Staged exclusion scan | Passed: no root `RUNNING_LOG.md`, heavy evidence/source snapshots, ignored APK outputs, `assets/`, or `data/artifacts/` staged |
| A19 governance docs staged | No |

## Lane Evidence

### Product/Source Behavior

Reviewed:

- `/tmp/a19-product-source.diff`
- `src/app/ask/ask-client.tsx`
- `src/app/ask/page.tsx`
- `src/app/actions.ts`
- `src/app/taxonomy-actions.ts`
- `src/app/items/[id]/page.tsx`
- `src/components/library-list.tsx`
- `src/db/topics.ts`
- `src/lib/ask/**`
- `src/lib/library/**`
- `src/lib/android-share/**`

### Auth/Security/Privacy

Reviewed:

- `/tmp/a19-security-privacy.diff`
- `src/proxy.ts`
- `src/proxy.test.ts`
- `src/lib/auth.ts`
- `src/lib/device-pairing/create-route-handler.ts`
- `src/app/settings/device-pairing/page.tsx`
- `src/app/settings/device-pairing/actions-client.tsx`
- `src/app/library/page.tsx`
- `src/app/more/page.tsx`
- `src/app/api/settings/device-pairing/route.test.ts`

### Android/Public/Offline Packaging

Reviewed:

- `/tmp/a19-android-public.diff`
- `android/app/build.gradle`
- `android/app/src/main/res/**`
- `capacitor.config.ts`
- `public/manifest.webmanifest`
- `public/offline.html`
- `public/sw.js`
- public icon assets
- `src/app/layout.tsx`
- `src/components/theme-bootstrap.tsx`

### Test/Quality/Governance/Staging Hygiene

Reviewed:

- A18 QA report and validation matrix
- staged pathspec/staged count
- `git diff --cached --check`
- staged exclusion scans
- A19 PRD/plan governance docs
- root running log policy

## Confirmed Findings

### P1 - Private surfaces trust cookie presence instead of verified sessions

**Evidence:**

- `src/lib/device-pairing/create-route-handler.ts:28` uses `hasSession(req)` to check only `Boolean(req.cookies.get(SESSION_COOKIE)?.value)`.
- `src/lib/device-pairing/create-route-handler.ts:33-43` returns `{ url, token }` after that presence-only check.
- `src/app/api/settings/device-pairing/route.test.ts:35-52` proves the current test happy path uses `brain-session=stub`.
- `src/proxy.ts:85-87` explicitly forwards any request with a non-empty session cookie, deferring full HMAC verification downstream.
- `src/app/settings/device-pairing/page.tsx:10-12` uses cookie presence before rendering advanced token setup.
- Newly staged private pages such as `src/app/library/page.tsx:64-67` and `src/app/more/page.tsx:27-28` render private library/provider state under the proxy's presence-only gate.

**Impact:** A forged or stale non-empty `brain-session` value can reach private data surfaces and the raw bearer token endpoint if downstream handlers/pages do not verify the session HMAC.

**Recommendation:** Add a shared verified-session guard and require `verifySessionToken` for sensitive route handlers and server-rendered private pages, especially device pairing/token return, library, more, provider status, search/export/Ask/thread/item APIs as appropriate. Add invalid-cookie tests that use a stub cookie and expect 401 or redirect.

### P1 - Ask history can stay bound to the wrong thread after navigation

**Evidence:**

- `src/app/ask/ask-client.tsx:67` initializes `turns` from `initialMessages` only once.
- `src/app/ask/ask-client.tsx:69` initializes `activeThreadId` from `threadId` only once.
- `src/app/ask/ask-client.tsx:120-123` reuses `activeThreadId` during submit.
- `src/app/ask/page.tsx:46-49` loads a new thread from the `thread` query param and passes it to the client.

**Impact:** Navigating between Ask history threads can display stale turns and submit the next question to the previous thread. This risks confusing conversation history and writing new messages into the wrong durable thread.

**Recommendation:** Reset client state when `threadId` or `initialMessages` changes, or key the client by active thread/scope so React remounts it on navigation. Add a regression test or component-level coverage if feasible; otherwise document the manual QA path.

### P2 - Tag/topic/collection Ask silently searches only 50 items while presenting full scope

**Evidence:** `src/app/ask/page.tsx:51`, `src/app/ask/page.tsx:54`, and `src/app/ask/page.tsx:58` cap tag/topic/collection item lists at 50, while `src/app/ask/page.tsx:95-109` displays full source counts and `src/app/ask/page.tsx:153` sends only the loaded item IDs.

**Impact:** Large scopes can produce incomplete answers without a clear warning.

**Recommendation:** Either show an explicit "first 50" limitation or add backend support for durable tag/topic/collection scope retrieval beyond explicit item IDs.

### P2 - Item deletion is no longer reachable from staged product UI

**Evidence:** `src/app/items/[id]/page.tsx:307-328` exposes Focus, Ask, and Export, while `src/app/actions.ts:38-42` still contains the delete server action. `src/components/library-list.tsx:276-285` passes only tag, collection, ask, and clear handlers to the bulk bar.

**Impact:** Users may lose a basic library-management affordance.

**Recommendation:** Restore a deliberate delete affordance on item detail or provide a documented alternate deletion path.

### P3 - IPv6 localhost service-worker bypass misses bracketed hostnames

**Evidence:** `public/sw.js` adds `::1` to `LOCAL_DEV_HOSTS`, but browser URL hostnames for literal IPv6 loopback are bracketed (`[::1]`). The local-dev bypass therefore may not trigger for `http://[::1]:...`.

**Impact:** Dev-only risk of stale SW interception on IPv6 localhost. Does not affect production `brain.arunp.in` or Android packaging validation.

**Recommendation:** Include `[::1]` in `LOCAL_DEV_HOSTS` in a follow-up.

### P3 - Mobile bulk selection omits tag/add-to-collection actions

**Evidence:** `src/components/library-list.tsx:323-350` mobile toolbar renders only Ask and Clear, while desktop toolbar at `src/components/library-list.tsx:352-370` continues into Ask/Tag/collection controls.

**Impact:** Mobile users have fewer bulk-management actions than desktop.

**Recommendation:** Add a compact mobile action menu for tag and collection attachment.

## Dismissed Or Downgraded Risks

| Candidate risk | Decision | Reason |
| --- | --- | --- |
| Public `/capture/share-result` leaks private data | Dismissed | It is exact-path public, reads `sessionStorage`, production fixture states are disabled, result keys are opaque, and stored payloads are sanitized/expiring. |
| `scope=items` SQL injection | Dismissed | Item IDs are capped and passed through prepared retrieval placeholders. |
| Service worker precaches private/API routes | Dismissed | Precache list is public-only; network-only paths include APIs and auth-sensitive routes. |
| Capacitor token logging regressed | Dismissed | `capacitor.config.ts` retains `loggingBehavior: "none"`, and A18 APK validation passed. |
| App identity/version mismatch | Dismissed | Android display name/launcher assets and `1.0.4/code5` validation are coherent for the debug candidate. |

## Staged-Index Preservation

| Check | Result |
| --- | --- |
| Staged path count after review | 258 |
| A19 source/config/runtime edits | None |
| Staged exclusion scan after review | Still clean |
| A19 governance docs | Created but intentionally unstaged |
| Root `RUNNING_LOG.md` | Appended after report and left unstaged |

## Required Next Slice

Create A20 as a governed fix/revalidation slice for at least:

1. verified-session enforcement on sensitive private surfaces and tests for invalid stub cookies;
2. Ask thread-state reset/remount behavior and regression coverage or documented manual QA.

A20 should also decide whether to address the P2/P3 findings in the same slice or defer them with owner acceptance.

## Remaining No-Go Gates

1. Staged candidate is not commit-ready until P1 blockers are fixed and validation reruns.
2. No commit, push, PR, deployment, publication, signing, upload, or APK distribution happened in A19.
3. APK publication authorization and named distribution target remain missing.
4. Full TalkBack spoken-order audit remains absent unless explicitly waived.
5. Deterministic URL-share success remains unresolved unless native note share is accepted as sufficient.
6. Heavy evidence/source snapshot retention remains undecided and unstaged.
7. Root `RUNNING_LOG.md` remains unstaged pending append-only staging strategy or explicit owner approval.
