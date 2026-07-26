# Stage 2 Physical Schema Addendum - Adversarial Review

**Created:** 2026-07-24 15:27:41 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `docs/feature-council/youtube-item-recovery-implementation/implementation/STAGE_2_PHYSICAL_SCHEMA_ADDENDUM.md` at SHA-256 `9585a7d87da6388c6f8af9124d0eed82cdeb495569317278944d597beb5d8fe7`, its generator at `f15fcdc3151b0a34e8693e570a3a1435bc1919305022f0634414a58ffc5d1331`, and its fixture at `45c922536cab353207ee5a456266e8857df07c2ecf67982b1fd66dbfe34d3d28`
**Report path:** `/Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/docs/feature-council/youtube-item-recovery-implementation/implementation/STAGE_2_PHYSICAL_SCHEMA_ADDENDUM_ADVERSARIAL_REVIEW_2026-07-24_15-27-41_IST.md`

## Executive Verdict

**NO-GO.** The reviewed addendum must not authorize native-fork work, migration DDL, database application, browser work, or release work.

The artifact is not a narrow physical-schema reconciliation. It replaces approved product and retention behavior with an all-system security, backup, client-storage, native-runtime, and platform-containment redesign. Two parts contradict P0 user outcomes: all existing YouTube items become permanently ineligible for recovery, and a routine backup can delete a held transcript before the user-visible retention deadline. The advancement gate also authorizes less implementation scope than its own first-layer evidence requires, begins from a knowingly stale branch, and depends on attestations and tests that are not yet canonically constructible.

The safest correction is replacement with a current-main-based, approved-scope Stage 2 addendum. Patching individual paragraphs would leave the unapproved architecture and its hidden dependencies intact.

## Evidence Inspected

- Governing implementation goal in `pasted-text-1.txt`, including source precedence, backward compatibility, staged implementation, lab isolation, production denial, and definition of done.
- Final V2 DOM-capture PRD and implementation plan, especially existing-item recovery, confirmation/receipt copy, retention, deletion, backup-expiry disclosure, migration sequencing, and production boundaries.
- Final V2 held-manual-enrichment implementation plan, especially deletion and the instruction that operational behavior must not promise immediate erasure from retained backups.
- Product Council and final UX/traceability materials for item-initiated recovery and held enrichment.
- Current worktree, branch, Stage 0/1 artifacts, source inventory, caller inventory, release authority, and Stage 1 review evidence.
- Current `origin/main` at `6784e0e85c50fd86e3353b54a8b1964f045b65b1`; branch head `7f5163d185dc2536f74bebb6d8c116dc2f2ccc86`; merge base `f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8`; six commits ahead and eleven protected-main commits behind.
- Current migration frontier `027_notebooklm_url_sources.sql`, SHA-256 `a488c7e15c54d232ad16708541bbc4a6fea6c2645fd79a999f7c416a8e2603b6`, Git blob `69ff5c2f13c82b4797143705bfa5ab8f6d31ba10`.
- Current SQLite callers, release scripts, deployment scripts, CI workflow, dependency declarations, backup/restore code, and direct stock `better-sqlite3`/`sqlite-vec` use.
- Pinned SQLite source `sqlite3.c` at SHA-256 `e80215754ac6cfaefe272342efd581b6dbefdbdc21f96bd83fcb698bee9d36a5`.
- Two deterministic generator executions, fixture byte comparison, ESLint, JSON parsing, the 69-entry/69-case exact reference bijection, 19 negative-vector categories, Markdown-fence parity, trailing-whitespace/final-LF checks, and secret/path/placeholder scans.
- Three prior focused reviews at the same addendum hash: migration/bootstrap GO, SQLite semantic GO, and repaired terminal/freeze GO, each with zero P0/P1/P2 findings in its deliberately narrow scope.
- Three independent broad adversarial passes: product/reality/staleness, safety/liveness/authority, and verification/deployment/rollback.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The migration permanently removes every existing YouTube item from the recovery cohort

