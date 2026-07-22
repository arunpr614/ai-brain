# AI Brain Explicit-Click YouTube Transcript Capture - PRD V1

**Created:** 2026-07-22 13:20 IST<br>
**Author:** Codex, acting product lead<br>
**Product-manager reviewer:** Gibbs agent, review pending<br>
**Technical-architect reviewer:** Halley agent, review pending<br>
**Status:** Draft V1 for specialist and adversarial review<br>
**Decision state:** Conditional go for synthetic/local and approved lab validation; production no-go<br>
**Target release:** Unscheduled; release identifier assigned only after the production decision gate<br>

## Related Evidence

- [Chrome companion repository landscape](../../research/youtube-transcripts/2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md)
- [YouTube transcript repository landscape](../../research/youtube-transcripts/2026-07-22_10-32-45_IST_github_youtube_transcript_repository_landscape_v1.md)
- [Live adapter bakeoff](../../research/youtube-transcripts/2026-07-22_10-32-45_IST_youtube_transcript_live_adapter_bakeoff.csv)
- [Current Brain extension manifest](../../../extension/manifest.json)
- [Current extension popup](../../../extension/src/popup.ts)
- [Current extension capture helper](../../../extension/src/capture.ts)
- [Existing transcript policy model](../../../src/lib/capture/policy.ts)
- [Existing transcript source model](../../../src/db/transcripts.ts)
- [Existing user-provided transcript route](../../../src/app/api/capture/transcript/route.ts)
- [v0.8.4 provider strategy](../v0.8.4-youtube-transcript-provider-resilience-implementation-plan-2026-06-11_15-09-51_IST.md)
- [v0.8.5 production operations plan](../v0.8.5-youtube-backfill-production-ops-implementation-plan-2026-06-11_21-26-01_IST.md)

## Executive Decision

Extend the existing Brain Chrome extension with a narrow YouTube-specific capture mode. The mode runs only after the user opens the Brain popup on an eligible YouTube video and explicitly chooses to inspect the transcript already visible in YouTube. The extension must then show a bounded evidence preview and require a second explicit confirmation before any transcript content is sent to Brain.

The preferred acquisition path is visible transcript-panel DOM extraction in Chrome's isolated extension world. It must not copy or export cookies, browser profiles, local storage, signed caption URLs, authentication headers, or Google account data. It must not fetch YouTube captions from the Brain server, navigate hidden tabs, run persistently on YouTube, or claim that a transcript is complete unless the bounded extractor proves it reached a stable final cue.

This PRD does not approve production use. Fixture-only implementation and a controlled lab canary may proceed only after the approval manifest, retention rules, and cleanup plan are machine-checkable. Production remains blocked until a separate platform, legal, privacy, and security decision explicitly supersedes the current no-go posture.

## Context

AI Brain currently captures a URL, title, optional note, or selected text from the existing Manifest V3 extension. For YouTube, the server-side path can save metadata and queue transcript recovery, but production evidence shows provider requests can return rate limits or anti-bot failures. The user can therefore end up with a valid saved item that has only metadata and cannot support transcript-level search, synthesis, or citation.

The user's local Chrome session can often display a transcript that the server cannot retrieve. A user-invoked extension can read the same rendered DOM already visible to the user without exporting the session. This improves technical reliability and narrows credential exposure, but it remains automated page extraction and introduces platform-policy, privacy, selector-maintenance, and access-limited-content risks.

## Current-State Facts

1. The current extension already has a popup, service worker, fixed Brain origin, bearer token, `activeTab`, `tabs`, `storage`, notifications, and typed URL-capture failures.
2. It does not have the `scripting` permission, a YouTube DOM extractor, a preview/confirm state machine, or automated tests.
3. `/api/capture/transcript` labels input as `user_paste` or `uploaded_file`; browser-visible captions require a distinct route and provenance.
4. The database can store policy decisions, transcript sources, text hashes, caption class, timestamp mode, and timestamped segments.
5. The current policy model can allow `lab_public_caption` in production when a legal approval ID is present. That behavior is not strict enough for this feature and must not be reused as the production gate.
6. Existing provider and backfill plans explicitly defer browser-authorized capture and prohibit mixing it into the current production operations slice.
7. Pure DOM evidence can capture the selected visible track but cannot reliably prove manual versus ASR identity. `caption_source_class` must remain `unknown` unless a future, separately reviewed evidence contract proves otherwise.

