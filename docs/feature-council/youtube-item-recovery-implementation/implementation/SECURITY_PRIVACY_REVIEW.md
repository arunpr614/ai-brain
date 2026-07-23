# Security and Privacy Review

**Frozen source baseline:** `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`

**Review date:** 2026-07-23 (Asia/Kolkata)

**Review posture:** frozen-baseline architecture review plus dated Stage 1 branch evidence; no production release claim

**Verdict:** production capture **DENIED**; production held-transcript processing **DENIED**; live lab canary **BLOCKED**

## Executive assessment

The frozen baseline does not yet provide the deployment classification, pre-body production denial, processing holds, revision/token fencing, worker modes, exact-origin helper, content-free diagnostic discipline, or additive schema needed to safely retain and process a browser-visible transcript.

The existing application remains suitable as the baseline for backward-compatible containment work. It is not authority to enable the new capability.

The corrected D-008 two-channel transfer narrows bearer and body exposure and separates destination, requester, and handoff origins. The focused Stage 0 recheck accepted that candidate contract with no remaining P0/P1 finding; it is not yet an implemented or verified control, and it supplies no authority to begin Chrome work before migration 027 and the package/security gates.

## 2026-07-23 Stage 1 implementation update

The “current gap” sections below describe the frozen `f905f6a1` baseline that Stage 1 was designed to contain. The uncommitted Stage 1 branch now implements and tests the non-enabling D-014/D-017 slice: authoritative deployment classification, configured-origin/private responses, schema capability tri-state, worker-mode planning, startup import containment, old-schema-safe hold checks, claim/dispatch/apply/terminal gates across the inventoried body-processing paths, standalone-script refusal, content-free diagnostics, and the exact existing status/UI privacy redactions. It does not add migration 027, a browser transcript route/action/status, attachment, hold release, extension behavior, or feature enablement.

The consolidated branch evidence now passes 1,251 repository tests, lint, typecheck, a production build, scope enforcement, and the 384-check immutable release-artifact smoke. The initial formal Stage 1 review returned **NO-GO** on a P1 rollback defect: the new D-018 unresolved batch marker is safe under the current binary but can be cleared by the frozen rollback binary. D-019 now binds awareness to `brainRuntimeCapabilities` owned by the app being packaged, requires the source and built standalone declarations to match exactly, attests the app-derived value in both manifests, and refuses an unaware target while any reservation-namespace member exists. Current-tools/historical-app, detached-attestation, malformed-marker, unreadable-state, preflight, stopped-writer, and restoration evidence is green. The separate formal focused final recheck accepted the remediation with zero P0/P1/P3 findings and closed R-031 for Stage 1. This remains a non-enabling containment verdict and does not authorize any restricted capability or deployment.

The same review recorded R-032: automatic transcript body apply and transcript-job success finalization are separate schema-026 transactions, so a process crash between them can replay source work. That P2 is a mandatory Stage 2 receipt/revision transaction requirement, not authority to broaden Stage 1.

## Protected assets

### Content-bearing assets

- browser-visible transcript cues and normalized body;
- user-provided transcript and note content;
- item title, body, author/channel, duration, source URL, and video identity;
- provider prompt/input and response;
- derived summary, quotes, topics, tags, and embedding chunks/vectors;
- capture and processing manifest content;
- screenshots or recordings containing real source content.

### Authority-bearing assets

- paired Brain bearer token;
- session cookie;
- one-time upload grant;
- capture intent and authorization receipt;
- capture/processing policy decisions;
- private manifest path and contents;
- provider/API credentials;
- extension/package identity;
- lab deployment and data-root identity;
- cleanup/backup/rollback authority.

### Binding facts

Some facts are content-free only in a specific internal protocol and are still sensitive:

- item/source/request/job/run/intent/grant/receipt identifiers;
- canonical video binding;
- expected content revision;
- body hash, byte length, and cue count;
- extension, extractor, normalization, and contract versions;
- authorization and provider-plan fingerprints;
- expiry/delete-by timestamps.

They may be used inside a bounded server-side authorization transaction. They are not allowed in public reports or general operational logs.