**Evidence:** The final product flow starts from an existing Brain YouTube item, and the DOM PRD promises `Transcript added` for an eligible metadata-only item. Addendum lines 635, 651, and 2712 instead insert immutable `legacy_unproven` client-storage rows for every pre-028 YouTube/YouTube Short item, forbid promotion, and make copied pending/retryable recovery jobs permanently inert.
**Why it matters:** Feature A's primary user journey is recovery for an item already in Brain. The migration would make the entire existing backlog ineligible without a product decision, migration path, UX change, or traceability update.
**Failure mode:** After upgrade, every existing eligible metadata-only YouTube item remains permanently unable to authorize inspect, transfer, attachment, or automatic recovery resolution. Only items created by the new binary can qualify.
**Recommendation:** Remove the invented immutable legacy exclusion. Define and test a reviewed migration/classifier that preserves eligibility for existing metadata-only items using authoritative server-side item/source state. If that cannot be made safe, stop and obtain explicit product approval for a new-items-only feature, then revise the PRD, UX, traceability, and release authority before implementation.

#### 2. Routine backup can delete a held transcript before the promised retention date

**Evidence:** The DOM PRD says default backups run about every six hours, tells the user Brain will retain a lab capture until the approved delete-by date, and discloses that deleted content may remain in backups until normal expiry. The manual-enrichment plan explicitly says not to promise immediate deletion from existing backups. Addendum lines 855, 861, 867, and 869 instead exclude every restricted live root from every S28 backup, append irreversible retirement evidence, and require corresponding live purge; line 867 explicitly permits deletion earlier than the maximum deadline when a backup is requested.
**Why it matters:** Feature B depends on the held transcript remaining available for later review and explicit processing authorization. The addendum silently changes `delete by` from a latest deletion boundary into permission for arbitrary early deletion triggered by routine backup.
**Failure mode:** A six-hour backup can purge the live source and held generation hours after capture, before the user can review or authorize enrichment, contradicting confirmation copy and durable held-state behavior.
**Recommendation:** Remove backup-triggered live purge and the replacement backup-retirement architecture. Preserve the approved live-retain-until/delete-by lifecycle and truthful normal-backup-expiry disclosure. Any stronger backup-erasure design requires a separately approved product/privacy/UX decision and must not shorten the promised usable window.

### P1 - High Risk

#### 1. Protected-main integration occurs too late

**Evidence:** Addendum lines 36–46 acknowledge that the branch is eleven protected-main commits behind and that release scripts overlap, but require integration only before SQL creation. Lines 18 and 2730 authorize native implementation immediately. Current main changed migration 027, backup/restore, release tooling, extension code, and packaging. The proposed first layer binds those same inputs.
**Why it matters:** Native, caller, release, and target attestations created on the stale branch would be invalidated by the mandatory later integration. This violates the governing source precedence and clean-current-main implementation requirement.
**Failure mode:** Work is implemented and reviewed against obsolete callers and release behavior, then either discarded or accidentally merged around protected-main changes.
**Recommendation:** Integrate current `origin/main`, reconcile the two overlapping release scripts and all affected callers, rerun the complete Stage 1 evidence and focused review, refresh control artifacts, and only then freeze a replacement Stage 2 contract. Later drift in native inputs, callers, package locks, target policy, or release scripts must invalidate implementation evidence.

#### 2. The addendum replaces the approved staged migration with an incompatible all-system cutover

**Evidence:** The governing goal and final implementation plans separate backward-compatible containment, additive/expand data foundation, Chrome work, recovery, enrichment, and later contract cleanup. Addendum sections 6.3.1, 6.3.2, 6.12.1, 7, 9, and 10 require simultaneous changes to service workers, RSC/read surfaces, every export path, local note storage, every SQLite opener, backup/restore, external recovery infrastructure, OS containment, release activation, and schema. Lines 2474 and 2572 make B27 incompatible and keep 028 outside the additive rollback allowlist, while line 2732 still blocks extension work needed by the same client-storage contract.
**Why it matters:** The proposed deployment cannot be staged, independently reviewed, or rolled forward with the approved PR sequence. It also exceeds a narrow drift addendum without an approved replacement architecture.
**Failure mode:** Migration 028 requires unshipped client, extension, platform, backup, and emergency-runtime behavior to be correct at one instant; any missing component keeps the application down or weakens a claimed invariant.
**Recommendation:** Restore the approved expand/transition/contract sequence. Stage 2 should add only the data/revision/hold/receipt/R-032 foundations that remain inert under production denial and are compatible with the transition binary. Defer browser, client-cache, manual-enrichment, contract cleanup, and production-release work to their reviewed stages.

