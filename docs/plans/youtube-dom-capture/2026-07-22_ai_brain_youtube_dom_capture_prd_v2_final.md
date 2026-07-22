# AI Brain Explicit-Click YouTube Transcript Capture - PRD V2 Final

**Created:** 2026-07-22<br>
**Owner:** Arun, AI Brain product owner<br>
**Author:** Codex, acting product lead<br>
**Status:** Final planning artifact<br>
**Decision state:** Go for synthetic fixtures and isolated local E2E; conditional go for a manifest-authorized lab canary after every Stage 0 gate; production no-go<br>
**Supersedes:** `2026-07-22_ai_brain_youtube_dom_capture_prd_v1.md`<br>
**Implementation companion:** `2026-07-22_ai_brain_youtube_dom_capture_implementation_plan_v2_final.md`<br>

## Executive Decision

Extend the existing Brain Chrome extension with a narrow companion flow for a transcript that the user has already opened and selected on a YouTube watch page. The extension reads the visible transcript DOM only after the user clicks `Inspect visible transcript`, keeps the result in extension memory for review, and sends it to Brain only after the user clicks `Save transcript to Brain`.

This is not a background browser, session export, network interceptor, caption-URL replay, or server-side YouTube client. Brain does not receive YouTube cookies, browser storage, Google account identity, browsing history, authorization headers, player responses, signed media/caption URLs, or the Chrome profile. The YouTube page never receives the Brain token.

V0.1 also adds a true `Save link only` fallback. That choice saves supplied page metadata and an optional note without fetching YouTube and without creating or reactivating transcript recovery work. Every extension action literally named `Save link` must use this path. Any action that retains the richer `/api/capture/url` behavior must use different copy such as `Save and enrich page`.

The browser-visible path is approved only for fixtures, isolated local E2E, and a separately authorized lab canary. It remains blocked in production code. Visible access is not treated as proof of retention rights, and DOM evidence is not called an official caption.

## Why This Product Exists

AI Brain can save YouTube metadata but server-side transcript providers can be rate-limited or blocked. Arun may still be able to see a transcript in a signed-in Chrome tab. Manual copy/paste is slow, loses cue structure, and gives poor provenance. A persistent logged-in browser on Hetzner would concentrate credentials and create invisible automation.

The product therefore needs a user-controlled middle path:

1. read only what the user deliberately made visible;
2. prove bounded traversal or fail without an uploadable partial result;
3. show what would leave Chrome;
4. require a second explicit action before transfer;
5. preserve honest source, policy, and completeness evidence;
6. keep production disabled until a separate reviewed decision.

## Evidence And Review Basis

- [Chrome companion repository landscape](../../research/youtube-transcripts/2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md)
- [YouTube transcript repository landscape](../../research/youtube-transcripts/2026-07-22_10-32-45_IST_github_youtube_transcript_repository_landscape_v1.md)
- [Live adapter bakeoff](../../research/youtube-transcripts/2026-07-22_10-32-45_IST_youtube_transcript_live_adapter_bakeoff.csv)
- [Interactive UX prototype](prototype/2026-07-22_ai_brain_youtube_dom_capture_ux_prototype.html)
- `2026-07-22_product_manager_agent_prd_input.md`
- `2026-07-22_technical_architect_agent_prd_v1_review.md`
- `2026-07-22_product_manager_agent_v1_review.md`
- `2026-07-22_technical_architect_agent_implementation_plan_v1_review.md`
- `2026_07_22_AI_BRAIN_YOUTUBE_DOM_CAPTURE_PRD_V1_ADVERSARIAL_REVIEW_2026-07-22_12-22-02_IST.md`
- `2026_07_22_AI_BRAIN_YOUTUBE_DOM_CAPTURE_IMPLEMENTATION_PLAN_V1_ADVERSARIAL_REVIEW_2026-07-22_12-22-02_IST.md`

## Current-State Facts