## Trust-boundary model

| Boundary | Allowed authority/data | Forbidden behavior |
|---|---|---|
| YouTube/page main world | Ordinary page rendering only | No Brain bearer, grant, destination, item identity, provider data, or injected application authority |
| Isolated extractor | Reads the explicitly inspected visible transcript after user action; returns a bounded candidate to the trusted panel | No persistent content script, MAIN-world execution, player-response/caption-URL scraping, cookie/account extraction, storage, logging, or network dispatch |
| Trusted side-panel document | Holds one transient candidate in memory for review; after confirmation may hold one secret upload grant | No paired bearer, persistent transcript/grant storage, page bridge, caller-selected destination/origin, retry queue containing content, analytics, logs, or crash evidence |
| Extension service worker | Owns paired bearer, validates content-free binding facts, requests grant at compile-time fixed lab origin | Never receives transcript body, never stores a grant/body in globals or extension storage, never accepts destination from page/panel |
| Brain route boundary | Authoritative deployment/mode/origin/auth checks; bounded request; server recomputation; atomic receipt/source/hold transitions | No production body read, Host-derived authority, redirect to another origin, client hash as truth, partial commit, or raw error echo |
| SQLite/data root | Exact item/source/revision/hold/receipt/run facts; content only under accepted retention policy | No shared production/lab data root, multiple active sources, released hold without durable authorization/job, or orphan late apply |
| Remote LLM/embed provider | Only the exact reviewed stage input under an accepted processing decision | No stable Brain identifiers, URL/video/account identity, extra context, unauthorized note/source content, or dispatch after expiry/denial |
| Logs/diagnostics/reports | Stable event/outcome codes, aggregate counts, elapsed/size buckets, booleans, versions | No content, target facts, stable IDs, hashes, origins, credentials, raw provider errors, or screenshots |

## Candidate D-008 transfer and origin taxonomy

The corrected addendum proposes:

1. The exact HTTPS Brain lab **web-page handoff origin** is the only `externally_connectable` sender of an opaque intent; runtime also checks top-frame sender URL.
2. The compile-time exact HTTPS **lab destination origin** is the only grant/commit/reconciliation network target; manifest host permission and CSP are exact, and redirects fail.
3. The exact `chrome-extension://<approved-id>` **requester Origin** is the only origin allowed by narrow non-credentialed CORS/preflight for the panel body channel.
4. The panel sends the service worker only content-free authorization facts after explicit confirmation.
5. The worker uses the paired bearer to obtain a short-lived, single-use secret grant from the lab destination.
6. The worker returns the grant only in the expected response to the requesting panel plus an enumerated route discriminator, never a URL.
7. The panel uploads byte-identical confirmed bytes with `credentials: "omit"`, `redirect: "error"`, `referrerPolicy: "no-referrer"`, and `cache: "no-store"`.
8. The server stores only the grant hash, recomputes digest, size, normalization, target/source/revision/policy facts, and atomically consumes intent/grant with the attachment receipt.
9. The panel erases body and grant after cancel, expiry, navigation, remount, reload, terminal response, or ambiguous-response reconciliation; reconciliation is content-free and sends neither body nor grant.

Security benefits:

- transcript text never enters the service worker;
- paired bearer never enters panel/page memory;
- the page cannot choose destination;
- an upload grant has less authority than the paired bearer but remains a redacted secret capability;
- response loss can reconcile an exact receipt without storing a transcript retry queue.

Focused recheck disposition and remaining implementation evidence:

- whether current authentication/API architecture can issue and validate the least-privilege grant without broadening bearer authority;
- independent enforcement of destination, extension requester Origin/CORS, and external Brain-page handoff origin;
- grant replay/idempotent receipt semantics;
- tab/document/video binding across navigation and panel remount;
- grant/content cleanup under extension suspension and ambiguous network results;
- whether all content-free facts stay out of general logs;
- whether Chrome 116 packaged behavior provides all required lifecycle signals without relying on `sidePanel.onClosed`.

