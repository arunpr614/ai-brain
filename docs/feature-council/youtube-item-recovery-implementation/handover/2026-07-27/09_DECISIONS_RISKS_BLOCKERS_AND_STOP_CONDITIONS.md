# Decisions, Risks, Blockers, and Stop Conditions

## Decision hierarchy

The [decision log](../../DECISION_LOG.md) reconciles current evidence. It cannot replace final PRDs/UX or weaken explicit safety/release boundaries.

## Decision summary

| ID | Decision | Current consequence |
|---|---|---|
| D-001 | Frozen historical implementation base was `f905f6a...` | Preserve as provenance; live merge base is now `6784e0e...` |
| D-002 | Extend the existing MV3 companion | No second extension |
| D-003 | Keep capture and held processing unavailable in production by construction | Production classification/denial outranks flags/config |
| D-004 | Link-only is a distinct metadata-only contract | No transcript read/fetch/job/trigger/backfill or success copy |
| D-005 | Grandfather historical duplicate prefixes 017/018 | Do not rename applied files; reject new duplicate prefixes |
| D-006 | Shift the whole unshipped feature migration sequence when the frontier moves | Originally 027/028/029; superseded by D-020 to 028/029/030 |
| D-007 | Exact-item intent commit supersedes URL-dedup destination selection | No alternate destination by URL |
| D-008 | Use two-channel transfer and three separately named origins | Worker owns authority; a content-free server-side `authorize inspect` decision must precede every extractor/DOM read; panel owns only transient content/upload grant |
| D-009 | Preserve four provider/authorization version domains | Never substitute wire, entry, input, or context versions |
| D-010 | Do not depend on `sidePanel.onClosed` | Chrome 116 lifecycle uses document lifetime and explicit invalidation |
| D-011 | Pre-Add content lives only in trusted panel memory | No storage, worker, page, URL, clipboard, log, or analytics copy |
| D-012 | Provider aliases are random/non-stable | No stable Brain identity across provider boundary |
| D-013 | Defer live lab until the external packet exists | Synthetic/packaged work continues; live request blocked |
| D-014 | Permit only non-enabling Stage 1 containment before feature schema | No feature migration/surface/intent/attachment/enablement |
| D-015 | Browser hold is body/source-scoped, not a blanket note-index ban | Separately authorized notes retain existing semantics where proven |
| D-016 | Feature schema `ready` requires exact ledger and full shape | No column-only/look-alike readiness |
| D-017 | Permit narrow privacy redaction in existing status/UI | No new feature/status semantics |
| D-018 | Persist unresolved batch reservation before provider dispatch | Ambiguous acceptance stays quarantined/nonresubmittable |
| D-019 | Bind reservation-awareness to the packaged application | Historical unaware artifact cannot activate against live marker |
| D-020 | Protected main consumed ordinary 027; shift feature sequence to 028/029/030 and bind exact Stage 2 seal | Freeze/apply/accept 028 first; freeze/apply/accept 029 before any manual behavior; apply 030 only after transition parity, drain, cutover, and rollback-blocking evidence |
| D-021 | Preserve contract bytes but block migration/S28/affected foundations on SQLite WAL advisory | A fixed source must prove semantic compatibility with the frozen 3.49.2 contract locators; hash pinning alone is insufficient |

## Current mutation authority

This handover is evidence and operating guidance, not authority by itself.
Apply the latest explicit governing instruction to each exact action:

| Action | Current authority rule |
|---|---|
| Local remediation and tests requested by the current task | Allowed only within the named worktree and task scope |
| `git ls-remote`, `gh pr view`, `gh pr checks`, and hosted-log inspection | Read-only refresh is required before relying on remote state |
| Exact sanitized handover Group E log append and staging for publication verification | Authorized by the governing goal plus current request only after zero P0/P1 exact-byte review; staging grants no commit or remote-write authority |
| Exact Group E commit, push, and draft-PR update | Authorized only after publication-verifier PASS on the identical staged set and validated scoped attestation |
| Any feature/crash/D-021 path, review submission, or other remote write | Not authorized by the handover-delivery attestation; require a new explicit instruction for the exact mutation |
| Merge, deployment, release, production enablement, live capture, or live processing | Not authorized; preserve the explicit denials and stop |

