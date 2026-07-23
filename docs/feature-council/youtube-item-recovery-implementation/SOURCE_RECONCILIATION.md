# YouTube Item Recovery Source Reconciliation

**Reconciliation date:** 2026-07-23 (Asia/Kolkata)

**Evidence snapshot:** [source inventory](SOURCE_INVENTORY.md) and [SHA-256 manifest](source-reconciliation/SOURCE_HASH_MANIFEST.md)

**Scope:** reconcile supplied artifacts under the governing source precedence; this is not a replacement PRD or implementation plan

## Governing precedence

When sources disagree, apply the pasted goal’s order:

1. current `origin/main`;
2. current merged pull-request state;
3. current heads of open dependent pull requests;
4. latest final V2 post-planning verification;
5. latest final V2 PRDs and implementation plans;
6. final V2 UX specifications and prototypes;
7. final adversarial reviews and disposition matrices;
8. V1 artifacts;
9. historical prototypes.

A newer source does not silently weaken an explicit safety, privacy, consent, or release boundary. Browser-visible transcript capture and held-transcript manual processing remain denied in production unless a later, explicit, separately reviewed authorization replaces that no-go.

## Current-state caveat

The recorded commits below are artifact pins only. They were locally resolvable, but their recorded PR states and heads are not treated as current facts. `DEPENDENCY_GRAPH.md` owns the fresh-fetch values for current `origin/main`, PR #41, PR #42, PR #48, their parent/base relationship, and integration order.

The supplied current-state audit inspected `cbaed78e879a84adcd3a5acbc489bd3ae82bb3b8` and expressly requires a new source audit against the implementation base before PR-1. The verification artifact pinned PR #42 to `c22b5aa80bf77f42b6571423299c874c297d0fc5`, PR #48 to `63effafc2c7601dc5ba52df7f0f96fb5af79ae3f`, and its then-current `origin/main` extension baseline to `3b4986b09a5936843a756526ab9630a382f30eca`. Any live drift is a reconciliation event, not permission to copy an old branch wholesale.

## Reconciled product boundary

The implementation has three separable paths:

1. **Production-safe link-only:** metadata only, truthful link-only language, `browser_link_only_v1`, and exclusion from transcript-recovery triggers and backfill.
2. **Lab-only exact-item recovery:** the existing Chrome companion, one short-lived exact-item intent, explicit inspect, visible selected transcript only, explicit transfer confirmation, atomic attachment, and a processing hold.
3. **Lab-only manual enrichment:** a second authorization for the exact held transcript revision, an idempotent asynchronous processing run, revision/fingerprint fencing, staged digest and indexing, truthful partial success, and durable completion evidence.

The exact-item Product Council flow narrows the generic capture plan for Feature A. No second extension, persistent YouTube host permission, static YouTube content script, cookies, browser storage, Google account data, player-response data, signed URLs, audio download, ASR, or page-selected Brain destination is allowed.

## Requirement reconciliation

| Corpus | Count | Reconciled treatment |
|---|---:|---|
| DOM capture P0 | 27 | Preserve `PRD2-F01` through `PRD2-F25`, `PRD2-F17A`, and `PRD2-F28`; apply exact-item decisions where they narrow the generic route/UX |
| DOM non-functional | 9 | Preserve privacy, performance, accessibility, compatibility, observability, and release gates |
| Manual enrichment P0 | 38 | Preserve `ME-F01` through `ME-F38` and their deterministic traceability mappings |
| Exact-item intent | 1 compound contract | Thirty-minute, single-use intent bound to user/account, item, revision, video, extension version, and return path |
| Exact-item release gates | 6 | Treat all six Product Council gates as required; later verification adds packaged, cross-tab/window, lifecycle, and production-negative evidence |

No P0 requirement is removed by this reconciliation. A requirement that conflicts with current code must be implemented, explicitly deferred by its own approved authority, or stopped behind a reviewed addendum.

## Contract candidates to freeze

These values are extracted candidates from the final artifacts. They are not deemed implemented merely because they are listed here.

### Browser capture and link-only

| Concern | Candidate |
|---|---|
| JSON body/route contract | `contract_version: 1` |
| Client API header | `X-Brain-Client-Api: 1` |
| Capture route header | `X-Brain-Youtube-Capture-Contract: 1` |
| Server constant | `YOUTUBE_BROWSER_CONTRACT = 1` |
| Extractor | `brain-youtube-dom/1` |
| Traversal/normalization algorithm | `ordered-overlap-v1` |
| Consent copy | `youtube-browser-transcript-v2` |
| Link-only extraction marker | `browser_link_only_v1` |
| Processing hold reason | `youtube_browser_v0_1` |
| Private capture manifest | schema/version 1 at `data/private/youtube-browser-transcript/manifest.json`; exact schema identifier must be frozen |

### Manual enrichment