1. The existing Manifest V3 extension has a popup, service worker, `activeTab`, fixed Brain host permission, bearer pairing, storage, context menus, and notifications.
2. It has no `scripting` permission, transcript extractor, preview/confirm reducer, or extension tests.
3. The current extension's URL save reaches `/api/capture/url`, which performs server extraction and can queue transcript recovery.
4. A database trigger also auto-enqueues recovery when a weak metadata-only YouTube item is inserted. A new route alone is not enough to make link-only truthful.
5. `/api/capture/transcript` is for paste/file input and records `user_paste` or `uploaded_file`; browser-observed captions need a distinct route and provenance.
6. Existing policy code checks a lab override before the production runtime and can production-allow `lab_public_caption` with an approval ID. This is unsafe for the new path and must be hardened.
7. Common origin validation accepts a missing origin or any Chrome extension ID; common API-version validation accepts a missing version. The companion route needs stricter route-local checks.
8. A running transcript recovery worker can fetch against a weak item and later upgrade it without atomically proving the job and item are still eligible.
9. Transcript source rows have a `status`, but the database does not currently enforce one active source per item.
10. Item repair resets enrichment work to pending. Transcript retention and external AI processing must therefore be treated as separate permissions.
11. Default backups run about every six hours and retain 28 snapshots, approximately one week.

## Product Principles

1. **Read requires a click.** Opening the Brain popup does not consent to DOM inspection.
2. **Transfer requires another click.** Inspection stays local until confirmation.
3. **Visible DOM only.** No cookies, player APIs, network replay, hidden tabs, automatic panel opening, or language switching in V0.1.
4. **Ordered completeness or failure.** The extractor preserves repeated cues and proves continuous ordered traversal; a partial result is never uploadable.
5. **Identity and revision are pinned.** Tab, route, video, document, panel, renderer, and selected-track evidence cannot change during a valid review. Any asynchronous server result computed from an older item content revision is discarded.
6. **Server owns trust decisions.** The client cannot assert policy, rights, retention, caption class, authoritative hashes, or downstream processing permission.
7. **Honest provenance.** The source is `browser_visible_transcript`, described to users and data consumers as a browser-visible observation.
8. **Retention is not processing consent.** External AI work stays held unless separately authorized.
9. **No silent replacement.** A different active transcript or note conflicts without mutation.
10. **Production cannot be promoted by configuration alone.** V0.1 code accepts no production mode.

## Users And Jobs

### Primary User

Arun is the AI Brain owner and the Chrome user viewing the YouTube page. He wants analysis-ready memory when he has rights to retain the content, while keeping his YouTube session out of Brain and Hetzner.

### Jobs To Be Done

1. Save the complete visible transcript track with cue starts and source evidence.
2. Know exactly what Brain inspected locally and what it will send.
3. Receive an honest typed failure when completeness or identity cannot be proven.
4. Save only the title/link when a transcript is unavailable or unwanted.
5. Retry safely after popup or worker interruption without duplicate sources.
6. Delete the item, source text, segments, notes, derived data, and receipts, with honest backup-expiry disclosure.

## Goals

1. Make an approved visible YouTube transcript locally capturable and reviewable.
2. Produce one committed item with one active source and ordered timestamped segments after confirmation.
3. Keep cookies, account data, browser storage, signed URLs, and Brain credentials on their respective sides of the boundary.
4. Prevent wrong-video association, partial success, stale-worker overwrite, duplicate active sources, and different-content replacement.
5. Provide a true metadata-only fallback that cannot start transcript recovery.
6. Produce fixture and canary evidence for a later production decision.

## Non-Goals

- No persistent browser or Chrome profile on Hetzner.
- No always-on content script, hidden tab, batch queue, playlist automation, or autoplay.
- No cookies, `webRequest`, network interception, page-world bridge, InnerTube, timedtext replay, PoToken, proxy rotation, CAPTCHA workarounds, or anti-bot bypass.
- No server-side YouTube request from either new endpoint.
- No automatic transcript-panel opening or language switching in V0.1.
- No browser audio capture or ASR fallback.
- No inference of manual versus ASR from labels, punctuation, density, style, or locale.
- No client-supplied caption class, rights basis, retention, or processing policy.
- No full transcript shown in the popup by default.
- No different-transcript replacement or multi-language active sources.
- No Shorts live canary in V0.1; Shorts remains fixture-only.
- No Chrome Web Store publication or production enablement under this PRD.

