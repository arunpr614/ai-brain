# YouTube Item Recovery Stage 0 - Adversarial Review

**Created:** 2026-07-23 08:42:46 IST  
**Reviewer stance:** Brutally honest adversarial review  
**Reviewed target:** `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/docs/feature-council/youtube-item-recovery-implementation/` at baseline `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`  
**Report path:** `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/docs/feature-council/youtube-item-recovery-implementation/YOUTUBE_ITEM_RECOVERY_STAGE_0_ADVERSARIAL_REVIEW_2026-07-23_08-42-46_IST.md`

## Executive Verdict

**NO-GO for advancing past Stage 0 in the package's current form.**

The migration-number decision itself is sound: on the inspected baseline, `027_youtube_browser_transcript.sql`, nominal `028_manual_transcript_enrichment_expand.sql`, and deferred nominal `029_manual_transcript_enrichment_contract.sql` are the correct next sequence, subject to the documented shift-together recheck. That is not the same as approving migration 027: no 027 SQL, hash, schema snapshot, compatibility evidence, or independent migration implementation review exists.

Backward-compatible Stage 1 containment **may begin only after** the Stage 0 traceability and sequencing P0 findings below are corrected and the corrected package receives a focused recheck. That authorization must be expressly limited to schema-026-safe, non-enabling containment. Migration 027, link-only release, Chrome body transfer, held-transcript processing, packaged/live YouTube access, and every live-lab action remain blocked by their separate gates.

Browser-visible transcript capture and held-transcript enrichment remain **DENIED in production**. The live lab remains **BLOCKED** because its external authorization and isolation packet does not exist in repository evidence.

## Evidence Inspected

- Governing goal: `/Users/arun.prakash/.codex/attachments/aa5c3aab-6476-46fa-b8d2-4e644bb5b5a4/pasted-text-1.txt`, especially lines 272-294, 390-438, 440-489, 659-691, and 866-900.
- Every Markdown file present in the reviewed target at review time, including the source/hash records, dependency graph, implementation baseline/tracker, migration decision, decision log, risk register, 65-P0 traceability, D-008 addendum, caller inventory, release-authority matrix, and security/privacy review.
- Highest-precedence final verification: `docs/research/youtube-transcripts/2026-07-22_18-23-41_IST_ai_brain_chrome_companion_post_planning_verification_v2_final.md`, especially lines 142-200 and 202-233.
- Final manual-enrichment plan: `docs/plans/youtube-item-recovery-enrichment/2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v2_final.md`, especially provider-plan §7 lines 398-441, provider-ready input §7.1 lines 443-461, request example lines 570-587, and PR sequence lines 1117-1131.
- Current runtime evidence at `f905f6a`: `src/instrumentation.ts:25-79`, `src/lib/capture/policy.ts:40-91,170-192`, `extension/src/background.ts:28-108`, `extension/src/capture.ts:64-118`, `src/app/api/capture/url/route.ts:57-84,142-163,245-392`, `src/app/api/items/[id]/enrich/route.ts:44-140`, and `src/db/migrations/021_restore_transcript_recovery_trigger.sql:8-72`.
- Migration evidence commands confirmed: HEAD, `origin/main`, and protected GitHub `main` all equal `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`; 28 SQL migrations exist; only historical prefixes `017` and `018` are duplicated; `026_notebooklm_export.sql` has SHA-256 `1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f`; the sorted basename/hash manifest has SHA-256 `34968918d6be44f52bb96b4404d9236e342a413733b0c84375855e02a5e2d60a`; no open PR adds a migration.
- Traceability evidence command confirmed exactly 65 unique functional P0 rows: 27 `PRD2-F*` and 38 `ME-F*`, with no duplicate IDs.
- Target-package validation before report creation found no broken relative Markdown links and no `git diff --check` errors.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The 65-P0 count is correct, but the traceability is not implementation-executable