| Concern | Candidate |
|---|---|
| Command contract | `manual-enrichment-v2` |
| Separate authorization manifest | `manual_transcript_enrichment_manifest_v1` |
| Authorization input fingerprint | `manual-content-authorization-input-v1` |
| Authorization context fingerprint | `manual-content-authorization-context-v1` |
| Provider-plan wire/schema object | `content-processing-provider-plan-v2` |
| Provider-plan entry fingerprint domain separator | `content-processing-provider-plan-v1` |
| Consent copy | `manual-transcript-enrichment-copy-v2` |
| Semantic indexing | `semantic-index-contract-v1` |
| Transcript/body integrity | `transcript-integrity-v1` |
| Digest output | `youtube-transcript-digest-output-v1` |

The implementation plan also uses `content-processing-provider-plan-v1` as the domain separator for each provider-plan entry fingerprint. The provider-ready authorization input and complete authorization context use their own domains. These identifiers name different semantic layers and must not be collapsed into one field; their required treatment is resolved below.

## Material conflicts and precedence resolutions

### 1. Migration `026` collision

**Conflict:** the DOM plan proposed `026_youtube_browser_transcript.sql`, but the later recorded base already contains `026_notebooklm_export.sql`. The manual plan then describes nominal `027`/`028`/`029` expansion steps.

**Resolution:** current `origin/main` wins. Inventory every current and pending migration, select the actual next free identifier, and rebase the browser-transcript foundation onto it. Shift dependent manual migrations together; do not assume that `027`, `028`, or `029` remains free. Freeze the chosen filename, SHA-256, and schema snapshot before feature implementation, then independently review clean-install, upgrade, mixed-version, and rollback restrictions.

### 2. Generic capture versus exact-item commit

**Conflict:** the generic plan allows URL/video create-or-upgrade behavior through `/api/capture/youtube-browser-transcript`; the later exact-item flow requires a short-lived bound intent and an exact commit endpoint such as `/api/capture/youtube-intents/:intent/commit`, with no URL-dedup fallback.

**Resolution:** for Feature A, the later exact-item Product Council decision and V2 verification win. The server must validate user, item, item revision, canonical video, extension, contract, expiry, and one-time use and then atomically attach only to that item. Generic capture must not become a fallback that can select or create a different destination. Production-safe link-only remains an independent route and semantic.

### 3. Extension permissions and UI surface

**Conflict:** the earlier generic extension plan centers the popup and proposes only the `scripting` permission. The later exact-item flow needs a tab-specific side panel plus exact-origin external connection, while the safety record forbids persistent YouTube host access and static content scripts.

**Resolution:** the later exact-item verification narrows the design: extend the existing MV3 companion; add only the permissions required for the side-panel path and exact Brain origin; retain temporary `activeTab`; execute the extractor in the top frame and isolated world; keep ordinary popup behavior unchanged; add no persistent YouTube host permission or static YouTube content script.

### 4. Production origin versus isolated lab authority

**Conflict:** older artifacts can be read as targeting the fixed Brain production host, while the final V2 verification and governing goal require distinct lab authority and explicit production denial.

**Resolution:** the governing release policy and final verification win. Research builds must compile in one exact lab origin and use separate lab extension identity, pairing/bearer configuration, deployment identity, database, and data root. Production builds expose no browser-transcript destination, or reject before body parsing. Production configuration may not turn the route on. Capture and manual processing remain lab-only.

### 5. Chrome side-panel lifecycle

**Conflict:** `sidePanel.open` is available from Chrome 116, but `sidePanel.onClosed` is Chrome 142+. Treating the latter as a minimum-version lifecycle primitive would make the stated compatibility floor false.

**Resolution:** do not rely on `sidePanel.onClosed`. Keep transcript text only in the panel document, make cleanup independent of that event, and require packaged tests for minimum and current supported Chrome across close/remount, navigation, grant loss, tab moves, extension reload, expiry, and two-tab/two-window isolation. Raise the minimum version only through an explicit reviewed decision.

### 6. Service-worker transcript handoff

**Conflict:** the governing goal requires a fixed-origin service-worker transfer and the DOM plan routes the confirmed payload through the service worker. The latest V2 verification simultaneously says transcript text remains only in the side-panel document and never enters the service worker, while the worker constructs the fixed lab URL and owns the paired bearer request. Neither statement can simply be discarded: the first fixes destination/auth authority; the second fixes the transcript-memory boundary.