## Release Gates

| Stage | Capability | Data destination | Decision |
|---|---|---|---|
| Prototype | Interactive HTML demonstrates states and copy | Browser memory only | Go |
| Synthetic fixtures | Pure extractor parses packaged, non-identifying HTML fixtures | Test memory only | Go after V2 algorithm contract |
| Local MV3 E2E | Built extension exercises two-click flow against fixture pages and fake Brain | Disposable local DB | Go after P0 implementation gates |
| Approved live canary | One target, then at least 20 unique capture intents across at least five authorized standard watch videos | Separate disposable lab data root/DB | Conditional go after Stage 0 |
| Shorts live canary | Approved Shorts targets | Separate future lab | No-go in V0.1 |
| Production | Any browser-visible transcript | Production Brain DB | No-go |

## Final V0.1 Decisions

| Decision | V2 answer |
|---|---|
| Extension | Extend the existing Brain extension; no second extension |
| Permission | Add `scripting`; retain temporary `activeTab`; no persistent YouTube host permission |
| Supported live route | Standard `youtube.com/watch` only |
| Shorts | Fixture-only |
| Panel behavior | User opens panel and selects language; Brain does not click YouTube controls |
| Source kind | New distinct `browser_visible_transcript` method/source |
| Caption class | Server-owned `unknown` for schema V1 |
| Cue timing | Ordered `start_ms`; `duration_ms` and `end_ms` stored null in schema V1 |
| Optional note | Saved separately; forced `include_in_ai=false`; differing existing note conflicts |
| Link-only | YouTube companion fallback only in V0.1; zero fetch and zero recovery eligibility |
| Live storage | Separate lab data root and database; never the production DB |
| Live retention | Manifest-specific, maximum seven days for V0.1; delete-by required |
| Downstream AI | Held/disabled in V0.1 canary; separate later authorization required |
| Diagnostics | Content-free local aggregates for 30 days; server confirmed-request aggregates for 14 days |
| Extension caller | Exact private-manifest extension ID/version plus bearer and required route contract header |
| Platform review | Written target-specific YouTube/platform terms determination is required before any live automated DOM access |
| Production | Unconditionally blocked in code |

## End-To-End User Experience

### Preconditions

1. Brain extension is paired and connected.
2. Current top-level tab is a canonical YouTube watch route.
3. User opened YouTube's transcript panel and selected the desired visible language.
4. For a live canary, target video, extension ID/version, extractor version, run, retention, and cleanup are approved by the private manifest.

### Ready State

The popup reads only the tab URL and title before inspection. It does not inject a script, inspect panel availability, send a DOM message, or read transcript text. It shows existing title, URL, and optional note controls plus:

> YouTube video ready.

> Open the transcript panel and choose a language, then inspect. Nothing has been read.

Primary transcript action: `Inspect visible transcript`<br>
Alternative: `Save link only`

### Inspect Consent

Immediately above the inspect action:

> Brain will read the transcript currently visible in this YouTube tab. It stays in this popup until you save it or close the popup.

Clicking inspect is the first explicit action. It injects packaged code into the active top frame and reads no other tab.

### Inspecting

The popup announces `Inspecting visible transcript` in a polite live region and shows bounded progress without sending page/transcript data to Brain. Closing the popup discards the result. The extractor restores the panel's original scroll position whether it succeeds or fails.

### Review Ready

The compact review shows:

- visible track label and language code when stable;
- caption type `Unknown`;
- segment count and normalized character count;
- timestamp mode `Cue start times`;
- `Complete traversal proven` only when every completeness invariant passes;
- first and last cue start time, without rendering the full transcript;
- extractor version;
- data categories that will be sent;
- note exclusion from AI;
- session-data boundary.

The review is invalidated if the tab, URL, video, document, panel, renderer, or visible selected track changes.

### Confirm Consent

Immediately above the save action:

> Save this transcript to Brain? Brain will send the transcript text, cue times, video title and URL, visible language, and your optional note. YouTube cookies, Google account identifiers, browsing history, player data, and signed caption URLs are not sent. Your note is saved separately and excluded from AI.

For a retained live lab run, the confirmation also renders the manifest-derived deletion deadline and this non-editable statement:

> Brain will retain this lab capture until <approved delete-by date>. No external AI provider will receive this capture while it is held.

Primary action: `Save transcript to Brain`<br>
Secondary action: `Cancel`

Clicking save is the second explicit action. No transcript-bearing network request may occur earlier.

### Committed Receipt

Success appears only after the server transaction commits. Outcomes are:

- `Transcript saved` for a new item;
- `Transcript added` for an eligible metadata-only item;
- `Already saved` for the same active server-computed transcript hash.

The receipt exposes `Open in Brain` and states:

> Deleting this item removes its live transcript and derived data. Deleted content may remain in retained backups until normal backup expiry, approximately one week under current defaults.

### Link-Only Choice

Copy:

> Saves the title, link, and optional note. Brain will not inspect YouTube or queue transcript recovery.

Outcome: `Link saved` or `Link already saved`. It never uses transcript-success language.

### Existing Content Conflict

If Brain has a different active transcript:

> Brain already has a different transcript for this video. Nothing was replaced.

If Brain has a different note:

> Brain already has a different note for this video. Nothing was replaced.

Actions: `Open in Brain`, `Cancel`. V0.1 offers no overwrite.

## Typed Product States

| Code/state | User meaning | Retry/action | Storage |
|---|---|---|---|
| `setup_required` | Pair Brain before saving | Open setup | None |
| `unsupported_tab` | Open a supported YouTube watch video | Change tab | None |
| `ready` | YouTube watch page is eligible; nothing has been read | Open panel, inspect, or link-only | None |
| `panel_not_open` | Inspect found no visible transcript panel | Return to YouTube | None |
| `transcript_unavailable` | Inspect found a packaged, locale-independent empty-transcript structure | Link-only | None |
| `inspecting` | Local bounded traversal is running | Cancel/close | Memory only |
| `review_ready` | Complete ordered result is local | Confirm/cancel | Memory only |
| `unsupported_dom` | Packaged renderer is not recognized | Update/retry | None |
| `virtualization_incomplete` | Continuous traversal/final cue was not proven | Retry or link-only | None |
| `navigation_changed` | Tab/video/document/panel/track changed | Reopen stable page | None |
| `invalid_segments` | A cue was malformed, out of order, or over limit | Update/retry | None |
| `payload_too_large` | Result exceeds a fixed limit | Link-only | None |
| `stale_review` | Page identity changed after inspection | Inspect again | None |
| `saving` | Confirmed request is in flight | Wait | Server transaction only |
| `created` | New item/source committed | Open Brain | Durable |
| `upgraded` | Weak item upgraded atomically | Open Brain | Durable |
| `duplicate` | Same active transcript already exists | Open Brain | Receipt only/no content mutation |
| `existing_transcript_conflict` | Different active source exists | Open existing item | Existing data unchanged |
| `existing_note_conflict` | Different note exists | Open existing item | Existing data unchanged |
| `feature_disabled` | Packaged/server gate is off | Link-only | None |
| `policy_blocked` | Run/target/retention is not authorized | Stop | Content not stored |
| `unauthorized` | Pairing bearer is invalid | Re-pair | None |
| `origin_not_allowed` | Caller is not approved extension | Stop | None |
| `update_required` | Extension/contract/extractor is not accepted or has been disabled | Install approved packaged update | None |
| `rate_limited` | Request rate exceeded | Retry after response delay | None |
| `network_error` | Brain was unreachable | Retry same request while review remains | Memory only |
| `server_error` | Transaction failed | Retry same request | No partial commit |

`caption_source_class=unknown` is a normal review/success attribute, not an error state. A changed or unstable selected track is an identity error.

## Functional Requirements