**Evidence:** `REQUIREMENT_TRACEABILITY.md:11-39,59-98` contains exactly 65 unique functional P0 rows, but its columns are only ID, prose implementation allocation, prose test allocation, owner, status, release gate, and residual risk. It has no per-row source-artifact field, exact code files, exact test files, or test-evidence field. A path-pattern check found zero path-like code/test allocations in those 65 rows. The governing goal requires those eight mappings at lines 663-674 and requires the file inventory and P0 code/test mapping to be frozen in Stage 0 at lines 430-438. `IMPLEMENTATION_BASELINE.md:199-201` still calls the current-code audit and P0 traceability incomplete. The newly added caller inventory is strong evidence, but it has not been joined into the P0 matrix, and it does not inventory the extension's literal Save-link callers.

**Why it matters:** The matrix cannot prevent an implementation PR from omitting a claimant, writer, route, extension caller, or required test. A prose phrase such as “centralized claimant gates” is not a file ownership boundary or an executable acceptance allocation.

**Failure mode:** Stage 1 edits only the obvious runtime worker, while a legacy route, direct backfill, trigger, popup/context-menu caller, or apply path remains outside the review and test surface. The row later appears “implemented” without evidence that all consumers were covered.

**Recommendation:** Add explicit `Source artifact`, `Code files`, `Test files`, and `Test evidence` columns for all 65 P0 rows. Planned rows may point to proposed paths and say “not executed”; they must not pretend evidence exists. Join every relevant row to the exact current paths in `implementation/CALLER_CONTAINMENT_INVENTORY.md`, and add the missing extension/link-only callers (`extension/src/background.ts`, `extension/src/popup.ts`, `extension/src/capture.ts`, and `/api/capture/url`). Preserve `Planned` until named tests have actually run.

#### 2. The package silently chooses containment-before-027 despite an unresolved governing gate conflict

**Evidence:** The governing migration gate says that before feature implementation the selected migration filename, hash, schema snapshot, clean/upgrade/mixed-binary tests, and rollback restrictions must be frozen, and says not to proceed until independent review (`pasted-text-1.txt:272-294`). `SOURCE_RECONCILIATION.md:91-95` repeats that rule. Yet `MIGRATION_COLLISION_RESOLUTION.md:23,300-304` says the 027 SQL/hash/schema/evidence do not exist, while `DEPENDENCY_GRAPH.md:73-85` and `implementation/CALLER_CONTAINMENT_INVENTORY.md:309-318` direct Stage 1 containment to land before 027. The governing goal separately lists Stage 1 containment before Stage 2 migration work (`pasted-text-1.txt:440-470`). No decision log entry resolves these two instructions or defines which work is a non-feature safety exception.

**Why it matters:** This is the exact boundary the review was asked to decide. Silently treating all containment code as exempt could allow feature endpoints, schema assumptions, or behavior to creep in before the migration gate. Treating nothing as exempt would prevent the explicitly requested old-schema safety work.

**Failure mode:** An implementation PR labels itself “containment” while adding a restricted route, action, write, extension behavior, or ready-schema assumption; alternatively, migration 027 lands before current claimants can safely recognize it.

**Recommendation:** Record a narrow reviewed decision: Stage 1 is a non-enabling safety slice permitted before 027 because the governing implementation sequence explicitly puts backward-compatible containment first. Freeze its allowed contents to authoritative deployment classification, production pre-body denial, configured-origin/private-response helpers, schema tri-state, worker-mode planning, existing claimant/backfill containment, kill switches, and content-free diagnostics on schema 026. Explicitly prohibit migration SQL, capture/manual actions, intent/grant/commit behavior, transcript writes, hold release, extension changes, and feature enablement in that slice. Require schema-026 parity and production-negative evidence. Migration 027 remains a separate NO-GO until its exact implementation gate passes.

#### 3. The link-only dependency graph permits a release that would enqueue transcript recovery