**Resolution:** require the corrected, adversarially rechecked **two-channel handoff addendum** before this slice is implemented. The service worker mints a short-lived, single-use secret upload authority scoped to the exact intent/item/video/extension/body contract and HTTPS lab destination; only its hash is stored. The trusted side-panel document performs the bounded body upload directly from the exact approved `chrome-extension://` requester Origin. A third exact HTTPS Brain-page origin is independently restricted by `externally_connectable` for the opaque intent handoff. The page receives neither destination authority nor credential, and the service worker receives neither transcript text nor a transcript-bearing message. D-008 specifies CORS/preflight, manifest host/CSP, replay, revocation, secret-grant leakage, response-loss reconciliation, close/remount cleanup, and bearer isolation. Transcript text and grant remain absent from forbidden worker/storage/log/page/report surfaces. If the existing authentication model cannot support this arrangement, stop the slice; do not silently route text through the worker, broaden CORS, or hand the paired lab bearer to the page/panel.

### 7. Provider-plan version

**Conflict:** the manual request example uses `content-processing-provider-plan-v2`, while §7 uses `content-processing-provider-plan-v1` as a provider-plan-entry fingerprint prefix. The Stage 0 draft incorrectly described the latter as the provider-ready input domain, which §7.1 defines separately.

**Resolution:** freeze four distinct semantics exactly as the final plan records them: `content-processing-provider-plan-v2` is the disclosed provider-plan wire/schema version; `content-processing-provider-plan-v1` prefixes the canonical fingerprint tuple for each provider-plan entry; `manual-content-authorization-input-v1` prefixes the provider-ready item/source/input tuple; and `manual-content-authorization-context-v1` prefixes the full consent/policy/stage context. Give all four separately named constants and serializers, document them in the authorization record, and test independent golden vectors plus one-field drift. Changing any accepted identity invalidates prior authorization and requires reconfirmation. Reject accidental substitution, omission, or reuse of one identifier as another.

### 8. V1 and V2 behavior

**Conflict:** V1 route, copy, generation, and prototype choices differ from final V2 decisions.

**Resolution:** the V2 PRDs/plans/UX and the V1 disposition matrix win. V1 artifacts remain provenance only; do not implement a V1 behavior unless V2 explicitly carries it forward.

### 9. Prototype network dependencies versus zero-network implementation

**Conflict:** the generic and exact-item prototype HTML references remote assets such as unpkg and YouTube image hosts, while packaged implementation and fixture tests require zero external requests. The manual V2 prototype uses local assets.

**Resolution:** prototypes are behavioral references, not production dependency manifests. Bundle reviewed local assets, use synthetic fixtures, and assert zero external requests in packaged tests. Do not copy third-party code or remote assets without license/provenance approval.

### 10. Package-local authority versus governing precedence

**Conflict:** the manual package README describes package-local authority, while the pasted goal supplies a global precedence and stronger release constraints.

**Resolution:** the governing goal wins. Package READMEs index their contents but cannot override current main, live PR state, the final verification addendum, or explicit production no-go decisions.

### 11. Recorded PR heads versus live dependency state

**Conflict:** the verification records PR #42 and #48 heads and says #48 was stacked on #42, but those states are mutable.

**Resolution:** preserve the recorded SHAs as artifact pins only. Freshly fetch PR state, base, heads, commits, checks, and files; reconcile material drift; resolve the #48-on-#42 relationship; and import only required changes with provenance. `DEPENDENCY_GRAPH.md` is the authority for the live result.

### 12. Historical audit versus implementation truth

**Conflict:** the manual audit’s code findings are tied to `cbaed78`, while implementation starts from a later current-main base.

**Resolution:** use the audit to define questions and hazards, not to assert current behavior. Re-audit all 19 named code paths and their current successors before PR-1, including auto-arming, worker/batch eligibility, revision fencing, partial success, status truthfulness, deletion, and processing authorization.

## Reconciled implementation order

The DOM plan’s PR-A through PR-H sequence is:

1. environment and policy;
2. production-safe link-only;
3. bounded extractor;
4. consent UX and extension lifecycle;
5. migration and atomic server route;
6. recovery CAS, receipts, and holds;
7. E2E/privacy/release compatibility;
8. lab canary evidence.

The manual plan’s PR-0 through PR-10 sequence is:

1. freeze upstream;
2. backward-compatible containment;
3. expand schema;
4. private manifest, status, and command;
5. repair dual-write and durable hold;
6. revision-bound digest;
7. current-revision semantic indexing;
8. batch fencing;
9. UX/accessibility;
10. backfill/cutover;
11. deferred cleanup/contract work.

Reconcile them as one dependency chain: freeze live source and migrations first; land production-safe containment and additive data contracts; implement the lab-only exact-item capture path; create the held source and authorization boundary; then add digest/index processing, truthful UX, cross-path fencing, and canary evidence. Production deployment may include only foundations and separately approved link-only behavior while all production-negative gates remain intact.

## Stop conditions

Stop the affected implementation slice and create a reviewed addendum if current evidence requires weakening any non-negotiable consent, privacy, exact-target, hold, deletion, or production-denial boundary; if the service-worker handoff cannot satisfy the final verification; or if migration identity cannot be made collision-free. Do not convert an unresolved contract candidate into de facto behavior.