| ID | Priority | Requirement | Required evidence |
|---|---|---|---|
| PRD2-F01 | P0 | Recognize canonical YouTube watch routes only for V0.1 live use. Keep Shorts parser cases fixture-only. | Shared URL contract tests |
| PRD2-F02 | P0 | Before inspect, perform zero script injection, DOM message, panel-presence query, transcript read, or transcript telemetry. The ready state is based only on tab URL/title. | MV3 E2E instrumentation |
| PRD2-F03 | P0 | Inject packaged code into the active top frame in the default isolated world using temporary `activeTab` and `scripting`. | Manifest and executeScript assertions |
| PRD2-F04 | P0 | Read only one already-visible transcript panel and stable selected-track evidence. Do not open controls or switch tracks. | Closed/hidden/ambiguous/multi-track fixtures |
| PRD2-F05 | P0 | Parse one supported renderer family from `textContent`; reject mixed, unknown, malformed, or script-bearing markup as data only. | Pure fixture/property tests |
| PRD2-F06 | P0 | Build an ordered cue sequence through longest suffix/prefix overlap between viewport snapshots; preserve repeated cues; never globally deduplicate or sort. | Repeated/equal-time/virtualized fixtures |
| PRD2-F07 | P0 | Start at logical top, advance less than one viewport, reject zero overlap/gap/stuck/replacement, and prove physical bottom plus three mutation-quiet identical terminal checks. | Traversal proof tests |
| PRD2-F08 | P0 | Restore original panel scroll position in `finally`. | Success/failure/cancel E2E |
| PRD2-F09 | P0 | Pin and recheck top frame, tab ID, start URL, video ID, route, document, panel, renderer, and selected-track evidence during extraction and before confirm. | SPA/document/panel/track race tests |
| PRD2-F10 | P0 | Enforce shared V1 limits: 15 seconds, 150 scrolls, 7,200 segments, 500,000 normalized characters, 2,000 characters/cue, 2 MiB request, three stable checks. | Exact boundary tests client/server |
| PRD2-F11 | P0 | Keep unconfirmed transcript content in popup/execution memory only and send nothing transcript-bearing before confirmation. | Storage/network/console E2E |
| PRD2-F12 | P0 | Route confirmed data only through fixed service-worker helper. Page code cannot access token, destination, or request authority. | Host/token/message tests |
| PRD2-F13 | P0 | Require bearer header, present exact approved extension origin, required route contract version, approved extension/extractor versions, strict JSON, and hard streamed body cap. Reject cookie-only access. | Route security matrix |
| PRD2-F14 | P0 | Server computes normalized text, text hash, request hash, caption class, timing mode, policy, and provenance. | Schema/server recomputation tests |
| PRD2-F15 | P0 | Persist item, policy, active source, ordered segments, note, processing hold, recovery resolution, derived reset, and terminal receipt in one transaction. | Failure injection at every step |
| PRD2-F16 | P0 | Same request/hash replays; same request/different hash conflicts; same video/text/new request duplicates; different source/note conflicts without mutation. | Idempotency and concurrency tests |
| PRD2-F17 | P0 | Resolve recovery in browser transaction and require stale worker compare-and-apply before any upgrade. | Deterministic interleaving tests |
| PRD2-F17A | P0 | Increment a database-backed item content revision on every body change. Recovery, URL upgrade, enrichment, and embedding claims/apply steps must compare their expected revision and discard stale results. | Deterministic barrier tests for every async writer |
| PRD2-F18 | P0 | Enforce at most one `status='active'` transcript source per item in SQLite after historical preflight. | Migration and concurrent insert tests |
| PRD2-F19 | P0 | Save optional note separately with `include_in_ai=false`; never overwrite a different existing note. | Note policy/conflict tests |
| PRD2-F20 | P0 | Insert an active downstream-processing hold for V0.1 and prevent enrichment/embedding workers from claiming held items. | Worker-gate tests |
| PRD2-F21 | P0 | Implement link-only using explicit extraction method/eligibility that the DB trigger, route, and all backfill paths exclude from transcript recovery. Every extension command named `Save link`, including hyperlink context menu and disabled companion fallback, uses it. | Throwing-fetch/no-job/backfill/context-menu tests |
| PRD2-F22 | P0 | Run live canary only against a non-production runtime and separate lab DB/data root authorized by private manifest. | Startup/manifest negative matrix |
| PRD2-F23 | P0 | Production runtime wins over every lab/config override and rejects this method before content parsing/persistence. | Production policy tests |
| PRD2-F24 | P0 | Delete item/source/segments/note/holds/receipts/derived rows and verify backup-expiry disclosure. | Deletion integration and restore audit |
| PRD2-F25 | P0 | Provide independent packaged-extension and server kill switches; server disable is immediate normal rollback. | Flag matrix and deployed smoke |
| PRD2-F26 | P1 | Emit only allowlisted aggregate diagnostics with no content or request/item/video/page identifiers. | Canary-string privacy tests |
| PRD2-F27 | P1 | Provide keyboard, focus, live-region, zoom, long-label, and reduced-motion behavior for every state. | Accessibility E2E |
| PRD2-F28 | P0 | Require a written YouTube/platform-terms determination in the private approval packet before any live automated DOM inspection, not only before production. | Stage 0 artifact validator/human sign-off |