**Evidence:** `DEPENDENCY_GRAPH.md:37-47,73-85` places link-only after containment but in parallel with migration 027. `implementation/RELEASE_AUTHORITY_MATRIX.md:26` likewise leaves production link-only conditional without naming 027 as a hard dependency. Current `src/db/migrations/021_restore_transcript_recovery_trigger.sql:8-72` enqueues every weak/metadata-only YouTube insert and its backfill has no `browser_link_only_v1` exclusion. The final DOM plan requires that trigger/backfill exclusion in the browser-transcript migration. The current literal extension “Save link” command calls the rich `captureUrl()` path (`extension/src/background.ts:28-38,72-102`), which calls `/api/capture/url` (`extension/src/capture.ts:64-88`); that route performs extraction and can explicitly enqueue transcript recovery (`src/app/api/capture/url/route.ts:142-163,245-253,377-379`).

**Why it matters:** “Save link only” has a non-negotiable no-fetch/no-recovery contract. Shipping it before the durable trigger and application-backfill exclusion would make the label false and could cause background YouTube access.

**Failure mode:** A user chooses Save link only; the item is inserted as weak metadata; migration 021's trigger or an application backfill creates a transcript job; the transcript worker later performs the very recovery that link-only promised not to start.

**Recommendation:** Make frozen migration 027, including trigger and every application/standalone backfill exclusion, a hard predecessor of link-only release. If the team wants a smaller independent data migration, it requires a new collision-free allocation and independent migration review; it cannot be smuggled into Stage 1. Add throwing-fetch, zero-job, trigger, application-backfill, standalone-backfill, popup, context-menu, and duplicate-item tests before any link-only release verdict becomes GO.

### P1 - High Risk

#### 1. D-008 conflates three different origins and leaves the direct panel upload's CORS contract undefined

**Evidence:** `decisions/TWO_CHANNEL_TRANSFER_ADDENDUM.md:15-17,39-45` repeatedly says “exact origin” without distinguishing what it means at each boundary. The final verification separately requires an exact Brain lab destination and exact-origin `externally_connectable` web-page handoff (`...post_planning_verification_v2_final.md:187-200`). A direct side-panel fetch to the lab API has a requester `Origin` of `chrome-extension://<approved-extension-id>`, not the HTTPS lab destination and not the Brain page origin named by `externally_connectable`. `implementation/SECURITY_PRIVACY_REVIEW.md:134-174` defines the owner-web configured-origin helper but does not freeze the extension-origin CORS/preflight contract.

**Why it matters:** These are independent security controls. Conflating them either makes the legitimate upload impossible or encourages a broad CORS exception that admits foreign extension/web origins. `externally_connectable` does not grant the panel network authority; exact destination host permission/CSP and server CORS are separate.

**Failure mode:** The server compares the request `Origin` to the HTTPS destination and rejects every panel commit, or accepts arbitrary origins to make the flow work. A redirect or permissive preflight then bypasses the intended fixed-origin boundary.

**Recommendation:** Revise D-008 to freeze three named values and tests: (1) compile-time HTTPS lab **destination origin** for grant/commit, with redirects rejected; (2) exact `chrome-extension://<lab-extension-id>` **requester Origin** accepted by narrowly scoped CORS/preflight only for the required methods/headers; and (3) exact Brain lab **web-page origin** in `externally_connectable` for the opaque intent handoff. Freeze exact lab `host_permissions`, extension CSP/connect-src, `credentials: "omit"` for grant upload, referrer/cache behavior, and negative tests for every other scheme/host/port/extension ID/origin.

#### 2. D-008 does not fully treat the upload grant as a secret capability

**Evidence:** The security review correctly classifies the one-time upload grant as authority-bearing (`implementation/SECURITY_PRIVACY_REVIEW.md:31-42`). The addendum says it stays out of storage and worker globals (`decisions/TWO_CHANNEL_TRANSFER_ADDENDUM.md:17-18`), but its required leakage tests cover transcript and paired bearer sentinels, not the grant itself (`:48-57`). `RISK_REGISTER.md:R-005` names transcript and paired bearer leakage but omits grant leakage.

**Why it matters:** The grant is a bearer capability to attach content to an exact item. Narrow scope and short expiry reduce impact; they do not make disclosure harmless.

**Failure mode:** The grant enters a runtime message log, diagnostic, URL, crash report, extension storage, page bridge, or screenshot. An unintended context can race the legitimate panel or correlate a private item operation.