## Product Problem

When Arun saves a YouTube video whose server-side transcript recovery is weak or blocked, AI Brain cannot reliably retain the transcript that Arun can already see in Chrome. Requiring manual copy/paste is slow, loses timestamps and provenance, and makes failure hard to understand. A background browser or server-side session would improve access at the cost of concentrating credentials, expanding the permission surface, and creating invisible automation.

The product needs a user-controlled middle path: inspect only the transcript deliberately made visible in the active tab, prove the capture is complete, show what will be retained, and send it only after confirmation.

## Target Users And Jobs

### Primary User

**Arun, the AI Brain owner and signed-in Chrome user**

- Watches a YouTube video and wants it to become analysis-ready memory.
- Values capture reliability but does not want browser credentials transferred to Hetzner.
- Needs plain, honest failures rather than a metadata-only save presented as transcript success.
- May view owned, public, unlisted, private, or access-limited content; visibility alone is not proof of retention rights.

### Secondary Stakeholders

- **AI Brain operator:** needs feature flags, aggregate health signals, deletion, rollback, and no sensitive logs.
- **Future maintainer/agent:** needs typed contracts, fixtures, selector diagnostics, and an explicit production gate.
- **Policy/privacy reviewer:** needs the exact data inventory, access model, retention rule, target manifest, and disclosure text.

### Jobs To Be Done

1. When a useful YouTube transcript is visible, help me save the complete selected track into Brain without copying it manually.
2. Before anything leaves Chrome, show me what Brain found and whether it proved completeness.
3. If Brain cannot safely capture the transcript, tell me why and save nothing partial or mismatched.
4. Let me save the link only when a transcript is unavailable or I do not want to retain it.
5. Let me find and delete the resulting Brain item and all transcript-derived data later.

## Product Principles

1. **User gesture before read:** opening the popup is not consent to inspect transcript text; `Inspect visible transcript` is the first explicit action.
2. **Review before transfer:** inspection remains local; `Save transcript to Brain` is the second explicit action.
3. **Visible DOM only:** capture the track the user selected and displayed. Do not silently open panels, switch languages, replay caption URLs, or navigate hidden tabs in the first version.
4. **Fail closed:** partial, unstable, identity-mismatched, or oversized results are not success and are not uploaded.
5. **Least privilege:** add `scripting`, retain `activeTab`, and do not add persistent YouTube host access for the first version.
6. **No credential bridge:** the page never receives the Brain token and Brain never receives the browser session.
7. **Honest provenance:** store `browser_visible_transcript`, completeness evidence, extractor version, visible track label, and `caption_source_class=unknown` when identity is unproven.
8. **No policy promotion by configuration alone:** production must remain blocked in code until a reviewed change deliberately enables it.

## Goals

1. Make approved YouTube captures analysis-ready when a complete visible transcript is available.
2. Preserve the current extension's fast link-only capture as an always-available alternative.
3. Give the user an understandable two-click consent and review flow.
4. Prevent partial transcript uploads, cross-video races, duplicate sources, and silent replacement of an existing different transcript.
5. Keep Google/YouTube session data local to Chrome.
6. Produce fixture-backed evidence sufficient for a later production decision.

## Non-Goals

- No always-on YouTube content script or network interception.
- No cookie, profile, local-storage, session-storage, authorization-header, or signed-URL access.
- No persistent logged-in browser on Hetzner.
- No background InnerTube, timedtext, PoToken, alternate client, proxy rotation, CAPTCHA, or anti-bot workaround.
- No hidden tab, batch queue, playlist capture, or automatic capture.
- No automatic opening of the transcript panel in the first version.
- No browser audio capture or ASR fallback in this feature.
- No manual/ASR inference from punctuation, density, style, or localized labels.
- No full-transcript rendering in the popup by default.
- No replacement of a different active transcript without a separate explicit conflict-resolution design.
- No Chrome Web Store publication until disclosure and single-purpose review are complete.
- No production public, private, unlisted, member-only, or age-gated capture under this PRD's current decision state.

