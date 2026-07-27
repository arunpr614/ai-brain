# Requirements and Verification Status

## Evidence rule

A requirement is not verified merely because:

- a plan or contract names it;
- a type/interface exists;
- a test name exists but is skipped or not selected;
- a narrow unit passes;
- the current behavior is consistent with it;
- a manifest declares it;
- a prior commit had green CI; or
- no failure was observed.

Verification requires the exact landed implementation, exact test path/case, executed command and counts, durable evidence, independent review, permitted environment, and residual risk.

The authoritative row-level mapping is [requirement traceability](../../REQUIREMENT_TRACEABILITY.md).

## Requirement corpus

| Corpus | Count | Current aggregate state |
|---|---:|---|
| DOM capture P0 functional requirements | 27 | Containment portions partially verified; Chrome/recovery behavior planned |
| DOM capture non-functional requirements | 9 | Some Stage 1 privacy/security foundations verified; full extension/UX/package evidence planned |
| Held manual-enrichment P0 requirements | 38 | Stage 1 containment portions partially verified; manual-processing behavior planned |
| Cross-cutting Stage 2 acceptance cases | 17 | Contract frozen; none executed as complete migration/package evidence |
| SQLite WAL-reset cross-cutting gate | 1 | Blocked P1 |

Total product corpus: 65 P0 functional IDs plus 9 capture NFRs.

## Milestone status

| Milestone | Status | What proves the status | What remains |
|---|---|---|---|
| M0 clean worktree/baseline | Complete historically | Isolated Phase4 branch/worktree and base record | Current tree is intentionally dirty; preserve it |
| M1 PR reconciliation | Complete | #41/#42/#48/#50 merged and rechecked | Refresh mutable GitHub state on resume |
| M2 source/hash reconciliation | Complete | 140 paths, 126 hashes, 14 duplicate groups; rehash still clean | Re-audit current code successors when implementing |
| M3 migration collision decision | Complete as numbering rule | Duplicate inventory, D-020, and shift-together decision | Current executable sequence is 028/029/030; historical pre-D-020 documents remain labeled snapshots |
| M4 Stage 0 review | Complete, conditional | Focused recheck zero P0/P1 | No broader authority |
| M5 Stage 1 containment | Complete, bounded | Formal focused recheck zero P0/P1; pushed code/tests | Preserve denials in all later work |
| M6 additive data foundation | In progress/blocked | Contract GO, primitives, memory-only route, pushed nominal route | Integrate crash proof, remediate SQLite, implement migration 028, execute AC01–17, obtain Implementation GO |
| M7 Chrome companion foundation | Pending | None | Manifest, lifecycle, extractor, fixtures, packaged evidence |
| M8 exact-item recovery | Pending | None | Intent, grant, attach, receipt, hold, item UX, link-only |
| M9 held manual enrichment | Pending; blocked on accepted migration 029 | None | Freeze/apply/accept 029 expand first, then plan preview, auth, jobs, digest/index, retry/drift/deletion |
| M10 UX/accessibility parity | Pending | Inert prototypes only | Real desktop/mobile/keyboard/AT evidence |
| M11 full security/QA | Pending; cannot close before accepted migration 030 | Stage 0/1 and bounded Stage 2 reviews only | Transition parity, drain, rollback blocking, 030 contract/cutover and post-contract matrix, then full regression, scans, package, privacy, accessibility, release-negative |
| M12 permitted release delivery | Pending | Draft PR only | Review, merge/deploy only within explicit authority |
| M13 documentation/handoff | In progress | This package and running log through nominal CI | Wiki and final reports after actual delivery |

## Capture requirement categories

### Authority and exact target

Required:

- exact user/account;
- exact item and item revision;
- canonical video ID;
- exact extension and contract version;
- expiring intent/grant;
- exact approved origins;
- no URL-dedup fallback;
- no page-selected destination; and
- atomic consumption/reconciliation.

Current:

- authority, origin, production-denial, and contract primitives exist;
- exact capture intent/grant/commit routes and schema do not.

### Explicit user actions and disclosure

Required:

- no read before successful server-side content-free `authorize inspect` and the
  user's explicit Inspect action;
- local review before transfer;
- explicit **Add** before transfer;
- destination, language, cue count, completeness, and disclosure; and
- truthful held state after attachment.

Current:

- final UX/prototype references exist;
- no production code implements these states.

### Extractor and browser lifecycle

Required:

- existing companion only;
- temporary `activeTab`;
- no persistent YouTube permission/static script;
- standard watch pages;
- isolated top-frame extractor;
- modern/legacy/virtualized renderer coverage;
- ordered repeated-cue preservation;
- gap/recycling/track/navigation detection;
- multi-tab/window/moved-tab/panel-remount/reload handling;
- zero external fixture traffic; and
- bounded content/size.

Current:

- planning and inert prototype evidence only.

### Attachment, holds, and recovery

Required:

- server recomputation;
- one-active-source rule;
- ordered segments;
- atomic item body/source/receipt/hold/revision update;
- response-loss idempotency;
- recovery-resolution behavior;
- stale-worker fencing; and
- retention/deletion.

Current:

- exact Stage 2 contract only; no migration/runtime implementation.

### Link-only

Required:

- metadata only;
- no transcript read/fetch/job/trigger/backfill;
- no transcript-success copy;
- exact eligibility classification; and
- independent route/contract.

Current:

- accepted decision D-004; no implementation or release evidence.

## Manual-enrichment requirement categories

### Plan and authorization

Required:

- truthful held projection;
- exact provider plan and four separate version domains;
- input and context fingerprints;
- retention/delete clocks;
- separate explicit consent;
- idempotent exact-revision authorization; and
- production denial.

Current:

- final PRD/UX/plan and Stage 1 denial primitives; no service/UI/schema implementation.

### Processing

Required:

- exact current claim;
- pre-dispatch revalidation;
- durable dispatch facts;
- stage-specific digest and index;
- partial success;
- retryable versus terminal digest/index outcomes;
- same-authority automatic digest retry with fresh attempt/claim tokens and a
  three-attempt cap;
- outcome-unknown reconciliation with no blind redispatch;
- index-only retry with a new index generation, exact digest reuse, and zero
  digest-provider calls;
- provider drift invalidation;
- current-space indexing;
- no generic worker bypass; and
- completion only after durable outputs.

Current:

- Stage 1 existing-worker exclusion/reservation foundations; no interactive manual lane.

### Apply, stale, deletion, retention

Required:

- item instance/revision/source/context/generation/token/hold/deletion/mode/clock fences;
- late result rejection;
- replacement invalidation;
- delete queued/in-flight;
- retention expiry and cleanup; and
- no output recreation.

Current:

- exact contract and some generic containment; feature implementation absent.

### UX and accessibility

Required:

- desktop/mobile;
- keyboard;
- focus containment/restoration;
- screen-reader announcements;
- zoom/contrast/reduced motion;
- loading, held, review, running, partial, failure, retry, drift, expiry, deletion, completion, and production-ineligible states.

Current:

- inert final prototypes and QA evidence only.

## Stage 2 AC01–AC17 registry

The accepted registry defines the exact executable evidence envelope. All cases remain unexecuted as complete Stage 2 migration/package evidence.

| Case | Platform | Owner | Tier | Current status |
|---|---|---|---|---|
| S2-AC-01 | Linux | data-release | disposable-database | Not executed |
| S2-AC-02 | Linux | backend-data | hermetic | Not executed |
| S2-AC-03 | Linux | product-backend | hermetic | Not executed |
| S2-AC-04 | Linux | backend-data | hermetic | Not executed |
| S2-AC-05 | Linux | backend-processing | hermetic | Not executed |
| S2-AC-06 | Linux | backend-data | hermetic | Not executed |
| S2-AC-07 | Linux | backend-data | hermetic | Not executed |
| S2-AC-08 | Linux | backend-data | hermetic-fixture-only | Not executed |
| S2-AC-09 | Linux | backend-data | hermetic-fixture-only | Not executed |
| S2-AC-10 | Linux | backend-processing | hermetic | Not executed |
| S2-AC-11 | Linux | processing-safety | hermetic | Not executed |
| S2-AC-12 | Linux | backend-data | hermetic | Not executed |
| S2-AC-13 | Linux | privacy-release | privileged-linux-disposable | Not executed |
| S2-AC-14 | Linux | security-release | hermetic | Not executed |
| S2-AC-15 | Linux | architecture-release | hermetic | Synthetic deny-only primitive exists; authoritative scan/case not executed |
| S2-AC-16 | Linux | release | release-artifact | Not executed |
| S2-AC-17 | Darwin | privacy-release | darwin-disposable | Prerequisite native work only; full case not executed |