**Recommendation:** Define the grant as `<redacted:secret>` everywhere. Permit it only in the single worker-to-panel response after confirmation and the single panel-to-fixed-API authorization field. Store only a cryptographic hash server-side; bind expiry/revocation/single-use/replay semantics; exclude it from URLs, storage, general messages, logs, analytics, crash data, reports, and page DOM; add grant-canary scans across all of those surfaces. Response-loss reconciliation must use a content-free receipt query and must not require retransmitting the body or exposing the grant.

#### 3. D-009 assigns the V1 namespace to the wrong fingerprint

**Evidence:** `SOURCE_RECONCILIATION.md:78-87,127-131` calls `content-processing-provider-plan-v1` the “provider-ready input fingerprint domain separator.” The final manual plan §7 defines that string as the canonical tuple prefix for an individual provider-plan entry (`...implementation_plan_v2_final.md:423-435`). Section 7.1 separately defines the provider-ready authorization-input domain as `manual-content-authorization-input-v1` (`:443-461`). The wire object remains `content-processing-provider-plan-v2` (`:570-587`). `DECISION_LOG.md:D-009` is too compressed to prevent the mistaken interpretation.

**Why it matters:** Provider-plan identity, authorization-input identity, and wire schema bind different facts. Hashing one tuple under another domain can accept drift that should force renewed review or reject an unchanged authorized input.

**Failure mode:** The implementation uses `content-processing-provider-plan-v1` to hash the complete provider-ready input or uses the V2 wire identifier as an entry fingerprint domain, producing incompatible authorization records and false `provider_plan_changed`/`authorization_input_changed` outcomes.

**Recommendation:** Freeze at least these separately named constants: provider-plan wire/schema `content-processing-provider-plan-v2`; provider-plan-entry fingerprint domain `content-processing-provider-plan-v1`; authorization-input fingerprint domain `manual-content-authorization-input-v1`; and authorization-context domain `manual-content-authorization-context-v1`. Correct the source reconciliation and D-009 wording, list the exact tuple for each, and add distinct golden vectors plus one-field drift tests.

#### 4. The required 027 schema contract omits durable exact-item intents and upload grants

**Evidence:** `MIGRATION_COLLISION_RESOLUTION.md:152-164` allocates revisions, sources, segments, receipts, holds, worker fences, and indexes, but no intent or upload-grant persistence. The final verification requires a hashed expiring exact-item intent and create/claim/authorize-inspect/commit/status contracts (`...post_planning_verification_v2_final.md:202-211`). D-008 requires a hashed-at-rest, single-use grant consumed transactionally with the intent and attachment receipt (`decisions/TWO_CHANNEL_TRANSFER_ADDENDUM.md:15-18,22-35`).

**Why it matters:** If intent/grant storage is not allocated before the migration is frozen, implementation will either require another unplanned migration, keep authority in process memory, or overload receipt rows with mutable pre-commit state.

**Failure mode:** Service-worker suspension or server restart loses authority state; replay/single-use enforcement becomes best-effort; response-loss reconciliation cannot distinguish issued, consumed, expired, revoked, and terminal requests.

**Recommendation:** Add explicit durable intent, inspect-authorization/claim as needed, upload-grant hash, expiry/revocation/consumption, request binding, and receipt-reconciliation schema to the reviewed 027 contract or allocate a separately ordered migration before Chrome work. Include item deletion cascade, one-time uniqueness, no-content columns, restart/replay tests, and atomic grant+intent+receipt consumption in the migration freeze.

#### 5. Note-index hold scope remains a material undecided contract

**Evidence:** `implementation/CALLER_CONTAINMENT_INVENTORY.md:163-181,320-335` and `implementation/SECURITY_PRIVACY_REVIEW.md:188-199` explicitly leave open whether a browser-transcript hold is whole-item or restricted-source processing. The final plans require note-index startup to be disabled in restricted lab modes and make the optional capture note AI-off, but they do not authorize an implementation-time guess about separately approved existing notes.

**Why it matters:** A whole-item hold can unexpectedly suppress an independently authorized note; a source-only hold can leak transcript-derived context if note/index inputs are not actually separable.