## Scope By Release Gate

| Stage | User-visible capability | Data destination | Decision |
|---|---|---|---|
| Fixture development | Brain popup recognizes local YouTube-shaped fixtures, inspects synthetic visible transcripts, previews evidence | Memory only; local synthetic fixtures | Go |
| Local extension-to-fixture E2E | Built MV3 extension exercises inspect, preview, confirm, typed failures, duplicate retry | Local fake Brain endpoint and disposable DB | Go |
| Approved lab canary | User invokes capture on reviewed owned/authorized video IDs from a private manifest | Lab Brain environment under approved retention | Conditional go after Stage 0 gates |
| Production candidate | Same UX against production Brain | Production persistent storage | No-go until separate policy decision |
| General availability | Eligible user-selected videos | Production persistent storage | Out of scope |

## Ideal User Experience

### Preconditions

1. Brain extension is paired and connected.
2. The current tab is a supported `youtube.com/watch` or `youtube.com/shorts` video route.
3. The user has opened YouTube's transcript panel and chosen the desired visible language.
4. For lab use, the video ID and retention rule are present in the private approved target manifest.

### Happy Path

1. User clicks the Brain toolbar icon.
2. Popup shows the existing title, URL, and optional note controls.
3. A YouTube transcript section says `Visible transcript detected` and `Nothing has been read yet`.
4. User clicks `Inspect visible transcript`.
5. Popup shows local progress while the isolated extractor walks the visible panel under strict time, scroll, segment, and size limits.
6. Brain rechecks the video identity and proves a stable final cue.
7. Popup shows a compact review:
   - visible track label and language when available;
   - segment count and normalized character count;
   - timestamp mode;
   - completeness result;
   - caption type `Unknown` unless proven;
   - exact data categories that will be sent;
   - statement that cookies, account data, and signed caption URLs are not sent.
8. User clicks `Save transcript to Brain`.
9. Server validates authentication, origin, feature mode, manifest/policy, identity, request limits, completeness evidence, timings, hash, idempotency, and conflict rules.
10. Popup shows `Created`, `Upgraded`, or `Already saved` only after the transaction commits.
11. Success receipt lists the saved link, transcript segments, provenance, and no-session-data boundary, with `Open in Brain`.

### Panel Closed

1. Popup says `Open the transcript on YouTube` and offers `Return to YouTube` or `Save link only`.
2. User returns to the page; Chrome closes the popup.
3. User opens YouTube's transcript panel and selects a language.
4. User clicks Brain again and follows the happy path.

### Existing Different Transcript

1. Server detects an active transcript with a different normalized hash.
2. Popup states that Brain already contains a different transcript and does not overwrite it.
3. User may open the existing item or cancel. Replacement/multi-language behavior is future scope.

## Functional Requirements