Before a write, record the authorizing instruction, exact paths/commit/remote
target, and allowed effect. If that mapping is absent or ambiguous, continue
safe local/read-only work and stop before the mutation.

## Current blockers versus deliberate denials

### Engineering blockers

| Blocker | Severity | Effect | Exit condition |
|---|---|---|---|
| Crash parent controller absent | P1 prerequisite | Stops abrupt-restart proof | Exact controller/fixtures/tests pass and review GO |
| Crash suite selects zero real tests | P1 false-confidence risk | Hosted job is vacuous | Real `crash/restart:` tests plus execution-count guard |
| Durable receipt validator disagrees with native receipt | P1 integration | Recovery worker rejects correct output | Exact schema reconciled and negative-tested |
| D-021 exact-hash/isolation/scenario/enforcement gaps | Four P1 review findings | Addendum NO-GO | Revision plus fresh zero-P0/P1 review |
| SQLite 3.49.2 affected-source compatibility | P1 source/semantics | Blocks migration 028/S28/affected foundations | One fixed source, full provenance, and a passing candidate-versus-3.49.2 semantic matrix for frozen physical-contract lines 3076-3085, 4443-4449, and 4514-4521 |
| Same-database actor/checkpoint closure absent | P1 architecture | Blocks S28 | Machine inventory, serialization, deterministic tests |
| Migration 028 absent | Stage gate | Blocks all feature data/runtime work | Contract-exact SQL/package/tests and Stage 2 Implementation GO |
| Migration 029 expand absent/unaccepted | Stage gate | Blocks every manual route, UI, worker, and provider behavior | Freeze, hash, apply, test, and accept `029_manual_transcript_enrichment_expand.sql` with zero P0/P1 |
| Migration 030 contract/cutover absent/unaccepted | Stage gate | Blocks Stage 7 completion and contract cleanup | Prove dual-read/write and backfill parity, drain, cutover, incompatible-rollback refusal, then apply/test/accept `030_manual_transcript_enrichment_contract.sql` |
| `authorize inspect` not proven before DOM access | P1 security | Blocks every transcript inspection/capture path | Content-free server-side authorization precedes every extractor/DOM read; refusal, expiry, drift, and substitution tests prove zero reads |
| Production extension capability-absence proof missing | P1 production denial | Runtime flags could conceal shipped recovery capability | Packaged production source/file/module/sourcemap inventory proves no recovery destination, panel, extractor, upload-grant, or handoff code |
| Retry outcome taxonomy not durable | P1 mutation/idempotency | Retry can redispatch an accepted outcome or rerun the wrong stage | Durable, fenced `retryable`, `terminal`, and `outcome-unknown` states with reconcile-before-redispatch tests |
| Post-hosted exact-commit review absent | P1 release evidence | A pre-push review or green wrapper may be misrepresented as final | Same-SHA logs/counts and named-case evidence pass a separate zero-P0/P1 post-hosted review |
| Broad dirty-tree QA absent | Release gate | Stops broad claims | Pristine/exact-scope full checks |

### External blockers

| Blocker | Effect | Smallest user/operator action later |
|---|---|---|
| No target-specific platform-policy determination | Blocks live YouTube lab | Supply reviewed written determination |
| No approved target/sample list | Blocks live canary | Supply authorized standard watch targets/sample |
| No isolated lab identities/credentials/database/data root | Blocks lab startup | Provision reviewed separate lab packet |
| No private manifests/retention/deletion owner | Blocks capture/processing | Create outside-Git manifests and cleanup ownership |
| No provider terms/processing decision | Blocks remote manual processing | Supply reviewed provider handling decision |

External blockers do not stop safe synthetic, packaged-local, documentation, PR, or production-negative work.

### Permanent current denials

- Production browser-visible transcript capture.
- Production held browser-transcript manual enrichment/indexing.
- Persistent YouTube access or static content script.
- Chrome Web Store publication of capture behavior.
- Production transcript/provider/data writes.
- Live canary without the full external packet.