The focused recheck resolved the contract questions and closed every P0/P1 finding. Chrome implementation remains blocked on migration 027, package/security evidence, and the separate lab gates. Rejected fallbacks still include a transcript-bearing runtime message, broad CORS, ordinary-message/log grant handling, and a caller-selected destination.

## Deployment and pre-body denial

The code-level decision must occur before request-body parsing:

```text
production marker?
  yes -> deny restricted capability before body read
  no  -> validate authoritative deployment
          -> validate worker/server mode
          -> validate origin and authentication
          -> validate exact current policy/intent/grant
          -> only then read the bounded body
```

Any of these conditions means production:

- `BRAIN_PRODUCTION_RUNTIME=1`;
- `BRAIN_DEPLOYMENT_ENV=production`;
- a conflict between production and lab markers;
- missing/malformed classification for the restricted route.

`BRAIN_TRANSCRIPT_ENV`, request-supplied environment, approval ID, feature flag, extension mode, or manifest cannot downgrade production.

Current gap:

- `src/lib/capture/policy.ts:51-56` promotes legacy lab before checking `NODE_ENV=production`;
- `src/lib/capture/policy.ts:40-75` accepts caller-supplied environment;
- `src/lib/capture/policy.ts:77-91,170-192` permits legal approval to affect production allowance for `lab_public_caption`;
- `src/lib/capture/transcripts/recovery-options.ts:59,83,172-191` consumes the same unsafe environment in a UI/read model.

Required negative tests must combine every production marker with every flag, approval, manifest, worker mode, caller environment, and retention setting. Every combination remains denied and persists `production_allowed=0` for the restricted method.

## Origin and authentication boundary

### Configured owner-web origin

One parsed `BRAIN_PUBLIC_ORIGIN` is authoritative. It must reject:

- missing or multiple configured origins;
- non-HTTP(S) schemes;
- credentials;
- non-root paths;
- query or fragment;
- `Origin: null`;
- multiple request Origin values;
- a foreign scheme, host, or effective port;
- redirects to a different origin.

It must ignore `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` when deciding authority.

This owner-web cookie-write origin is not the extension requester Origin and is not a substitute for either D-008 destination or CORS policy. Fixture/lab extension upload requires the exact approved `chrome-extension://` requester Origin, exact destination host permission/CSP, `Access-Control-Allow-Origin` set to that one extension origin, `Vary: Origin`, no credentials, and a fixed method/header allowlist.

Current gaps:

- `src/lib/processing/http.ts:59-76` compares the raw environment string;
- `src/lib/notes/http.ts:21-35` derives authority from Host/forwarded headers and is unsuitable for the new write routes;
- `src/lib/auth/bearer.ts:231-269` allows bearer/CORS origins with different semantics and cannot replace cookie same-origin validation.

### Authentication split

- Ordinary owner web routes use the authenticated owner session plus exact configured Origin for writes.
- Extension authority stays in the service worker's paired bearer.
- The side panel receives only a one-time secret body grant after explicit confirmation; it is permitted only in that worker response and one fixed API authorization field.
- A page/content world receives neither credential.
- The server validates extension/package identity and exact current intent in addition to credential validity.
- A credential never converts an environment or policy denial into permission.

Private responses use:

- `Cache-Control: private, no-store, max-age=0`;
- `Vary: Cookie` where cookie-authenticated;
- `X-Content-Type-Options: nosniff`;
- bounded typed JSON;
- stable error codes;
- no request/content echo.

## Processing hold and stale-result boundary

An accepted browser source is retained under a durable processing hold. Every claimant must honor that hold at:

1. candidate/enqueue;
2. claim;
3. immediately before provider dispatch;
4. transactional apply;
5. terminal state transition;
6. retry/requeue;
7. standalone backfill execution.

Current unfenced paths are documented in `CALLER_CONTAINMENT_INVENTORY.md` and include:

- transcript recovery and backfills;
- scheduled and realtime enrichment;
- batch submit and poll/apply;
- inline and standalone embedding;
- generic item upgrade/repair;
- note indexing only when its input separation is unproven; D-015 leaves independently authorized note+title indexing outside the source/body hold in `standard` mode and disables it entirely in `manual-transcript-lab`;
- legacy `/enrich`;
- status projections and deletion races.