| ID | Priority | Requirement | Acceptance Evidence |
|---|---|---|---|
| PRD-F01 | P0 | Recognize only supported canonical YouTube video routes and reject channels, playlists without a video, embeds outside the approved set, malformed IDs, and non-YouTube tabs. | URL contract tests shared across extension/server cases |
| PRD-F02 | P0 | Do not inspect page transcript text until `Inspect visible transcript` is clicked. | MV3 E2E asserts zero injection before action |
| PRD-F03 | P0 | Inject only into the active tab using `activeTab` plus `scripting`, in the default isolated world, after the explicit action. | Manifest test and E2E service-worker/permission assertions |
| PRD-F04 | P0 | Read only the already-visible transcript panel and selected visible track. Do not click localized controls or switch languages in V0.1. | Closed-panel fixture returns `panel_not_open`; multi-track fixture captures selected visible track only |
| PRD-F05 | P0 | Support current modern and legacy transcript segment renderers and a mixed/unknown layout failure. | Synthetic parser fixtures |
| PRD-F06 | P0 | Walk virtualized panels under bounded scrolling and succeed only after bottom, final cue, scroll height, and segment set are stable for three consecutive checks. | Long virtualized fixture and unstable fixture |
| PRD-F07 | P0 | Recheck tab/video identity after extraction; reject when navigation changes. | SPA race E2E |
| PRD-F08 | P0 | Normalize cue text from `textContent` only, deduplicate by normalized timing/text key, validate finite nonnegative monotonic timings, and never preserve HTML. | Parser/unit/property tests including script-like cue text |
| PRD-F09 | P0 | Enforce client and server limits: 2 MiB serialized body, 500,000 normalized characters, 7,200 segments, per-cue text limit, 12-second extraction, and 240 scroll iterations. | Boundary/over-limit tests at both layers |
| PRD-F10 | P0 | Show review evidence without rendering the full transcript by default. | Popup screenshot/DOM assertions and overflow checks |
| PRD-F11 | P0 | Send transcript content only after `Save transcript to Brain`; preserve `Save link only`. | Network interception E2E |
| PRD-F12 | P0 | Use a dedicated fixed-origin endpoint and typed request schema; page content cannot choose the destination. | Capture helper tests and manifest host-permission assertion |
| PRD-F13 | P0 | Create a new item or upgrade an existing metadata-only/weak item atomically; same hash returns duplicate; different active transcript returns conflict without overwrite. | Route/service transaction tests |
| PRD-F14 | P0 | Persist optional user note atomically with the capture, using the existing manual-note model rather than mixing note text into transcript provenance. | New item/upgrade/note rollback tests |
| PRD-F15 | P0 | Persist browser-visible provenance, policy decision, unknown caption class, timing mode, extractor version, request ID, server-computed hash, and segments. | DB assertions after capture |
| PRD-F16 | P0 | Same request ID and same request hash is idempotent; same request ID with different payload is a typed conflict. | Retry and mutation-mismatch tests |
| PRD-F17 | P0 | No empty, partial, unstable, policy-blocked, or identity-mismatched transcript is stored as success. | Negative test matrix and DB no-write assertions |
| PRD-F18 | P0 | Item deletion cascades through transcript source, segments, derived chunks, vectors, summaries/jobs, note, and request-id receipt according to the existing deletion contract. | Deletion integration test |
| PRD-F19 | P0 | Feature can be disabled independently in the extension package and at the server route. Server production mode rejects the source in code. | Flag matrix tests and production-mode negative test |
| PRD-F20 | P1 | Provide local aggregate diagnostics with no titles, URLs, video IDs, transcript text, track labels, account identity, or tokens. | Privacy unit test and exported diagnostic snapshot |
| PRD-F21 | P1 | Provide `Open in Brain` for created, upgraded, duplicate, and existing-transcript-conflict outcomes. | Popup interaction tests |
| PRD-F22 | P2 | Evaluate same-tab automatic panel opening only after V0.1 reliability and policy review. | Separate future decision; not a V0.1 acceptance criterion |

## Nonfunctional Requirements

| ID | Category | Requirement |
|---|---|---|
| PRD-N01 | Privacy | The extension, endpoint, logs, diagnostics, screenshots, fixtures, and reports contain no browser cookies, profile data, local/session storage, Google identity, signed caption URLs, Brain tokens, or private transcript samples. |
| PRD-N02 | Security | No remote code, remote selectors, `eval`, MAIN-world execution, page-to-extension URL choice, persistent YouTube host permission, or arbitrary extension-origin fetch. |
| PRD-N03 | Reliability | False transcript-success rate is 0 in the automated matrix; partial or unproven completeness is a failure. |
| PRD-N04 | Performance | Synthetic complete transcript up to 30 minutes: local extraction p95 <= 3 seconds. Up to 3 hours/7,200 segments: p95 <= 10 seconds and hard stop <= 12 seconds on the reference fixture runner. |
| PRD-N05 | API latency | Confirm-to-committed-response p95 <= 2 seconds for payloads under 500,000 characters on the lab environment, excluding later asynchronous enrichment. |
| PRD-N06 | Accessibility | Popup is keyboard operable, focus ordered, screen-reader labeled, status changes use polite live regions, errors do not rely on color, and reduced-motion preference disables nonessential animation. |
| PRD-N07 | Maintainability | Selector families, extractor version, typed errors, and fixture coverage are packaged with the extension; remote configuration may disable versions but may not deliver executable code or selectors. |
| PRD-N08 | Observability | Server records aggregate outcome, duration bucket, size bucket, extractor version, and policy result only. It never records content or identifying page fields. |
| PRD-N09 | Compatibility | Chrome/Edge Manifest V3 current stable; exact minimum browser version set during implementation from the APIs actually used. Firefox is out of scope. |
| PRD-N10 | Data integrity | Item, note, policy, transcript source, segments, request receipt, and derived-work reset commit or roll back together. |