#### 3. New ordinary YouTube items would lose existing production capabilities

**Evidence:** Addendum line 635 assigns `no_durable_client_copy_v1` to every post-028 YouTube/YouTube Short item. Lines 639–645 then replace normal reads with restricted shells and ban export, print, share, clipboard, offline use, NotebookLM, Recall, Telegram, and other existing paths. Production browser capture remains denied.
**Why it matters:** Ordinary production behavior must remain unchanged while restricted capabilities are denied. The migration would impose lab-only restrictions on every new production YouTube item even though no transcript capture occurred.
**Failure mode:** Production users save an ordinary or link-only YouTube item and unexpectedly lose established read/export/integration behavior.
**Recommendation:** Do not add this client-storage architecture to Stage 2. If a later lab design needs a restricted client contract, mint it only from an explicit isolated-lab or no-network synthetic creation authority and prove ordinary/link-only regression parity.

#### 4. Test and development can authorize live YouTube DOM inspection

**Evidence:** Line 409 says test/development are synthetic-only. `standard_watch_v1` at lines 1521 and 1527 and grant issuance at line 1587 validate real `www.youtube.com` but do not require `environment='lab'` plus current external target authorization. The lab-versus-fixture distinction appears only after body streaming at line 2495.
**Why it matters:** The governing boundary requires separate lab identity, data root, credentials, manifest, target authorization, policy approval, and cleanup before any live automated DOM inspection. Denying at commit is too late; inspect itself reads the transcript.
**Failure mode:** A test/development policy issues and consumes inspect authority against a live standard watch page, allowing transcript DOM execution before the later storage gate rejects it.
**Recommendation:** Freeze and enforce an environment-by-route matrix at intent creation, claim, inspect issuance, inspect consumption immediately before execution, confirmation, grant, and commit: only authorized lab plus `standard_watch_v1`; only test/development plus packaged no-network fixture; production always denied. Add the complete negative cross-product and prove zero DOM/text access on every denial.

#### 5. The advancement gate authorizes less code than its required evidence depends on

**Evidence:** Lines 18 and 2730 authorize only two source forks, one combined addon, wrapper, tests, and first-layer attestation. Lines 2366–2372 require external supervisor/watchdog, pidfd manager, descriptor broker, trusted clock service, tmpfs setup, LSM/sandbox/cgroup policy, kill/reap protocol, and raw-destruction machinery. Lines 80–82, 784, and 871 also require an independent recovery control plane and replicated ledger, none of which has a concrete repository package, owner, protocol, deployment artifact, or approved service.
**Why it matters:** The authorized slice cannot produce its own completion evidence without silently expanding scope.
**Failure mode:** Implementers either create unreviewed privileged platform components or claim a first-layer attestation while required external controls do not exist.
**Recommendation:** Prefer removing the unapproved native/platform/backup architecture from the replacement addendum. If retained under a separate approved decision, enumerate exact repository packages, platform units, services, owners, protocols, trust roots, target triples, and license/NOTICE obligations; split native, platform-containment, and composition attestations and review each before SQL.

#### 6. Attestations, callers, and release targets are not canonically verifiable

**Evidence:** Lines 2364–2374 list first-/second-layer content in prose but define no complete ordered payload, framing domain, artifact format, signature/trust binding, release-manifest placement, or closed target registry. The current caller inventory is frozen at the old baseline, while current code has many direct stock `better-sqlite3`/`sqlite-vec` openers and deployment can reinstall stock packages. CI runs only generic `ubuntu-latest`; release verification checks versions/ABI, not kernel, LSM, cgroup, mount, caller, or native attestations.
**Why it matters:** “Every target” and “every caller” cannot produce a reproducible pass/fail gate without finite registries and trusted artifact formats.
**Failure mode:** Unregistered callers or unsupported target policy bypass the wrapper while prose-only attestations still appear green.
**Recommendation:** For any retained native design, freeze machine-readable caller and target registries; exact payload/domain/signing formats; provenance trust; release-manifest bindings; source/bundle/install-command/native-dependency scans; and exact-target test jobs. No general claim may substitute for finite evidence.

#### 7. The migration-attestation dependency is cyclic