## Nonfunctional Requirements

| ID | Category | Requirement |
|---|---|---|
| PRD2-N01 | Integrity | False success, wrong-video association, stale overwrite, and duplicate active source are each zero in all automated and canary evidence. |
| PRD2-N02 | Privacy | No cookie, browser storage, account identity, history, player response, signed URL, token, transcript/note text, title, URL, video ID, or track label appears in diagnostics/logs/reports/screenshots. |
| PRD2-N03 | Security | No remote code/selectors, `eval`, MAIN-world execution, arbitrary destination, missing-origin acceptance, cookie-only auth, persistent YouTube host access, or page-to-extension token bridge. |
| PRD2-N04 | Performance | Up to 30-minute fixture p95 local extraction <=3 seconds. Up to 3 hours/7,200 cues p95 <=10 seconds. Hard stop <=15 seconds. |
| PRD2-N05 | API | Confirm-to-commit p95 <=2 seconds in lab for valid payloads below 500,000 characters, excluding held downstream processing. |
| PRD2-N06 | Accessibility | Complete keyboard operation, logical focus, named controls, polite status announcements, no color-only meaning, 200% zoom support, and reduced motion. |
| PRD2-N07 | Maintainability | Selectors, renderer parsers, limits, and extractor version ship in the package; server can disable but cannot send executable updates. |
| PRD2-N08 | Compatibility | Test the packaged build on current and previous stable Chrome at implementation time; pin the minimum tested version before lab packaging. |
| PRD2-N09 | Rollback | Normal rollback is server disable on the forward-compatible release. Previous-binary rollback is unavailable until migration-026 compatibility rehearsal passes. |

## Data Inventory

| Data | Before confirm | After confirm | Retention/control |
|---|---|---|---|
| Transcript cue text/start times | Extension memory only | Item body/source/segments in lab DB | Manifest max seven days; item deletion |
| Title/canonical URL/video ID | Popup memory/current tab | Item and policy data | Item lifetime; lab delete-by |
| Visible track label/language | Popup memory | Source provenance when stable | Source lifetime |
| Caption class | Not inferred | Server writes `unknown` | Source lifetime |
| Completeness counters/version | Popup memory | Source provenance and aggregate buckets | Source lifetime; aggregate expiry |
| Optional note | Popup memory | Separate item note, AI-off | Note/item deletion |
| Request receipt/hash | Generated locally/hash server-side | Receipt table | Item deletion in V0.1 |
| Processing hold | Not applicable | Active hold linked to source/policy | Source/item deletion or separately approved release |
| Brain bearer | Extension storage/authorization header | Never persisted by route | Until rotation/unpair |
| Cookies/profile/storage/account/history | Never read | Never sent/stored | Not applicable |
| Player response/signed caption/media URL | Never read | Never sent/stored | Not applicable |

Unconfirmed data is never written to `chrome.storage`, IndexedDB, clipboard, downloads, console, diagnostics, crash reports, or service-worker persistence.

## Private Lab Manifest Gate