Stage 1 can make hold checks old-schema-safe, but it cannot prevent a response from applying to a changed revision without migration 027's expected revision and claim token. Production remains denied until the Stage 2 fence and deterministic race tests pass.

## Old-schema fail-closed design

Security depends on distinguishing:

- `absent`: legitimate schema 026; ordinary current behavior may continue while all restricted features remain denied;
- `ready`: complete expected feature shape; hold-aware query/apply paths activate;
- `incompatible`: partial/malformed shape or discovery failure; affected work does not start or claim.

The probe in the allocated `src/db/schema-capabilities.ts` must inspect `sqlite_master`, table/column/check/trigger/index shape, and the migration ledger before preparing new-schema SQL. It reports `ready` only when the ledger contains the exact independently frozen 027 filename with the exact packaged SHA and the complete reviewed shape is present. Before that filename, SHA, and manifest are frozen, no database can produce a production-eligible `ready` result. The cache is keyed only by DB handle and `PRAGMA schema_version`; it invalidates after migration, never caches hold state, and never skips ledger attestation. `src/db/schema-capabilities.test.ts` must reject missing/wrong ledger names or hashes, partial shape, wrong checks/triggers/indexes, and discovery failure as `incompatible` while preserving legitimate schema-026 `absent`.

Treating every absence as fatal would break ordinary production before the migration. Treating a partial schema as absent could process held content. The tri-state avoids both failures.

## Worker isolation

| Mode | Security expectation |
|---|---|
| `disabled` | No enrichment, embedding, note-index, transcript-recovery, batch-submit, or batch-poll claimant starts. |
| `standard` | Only the reviewed ordinary set starts; active holds are unconditionally excluded at data boundaries. |
| `manual-transcript-lab` | Only exact interactive digest/index runners for a current accepted authorization may start. Scheduled enrichment, generic embedding, note-index, transcript recovery, and batch never start. |

The baseline has no capable interactive runners. Stage 1 therefore starts none for `manual-transcript-lab`.

`src/instrumentation.ts:25-40` currently imports all content workers before any mode decision and starts them at `src/instrumentation.ts:71-79`. The mode and capability plan must be resolved before importing those modules. Retention, backup, Processing enrollment, and API-token setup are outside this content-worker switch.

Standalone scripts do not pass through instrumentation:

- `scripts/backfill-youtube-transcripts-prod.mjs:99-185,267-296`;
- `scripts/backfill-embeddings.mjs:50-195`;
- `scripts/backfill-embeddings-prod.mjs:49-183`.

Each needs its own deployment/mode/schema/hold gate.

## Data minimization and forbidden data

### Forbidden in diagnostics, logs, analytics, public reports, and screenshots

- transcript, note, item body, prompt, response, summary, quote, topic evidence, or chunk text;
- target ID, video ID, source URL, page URL, item title, channel/author, track label, or filename;
- item, source, request, job, batch, intent, grant, run, attempt, receipt, mutation, or policy-decision ID;
- stable or hashed aliases that allow correlation;
- body, source, authorization, manifest, request, or provider-plan hashes;
- account identity, extension-user identity, email, chat/user ID, IP address, hostname, data-root path, or configured/request origin;
- session cookie, paired bearer, provider token, grant, secret, manifest content, or credential fragment;
- raw provider error, HTTP response body, stack, request fragment, or serialized exception;
- screenshots or recordings of real source content.

### Allowed content-free operational fields

- fixed event name from a closed enum;
- fixed outcome/error code from a closed enum;
- effective deployment class and configuration state;
- worker mode;
- claimant and phase (`startup`, `claim`, `dispatch`, `apply`);
- schema feature state (`absent`, `ready`, `incompatible`);
- aggregate counts and zero/nonzero guardrail booleans;
- elapsed-time and payload-size buckets, not exact target-linked values;
- reviewed extension/extractor/contract versions;
- timestamp;
- stop/go decision.