**Evidence:** Lines 2374–2376 require authored DDL, an exact-S28 second layer, and a disposable S27-to-S28 rehearsal to build attestations. Lines 2405 and 2732 require those attestations before the DDL may be prepared or run against any database.
**Why it matters:** The evidence needed to authorize rehearsal cannot be created without performing the rehearsal it forbids.
**Failure mode:** Migration implementation can never satisfy the gate without an undocumented exception.
**Recommendation:** In a replacement staged contract, explicitly distinguish offline DDL authoring and isolated disposable rehearsal from authority to touch any shared/lab/production database. Authoring plus disposable tests precede migration review; non-disposable prepare/apply remains blocked until reviewed evidence exists.

#### 8. The retention system cannot honestly guarantee its deletion deadline

**Evidence:** The design blocks live root deletion until remote ledger replication acknowledges it; an outage after admission can therefore extend content past `source_delete_by`. The live database reserves no terminal bytes/inodes for mandatory outbox, ledger, tombstone, seal, WAL/journal/VACUUM, and completion writes. The claimed hard destruction bound is derived from three benchmark runs and conflicts with failure modes where clock/reference recovery blocks irreversible action.
**Why it matters:** A hard privacy deadline cannot depend on a future remote acknowledgement, unreserved storage, or sampled timing. Readiness containment is not deletion.
**Failure mode:** Recovery-store outage, ENOSPC, inode exhaustion, fsync delay, or clock latch leaves restricted content indefinitely while direct deletion is forbidden.
**Recommendation:** Remove this replacement retention engine and preserve the approved item-delete plus normal-backup-expiry model. If a future reviewed design claims a hard physical deadline, it needs enforceable terminal capacity, outage-independent local deletion authority, anti-resurrection semantics, conservative clock behavior, finite exact-target tests, and a truthful distinction between measured SLO and hard guarantee.

#### 9. The raw tmpfs privacy boundary omits system-memory persistence paths

**Evidence:** Lines 1122 and 2713 check swap, hibernation, and process core dumps, while line 1138 claims a kernel panic removes raw tmpfs bytes. The target contract does not cover kdump/crashkernel/kexec crash kernels, persistent `/proc/vmcore`, hypervisor snapshots, or host memory snapshots.
**Why it matters:** tmpfs does not itself prove that memory cannot be persisted during host or VM crash capture.
**Failure mode:** Transcript-bearing raw pages survive in a crash dump despite an attested “volatile only” claim.
**Recommendation:** Do not make this claim in the narrow Stage 2 data foundation. Any later raw-staging target must either prove those persistence paths absent/disabled or declare the target unsupported, with privileged negative capability tests.

#### 10. The mandatory test matrix is not executable release evidence

**Evidence:** Section 10 has no stable case IDs, finite failpoint registry, command/harness mapping, environment tier, timeout, oracle, evidence schema, artifact hash, or owner. Phrases such as “every instruction,” “every interval,” “every packaged target,” and future repository-scanned producers are unbounded. Current CI has no privileged exact-kernel cgroup/LSM, reboot, watchdog, or disposable-node job. The claimed independent clean-room conformance audit at line 2444 has no report or independent encoder in the repository; the generator reproducing its own fixture proves self-consistency only.
**Why it matters:** A prose matrix cannot yield reproducible GO evidence, and a self-generated fixture cannot be described as an independent audit.
**Failure mode:** Reviewers accept test theater because no finite manifest can show what ran, on which target, with which oracle, and against which bytes.
**Recommendation:** Remove unsupported audit claims. Give every retained requirement and case a stable ID, finite generated state/failpoint registry, command, harness, exact environment, timeout, oracle, owner, evidence path/hash, and release gate. Separate hermetic, privileged integration, disposable-node/reboot, and deployment-rehearsal tiers.

#### 11. Post-S28 recovery is not a deployable rollback path

**Evidence:** The addendum's “rollback” keeps S28 and requires a schema-aware fixed binary. Current tooling packages and attempts a historical previous application; the compatibility checker correctly rejects B27 against S28. No prebuilt, reviewed S28-compatible emergency containment runtime, automatic selection rule, or measured recovery objective exists.
**Why it matters:** A migration commit followed by B28 startup failure leaves the application down with no deployable recovery artifact.
**Failure mode:** Automatic rollback selects B27, B27 refuses S28, and neither user workflow nor defined emergency containment starts.
**Recommendation:** Follow the approved transition-binary/forward-disable plan. Before any non-disposable schema application, prebuild, review, install, and rehearse the compatible forward-recovery artifact. Call it forward recovery, not downgrade rollback, and test every post-commit/close/reopen failure.