## Typed User States

| Code | User message/meaning | Retry | Storage |
|---|---|---|---|
| `not_youtube_video` | Open a supported YouTube video first | No on current page | None |
| `panel_not_open` | Open YouTube's transcript panel and choose a language | Yes | None |
| `transcript_unavailable` | This video/session exposes no transcript | No unless availability changes | Link only if user chooses |
| `unsupported_dom` | YouTube layout is not recognized by this extractor version | After extension update | None |
| `virtualization_incomplete` | Brain could not prove it reached the final cue | Yes | None |
| `navigation_changed` | The video changed during inspection | Yes on stable page | None |
| `track_identity_unknown` | Text is capturable but manual/ASR cannot be proven | Text may proceed under policy; identity-specific gates fail | Store `unknown` only |
| `payload_too_large` | Transcript exceeds capture limits | No in V0.1 | None |
| `invalid_segments` | Cue timing/text failed validation | After extension update/retry | None |
| `existing_transcript_conflict` | Brain already has a different active transcript | No overwrite; open existing item | Existing data unchanged |
| `feature_disabled` | Browser transcript capture is disabled | No until enabled | None |
| `policy_blocked` | This run/video/retention is not authorized | No | Blocked decision/aggregate only |
| `unauthorized` | Brain pairing token is invalid | Re-pair | None |
| `rate_limited` | Too many capture requests | Yes after retry interval | None |
| `network` | Brain could not be reached | Yes; no implicit queue | Local result discarded on close |
| `server_error` | Brain failed before commit | Yes with same request ID | Transaction rolled back |

## Data Inventory And Retention

| Data | Collected | Destination | Retention |
|---|---|---|---|
| Canonical YouTube URL and video ID | After confirmation | Item/policy/request receipt | Until item deletion |
| Page title | After confirmation | Item | Until item deletion/edit |
| Optional note | After confirmation | Existing item-note tables | Until note/item deletion |
| Visible track label | After confirmation when available | Transcript provenance | Until transcript/item deletion |
| Language code | After confirmation only when stable evidence exists | Transcript source | Until transcript/item deletion |
| Transcript cue text/timings | After confirmation | Item body and transcript segments | Per approved retention class; deletable |
| Extractor/completeness counters | After confirmation | Provenance and aggregate metrics | Item lifetime for provenance; aggregate retention policy for metrics |
| Client/server text hash | After confirmation | Request/source records | Item/request receipt lifetime |
| Brain bearer token | Existing extension configuration | `chrome.storage.local` only; authorization header in transit | Until unpaired/rotated |
| Browser cookies/session/profile/Google identity | Never | Nowhere | Not applicable |
| Signed caption URLs/player response | Never in V0.1 | Nowhere | Not applicable |

Local inspection data must remain in popup/service-worker memory only. It must not be written to `chrome.storage`, IndexedDB, clipboard, downloads, console logs, or crash reports. Closing the popup, changing the tab, or restarting the worker discards unconfirmed content.

## Legal, Policy, And Privacy Gates

### Stage 0 Lab Gate

Before any retained live transcript:

1. Private approval artifact has ID, reviewer, issued/expiry dates, allowed account alias, exact video IDs, rights basis, allowed data classes, retention, cleanup owner, and deletion deadline.
2. Private target manifest exists outside Git with exact video IDs and matches the approval artifact.
3. Every live target is owned or otherwise explicitly authorized for the approved research.
4. Lab feature mode is disabled by default and cannot run in production.
5. No real transcript text or identifying screenshot is committed or placed in public reports.
6. Cleanup/deletion command and verification query are rehearsed on synthetic data.