**Failure mode:** Migration 027 or a claimant helper embeds one interpretation into SQL, after which later correction requires data cleanup, reauthorization, or another migration.

**Recommendation:** Freeze a decision before 027. Define the exact protected data scope, behavior for pre-existing AI-enabled notes, claim/apply predicates, status copy, and deletion behavior. Until then, `manual-transcript-lab` must continue to start no note-index claimant, and the optional recovery note remains `include_in_ai=0`.

### P2 - Medium Risk

#### 1. Stage 0 status records contradict the evidence now present

**Evidence:** `IMPLEMENTATION_TRACKER.md:15-17` still marks source/hash and migration collision work “In progress.” `IMPLEMENTATION_BASELINE.md:199` says the current-code behavior re-audit is not complete even though `implementation/CALLER_CONTAINMENT_INVENTORY.md` now records it. The baseline and decision log still describe provider-plan and D-008 resolution at different levels of completeness. The risk register has no entries for the origin taxonomy, grant capability, provider-domain error, link-only/027 dependency, or traceability gap.

**Why it matters:** The tracker is the advancement control. Stale states can cause an agent either to redo completed work or to treat a pending contract as approved.

**Failure mode:** A later agent reads only the tracker/decision log, starts the wrong slice, or fails to carry this review's lower-severity risks forward.

**Recommendation:** After remediation, update M2/M3/M4 with precise meanings: source reconciliation complete; numbering decision reviewed; actual 027 implementation still NO-GO; D-008 and D-009 corrected but unimplemented; Stage 1 conditionally authorized only under its narrow scope. Add this report's unresolved items to `RISK_REGISTER.md`.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The package correctly separates production denial, lab authority, and synthetic work, and it correctly identifies the next migration number. It gets the execution boundary wrong in four ways:

1. It equates a count-complete P0 list with an implementation-ready traceability matrix.
2. It chooses containment-before-027 without recording how that choice satisfies the governing migration gate.
3. It treats link-only as independent of the only planned durable recovery-exclusion migration.
4. It compresses distinct transfer origins and distinct fingerprint domains into ambiguous “origin” and “provider-plan version” labels.

It also under-specifies the durable authority objects D-008 requires and leaves note-hold scope as an implementation-time choice.

## Missing Validation

- A machine check that all 65 P0 rows have nonempty source, code, test, status, gate, and evidence fields, while rejecting `Verified` without an executed artifact.
- A schema-026 Stage 1 parity matrix that proves ordinary production behavior remains unchanged and every restricted action remains absent/denied.
- A test proving link-only cannot create a transcript job through SQL trigger, application backfill, standalone backfill, duplicate path, popup, or context menu.
- Exact extension-origin CORS/preflight, destination redirect, `externally_connectable`, host-permission, and CSP tests for D-008.
- Upload-grant secret-canary scans and restart/replay/response-loss tests.
- Separate provider-plan-entry, authorization-input, and authorization-context golden fingerprints.
- Migration tests for durable intent/grant lifecycle and transactional consumption.
- A frozen note-hold-scope matrix.

## Revised Recommendations

1. Correct the Stage 0 traceability and join it to the current caller inventory.
2. Record the narrow schema-026 containment carveout and explicitly exclude feature/schema/extension behavior from Stage 1.
3. Make 027 a hard dependency of link-only and add durable intent/grant schema to the 027 contract.
4. Revise D-008 for the three-origin model, exact CORS/manifest boundaries, and secret-grant handling.
5. Correct D-009 into four separate version/domain constants with golden vectors.
6. Freeze note-index hold scope.
7. Update tracker/baseline/risk states, then run a focused Stage 0 recheck.
8. Only after that recheck, begin Stage 1 containment. Keep 027, link-only, Chrome, manual enrichment, live lab, and production enablement blocked until their own evidence exists.

## Go / No-Go Recommendation

