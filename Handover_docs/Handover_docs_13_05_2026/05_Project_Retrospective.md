# M5 — Project Retrospective (session 2026-05-13)

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/05_Project_Retrospective.md`
**Baseline:** full
**Scope:** decisions locked this session, bets made, surprises, things I'd do differently
**Applies to:** both lanes
**Status:** COMPLETE (documentation)

> **For the next agent:** this is an honest retrospective, not a victory lap. If it reads as "everything went great," that's the filler signal you should reject. The session shipped 16 commits and 425/425 tests, but at least 3 of those commits were follow-up fixes for things that should have been right the first time. Read this to understand what's brittle and where the next agent's caution should focus.

---

## 1. What the session set out to do

1. Write offline-mode plan v3 (close 22 self-critique-v2 items + 10 user questions).
2. Execute every commit in plan v3 §7's rollout table.
3. Build APK 0.5.5.
4. Append a detailed running-log entry covering all the work.
5. Produce a manual verification matrix template for the user to run on the Pixel.

## 2. What got done

- **Plan v3 written** — `docs/plans/v0.6.x-offline-mode-apk.md` rewritten in one pass; all 22 critique-v2 items addressed; 10 user questions resolved with documented defaults; residual list reduced to 3 confirmation items.
- **All 12 OFFLINE-* IDs shipped** — PRE / 1A / 1B / 2 / 3 / 4 / 6 / 7 / 8 / 9 / 10 / 12 each in its own atomic commit per plan §7.
- **425/425 tests** (was 260 at session start; +165 new across `src/lib/outbox/`, `src/lib/auth/api-version.ts`, `src/lib/capture/youtube-url.ts`).
- **APK 0.5.5 built** at `data/artifacts/brain-debug-0.5.5.apk` (10.9 MB). Not yet installed on Pixel.
- **3 new Capacitor plugins integrated**: `@capacitor/network`, `@capacitor/local-notifications`, `idb` (npm), `fake-indexeddb` (devDep).
- **Manual verification matrix template** at `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` (617 lines, 24 scenarios, 7 buckets, fillable).
- **Running log 31st entry appended** with full self-critique + 7 action items.
- **Handover package v5 written** (this folder).

## 3. Decisions locked this session

| Decision | What | Why | Reversible? |
|---|---|---|---|
| Roll-own outbox with `idb` | Reject Workbox/redux-offline/background-runner | Schema ownership for v0.7.x WorkManager bridge; archived/missing deps | Yes — v0.7.x can replace, but plan §4.10 keeps schema stable |
| Web Worker for PDF SHA-256 | Off-thread hash with inline fallback | UI freeze 600–1200 ms on 10 MB PDF in main thread | Yes — fallback is the safe default |
| `synced` rows retained indefinitely | Drop 24h auto-delete | Audit trail; users can review what synced this week | Yes — quota-pressure escape valve at 85% prunes oldest |
| Brain stays in foreground after share | Don't `Activity.finish()` after share | Matches Android share-target reality; auto-finish is fragile | Yes — could add later if user requests |
| `X-Brain-Client-Api: 1` header on all outbox POSTs | Adds version-mismatch surface | Protects users who queue offline for a week then server upgrades | Yes — bump value to invalidate old APK installs |
| YouTube variants collapse client-side | `normalizeUrlForDedup` short-circuits any recognized variant | Server already does it pre-dedup; client gap caught by user review | Hard to undo; mirrors server contract |
| Pure URL helpers extracted from `youtube.ts` | Required to ship `86cefb3` to APK | jsdom is server-only; client bundle was failing | Yes but unlikely; `youtube-url.ts` is a clean module |
| **No git tag** for v0.5.5 | Lane L tiered rule (`48967cd`) — tags belong to Lane C | Avoids conflict with Lane C v0.6.0 tagging | Yes — Lane C can tag mid-cutover |

## 4. Bets made — what could go wrong

| Bet | Risk | Mitigation in place | Mitigation gaps |
|---|---|---|---|
| Web Worker is available in Capacitor WebView | If unavailable AND `new Worker(URL, {type:'module'})` syntax fails to bundle correctly under Next.js/turbopack inside Capacitor → silent fallback | Inline fallback hashes on main thread; 600–1200 ms UI freeze on 10 MB PDF, but ships | OFFLINE-PRE probe doesn't directly test Module-Worker URL bundling; only "Worker available: yes/no" |
| `visibilitychange` fires on Android resume in WebView | If it doesn't, foreground-retry trigger silently fails | `@capacitor/network` on connectivity-regain still fires; 30s tick still fires | Manual matrix Bucket A would catch this (drain after foreground) |
| `EXPECTED_CLIENT_API` stays 1 across v0.6.0 cutover | If Lane C bumps it mid-cutover, all queued offline items go stuck:version_mismatch | Plan §5.5 documents this; "Update Brain" copy is correct UX | Plan v3 §13.2 + M3 §4.1 both flag this for Lane C |
| Outbox dedup correctness (the 3-tier check) | A bug in `normalizeUrlForDedup` or `noteContentHash` could cause false dedup → user thinks share enqueued but row isn't there | 32 dedup tests; YouTube canonicalization tests; server-side dedup is the safety net | No fuzz testing |
| `idb` library stability | A bug in `idb` 8.0.3 that we don't catch | 1.19 KB lib, 7.3k★, well-vetted; tests via fake-indexeddb | Don't pin to exact version; minor bumps could change behavior |

## 5. What surprised me — learnings

### 5.1 The build:apk gate caught what npm test + typecheck + npm run build didn't

`86cefb3` (YouTube dedup fix) introduced a `dedup.ts → youtube.ts → jsdom` import chain. `jsdom` is server-only (needs `fs`/`crypto`). My session passed:
- `npm run typecheck` ✓ (TS doesn't know jsdom is server-only)
- `npm test` ✓ (Node imports the whole module unbundled)
- `npm run build` ✓ (server-only Next.js build doesn't surface client bundling errors)

But `npm run build:apk` (which runs the **full** Next.js client bundle) failed instantly. The fix shipped as `4a6548a`.

**Lesson written into M8 + RUNNING_LOG action item #1:** any change to a file in the client component import graph requires `npm run build:apk` BEFORE commit. The other gates are necessary but NOT sufficient.

### 5.2 The v3 critique cycle paid off massively

The user's prior session ended with a 22-item self-critique-v2 of plan v2. Without that critique, v3 would have shipped with 3 hidden blockers (broken §4.10 cross-reference, schema doesn't fit PDFs, release-tag rule violation) + 9 high-severity gaps. Each of those would have surfaced at execution time as a follow-up commit.

Pattern:
- v1 plan: 14 items in v1 critique
- v2 plan (rewrite): 22 NEW items in v2 critique
- v3 plan (rewrite): I claim "all 22 closed + 10 questions resolved"
- v3 critique pending — manual matrix may surface more

**Hypothesis: every plan should go through 2 critique cycles before execution.** v3 didn't get a third critique because the user accepted my proposed defaults to the 10 questions and we executed. If matrix testing surfaces a v3 critique-3, this hypothesis stays alive.

**Update 2026-05-14: hypothesis materialized at largest severity.** Manual matrix run on the Pixel surfaced `ERR_INTERNET_DISCONNECTED` on offline cold-start — plan v3 had zero references to service workers / app-shell / WebView cold-start. All 12 OFFLINE-* commits were correct code but unreachable on the device because the bundle containing `share-handler.tsx` couldn't load. Fix planned in `docs/plans/v0.5.6-app-shell-sw.md` (Path C — SW for app-shell + library offline reading IN scope). The hypothesis is now strongly supported, not pending.

### 5.3 Backoff math vs plan literal

OFFLINE-2 backoff: plan §5.3 schedule says "attempt 9+ → +3600s" (1-hour cap). Pure-exponential math `2^(a-1) * 10s` only reaches the 1-hour cap at attempt 10 (5120s > 3600s). When I implemented the math first, the test that asserted attempt 9 = 3600s failed.

Two valid resolutions: (a) update the plan to say "attempt 10+ → cap" or (b) clamp at 9 explicitly. I picked (b) because the plan was the explicit user-approved contract; the doc-vs-math gap is what `**(SoT: code)**` flags exist for.

**Lesson: when a plan specifies a table AND the math should "naturally" produce that table, verify both views and flag the mismatch in the doc rather than silently re-deriving.** Documented in M1 §6 SoT table.

### 5.4 The Date.parse trap

`parseRetryAfterMs("-5")`: my reject-negatives branch fired on the seconds path correctly (`Number("-5") = -5; >=0 = false`), then I let it fall through to `Date.parse("-5")` which returned `988655400000` — Node's Date parser interprets bare numbers as a year. Caught by unit test.

Fix: when input parses as a finite number, that's authoritative regardless of sign — don't fall through to date parsing.

**Lesson: when a function has multiple parse strategies, the order + fall-through behavior on edge inputs needs explicit unit tests, not just happy-path tests.**

### 5.5 Server-only deps poison client bundles even when not called

The biggest miss this session. See §5.1 — same root cause from a different angle. `youtube.ts` had `import { JSDOM } from "jsdom"` at module top. Even when only the pure URL helpers (`extractVideoId`, `canonicalYoutubeUrl`) are used downstream, ESM hoists every top-level import. Webpack tries to bundle jsdom into the browser bundle; build dies.

**Lesson: any file imported by a client component must be free of server-only deps OR must lazy-load them.** Documented in M1 SoT table + M8 §3.

### 5.6 Capacitor plugin imports must be lazy + try/catch'd

All three new plugins are imported via `await import("...")` inside try/catch so non-APK builds (desktop dev server, SSR) don't throw at module-eval time. `triggers.ts` has a `visibilitychange` browser-event fallback when `@capacitor/app` isn't installed.

**Lesson: plugin coupling must be runtime-conditional, not compile-time.** This was actually right from the start in this codebase per `share-handler.tsx`'s pre-existing pattern.

### 5.7 Bundling 12 commits in one session worked because each was atomic

Each OFFLINE-* commit had its own typecheck + test + lint + build gate; no cross-commit dependencies broke. Two follow-ups (`86cefb3` + `4a6548a`) are the evidence that the gate actually mattered.

**Lesson: if the plan's commits are well-decomposed, executing them sequentially in one session is safer than batching multiple into one commit.** Confirms `bce0fa5`-style mega-commit is the wrong default.

## 6. Things I avoided that should have happened

### 6.1 No `triggers.test.ts`

`src/lib/outbox/triggers.ts` is 141 lines of Capacitor listener wiring + `visibilitychange` fallback + 30s interval + concurrency flag. Shipped with **zero tests**. The commit message even said "triggers integration is best validated via manual APK testing."

True for the plugin-listener half. False for the in-memory `running` concurrency flag and the `drainAfterReset` ordering — both are pure-logic and could have been tested in 15 min.

### 6.2 No `inbox-client.test.tsx`

OFFLINE-7 ships 272 lines of UI with **zero tests**. The commit said "underlying primitives are well-tested." True, but `useEffect`/`useCallback` wiring + busy-state handling + error rendering is non-trivial. Manual matrix items G-1 / G-2 cover it; absence of automated test is a perpetual gap on this project.

### 6.3 No happy-path test for `pdfTransport`

`transport.test.ts` asserts dispatch + the predictable error path (`pdf-read-failed` because Node has no Capacitor filesystem). The 2xx-with-deletePdf success path is covered only via APK manual testing. A mockable filesystem injection seam in `pdfTransport` would have made this testable; chose not to add it.

### 6.4 Did not push `lane-l/feature-work` during the session

All 16 commits are local at handover time. If the session crashed mid-way the work would have been at risk.

### 6.5 Did not investigate `npm audit`

3 plugin installs this session, each printed "4 vulnerabilities (3 moderate, 1 high)." Treated as noise. Same as prior session. Worth a `npm audit` review before merge to main.

### 6.6 Did not run the manual matrix myself

The matrix is fillable but NOT filled. The whole tower of pure-logic tests is meaningless if Bucket A (basic happy path) fails on the device.

## 7. Pattern-level concerns

### 7.1 I commit aggressively without running the build:apk gate

Of the 16 commits this session, only 1 ran `build:apk` pre-commit (`fd8a72d` happened to need a Capacitor sync verification). The other 15 relied on `next build` (server-only) which doesn't surface client-side bundling. `4a6548a` caught what `86cefb3` should have caught.

This is the same pattern as prior session's action items: I'll fix at user-request time but not pre-commit time. **The next agent should adopt the action item #1 from RUNNING_LOG: build:apk before every commit touching `src/components/`, `src/app/`, or `src/lib/outbox/`.**

### 7.2 No automated UI testing in the entire session

OFFLINE-7 (272 lines), OFFLINE-9 share-handler edits (~100 lines), OFFLINE-10 toast (84 lines) — covered only by manual matrix. Carryover from earlier sessions; not new today.

### 7.3 Plan-vs-code clamp choices not flagged in the plan

Backoff §5.3 clamp at attempt 9 was right per plan literal but wrong per math. The right move was to flag the discrepancy in the plan doc itself, not just in the M1 SoT table. Future plans should pre-audit math-vs-table consistency.

## 8. Honest reservations about ship-readiness

The MUST-pass items in the manual matrix (A1, A2, A3, B1, B2, C1, F1) are 7 scenarios. If any fail on the Pixel:

| Scenario | If it fails, root cause is likely... |
|---|---|
| A-1 (online URL share) | Bearer token auth path or share-handler-rewrite logic |
| A-2 (offline URL share) | `initOutbox` never resolves, or `findByContentHash` missing the index |
| A-3 (drain on reconnect) | `@capacitor/network` listener not firing, OR `resetQueuedRetryTimes` missing |
| B-1 (online PDF share) | `readSharedPdfAsBlob` extraction (commit `4a6548a` re-routed this) regression |
| B-2 (offline PDF share) | `savePdf` permission failure on `Filesystem.writeFile` |
| C-1 (2-second dedup) | Existing F-041 dedup; unchanged this session — stays a control case |
| F-1 (notification permission) | `LocalNotifications.requestPermissions()` fails silently OR my `inWorkerContext` guard in sha256-worker.ts breaks the main-thread import |

Out of those, **B-1 is the highest-risk** because the `4a6548a` build-fix touched the PDF read path and was not exercised on a real device.

## 9. What I'd do differently next time

1. **Run `npm run build:apk` before every commit that touches the client import graph.** The 30 sec it costs is much less than the time spent on `4a6548a`.
2. **Write tests for `triggers.ts` + `inbox-client.tsx` + `pdfTransport` happy path.** Even 5–10 tests per module would have caught wiring bugs that manual matrix has to.
3. **Push `lane-l/feature-work` after each plan-§7 commit.** 16 unpushed commits is too many.
4. **Run `npm audit` after each plugin install.** Treating the warning as noise across 3 sessions is wrong.
5. **Pre-audit the plan's math vs its tables.** Backoff §5.3 should have caught the attempt-9 cap discrepancy at plan time, not at code time.

## 10. What stayed brittle (acknowledged)

- **`pdfTransport` happy-path is unverified by automated tests.** Best-effort: manual matrix scenario B-3.
- **Worker bundling under Next.js/turbopack inside Capacitor is unverified.** Inline fallback handles it but if "Worker available: yes" but module-worker bundling silently routes to fallback, no alarm bell rings.
- **`/inbox` keyboard navigation is untested in production WebView.** Manual matrix G-2 is desktop-only — there's no mobile a11y harness.
- **`@capacitor/app` is not installed** — relying on `visibilitychange` browser fallback. If matrix shows it misses Android resume events, will need to install it.

## 11. Cross-references

- M0 §8 — what's different from v4 baseline (high level)
- M1 §6 — SoT table (where doc disagreed with code)
- M8 — known-issues register (recurring concerns from this session)
- M9 — action items per lane (concrete next steps)
- `RUNNING_LOG.md` 31st entry §"Session self-critique" — same content, different audience (the AI-agent journal)