Do not reduce the registry's exact oracles to this table. Read the frozen JSON and physical addendum before implementing any case.

## Required verification families

### Repository gates

- formatting/whitespace;
- lint;
- strict typecheck;
- unit and integration tests;
- production application build;
- extension build;
- environment and agent-doc checks;
- release-tool smoke;
- secret and credential-signature scans;
- dependency review; and
- exact diff/structure checks.

### Migration/data

- `028_youtube_browser_transcript.sql` is the Stage 2 browser foundation;
- `029_manual_transcript_enrichment_expand.sql` must be frozen, applied, and
  accepted before any manual route, UI, worker, or provider behavior;
- `030_manual_transcript_enrichment_contract.sql` may run only after
  dual-read/dual-write and backfill parity, work drain, cutover evidence, and
  release-tool refusal of incompatible rollback binaries;
- clean install;
- upgrade from current production schema;
- every relevant intermediate schema;
- idempotent second run;
- migration failure atomicity;
- migration filename/hash drift rejection;
- historical duplicate-prefix guard;
- preflight collisions;
- exact S28 shape/ledger/package attestation;
- old binary/new schema and new binary/old schema;
- old/transition/new binary matrices on S28, S29, and S30;
- dual-write/backfill parity, drain, cutover, post-contract verification, and
  incompatible rollback refusal;
- rollback refusal/forward containment;
- concurrent migrators;
- writer/checkpoint/crash/last-close tests;
- foreign-key, row-count, preservation-hash, and deletion evidence; and
- AC01–AC17.

### Chrome/extension

- manifest permission diff;
- exact origins and sender IDs;
- content-free server-side `authorize inspect` before any extractor/DOM read;
- no persistent YouTube host permission;
- no static YouTube content script;
- modern/legacy/virtualized fixtures;
- repeated cues, gaps, recycling, track drift;
- navigation, tab/panel/reload/multi-window cases;
- expiry and cross-context substitution;
- oversized/HTML-like payloads;
- zero external fixture network; and
- packaged Chrome 116+ behavior;
- a production-extension source/file/module/sourcemap inventory proving zero
  recovery destination, recovery panel, transcript extractor, upload-grant, or
  recovery-handoff code; runtime denial alone is insufficient.

### Backend and processing

- exact auth/origin/version/contract;
- production denial before body read;
- atomic commit, duplicate, lost-response retry, concurrent/different-content conflict;
- active-source invariant;
- hold/revision/item-instance fences;
- stale recovery/enrichment/embedding;
- provider drift and partial success;
- deletion queued/in-flight;
- retention expiry;
- old-binary rollback block; and
- no production provider call.

### UX/accessibility

- no premature success;
- honest missing/link-only/held/partial/drift/expired/deleted/completed copy;
- responsive widths;
- keyboard/focus;
- screen-reader live announcements;
- reduced motion;
- zoom/contrast; and
- production unavailable state.

### Security/privacy

- no content or stable identity in logs, HTTP, analytics, reports, extension storage, URLs, or crash evidence;
- zero extractor/DOM reads for denied, expired, stale, substituted, or failed
  authorize-inspect requests;
- pre-body denial;
- exact CORS/origin;
- no cookie/storage/account/player access;
- content bounds;
- no foreign destination;
- no persistent grant;
- provider aliases;
- private manifest exclusion;
- production-extension recovery-capability absence;
- zero external fixture requests; and
- secret scan.

## Current broad-QA caveats

- The pushed exact-head CI is green for `4786b07`.
- The current dirty tree changes native nominal bytes, so that evidence does not cover it.
- Unscoped lint/typecheck can descend into the unrelated nested checkout and is not hermetic.
- Final broad claims require a pristine worktree or an exact exclusion whose scope is documented and independently reviewed.
- Two current P1 tests are skipped.
- The crash suite currently selects zero real tests.
- The D-021 source gate has no executable implementation.

## Promotion rule

Before changing any requirement row to `Verified`, record:

1. exact source artifact/decision;
2. exact current code files and commit;
3. exact current test files and named cases;
4. command, timestamp, host/platform, counts, and evidence path;
5. pre-push source/local-evidence review result and exact reviewed hash;
6. when hosted evidence is required, exact pushed commit, workflow/run/job IDs,
   commands, selected/pass/fail/skip counts, inspected logs, and a separate
   post-hosted exact-commit evidence review;
7. permitted environment/release effect; and
8. residual risk.
