# AI Brain Chrome Companion - Post-Planning GitHub Verification

**Captured:** 2026-07-22 18:23 IST

**Status:** Decision addendum; fixture/local implementation input, not production approval

**Evidence base:** 50-project Chrome-companion inventory, 18 source inspections, 8 empirical validations, current top-ten GitHub metadata, and one changed-head revalidation

**Machine-readable refresh:** [`2026-07-22_18-23-41_IST_github_chrome_companion_top_candidate_refresh.csv`](./2026-07-22_18-23-41_IST_github_chrome_companion_top_candidate_refresh.csv)

## Decision

Extend the existing Brain Manifest V3 extension. Do not create or fork a second extension.

The selected path is:

1. Brain creates a short-lived, single-use request bound to the exact item, item revision, canonical YouTube video ID, Brain account, and approved extension version.
2. The user opens the request-bound YouTube tab and clicks the Brain toolbar icon.
3. A tab-specific Brain side panel guides the user to open YouTube's visible transcript panel. Nothing is read before the user clicks **Inspect visible transcript**.
4. A bounded, isolated-world DOM extractor reads only the visible selected transcript, proves ordered traversal to the final cue, rechecks tab/video/document/track identity, and fails closed on partial evidence.
5. The user reviews counts, language, completeness, destination item, exclusions, and unknown caption type, then clicks **Add transcript to this Brain item**.
6. The extension sends structured cues and bounded page metadata to one fixed Brain origin. It sends no YouTube cookies, Google account data, browser storage, player response, signed URLs, or YouTube authorization material.
7. Brain revalidates the exact request/item/revision/video binding and atomically attaches the source with an idempotent receipt.
8. AI digest and indexing remain paused. A separate, disclosed Brain action authorizes processing for that exact transcript revision.

Use GitHub projects as selective references, not as a product foundation. The strongest combination remains:

- [`searchpcc/tube2md`](https://github.com/searchpcc/tube2md) for the small action-injected, dual-renderer DOM shape and parser fixtures;
- [`yniijia/subtidex`](https://github.com/yniijia/subtidex) for bounded virtualized-panel traversal ideas;
- [`BitYoungjae/just-copy-subtitles-for-youtube`](https://github.com/BitYoungjae/just-copy-subtitles-for-youtube) for typed track/provenance models and focused tests, excluding its session request path;
- [`ANcpLua/yt-transcript`](https://github.com/ANcpLua/yt-transcript) for MV3 build and extension-harness ideas, rebuilt around local fixtures;
- [`labib2002/Briefly`](https://github.com/labib2002/Briefly) for typed failures, health signals, and kill-switch concepts;
- [`ryanbiddy/uoink`](https://github.com/ryanbiddy/uoink) for fixed companion-to-service handoff concepts.

This is a conditional go for synthetic fixture and packaged local-extension work. Browser-mediated production capture remains a no-go under the current policy record.

## Why This Addendum Exists

The merged [Chrome companion landscape](./2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md) already contains the broad research, rankings, source audit, test results, legal/platform posture, security boundaries, server contract, and staged implementation recommendation. Repeating that 50-project analysis would add volume without new evidence.

This pass answers three narrower questions after the later product work:

1. Did any leading repository change enough to alter the ranking?
2. Does the recommendation still fit the accepted exact-item recovery experience and held-processing design?
3. Which earlier statements need correction before implementation?

The answers are: no ranking change, strong architectural fit, and one material manifest correction for the side-panel UX.

## Evidence Lineage

| Artifact | Role |
|---|---|
| [Merged PR #40](https://github.com/arunpr614/ai-brain/pull/40) | Published 105-repository transcript landscape, 50-project Chrome-companion inventory, validation matrices, and architecture recommendation |
| [Chrome companion landscape](./2026-07-22_11-05-48_IST_ai_brain_chrome_companion_github_landscape_v1.md) | Primary repository ranking and technical/security analysis |
| [50-project inventory](./2026-07-22_11-05-48_IST_github_youtube_transcript_chrome_companion_inventory.csv) | Machine-readable discovery and source-inspection evidence |
| [Validation matrix](./2026-07-22_11-05-48_IST_github_youtube_transcript_chrome_companion_validation_matrix.csv) | Commit-pinned build/test/audit observations |
| [PR #42](https://github.com/arunpr614/ai-brain/pull/42) | Exact-item, per-tab, side-panel recovery prototype and Product Council decision |
| [PR #48](https://github.com/arunpr614/ai-brain/pull/48) | Held transcript manual-enrichment PRD, UX specification, and implementation plan |
| `extension/manifest.json` on `origin/main@3b4986b` | Current Brain extension baseline: MV3, popup, `activeTab`, `tabs`, storage, notifications, alarms, and fixed Brain host |

PR #42 and PR #48 are open at this snapshot. Their design inputs are reconciled here, but their files are not assumed to be on `main` until merged.

## Current Repository Snapshot

GitHub metadata was refreshed from the repository API on 2026-07-22. Stars are discovery signals, not quality or safety evidence.

| Rank | Repository | Current head | License signal | Stars | Last push UTC | Refresh result |
|---:|---|---|---|---:|---|---|
| 1 | [`searchpcc/tube2md`](https://github.com/searchpcc/tube2md) | `716654f362ed` | MIT | 1 | 2026-04-27 | Same tested commit; ranking unchanged |
| 2 | [`BitYoungjae/just-copy-subtitles-for-youtube`](https://github.com/BitYoungjae/just-copy-subtitles-for-youtube) | `98adb0046c87` | MIT | 1 | 2026-06-30 | Same tested commit; ranking unchanged |
| 3 | [`yniijia/subtidex`](https://github.com/yniijia/subtidex) | `8738fa47fdc7` | MIT | 5 | 2026-06-29 | Same tested commit; ranking unchanged |
| 4 | [`ANcpLua/yt-transcript`](https://github.com/ANcpLua/yt-transcript) | `3be44284cc19` | MIT | 0 | 2026-07-22 | Four commits ahead; revalidated below; ranking unchanged |
| 5 | [`labib2002/Briefly`](https://github.com/labib2002/Briefly) | `2ddf8eeb57d0` | MIT | 4 | 2026-07-10 | Same tested commit; ranking unchanged |
| 6 | [`ryanbiddy/uoink`](https://github.com/ryanbiddy/uoink) | `97f4e99351fb` | MIT | 0 | 2026-07-20 | Current companion/handoff reference; no ranking change |
| 7 | [`dpolivaev/video-chapters-extension`](https://github.com/dpolivaev/video-chapters-extension) | `73e6d010ff82` | GPL-3.0 identified in source; API `NOASSERTION` | 3 | 2025-12-18 | Same tested commit; patterns only |
| 8 | [`lifesized/youtube-transcriber`](https://github.com/lifesized/youtube-transcriber) | `48f278c38cce` | AGPL-3.0 | 24 | 2026-07-21 | Current full-product reference; patterns only |
| 9 | [`krishnakanthb13/yt-transcript-studio`](https://github.com/krishnakanthb13/yt-transcript-studio) | `0ccbfa4112aa` | GPL-3.0 | 0 | 2026-06-17 | Same tested commit; patterns only |
| 10 | [`jingsu96/linear-web-clipper`](https://github.com/jingsu96/linear-web-clipper) | `c89f5364f151` | MIT | 4 | 2026-02-22 | Handoff reference; `<all_urls>` remains too broad |

None was archived or disabled at the snapshot.

### Changed-head revalidation

`ANcpLua/yt-transcript` moved four commits from the tested `06dd00df2954` snapshot to `3be44284cc19`. The delta contains product-string cleanup, dead-code removal, a repository-relative browser-test path fix, and release version bumps. Its manifest permission set and broad extraction architecture did not narrow.

Fresh clean-clone results at `3be44284cc19`:

- `npm ci`: pass; 243 packages installed;
- TypeScript lint: pass;
- production extension build: pass;
- manifest tests: 3/3 pass;
- dependency audit: 4 high, 0 critical;
- live browser script: deliberately not run.

The current upstream browser script navigates to live YouTube, writes synthetic consent cookies, observes player/timedtext traffic, and exercises MAIN-world/session-aware behavior. It is not a self-contained local fixture. Therefore the reusable contribution is the MV3 harness shape, not the live script or its network/session behavior. AI Brain must create its own synthetic local YouTube-shaped fixtures and assert zero external requests.

## Architecture Options Matrix

| Option | Representative repositories | Browser/session behavior | Reliability and maintenance | Brain fit | Decision |
|---|---|---|---|---|---|
| Explicit-click visible-DOM extraction | Tube2MD, SubtideX | Temporary `activeTab`; isolated script; visible selected panel only | YouTube DOM can drift; bounded fixtures and typed failures make drift observable | Smallest privilege and scope; matches Open, Inspect, Add | **Selected default** |
| MAIN-world player response plus timedtext | Just Copy Subtitles, ANcpLua | Reads player state and may issue session-bound caption requests with page credentials or token-aware behavior | Can expose stronger track identity, but depends on undocumented internals and signed/session resources | Conflicts with the no-session-export and DOM-first boundary | **Reference types only; reject retrieval path** |
| Always-on interception and fallback ladder | ANcpLua, Briefly | Persistent content scripts, request interception, alternate clients, hidden navigation, or audio/ASR fallbacks | Broadest coverage and largest breakage/security surface | Far larger than one explicit recovery action | **Reject for V0.1** |
| Full local/self-hosted companion product | uoink, youtube-transcriber | Extension plus local daemon, MCP/native messaging, cloud, or ASR paths | Useful end-to-end product lessons; major operational and permission surface | Brain already owns the service boundary | **Reuse handoff concepts only** |
| Generic service clipper | Linear Web Clipper | Persistent broad content access and service handoff | Mature clipping pattern, but weak least-privilege fit | `<all_urls>` is unjustified for YouTube recovery | **Reject manifest; reference confirmation/transport ideas** |
| Wholesale fork of any candidate | All | Imports upstream permissions, lifecycle, dependencies, UX, and policy assumptions | Fast initial demo, expensive security and maintenance inheritance | Duplicates the existing Brain extension and fragments pairing/auth | **Reject** |
| Official YouTube Captions API where the user can edit the video | Platform route, not a GitHub extension | OAuth-scoped official API; no page session scraping | Strongly documented but not a generic public-video transcript source | Preferred for owned/authorized editable videos | **Keep as separate first-party route** |

The visible-DOM choice is not claimed to prove manual versus ASR. Store `caption_source_class = unknown` unless a separately reviewed evidence source proves track kind. Do not close S02's `en:asr` requirement from DOM text alone.

## Selective Reuse Ledger

| Repository | Reuse | Exclude |
|---|---|---|
| Tube2MD, MIT | Dual modern/legacy renderer selectors, plain-text normalization, parser-fixture organization, explicit no-cue failure | Product Markdown/download behavior, automatic panel opening, unneeded player metadata, persistent YouTube host access |
| SubtideX, MIT | Virtualized scrolling concepts, renderer diagnostics, bounded stability checks | Mixed DOM/player/caption-fetch fallback core and untested monolithic source |
| Just Copy Subtitles, MIT | Types for track label/language/provenance and compact test cases | MAIN-world `movie_player`, credentialed timedtext, PoToken handling, caption-state priming |
| ANcpLua, MIT | MV3 build/package structure, service-worker/side-panel harness concepts, manifest tests | Continuous interception, alternate InnerTube clients, live cookie-seeded script, audio capture, local ASR, AI-provider scope |
| Briefly, MIT | Typed failure taxonomy, health events, selector-version observability, kill-switch concepts | Hidden queue tabs, broad permissions, remote selector behavior, dependency baseline |
| uoink, MIT | Fixed-origin service handoff, local-first receipt/retry concepts | Multi-site PKM/MCP product, local helper daemon, broad clipping surface |
| video-chapters-extension and transcript-studio, GPL-3.0 | Test architecture and observable behavior only | No code copying without license/distribution review |
| youtube-transcriber, AGPL-3.0 | Product/system behavior only | No code copying without license/distribution review; no native messaging/cloud/ASR expansion |
| Linear Web Clipper, MIT | Explicit confirmation and service handoff concepts | `<all_urls>` and persistent generic content-script access |

If MIT code is copied rather than independently reimplemented, record the exact source commit and copied files/functions, retain required notices, and add an attribution ledger. Prefer narrow clean-room implementation in Brain's existing TypeScript conventions.

## Target Flow And Trust Boundaries

```mermaid
sequenceDiagram
  participant U as User
  participant B as Brain item
  participant W as Brain service worker
  participant Y as YouTube tab
  participant S as Brain side panel
  participant A as Brain API

  U->>B: Get transcript with Chrome
  B->>A: Create exact-item, expiring intent
  A-->>W: Opaque intent through exact-origin handoff
  W->>Y: Open and bind one tab; read nothing
  U->>W: Click Brain toolbar icon
  W->>S: Validate intent and open tab-specific panel
  U->>Y: Open transcript and choose language
  U->>S: Inspect visible transcript
  S->>A: Authorize inspect; no transcript text
  A-->>S: Short-lived authorization
  S->>Y: Isolated, bounded DOM inspection
  Y-->>S: Structured cues and visible metadata only
  S-->>U: Review destination, counts, language, completeness
  U->>S: Add transcript to this Brain item
  S->>W: Confirm exact logical request
  W->>A: Fixed-origin commit with paired Brain bearer
  A-->>W: Durable idempotent receipt
  W-->>U: Transcript added; AI processing has not started
```

Trust rules:

- The YouTube page is untrusted and never receives the Brain bearer, destination authority, item ID, or request authority.
- Only the opaque intent identifier crosses the Brain-page handoff. It must not appear in the YouTube URL, DOM, clipboard, or diagnostics.
- `chrome.storage.session` may hold bounded intent/tab metadata; transcript text remains in extension-page memory and is discarded on close, expiry, navigation, cancel, or successful commit.
- The side panel cannot inspect merely by opening. The explicit Inspect action first obtains current server authorization, then injects once into the top frame.
- The extractor reads `textContent`, timestamps, visible track/language evidence, canonical video identity, and bounded page metadata. It reads no cookies, browser storage, auth headers, player responses, signed caption URLs, or unrelated browsing data.
- The service worker constructs the fixed Brain URL and owns the bearer request. The page and extracted payload cannot select a destination.
- The server treats all captured fields as untrusted, recomputes normalization and hashes, validates item/revision/video/intent/source constraints, and commits source, segments, receipt, revision, and processing hold transactionally.

## Manifest Correction

The original landscape's statement that only `scripting` is new is correct for its popup-only flow. It is not correct for the later accepted tab-specific side-panel experience.

For the selected item-bound UX, the reviewed research manifest delta is:

- add `scripting`;
- add `sidePanel`;
- retain `activeTab`, `tabs`, storage, context menus, notifications, alarms, and the exact Brain host;
- add exact Brain-origin `externally_connectable` configuration for the opaque intent handoff;
- require Chrome 116+ for programmatic tab-specific `sidePanel.open()`;
- add no persistent YouTube host permission and no static YouTube content script.

`externally_connectable` is a manifest trust configuration, not a general page-access permission. It must name the configured Brain origin exactly and have negative tests for every other origin.

Chrome documents that `activeTab` grants temporary access following a user gesture, `scripting` can execute under that grant, and a side panel requires the `sidePanel` permission. Programmatic `sidePanel.open()` requires a user action and supports a tab-specific context. See the official [`activeTab`](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [`scripting`](https://developer.chrome.com/docs/extensions/reference/api/scripting), [`sidePanel`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [`action`](https://developer.chrome.com/docs/extensions/reference/api/action), and [messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) documentation.

## Implementation Slice

Do not begin with a live YouTube account or a fork. Build this vertical slice:

1. **Pure contracts:** canonical YouTube watch URL parser; intent state; renderer-neutral cue type; strict errors and shared size/time constants.
2. **Pure DOM extractor:** modern and legacy synthetic fixtures, repeated equal cues, multilingual labels, malformed timestamps, track changes, no panel, and long virtualized transcripts.
3. **Tab-bound extension state:** ordinary popup remains unchanged; only a valid intent tab gets the empty action popup and side-panel path; SPA navigation, close, expiry, and tab close restore ordinary behavior.
4. **Local packaged MV3 E2E:** Brain fixture origin, YouTube-shaped fixture origin, built extension, action click, `activeTab`, side-panel open, Inspect, review, Add, receipt replay, restart, and zero external network requests.
5. **Disabled lab API:** create/claim/authorize-inspect/commit/status contracts; strict origin/version/extension checks; hashed expiring intent; exact-item transaction; idempotent receipts; downstream processing hold.
6. **Security and privacy tests:** page cannot obtain bearer or authority; wrong origin/version/item/revision/video fails; partial transcript never commits; no transcript/session data reaches storage, URL, logs, analytics, or error reports.
7. **Only then consider an owned/authorized live lab canary:** separate lab service and data root, disposable research account, exact reviewed targets, visible browser, explicit clicks, retention deadline, cleanup proof, and fresh platform/legal/privacy/security approval.

## Required Gates

The fixture/local implementation is acceptable only when all are true:

- exact permission and host snapshots reject `cookies`, `webRequest`, `debugger`, `tabCapture`, `offscreen`, `nativeMessaging`, `<all_urls>`, YouTube host permissions, and static YouTube content scripts;
- a real packaged-extension test proves the per-tab empty-popup `action.onClicked` path grants `activeTab` and opens the correct side panel while ordinary tabs keep the existing popup;
- exact-origin external messaging, paired bearer, extension ID/version, expiry, revocation, replay, and single-use behavior have negative tests;
- Inspect makes no transcript-bearing Brain request and opening the side panel reads no transcript DOM;
- ordered-overlap traversal proves the first and final cue, preserves repeated cues, and fails closed on gaps, caps, identity changes, or unsupported renderers;
- the pre-confirm identity check catches tab, canonical URL, video, document, panel, renderer, and selected-track drift;
- commit is exact-item only and never falls back to URL deduplication or another matching item;
- same-request retry produces one receipt/source, competing requests produce one active source, and stale revisions replace nothing;
- side-panel close and service-worker lifecycle tests prove transcript-memory deletion and mandatory reinspection;
- the server creates a downstream-processing hold atomically, and no digest, embedding, recovery, or batch worker can claim or apply to held content;
- production configuration rejects intent creation and browser commit before request-body processing while paste/upload remain available;
- CI and fixture E2E make zero live YouTube requests.

## Platform, Privacy, And Production Gate

The user's stated research approval supports this repository research. It does not by itself change YouTube's terms, Chrome Web Store policy, content rights, or AI Brain's production source policy.

YouTube's current Terms restrict automated access and scraping except as authorized by the service or with prior written permission. Chrome treats scraped page content as user data, including when processed locally. Those constraints require a target-specific retained approval artifact and reviewed manifest before any live inspection, not merely before upload. See [YouTube Terms](https://www.youtube.com/static?template=terms) and [Chrome user-data policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

Decision states:

| State | Decision |
|---|---|
| Repository research and synthetic parser fixtures | Go |
| Packaged MV3 against local Brain/YouTube-shaped fixtures with zero external requests | Conditional go after exact manifest and test plan review |
| Owned/authorized live lab inspection and retained transcript | Blocked until target-specific platform/legal/privacy/security decision, separate lab environment, retention/cleanup manifest, and passing packaged E2E |
| Hetzner headless browser with a persistent personal Google profile/session | No-go |
| Production browser-mediated public transcript capture | No-go until a new explicit decision supersedes the current policy record |

## Residual Risks

- YouTube DOM, localization, accessibility labels, and virtualization can change without notice.
- A visible transcript may be incomplete relative to an underlying caption resource even when the panel traversal is internally continuous.
- DOM evidence cannot reliably distinguish manual captions from ASR.
- Private or unlisted transcripts increase privacy and rights impact even when visible to the signed-in user.
- `activeTab` is temporary but still powerful at the moment of invocation; extension compromise remains consequential.
- Side-panel and action lifecycle behavior requires real packaged Chrome testing; unit tests cannot prove the grant/open sequence.
- GitHub activity, dependencies, and licenses are snapshots and must be rechecked before code procurement.
- An engineering success does not imply platform permission or production approval.

## Final Recommendation

Build no new extension and fork no repository. Implement the narrow behavior in the existing Brain extension, using MIT projects as attributable micro-references and GPL/AGPL projects as patterns only.

Use the exact-item, per-tab side-panel experience from PR #42; the isolated, bounded DOM and atomic hold/receipt architecture from the merged landscape and DOM-capture plan; and the separate processing consent from PR #48. Treat `scripting` plus `sidePanel`, exact-origin external messaging, packaged MV3 local fixtures, and a downstream-processing hold as required architecture, not optional hardening.

The next executable milestone is a fixture-only packaged extension spike with zero live YouTube traffic. A live account/session is neither required nor appropriate for that milestone.