The user's statement that research approval exists is important context but is not, by itself, the machine-verifiable artifact required by this gate.

### Production Decision Gate

Production remains no-go until all are complete:

1. Fresh YouTube platform-terms review and written decision for the proposed behavior.
2. Chrome user-data disclosure/privacy review, and Chrome Web Store single-purpose review if distributed.
3. Security review of the built extension, permissions, endpoint, migration, logs, and threat model.
4. Approved policy for public versus owned/authorized versus access-limited content.
5. Explicit retention, deletion, support-access, and incident rules.
6. Controlled canary evidence meets every metric and no-go threshold.
7. A new PRD/decision record changes the code-level production block. An environment variable or approval ID alone cannot promote the feature.

## Metrics And Measurement

### Primary Outcome

**Approved capture completion rate**

```text
committed created/upgraded/duplicate captures
------------------------------------------------
user-confirmed approved lab capture requests
```

Target during controlled canary: >= 95%, excluding deliberate policy-block and existing-transcript-conflict cases.

### Trust Guardrails

- **False success:** 0 cases where UI shows transcript success without committed active source and expected segment count.
- **Partial upload:** 0 active sources from `virtualization_incomplete`, identity mismatch, validation failure, or over-limit results.
- **Credential/session leakage:** 0 findings in automated scans and E2E canary-token tests.
- **Idempotency:** 100% same-request retries return one item/source outcome; 0 duplicate active sources.
- **Conflict safety:** 100% different-active-transcript cases leave existing data unchanged.
- **Deletion:** 100% approved canary deletions remove source, segments, body-derived chunks/vectors, summaries/jobs, note, and request receipt as specified.

### Quality And Performance

- Fixture extraction pass rate: 100% for supported modern, legacy, multilingual label, and bounded virtualized fixtures.
- Expected failure classification: 100% for closed panel, no transcript, unsupported DOM, incomplete virtualization, changed navigation, malformed timing, and over-limit fixtures.
- Local extraction latency: meet PRD-N04.
- Confirm-to-commit latency: meet PRD-N05.
- Popup viewport checks: no horizontal overflow, clipped commands, inaccessible focus, or incoherent overlap at target popup widths and 200% zoom.

### Measurement Boundary

No pre-confirm transcript or page telemetry is sent to Brain. Fixture harnesses and controlled canary records measure local inspection outcomes. The server can measure only confirmed requests and later outcomes. Any future remote pre-confirm diagnostics require a separate opt-in privacy decision.

## Accessibility Requirements

1. Preserve logical focus when moving from inspect to review to success/error.
2. Escape closes/cancels without uploading; closing discards local content.
3. Every icon button has an accessible name and tooltip where meaning is not universal.
4. Screen readers hear scanning, review-ready, saving, success, and error transitions once.
5. Segment/language/count evidence is represented as text, not color alone.
6. Long titles, translated labels, 200% zoom, and narrow popup widths do not clip primary actions.
7. Animation respects `prefers-reduced-motion`.

## Milestones

| Milestone | Capability | Exit gate | Launch state |
|---|---|---|---|
| YTC-0 | Approval packet, private manifest schema, threat model, final V2 docs | All Stage 0 document gates satisfied | Planning only |
| YTC-1 | Pure extractor and synthetic fixtures | Unit/fixture matrix green; no network or storage | Local development |
| YTC-2 | Popup inspect/review/confirm UX | Accessibility and state-machine tests green | Local development |
| YTC-3 | Dedicated disabled lab endpoint and migration | Route, policy, transaction, idempotency, deletion tests green | Disabled |
| YTC-4 | Extension-to-local-fixture MV3 E2E | Permission, token isolation, network, race, restart, overflow matrix green | Local lab |
| YTC-5 | Owned/authorized live canary | Approval manifest, retention, cleanup, metrics, and incident review pass | Controlled lab |
| YTC-6 | Production decision | Separate written approval and code change | No-go under this PRD |

## Ownership And Dependencies