Only a new explicit, separately reviewed authorization can change these.

## Open high-severity risk themes

The [risk register](../../RISK_REGISTER.md) contains the authoritative row detail.

### P0 themes

- Weak-source auto-upgrade or existing Save-link behavior accidentally performs transcript recovery.
- Stage 1 containment broadens into feature/schema/extension behavior.
- Link-only releases before durable recovery exclusions.
- A production path becomes feature-enabling through config/manifest/request authority.

Release effect: immediate stop.

### P1 data/transaction themes

- `content_revision` or item instance is not advanced/fenced across every body writer.
- One-active-source migration collides with historical data.
- Intent/grant/replay authority is not durable.
- Lost response or ambiguous provider acceptance causes duplicate mutation/dispatch.
- Retryable, terminal, and outcome-unknown results collapse into one retry sink,
  allowing blind redispatch or the wrong provider stage to rerun.
- Deletion races recreate source or derived output.
- Stale recovery/enrichment/embedding output applies after revision/source/hold/generation drift.
- Partial schema or look-alike readiness is accepted.
- Old binaries process new held state.
- SQLite writer/checkpoint/reset/last-close races remain unclosed.

### P1 Chrome/security themes

- Destination, Brain page origin, extension requester origin, and fixed upload destination are conflated.
- Transcript content enters worker/storage/page/URL/logs.
- The extractor/DOM is read before a content-free server-side
  `authorize inspect` decision, including refusal, expiry, drift, or
  substitution cases.
- Persistent YouTube permission, MAIN-world execution, account/player/cookie access, or broad CORS appears.
- Panel remount/navigation crosses tab/window/content boundaries.
- Chrome-version assumptions rely on unavailable APIs.
- Provider content/errors or stable identifiers enter HTTP/log/analytics.
- A production bundle contains dormant recovery destination, panel, extractor,
  upload-grant, or handoff capability even when runtime configuration denies it.

### P1 processing/UX themes

- Legacy enrichment/batch paths bypass holds/authorization.
- Provider plan/input/context versions drift or are substituted.
- Completion copy appears before durable digest/current index.
- Partial success/retry reruns the wrong provider stage.
- Provider drift or source replacement does not invalidate authority.
- UI projects provider activity from raw/ambiguous state.

## Lower-severity residuals that remain important

- R-019: live canary external packet absent.
- R-020: dependency baseline contains vulnerabilities requiring targeted review.
- R-021: prototype assets may imply external network/license risk.
- R-022: deferred contract migration must not enter initial expand rollout.
- R-030: tracker/status may drift from evidence.
- R-032: automatic recovery apply/finalize crash window.
- R-033: memory-only/nominal native proof may be overclaimed.
- R-034: broad lint/typecheck is non-hermetic around nested checkout.
- Public handover risk: machine-local paths, account identifiers, private
  attachment locators, credentials, targets, or transcript content must not
  enter the package. Existing public-history exposure requires a separate owner
  disposition; never rewrite history silently.
- Native P2: hostile same-UID races, injected filesystem faults, power loss, broader prepare/finalize faults, and actual WAL-reset race coverage are not proven.

Record unresolved P2/P3 in the risk register; never silently drop them.

## D-021 review findings

The current addendum is not accepted. Its first session review found:

1. no exact-hash governance;
2. insufficient closed-isolation receipt/tests;
3. false/ambiguous all-scenario WAL recovery wording; and
4. no executable migration/release enforcement or current production posture.

See [D-021 session findings](13_D021_ADVERSARIAL_REVIEW_SESSION_FINDINGS.md).

## Consolidated mandatory gates

The following gates are cumulative. A later gate cannot compensate for an
earlier failure:

| Gate | Required evidence | Stop effect |
|---|---|---|
| Fixed-SQLite compatibility | One exact source/build provenance plus the candidate-versus-3.49.2 matrix for frozen physical-contract lines 3076-3085, 4443-4449, and 4514-4521 | No migration 028, S28, or affected foundation |
| Migration 028 | Frozen hash, exact SQL/package/shape/ledger tests, crash/WAL gates, and Stage 2 Implementation GO | No feature data/runtime work |
| Migration 029 expand | Frozen hash; clean/upgrade/intermediate/atomicity tests; accepted with zero P0/P1 | No manual route, UI, worker, provider call, or manual-processing behavior |
| Inspect authorization | Content-free server-side `authorize inspect` before every DOM/extractor read; denial/drift/expiry/substitution prove zero reads | No inspection, capture, upload grant, or handoff |
| Production capability absence | Production package source/file/module/sourcemap inventory contains no recovery destination, panel, extractor, upload-grant, or handoff code | No production package or release claim |
| Retry safety | Durable fenced states: retryable proves non-acceptance and may rerun only the failed stage under a new attempt/generation; terminal forbids redispatch; outcome-unknown remains quarantined until reconciliation proves the provider outcome | No manual worker/provider activation |
| Migration 030 contract/cutover | Transition dual-read/write and backfill parity, drain, cutover, incompatible rollback refusal, then frozen/applied/accepted 030 and post-contract matrix | No Stage 7 completion or contract cleanup |
| Pre-push source/local-evidence review | Exact candidate bytes, commands, counts, hashes, and zero P0/P1 | No authorized commit/push |
| Hosted exact-commit evidence | Every required job is on one exact pushed commit, with inspected logs, counts, and named required cases | No hosted claim |
| Post-hosted exact-commit review | Separate review binds exact commit, runs/jobs/logs/counts and returns zero P0/P1 | No final review, PR-ready, merge, deployment, or release claim |
| Mutation authority | Explicit instruction authorizes the exact local or remote write and its scope | Stop before stage/commit/push/PR mutation/merge/deploy/release |
| Publication/privacy | Portable links/commands, no machine-local or private data, complete package scan, durable manifest/index/verifier | No package publication |

## Stop conditions

Stop the affected lane immediately when:

- a P0/P1 finding appears;
- exact reviewed hashes drift;
- a fixed SQLite source is selected without the full semantic compatibility
  matrix, or any frozen 3.49.2 locator behavior differs without a new versioned
  compatibility addendum, regenerated registry/index/verifier, and Contract GO;
- a test is skipped, zero-selected, flaky, or narrower than the claim;
- origin/main or an open PR changes migration/source/package assumptions;
- the frozen contract changes;
- migration 029 is absent/unaccepted before any manual route, UI, worker,
  provider, or processing behavior;
- migration 030 is attempted before transition parity/drain/cutover/rollback
  blocking, or Stage 7 is called complete before 030 acceptance;
- an extractor or transcript DOM read occurs before content-free server-side
  `authorize inspect`, or a refused/stale/expired/substituted request reads DOM;
- a production bundle contains any recovery destination, panel, extractor,
  upload-grant, or handoff capability;
- retryable, terminal, and outcome-unknown states are not durable and fenced,
  retryable work could rerun the wrong stage, terminal work could redispatch, or
  outcome-unknown work could leave quarantine before reconciliation proves the
  provider outcome;
- a pre-push review is presented as final when hosted evidence is required, or
  hosted evidence lacks a separate same-SHA post-hosted review;
- a user/unrelated edit overlaps the lane;
- a machine-local path, account identifier, attachment locator, private
  manifest, secret, target, credential, or transcript content would enter Git
  or output;
- a live YouTube request would be needed without authorization;
- production denial would need weakening;
- old/new binary-schema-source behavior is unproven;
- a destructive cleanup cannot resolve exact identity safely;
- a deployment/merge/release step lacks explicit authority; or
- an evidence receipt exposes content, path, PID, handle, credential, or reusable authority.

## No-go claim language

Use exact wording:

- `Foundation implemented` only for a reviewed foundation.
- `Synthetic fixtures verified` only after executed fixture evidence.
- `Packaged local extension verified` only after packaged E2E.
- `Approved lab canary complete` only after authorization, execution, and cleanup.
- `Browser transcript capture blocked in production`.
- `Manual browser-transcript enrichment blocked in production`.

Do not say `implemented in production`, `live`, `deployed`, `safe`, `ready`, or `complete` without matching evidence and authority.