Before retained live text, a root/operator-owned mode-`0600` private JSON manifest outside Git must validate:

- schema version and unique run ID;
- approval ID, reviewer, issue/expiry time, operator, cleanup owner;
- written platform-terms decision reference, decision owner, scope, and expiry;
- exact non-production environment and separate lab data-root identity;
- exact extension ID and extension version;
- accepted extractor and route-contract versions;
- exact watch-page video IDs and rights basis (`owned_youtube_channel` or `authorized_youtube_video`);
- full-text retention allowed, captured-at window, mandatory delete-by no later than seven days;
- processing mode `hold` for V0.1;
- diagnostic retention of 14 server days and 30 local days;
- cleanup command identifier and verification query identifier;
- backup policy/disclosure acknowledgement;
- manifest content hash.

The route rejects symlinked, group/world-readable, expired, production-targeting, unlisted, mismatched, or unknown-version manifests. Private IDs and targets are never committed.

The user's legal-approval statement is accepted as context; the live gate still requires the machine-verifiable private artifact.

## Metrics And Stop Conditions

### Product Metrics

| Metric | Target |
|---|---:|
| Supported fixture extraction classification | 100% |
| New-content commit rate | >=95% across at least 20 unique intents and five approved watch videos; retries excluded |
| Same-content duplicate resolution | 100% |
| Same-request idempotent replay | 100% |
| False transcript success | 0 |
| Partial/incomplete source committed | 0 |
| Wrong video/document/panel/track association | 0 |
| Credential/session/content diagnostic leakage | 0 |
| Stale recovery overwrite | 0 |
| Multiple active source per item | 0 |
| Different transcript/note overwrite | 0 |
| Unapproved downstream worker claim | 0 |
| Canary deletion/cleanup verification | 100% |
| Moderated consent comprehension | 5/5 participants or reviewers correctly explain local inspect, transfer, retention, and no external AI processing |

Server metrics cover only confirmed requests. A canary operator records content-free local inspect outcome counts by extractor version and error code so pre-confirm failures are not hidden from the reliability denominator.

### Immediate Stop Conditions

Stop the canary, disable the server route, and preserve redacted evidence on any:

- privacy/session/token leak;
- unexpected target or extension accepted;
- partial or wrong-identity success;
- stale worker mutation;
- duplicate active source;
- unapproved enrichment/embedding claim;
- failed deletion/cleanup;
- platform complaint or policy concern;
- three consecutive known-layout failures, or unsupported-DOM rate above 5% once at least 20 eligible inspections exist;
- P0/P1 defect.

## Accessibility Acceptance

1. Tab order follows title, note, inspect/link-only, review, confirm/cancel, receipt.
2. Focus moves to the new state heading and never disappears behind rerender.
3. Escape/cancel before confirm uploads nothing.
4. Screen readers announce inspecting, review ready, saving, result, and error once.
5. Long localized labels and titles wrap without clipping at popup widths and 200% zoom.
6. Buttons use icons where familiar and accessible names/tooltips where the symbol is not universal.
7. Reduced motion removes nonessential transitions.

## Milestones And Exit Gates

| Milestone | Deliverable | Exit gate |
|---|---|---|
| YTC2-0 | Final PRD/plan/reviews, threat model, private manifest schema | Every review finding resolved; production no-go explicit |
| YTC2-1 | True link-only route and recovery exclusion | Zero fetch, zero trigger/backfill job, idempotent metadata save |
| YTC2-2 | Pure ordered extractor and synthetic fixtures | Full parser/traversal/property matrix green |
| YTC2-3 | Popup reducer and service-worker flow | Two consent actions, accessibility, no pre-confirm send |
| YTC2-4 | Policy/auth/migration/atomic service/race hardening | Security, migration, CAS, uniqueness, hold, deletion tests green |
| YTC2-5 | MV3 local E2E | Permission, identity, race, privacy, restart, overflow matrix green |
| YTC2-6 | One-target live canary | Separate lab, manifest, retain/delete/backup evidence clean |
| YTC2-7 | Expanded watch canary | Up to 20 approved attempts, metrics and stop review pass |
| YTC2-8 | Separate production decision packet | No production implementation under V0.1 |