| Area | Driver | Reviewer/approver |
|---|---|---|
| Product scope, UX, metrics | Product manager / Arun | Privacy and technical architect |
| Extension/extractor | Extension engineer | Security and technical architect |
| Endpoint/persistence/migration | Backend engineer | Data owner and technical architect |
| Policy/approval manifest | Product owner | Legal/platform/privacy reviewer |
| Fixture/E2E/QA | QA engineer | Product manager and security reviewer |
| Lab operation/cleanup | AI Brain operator | Arun |
| Production enablement | Not assigned | Requires new cross-functional decision |

## Risks And Mitigations

| Risk | Severity | Mitigation/no-go trigger |
|---|---|---|
| YouTube DOM changes or virtualization silently truncates | High | Multiple renderer fixtures, stable-bottom proof, strict caps, version diagnostics, fail closed; false success is no-go |
| Access-limited transcript retained without adequate rights | High | Private target manifest and rights basis in lab; production blocked until policy model approved |
| Browser token leaks into page context | Critical | Isolated-world injection, fixed helper, no message bridge, canary-token E2E; any leak is no-go |
| Transcript/page data appears in logs or diagnostics | High | Structured allowlisted metrics, privacy tests/scans; any content log is no-go |
| User believes inspect already saved or save succeeded before commit | High | Two distinct actions, explicit local/transfer copy, success only on committed response |
| Different language overwrites existing transcript | High | Same hash duplicate; different hash conflict with no overwrite in V0.1 |
| Same request creates duplicate rows after retry/restart | High | Durable request receipt and unique constraint; retry E2E |
| Migration corrupts transcript source/policy history | High | Pre-migration fixture, foreign-key check, row-count/hash parity, backup/restore rehearsal |
| Production enabled accidentally | Critical | Unconditional production policy block plus route/extension flags; production negative CI test |
| Popup closes during inspection or confirmation | Medium | No local persistence/implicit retry; server idempotency handles confirmed in-flight retry |
| Platform/store review rejects behavior | High | No production or store release until separate written decision; retain link-only extension behavior |

## Product Acceptance Gates

### Fixture And Local Lab

- Every P0 functional and nonfunctional requirement has named automated evidence.
- All supported fixtures pass and all negative fixtures fail with the expected typed code.
- No pre-action injection and no pre-confirm transcript network request.
- No token/session/page-access leakage in canary tests.
- No partial or cross-video transcript stored.
- Dedicated endpoint is disabled outside test/lab and rejects production.

### Controlled Live Canary

- Approval artifact and target manifest pass machine validation.
- Only approved video IDs are accepted.
- Capture and deletion evidence is recorded without transcript text or identifying page data.
- Primary outcome and all trust guardrails meet target.
- Cleanup completes by the manifest deadline.

### Production

- Explicitly not approved by this V1 PRD.

## Definition Of Done For The Planning Package

1. PRD V1 and implementation plan V1 exist.
2. Product-manager and technical-architect agents review the V1 artifacts.
3. Evidence-first adversarial reviews are saved for both V1 artifacts.
4. Every actionable finding is mapped to a V2 change or an explicit rejected/deferred rationale.
5. PRD V2 and implementation plan V2 are internally consistent and marked final.
6. Documentation/privacy/link checks pass.
7. The package is committed, pushed, and available through a GitHub pull request/report.

## Open Decisions For Review

1. Should the optional note be saved as an item note with the current default AI-inclusion policy, or forced to `include_in_ai=false` until the user changes it?
2. Should Shorts be included in the first live canary or remain fixture-only?
3. What exact extension minimum Chrome version follows from the selected MV3 test runtime?
4. How long should aggregate server metrics and blocked policy decisions be retained?
5. Should a production design support multi-language transcript sources, explicit replacement, or continue to block different hashes?
6. What private approval-manifest format and signer/owner are accepted for the controlled lab?

## V1 Assumptions

- AI Brain remains a single-owner personal system.
- The existing fixed Brain HTTPS origin and bearer pairing remain the service boundary.
- A reviewed lab may retain full transcript text only for manifest-authorized targets; otherwise use derived metrics or no retention.
- The production provider/backfill behavior remains unchanged.
- This planning package does not itself implement or enable transcript capture.