- **Stage 0 advancement:** NO-GO until the P0 findings and all dependent P1 contract findings are corrected and rechecked.
- **Migration numbering decision:** GO for nominal 027/028/029 on `f905f6a`, with the shift-together recheck.
- **Stage 1 containment:** NOT YET. Conditional GO after the documented fixes, limited to non-enabling schema-026-safe containment.
- **Migration 027 implementation/merge:** NO-GO pending SQL, complete authority schema, hash/schema freeze, clean/upgrade/mixed-binary/rollback evidence, and independent implementation review.
- **Link-only release:** NO-GO until its durable 027 recovery exclusions and zero-fetch/job/backfill tests pass.
- **Chrome extractor/body transfer:** NO-GO; D-008 P1 findings and 027/package gates remain open.
- **Held manual enrichment:** NO-GO; provider-domain, 027/028, processing, and external gates remain open.
- **Live lab:** BLOCKED absent the external authorization/isolation/retention/cleanup packet.
- **Production capture/manual processing:** DENIED.

## Plan Revision Inputs

### Required Deletions

- Delete the implication that a 65-row prose allocation is a frozen code/test traceability map.
- Delete the graph edge that allows link-only to advance independently of the durable recovery-exclusion migration.
- Delete ambiguous uses of “exact origin” where destination, requester extension Origin, and `externally_connectable` page origin differ.
- Delete the statement that `content-processing-provider-plan-v1` is the provider-ready input fingerprint domain.
- Delete any suggestion that a one-time grant is safe to log or handle as ordinary content-free metadata.

### Required Additions

- Add exact source/code/test/evidence columns for every functional P0 row and link the current caller inventory.
- Add a decision defining the Stage 1 schema-026 containment carveout and its prohibited scope.
- Add extension Save-link callers and `/api/capture/url` behavior to the affected-file inventory.
- Add 027 intent/grant/reconciliation schema requirements and link-only trigger/backfill dependencies.
- Add the three-origin D-008 model and secret-grant lifecycle.
- Add the four provider/authorization version domains and golden tuples.
- Add the note-hold-scope decision.

### Required Acceptance Criteria Changes

- Stage 1 passes only if schema 026 ordinary workflows are unchanged and no restricted action, write, route behavior, or extension behavior exists.
- Link-only passes only with zero network extraction and zero job from every trigger/backfill/caller path.
- D-008 passes only when exact destination, extension requester Origin, Brain-page origin, redirects, CORS, manifest, CSP, and grant leakage all fail closed.
- Provider authorization passes only when independent golden vectors prove the correct tuple/domain at each layer.
- 027 passes only when restart-safe intent/grant/receipt behavior is part of the frozen schema.

### Required Validation Changes

- Add CI validation for complete P0 traceability fields and legal status transitions.
- Add migration-prefix, migration-manifest, schema-snapshot, binary/schema, and exact rollback-block checks.
- Add deterministic Stage 1 schema absent/ready/incompatible tests.
- Add link-only trigger/application/standalone-backfill and extension caller tests.
- Add D-008 CORS/preflight/redirect/grant-secret tests.
- Add provider-domain golden-vector tests.
- Re-run Markdown link, `git diff --check`, secret-pattern, and risk/tracker consistency checks after remediation.

### Required No-Go Gates

- No Stage 1 code before the traceability and containment-sequencing P0 findings are rechecked.
- No link-only release before 027 recovery exclusions are durable and verified.
- No 027 merge before complete SQL/hash/schema/binary/rollback evidence and a fresh independent migration review.
- No Chrome body transfer before D-008 origin and grant findings are resolved.
- No manual-enrichment work before D-009 and note-hold scope are frozen.
- No live YouTube access before the complete external packet.
- No production capture or held-transcript processing under this goal.

## Residual Risks

Even after these revisions, YouTube's DOM and Chrome side-panel lifecycle remain unversioned external dependencies; packaged tests can prove only the tested browser/layout set. A correct two-channel protocol still places a one-time authority and transcript body together in the trusted panel after confirmation, so extension compromise remains consequential. SQLite migration auto-apply and mixed-binary operation require release-tool enforcement, not documentation alone. Provider handling and deletion remain partly external facts. None of those residual risks weakens the current production no-go or the live-lab authorization gate.