## Ownership

| Area | Driver | Required reviewer/approver |
|---|---|---|
| Product scope/copy/metrics | Arun/product manager | Privacy and architect |
| Extractor/extension | Extension engineer | Architect, security, QA |
| Endpoint/persistence/migration | Backend engineer | Architect, data owner, security |
| Manifest/rights/retention | Arun/operator | Legal/platform/privacy reviewer |
| Downstream processing | AI Brain data owner | Privacy/security/provider approver |
| Fixture/E2E/accessibility | QA engineer | Product and security |
| Canary/cleanup | Named lab operator | Arun and privacy reviewer |
| Production enablement | Unassigned | Separate cross-functional approval and code change |

## Product Acceptance Gates

### Synthetic And Local

- Every P0 requirement has a named automated test.
- Repeated cues are preserved in order; zero-overlap and every cap fail closed.
- No DOM read before inspect and no transcript network before confirm.
- Exact extension caller contract is enforced.
- Link-only produces no current or future recovery eligibility.
- Recovery race, active-source concurrency, note conflict, processing hold, deletion, and migration tests pass.
- No sensitive canary strings appear in outputs or committed artifacts.

### Live Canary

- Private manifest and separate data root pass startup and route validation.
- Standard watch targets only; exact extension/extractor only.
- Processing remains held and external provider credentials/workers cannot claim held data.
- One-target create, retry, duplicate, conflict, stale-worker, and delete sequence is clean before expansion.
- Expansion produces at least 20 unique capture intents across at least five approved watch videos; retries do not count.
- The versioned consent flow passes 5/5 moderated comprehension checks.
- All metrics and stop conditions pass; cleanup completes by delete-by.

### Production

Production is explicitly not approved. A later decision must include fresh platform/legal/privacy/security review, scoped extension credential, distribution/disclosure decision, canary evidence, content eligibility, retention/support/incident policy, and a reviewed code change removing the production block.

## Risks That Remain

| Risk | Post-V2 handling |
|---|---|
| YouTube changes unversioned DOM | Bundled selectors, fail closed, extractor disable, fixtures, stop threshold |
| Virtualization cannot be proven for a layout | Return `virtualization_incomplete`; no fallback upload |
| Visible access lacks retention rights | Exact approved targets and rights basis; production no-go |
| Shared bearer has broad scope | Exact origin in lab; scoped extension credential required before production |
| DOM evidence is not official caption evidence | Source named browser-visible observation; caption class unknown |
| Deleted content persists in backups temporarily | Receipt disclosure and verified normal expiry |
| Lab behavior diverges from production | Production-shaped disposable snapshot, but never production DB/runtime |
| Store/platform rejects future distribution | Keep link-only behavior; no store/production release under V0.1 |

## Glossary And Traceability

| Term | Meaning |
|---|---|
| Inspect | Local DOM read after the first explicit click; no transcript transfer |
| Confirm/save | Fixed-origin transfer after the second explicit click |
| Browser-visible observation | Honest provenance for rendered DOM text; not an official-caption claim |
| Duplicate | Same server-computed active transcript hash; no second source |
| Content revision | Monotonic database version of an item's body used to reject stale async results |
| Processing hold | Durable block preventing enrichment/embedding of this captured body |

The implementation plan maps PRD2 requirement groups to tasks and tests: F01-F12 to YTC2-2/3, F13-F20 to YTC2-4, F21 to YTC2-1, F22-F28 to YTC2-0/5/6. The resolution matrix provides finding-to-section traceability.

## Definition Of Done

This final PRD is complete when:

1. it and the V2 implementation plan are committed and linked with both specialist reviews, both adversarial reports, and the resolution matrix;
2. all review findings have a resolved, deferred-with-no-go, or rejected-with-evidence disposition;
3. documentation, relative-link, privacy, and repository checks pass;
4. the branch is pushed and a GitHub pull request/report is available.

Implementation is not part of this planning PR. Fixture/local implementation may start from the V2 plan. Retained live work and production remain governed by their explicit gates.