### P2 - Medium Risk

#### 1. Operator observability and recovery ownership are incomplete

**Evidence:** Stable error tokens exist, but no closed metric/alert set, deadline-slack threshold, capability-latch health signal, owner, escalation path, recovery runbook, or simulated operator evidence is required.
**Why it matters:** Fail-closed systems can remain unavailable indefinitely without actionable, content-free operations.
**Recommendation:** Bind metrics, alerts, owners, runbooks, recovery drills, and evidence IDs to each release gate.

#### 2. The authoritative control documents are stale

**Evidence:** `IMPLEMENTATION_BASELINE.md`, `MIGRATION_COLLISION_RESOLUTION.md`, `IMPLEMENTATION_TRACKER.md`, `RISK_REGISTER.md`, `DECISION_LOG.md`, `REQUIREMENT_TRACEABILITY.md`, `CALLER_CONTAINMENT_INVENTORY.md`, and `RELEASE_AUTHORITY_MATRIX.md` still describe the older base/frontier and do not consistently carry 027-to-028 decisions.
**Why it matters:** Reviewers cannot tell which document is current authority.
**Recommendation:** After current-main integration and contract replacement, refresh the control set atomically and mark historical snapshots explicitly.

#### 3. Production and private-lab extension packaging are not yet separated

**Evidence:** Current main packages the existing production companion from one extension distribution. The goal requires the same source tree but separate lab extension identity, credentials, data root, and manifest, with production denial retained.
**Why it matters:** A later Chrome stage could accidentally ship lab identity, permissions, endpoints, or live-capable flags in the production artifact.
**Recommendation:** Before Stage 3, define production and private-lab build flavors from the same extension source, with manifest/permission/origin/flag rejection checks and packaged E2E for both.

#### 4. Permanent inspect-issuance history is unbounded

**Evidence:** Lines 1495–1512 retain issuance rows across consumption, item deletion, backup, restore, and epoch rotation and forbid deletion, without a capacity or rotation lifecycle.
**Why it matters:** Eventual exhaustion or unbounded growth becomes an availability problem.
**Recommendation:** If this later-stage authority design is retained, define per-epoch/global capacity, fail-closed admission, and reviewed rotation/pruning only when mutable authority is empty.

#### 5. Atomic publication of the database-plus-sidecar pair is unspecified

**Evidence:** The backup design requires two sibling outputs but describes them as atomically published; ordinary rename cannot atomically expose two independent sibling files.
**Why it matters:** Crash can expose an unverifiable or mismatched pair.
**Recommendation:** If retained under a separate backup project, use a bundle-directory rename or one atomically switched manifest pointer that content-addresses both children, with crash injection around every write/fsync/rename.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

- It treats stricter-sounding architecture as automatically safer even when it contradicts approved retention and existing-item outcomes.
- It turns a narrow migration-collision addendum into a replacement operating system for database access, backup, client storage, recovery infrastructure, and host containment.
- It allows implementation against a stale branch even though the evidence explicitly binds files changed on protected main.
- It declares universal target/caller/test properties without finite registries or executable evidence.
- It conflates a measured operational bound with an enforceable deletion guarantee.
- It calls forward recovery “rollback” without a compatible prepositioned artifact.
- It claims independent conformance evidence that is not present.

## Missing Validation

- Production-shaped upgrade proving an existing metadata-only YouTube item remains eligible and can complete exact-item recovery.
- Backup before `source_delete_by` proving the live source, hold, and later manual-enrichment opportunity remain unchanged.
- Complete Stage 1 validation and focused re-review after protected-main integration.
- Approved expand/transition/contract binary-schema matrix and forward-recovery rehearsal.
- Environment-by-route inspect matrix proving test/development cannot touch live YouTube.
- Ordinary production/link-only regression proving no restricted client contract or feature loss.
- Finite target/caller registries and exact evidence formats for any retained native work.
- Independent encoder/audit evidence rather than generator self-consistency.
- Stable test-case registry, harness/oracle mapping, environment tiers, and signed evidence manifest.
- License/provenance/NOTICE review for any future third-party source fork.

## Revised Recommendations