The diagnostics API must accept a typed allowlisted object, not `Record<string, unknown>` and not an arbitrary error. It must not spread caller input.

### Current diagnostic gaps

- `src/lib/errors/sink.ts:29-41` accepts arbitrary JSON objects.
- `src/lib/queue/enrichment-worker.ts:170-200,211-266` logs job/item identifiers and raw errors.
- `src/lib/queue/transcript-worker.ts:467-506` logs video/item/job identifiers and error messages.
- `src/lib/queue/enrichment-batch-cron.ts:109-133` logs batch identifiers and raw errors.
- `scripts/backfill-embeddings.mjs:163-165,187-194` prints item identifiers, titles, and result messages.
- `scripts/backfill-embeddings-prod.mjs:46-75` prints database path, item identifiers/titles, and errors.

New containment diagnostics must not reuse these payloads. A later claim of globally content-free logging requires refactoring and scanning the existing paths, not merely adding a safe helper.

## Provider boundary

The remote provider receives only the exact stage input accepted by the current processing decision. It never receives:

- Brain item/source/video/account identity;
- URL or target label;
- capture manifest or policy content;
- stable provider-facing aliases;
- unrelated note or source data;
- a title when the accepted manual plan says title is preserved/not processed;
- input after hold, revision, provider plan, consent copy, retention, expiry, or deletion drift.

Provider aliases are fresh random non-stable values. Provider dispatch is recorded before network ambiguity can be misreported as “nothing was shared.” Provider handling terms and local deletion clocks are reported truthfully; the UI does not promise provider deletion without evidence.

The current scheduled enrichment input includes title, author, duration, and body at `src/lib/enrich/pipeline.ts:184-206`, and current enrichment can rewrite title at `src/lib/enrich/pipeline.ts:219-251`. The future manual-transcript contract must use its own exact input plan and preserve title as specified; it cannot reuse scheduled enrichment by changing a flag.

## Threats and required controls

| Threat | Frozen-baseline exposure | Required proof | Release effect |
|---|---|---|---|
| Production flag/config enables capture | Unsafe legacy classifier; no code-level new-route denial | Exhaustive denial-wins matrix; pre-body parser spy remains zero | P0; blocks all production deployment if failed |
| Page obtains bearer/destination | D-008 contract reviewed; implementation absent | Canary bearer sentinel absent from page/panel; destination override impossible | P0; blocks Chrome work |
| Worker receives transcript | Accepted candidate contract remains unimplemented | Transcript sentinel absent from runtime messages/globals/storage/logs | P0 |
| Panel persists transcript/grant | No feature implementation yet | Remount/navigation/reload/expiry/cancel tests; transcript and grant canary scan | P0 |
| Foreign extension/web origin uploads | D-008 corrected but unimplemented | Exact CORS/preflight, externally-connectable sender, host-permission/CSP, redirect and extension-ID negatives | P0 |
| Grant leaks outside allowed response/header | D-008 corrected but unimplemented | Secret-canary scan of messages, globals, storage, URL, DOM, logs, analytics, crash evidence, screenshots, reports | P0 |
| Wrong item/video/revision commit | No intent/revision/receipt schema | Exact binding substitution tests and atomic CAS | P0; blocks migration/capture |
| Held source claimed by background work | No hold schema or worker mode | Seed every queue class; provider spies and row diffs remain zero | P0 |
| Stale provider result applies | Current writes use item ID/state only | Deterministic barriers at dispatch/response/apply with revision/token drift | P0 |
| Multiple active transcript sources | Current DB permits it | Preflight and unique partial index; collision fixture | P1 migration gate |
| Legacy `/enrich` bypasses hold | Route mutates/dispatches directly | Held bodyless/default/force requests have typed no effect | P1 processing gate |
| Batch/standalone backfill bypass | Direct queries/scripts | Mode/hold tests and explicit refusal | P1 |
| Delete races recreate output | Current apply lacks item/revision/token fences | Delete during provider barrier leaves no output/success row | P1 |
| Status claims ready while held/stale | Current read models use raw jobs/chunks | Effective held/revision-current projection tests | P1 |
| Content enters logs/reports | Existing raw identifiers/errors | Forbidden-key/value scanner and canary sentinel scan | P0/P1 |
| Lab uses production identity/data | External packet absent | Startup identity/data-root/manifest mismatch negatives | P0 for live lab |

