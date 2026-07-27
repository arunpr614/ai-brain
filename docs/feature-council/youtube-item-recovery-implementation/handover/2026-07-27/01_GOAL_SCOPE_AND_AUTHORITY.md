# Goal, Scope, and Authority

## Governing implementation objective

Implement the approved YouTube item-recovery and held-transcript manual-enrichment foundations for AI Brain, using the final V2 product, UX, architecture, adversarial-review, pull-request, and verification artifacts. Extend the existing AI Brain Chrome companion. Do not create a second extension.

The goal is persistent and stage-gated. A partial foundation, a green narrow test, or a merged schema is not equivalent to the end-user capability or release readiness.

## Feature A: exact-item YouTube transcript recovery

The intended flow is:

1. An eligible AI Brain YouTube item offers a transcript-recovery request.
2. AI Brain creates a short-lived intent bound to the exact user, item, item revision, canonical YouTube video ID, extension version, and contract version.
3. The existing Chrome companion opens or binds the relevant standard YouTube watch tab.
4. The user opens YouTube's visible transcript panel and selects a language.
5. The panel obtains a successful server-side, content-free `authorize inspect`
   decision for the exact current binding through the service worker.
6. No transcript content is read until that authorization succeeds and the user
   explicitly chooses **Inspect visible transcript**.
7. A bounded, isolated, top-frame extractor reads only the already visible
   selected YouTube transcript.
8. The trusted extension UI shows destination, language, cue count,
   completeness evidence, and disclosure.
9. No content is transferred until the user explicitly chooses **Add**.
10. The server recomputes normalization, source classification, fingerprints,
    policy, and exact-item authority, then atomically attaches the transcript to
    that exact item.
11. The attachment is held from AI processing until a separate processing
    authorization succeeds.

### Feature A boundaries

- Standard watch pages only for initial live-lab scope.
- Shorts remain fixture-only unless a later reviewed decision authorizes them.
- No persistent YouTube host permission.
- No static YouTube content script.
- Temporary `activeTab` only.
- Top-frame isolated execution only.
- Visible selected transcript only.
- No cookie, browser storage, Google-account, player-response, signed-URL, caption-URL, authorization-material, or audio/ASR access.
- Ordered cues and legitimate repetition must be preserved.
- Incomplete, drifting, recycled, or cross-tab/video evidence fails closed.
- The page cannot choose the Brain destination.
- Reading the already visible selected YouTube DOM after server authorization
  and explicit Inspect is intended.
- Transcript text must not be injected into or copied into extension storage,
  the service worker, the Brain item-page DOM or any other page-controlled DOM,
  URLs, clipboard, logs, analytics, or crash evidence.

## Feature B: manual enrichment of a held browser transcript

The intended flow is:

1. AI Brain truthfully shows that a browser-recovery transcript is attached but has not been sent for AI processing.
2. The user reviews the exact enrichment plan, providers, input fingerprint, retention, and expected output.
3. The user separately authorizes processing for the exact current transcript revision and accepted plan/context versions.
4. AI Brain creates an idempotent revision-bound processing request.
5. Digest and indexing stages run only in an approved execution environment and worker mode.
6. Claim, dispatch, apply, retry, deletion, retention, provider drift, source replacement, and stale-result gates revalidate the complete accepted authority.
7. Partial success is truthful: durable digest may survive an index failure, and an index retry must not rerun the digest provider.
8. Completion is reported only after durable current digest and current-space index outputs exist.

### Feature B boundaries

- Capture consent is not processing consent.
- Production-held browser transcripts remain unclaimable and unprocessable.
- Optional recovery notes remain AI-off where specified.
- Provider aliases are random and non-stable.
- Stable Brain identity, transcript content, provider responses, and raw errors must not enter diagnostics.
- Every relevant item-body mutation advances `content_revision`.
- Stale enrichment and embedding workers cannot apply output after source, revision, authorization, generation, hold, deletion, mode, or policy drift.
- Deletion and retention must prevent late recreation.

## Adjacent metadata-only link save

The separately gated link-only behavior:

- saves URL and approved metadata without reading transcript content;
- never uses transcript-success language;
- creates no transcript recovery job through application logic, SQL triggers, backfills, duplicate handling, or legacy capture paths;
- marks eligibility according to the frozen contract; and
- remains distinct from browser capture.

Link-only is not currently implemented or released on this branch.

## Environment and release distinctions

### Production-safe deployment

Code may be deployable only if it:

- preserves code-level production denial for browser capture and held processing;
- does not expose inactive actions as working;
- does not process held browser transcripts;
- adds no persistent YouTube access;
- passes production-negative, backward-compatibility, observability, and rollback gates; and
- is within the reviewed release-authority matrix.

Non-enabling containment and, later, separately accepted link-only behavior are the only potentially production-authorized scopes under the current decisions.

### Isolated lab enablement

Capture or processing can be enabled only in a separately authorized lab with:

- separate deployment and extension identities;
- separate credentials;
- separate database and data root;
- private manifests outside Git;
- exact target authorization;
- approved retention and deletion;
- approved provider terms and processing decision;
- restricted worker mode;
- content-free monitoring, kill switch, rollback, and cleanup; and
- successful synthetic and packaged-local gates first.

The required external packet is absent. No live canary may run.

### Production feature enablement

Production enablement of browser-visible transcript capture or held browser-transcript enrichment is not authorized. Do not:

- remove or bypass production-denial code;
- enable through flags, manifests, environment variables, request fields, or approval text;
- publish the capture extension;
- send browser transcripts to production providers;
- store browser transcripts in the production database; or
- describe either restricted capability as live in production.

## Non-negotiable implementation invariants

1. Extend the existing MV3 companion.
2. Require successful server-side content-free `authorize inspect` and the
   user's explicit inspect action before reading transcript content.
3. Require the explicit **Add** action before transfer.
4. Use exact-item, exact-revision, exact-video, exact-extension, and exact-contract bindings.
5. Use the accepted two-channel transfer contract; do not route transcript text through the service worker.
6. Recompute normalization, hashes, policy, and source classification on the server.
7. Use transactional attachment and idempotent receipts.
8. Maintain the one-active-source invariant where specified.
9. Persist browser transcripts in a held state.
10. Require a separate processing authorization.
11. Fence every claimant, dispatcher, and applier against stale authority.
12. Preserve deletion, retention, rollback, and production-denial semantics.
13. Treat every P0/P1 adversarial finding as a blocker for its dependent gate.
14. Never overclaim synthetic, memory-only, nominal, or sequential evidence.

## Required implementation order

| Stage | Purpose | Current state |
|---|---|---|
| 0 | Source, PR, migration, contract, affected-file, and P0 baseline | Complete with later drift/addenda recorded |
| 1 | Backward-compatible production containment | Complete and reviewed; non-enabling |
| 2 | Additive data and transactional foundation | In progress; contract accepted, implementation blocked before migration |
| 3 | Existing Chrome companion foundations | Pending |
| 4 | Exact-item recovery and separately gated link-only | Pending |
| 5 | Freeze, apply, and accept `029_manual_transcript_enrichment_expand.sql`, then implement held manual enrichment | Pending; no manual route/UI/worker/provider behavior may precede accepted 029 |
| 6 | UX and accessibility parity | Pending |
| 7 | Prove transition parity/drain/rollback blocking, apply and accept `030_manual_transcript_enrichment_contract.sql`, then complete full synthetic, packaged, migration, security, release-negative, documentation, and authorized-lab validation | Pending; Stage 7 cannot complete before accepted 030 and its post-contract matrix |

Stage ordering may be adjusted only for current repository drift and never to bypass a safety or evidence dependency.

## Completion standard

The original implementation goal is complete only when every named source is inventoried, migration numbering and SQLite source provenance are reconciled, every applicable P0 has code and test evidence, the existing companion is extended without permission broadening, all additive migrations and binary/schema combinations pass, all P0/P1 findings are closed, documentation and Wiki status are exact, production-negative behavior is verified, and every authorized release/deployment step has durable evidence.

If external lab authority remains absent, the correct result is a truthful blocked lab report after all safe local work—not an invented canary or production enablement claim.