1. Keep migration SQL, native forks, browser work, live access, and deployment blocked.
2. Integrate current protected main and reconcile Stage 1/release overlaps first.
3. Rerun Stage 1 scope, tests, builds, release smoke, and focused review on the integrated tree.
4. Replace this addendum with a narrow approved-scope contract:
   - migration 028 collision/frontier and compatibility;
   - existing-item-safe `content_revision` and body-change fencing;
   - additive transcript source/segment/hold/receipt/job foundations;
   - one-active-source enforcement after explicit historical preflight;
   - R-032 atomic recovery apply/finalize receipt;
   - held generation identity;
   - ordinary item deletion and truthful normal-backup-expiry behavior;
   - production denial and no new route/extension/provider authority.
5. Preserve the final plans' expand/transition/contract sequence and existing-client behavior.
6. Put browser intent/grant/inspect, private-lab extension, manual-enrichment authorization, and any stronger retention/native-platform proposal behind their later, separate reviewed gates.
7. Give the replacement artifact finite case IDs and executable evidence mappings.
8. Re-run focused migration, product/retention, transaction, and full adversarial reviews on one exact replacement hash.

## Go / No-Go Recommendation

**NO-GO.** Advancement requires:

- zero unresolved P0/P1 findings on a replacement exact hash;
- current-main integration and refreshed Stage 1 evidence;
- proof that existing eligible items remain recoverable;
- proof that backup does not purge a live held transcript before its approved date;
- restoration of backward-compatible staged delivery;
- finite, executable validation evidence.

## Plan Revision Inputs

### Required Deletions

- Immutable blanket `legacy_unproven` exclusion for all pre-028 items.
- Automatic `no_durable_client_copy_v1` classification for every new YouTube item.
- Backup-triggered early live purge and replacement backup-retirement system.
- Unapproved native/platform/external-recovery architecture from the Stage 2 data-foundation gate.
- Universal prose-only target/caller/test claims.
- Unsupported independent-audit claim.

### Required Additions

- Current-main integration as a prerequisite to any Stage 2 implementation.
- Existing-item migration/classifier and acceptance test.
- Approved retention/delete-by/normal-backup-expiry semantics.
- Narrow additive data and R-032 transaction contract.
- Explicit binary/schema transition and compatible forward-recovery artifact.
- Finite requirement/test/evidence registry.
- Closed lab-versus-synthetic environment matrix for later browser work.

### Required Acceptance Criteria Changes

- Stage 2 data foundation must not require Chrome, service-worker, client-cache, platform-containment, or external recovery-control-plane deployment.
- Ordinary production and link-only YouTube behavior must remain byte/semantics compatible except for inert additive foundations and unconditional safety fencing.
- A pre-028 eligible metadata-only item must remain eligible after migration.
- A held source must remain live and usable until its approved delete-by boundary unless the user explicitly deletes the item.
- Deleted content may remain in retained backups until truthful normal expiry, matching approved disclosure.

### Required Validation Changes

- Add stable case IDs, commands, harnesses, target/environment tiers, timeouts, oracles, owners, and evidence hashes.
- Add production-shaped S27-to-S28 upgrade, concurrent migration, crash, no-op, and forward-recovery tests.
- Add exact old/new binary-schema matrix from the approved transition plan.
- Add existing-item recovery and pre-deadline backup retention tests.
- Add production-negative and ordinary-workflow regression tests.
- Require a genuinely independent encoder only for contracts that need one.

### Required No-Go Gates

- Protected main not integrated or Stage 1 evidence stale.
- Existing-item recovery is removed without explicit product approval.
- Backup can purge a live held source before its disclosed date.
- Test/development can authorize live DOM inspection.
- A migration depends on unimplemented or unreviewed client/platform/external infrastructure.
- Roll-forward recovery artifact is absent or unrehearsed.
- Any P0/P1 adversarial finding remains unresolved.

## Residual Risks

Even after narrowing the addendum, schema evolution across current direct SQLite callers and the one-active-source/R-032 transaction boundaries remain high-risk and require deterministic concurrency/failure tests. Later browser capture still depends on external lab authorization, platform-policy determination, packaged-extension isolation, retention/deletion approval, and cleanup evidence. Production browser capture and held-browser-transcript manual enrichment remain unauthorized regardless of data-foundation progress.