## Current feature, migration, and release blockers

1. Migration 027 does not exist; revision, active-source, hold, intent/grant/receipt, and claim-token invariants are absent.
2. R-032 remains open: transcript body apply and recovery receipt/job finalization need atomic completion or durable reconciliation, revision/claim fencing, and a deterministic crash barrier.
3. Browser intent/grant/commit, immutable receipt, transcript-source attachment, and held manual-enrichment feature paths are intentionally absent.
4. Complete revision/token fencing for future source attachment and processing awaits the Stage 2 schema and service contracts.
5. Previous-binary compatibility after migration 027 has not been proven or gated against a frozen 027 artifact.
6. The browser companion's packaged security, persistence, origin, and secret-canary evidence does not exist.
7. The target-specific external authorization and isolated-lab packet is absent.
8. Stage 1 containment is formally GO but non-enabling and undeployed; it grants no feature, live-lab, or production authority.

No lower-severity mitigation or feature flag can waive these blockers.

## Required security test evidence

### Deployment and request boundary

- exhaustive authoritative deployment/runtime/legacy-env/flag/manifest/approval matrix;
- production denial before JSON/form/body parsing;
- no request-derived identifier for malformed unread production bodies;
- no redirect or destination override;
- exact private/no-store/nosniff response headers.

### Origin and credentials

- exact configured origin accepted after safe normalization;
- missing, malformed, null, multiple, credential-bearing, path/query/fragment, foreign port, and forwarded-host attacks rejected;
- paired bearer absent from panel/page/storage;
- grant cannot authorize another body, item, revision, video, request, extension, origin, or time window.

### Worker and stale-result containment

- schema absent/ready/incompatible matrix;
- every pending queue class seeded under each worker mode;
- active hold prevents claim, dispatch, apply, retry, and terminal success;
- hold/revision/deletion/provider-plan drift injected at every provider barrier;
- direct backfills refuse or skip identically;
- legacy `/enrich` provider/state spies remain zero under hold.

### Privacy

- transcript canary absent from worker messages, extension storage, page DOM, logs, diagnostics, URLs, crash artifacts, and reports;
- paired-bearer canary absent outside worker-to-fixed-origin authorization;
- forbidden-key property tests for diagnostics;
- repository/build/runtime scan for real target/content fixtures;
- only aggregate content-free canary report;
- cleanup verification without screenshots of real content.

### Atomicity and deletion

- failure injection after every intent/grant/source/segment/receipt/hold/job write;
- response loss reconciles one terminal receipt;
- item deletion cascades all new state;
- late result after deletion cannot recreate any derived/source/job success.

## External live-lab gate

Even a fully passing implementation cannot perform a live canary until the external packet supplies:

- written target/platform authorization;
- approved targets and rights basis;
- isolated lab deployment, extension, credential, DB, and data-root identities;
- private capture and processing manifests with verified owner/mode;
- provider handling decision;
- retention/delete-by and cleanup owner;
- monitoring, stop/go, backup, rollback, and cleanup commands;
- the accepted D-008 contract plus passing packaged security evidence.

Until then the correct artifact is a truthful blocked-canary report using no live target or content.

## Final verdict

| Capability | Verdict |
|---|---|
| Documentation, source reconciliation, and production-negative design | **GO** |
| Backward-compatible Stage 1 containment | **GO** after formal focused final-gate recheck; non-enabling only |
| Synthetic/pure fixture implementation | **CONDITIONAL**, after D-008 and dependency gates |
| Packaged-local real YouTube access | **DENIED**; fixtures only |
| Isolated live lab canary | **BLOCKED** absent external packet |
| Production browser-visible transcript capture | **DENIED** |
| Production digest/index processing of held browser transcript | **DENIED** |

The denial is code-level and decision-level. It remains in force regardless of flags, approvals, manifests, package mode, worker mode, or implementation completeness.
