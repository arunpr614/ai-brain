# AI Brain → NotebookLM — PM Platform, Data, and Privacy Recommendation

**Created:** 2026-07-21 18:53:21 IST
**Council role:** PM — Platform, Data, and Privacy
**Independence:** This recommendation was produced without reading either other individual PM recommendation.
**Code baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`
All evidence paths below are relative to the repository root.

## Executive Verdict

# Defer

**Confidence:** High, 0.93.

Defer production implementation, production migrations, Google dependencies, deployment, and any real-content synchronization. The evidence does not yet identify which Google product the owner can use, and the available editions lead to materially different products:

- Consumer and paid-consumer NotebookLM have no documented public source-management API. A Google Docs bridge can prove only that a Drive document changed, not that NotebookLM refreshed, ingested, cited, or deleted the source.
- Ordinary Workspace NotebookLM has the same source-management gap, with an additional unresolved edition-specific privacy classification.
- Gemini Notebook Enterprise has a documented source API, but it is a separate licensed Cloud product whose current source guides are Preview/Pre-GA and `v1alpha`. Its live authentication, account entitlement, write reconciliation, quotas, processing, and cleanup have not been tested.

The credential-free harness is valuable evidence that a safe local design is possible. It is not evidence that Google accepts, exposes, refreshes, uniquely reconciles, or deletes anything. Gate 0 is unanswered, no official authorization flow has run, no real provider behavior has been observed, and the decisive Enterprise lost-response risk remains open. Those facts make a production recommendation premature.

This is not a permanent rejection. Re-entry is credible after the account lane is known and a bounded official synthetic test closes the applicable live gaps.

## Decision Scope and Assumptions

This decision assumes:

1. The decision concerns the promised product capability—automatic daily and manual AI Brain → NotebookLM synchronization—not merely permission to continue research.
2. “Synchronized” requires a supported, truthful terminal state. A local enqueue or successful Drive write alone is insufficient.
3. The USD 0 external-spend constraint remains in force. No new Cloud subscription, license commitment, billable quota, or overage is authorized.
4. No undocumented RPC, consumer session cookie, browser automation, DOM automation, or third-party wrapper over an unofficial interface is acceptable.
5. The intended experience uses one explicitly bound target notebook. The system must never spill into a fallback notebook, project, account, folder, or file.
6. Initial product scope is new eligible items created after connection. Historical backfill, edits, deletion propagation, and attached private notes are out of scope until separately authorized.
7. Official documentation reviewed on 2026-07-21 is the current public evidence; the current GA-versus-Preview conflict is resolved conservatively in favor of Preview/Pre-GA treatment.
8. Gate 0 account, entitlement, synthetic-target, authorization, and manual-verification answers are absent. No account, credential, Google project, notebook, Drive file, real AI Brain item, or live Google operation was used.

## Evidence Inspected

- `docs/feature-council/notebooklm-sync/ACCOUNT_ELIGIBILITY.md`
- `docs/feature-council/notebooklm-sync/research/2026-07-21_google-platform-research.md`
- `docs/feature-council/notebooklm-sync/research/2026-07-21_security-privacy-assessment.md`
- `docs/feature-council/notebooklm-sync/research/RESEARCH_SYNTHESIS_V2_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/COMPLIANCE_MATRIX.md`
- `docs/feature-council/notebooklm-sync/RISK_REGISTER.md`
- `docs/feature-council/notebooklm-sync/CAPACITY_MODEL.md`
- `docs/feature-council/notebooklm-sync/spikes/S3_ITEM_TYPE_MAPPING_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/spikes/S5_ADAPTER_IDEMPOTENCY_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/spikes/S6_LOST_RESPONSE_RECOVERY_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/spikes/S8_ORCHESTRATION_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/spikes/S9_CAPACITY_SIMULATION_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/spikes/S10_CREDENTIAL_LIFECYCLE_2026-07-21.md`
- `docs/feature-council/notebooklm-sync/reviews/CREDENTIAL_FREE_HARNESS_ADVERSARIAL_REVIEW_2026-07-21.md`
- The prior read-only current-state and Recall architecture audit at the stated code baseline.

## Edition-by-Edition Platform Decision

| Edition | Official mutation surface found | What AI Brain could truthfully prove | Material constraints | Platform judgment |
|---|---|---|---|---|
| Consumer Standard | No documented public NotebookLM source-management API | An app-owned Google Doc was updated; NotebookLM refresh remains unverified | 50 sources/notebook, 500,000 words/source, manual initial import, manual/unobservable refresh, consumer feedback privacy boundary | Does not support the requested synchronization promise |
| Paid consumer: AI Plus, Pro, Ultra | No documented public NotebookLM source-management API; larger limits do not confer Enterprise API entitlement | Same Drive-write-only terminal state as Standard | 100–600 sources depending on tier; same unsupported NotebookLM automation boundary | Higher capacity does not change platform feasibility |
| Ordinary Workspace / Education | No documented public NotebookLM source-management API | An app-owned Workspace Doc was updated; NotebookLM refresh remains unverified | Manual initial import; Workspace core-service versus additional-service privacy terms depend on exact edition | Only a separately named Drive publication bridge is supportable today |
| Gemini Notebook Enterprise | Documented create/upload/get/delete source operations through Discovery Engine `v1alpha` | Exact source mapped and polled to documented `COMPLETE`, if live behavior confirms the contract | Preview/Pre-GA, separate Cloud product, project/billing/API/region/IAM/license/notebook permission requirements, no documented update/refresh/webhook/create idempotency/source-list method or method quota | Plausible official sync lane, but not production-ready without entitlement and live synthetic proof |

Evidence: the platform research distinguishes the products and supported paths at `research/2026-07-21_google-platform-research.md:7-18,20-63`; documents Enterprise operations and missing methods at `:65-113`; and describes the Drive fallback and its unobservable refresh boundary at `:125-138,163-168`. Account eligibility remains explicitly unknown at `ACCOUNT_ELIGIBILITY.md:15-24,44-53`.

### Cost consequence

Gemini Notebook Enterprise lists at USD 9 per license per month with a minimum 15-license subscription, implying USD 135/month before discount or tax. That is incompatible with the USD 0 constraint unless the owner is already entitled and the approved synthetic spike creates no incremental charge (`research/2026-07-21_google-platform-research.md:48-63`). Standard Docs API use currently has no additional charge within quota, but Google warns of planned quota-overage billing later in 2026; the bridge must remain below free quota and be revalidated before release (`:125-138`).

## Platform and Security Scorecard

Rating meanings: **Ready** = evidence supports production design; **Conditional** = design exists but a bounded gate remains; **Blocked** = required evidence or substrate is absent.

| Dimension | Rating | Evidence-based assessment |
|---|---|---|
| Edition and entitlement | Blocked | Gate 0 has no account/plan, license, Preview-terms, project, target, or authorization answers |
| Consumer official API fit | Blocked | No documented public source-management API was found |
| Workspace official API fit | Blocked | Docs/Drive is official, but NotebookLM attachment/refresh/deletion is manual or unobservable |
| Enterprise API fit | Conditional | Supported create/get/delete exists, but current guides are Preview/`v1alpha` and live behavior is untested |
| Authentication and IAM | Blocked | First-party options are documented, but licensed-user behavior, unattended auth, exact account binding, and service-account compatibility are unverified |
| Lost-response safety | Conditional | Local fail-closed reconciliation passed; no documented provider idempotency key or conclusive Enterprise visibility horizon exists |
| Credential storage | Blocked | Safe lifecycle is designed, but AI Brain has no approved secure mutable token store; plaintext settings and backups are unsuitable |
| Target/account isolation | Conditional | Subject/target/ACL binding and fencing passed in fakes; no live target or ACL preflight has occurred |
| Content minimization | Conditional | Synthetic mapper tests passed; production eligibility, consent, sensitive-classification, and canonical formatter do not yet exist |
| Privacy/legal disclosure | Blocked | Consumer, Workspace core/additional service, and Enterprise logging terms differ; the applicable edition is unknown |
| Processing observability | Conditional | Enterprise documents source polling states; Drive cannot expose NotebookLM refresh status through a supported API |
| Capacity and quota | Conditional | Public limits and deterministic scenarios are modeled; actual item distribution, current occupancy, deletion lag, method quotas, and batch maximum are unknown |
| Operational durability | Conditional | Local outbox, fencing, crash recovery, poison isolation, and truthful status passed; no real adapter, secret store, scheduler, or deployment exists |
| Maintainability | Blocked | Preview drift, GA-status conflict, absent source update, and unknown quotas make the production contract unstable |
| Reversibility and erasure | Blocked | Enterprise deletion completion and Drive/Notebook cleanup are untested; Google usage logs are an independent retention boundary |

## Findings

### P0 — Must Be Closed Before Production Implementation

#### 1. The product lane cannot be selected

**Evidence:** Account class, Enterprise entitlement, Preview approval, synthetic target permission, and official local authorization capability are all unknown (`ACCOUNT_ELIGIBILITY.md:15-24,44-53`).
**Why it matters:** Consumer, Workspace, and Enterprise require different APIs, credentials, status language, privacy disclosures, cost assumptions, capacity strategies, and cleanup procedures.
**Failure mode:** A generic implementation could target an API the owner cannot use, incur unauthorized cost, misstate privacy terms, or expose content to the wrong Google product.
**Recommendation:** Ask the single consolidated non-secret Gate 0 question set. Do not create production code or acquire credentials before the lane is selected.

#### 2. Consumer and Workspace cannot support a verified “NotebookLM synchronized” state

**Evidence:** The official fallback can create/update a Doc, but initial NotebookLM import is manual and refresh is documented UI behavior without a supported observation API or SLA (`research/2026-07-21_google-platform-research.md:125-138,163-168`). The synthesis explicitly separates `Drive document updated` from unverified NotebookLM refresh (`research/RESEARCH_SYNTHESIS_V2_2026-07-21.md:32-38`).
**Why it matters:** Success wording is a data-integrity and trust contract.
**Failure mode:** AI Brain reports success while NotebookLM still contains old content, failed to refresh, cites an older revision, or retains a removed source.
**Recommendation:** If Gate 0 selects consumer or Workspace, re-scope and name the feature “Publish to Google Drive for NotebookLM,” not synchronization. Require one-time manual import and manual refresh verification. If the original verified-sync promise remains mandatory, keep this lane deferred until an official observable source API exists.

#### 3. Enterprise creation is not yet safe under a lost response

**Evidence:** Google documents no caller-supplied source ID or idempotency key and no dedicated source-list method; `GetNotebook` inventory is the proposed reconciliation surface (`research/2026-07-21_google-platform-research.md:97-113,151-159`). The local harness correctly blocks on zero or multiple matches, but confirms no official conclusive visibility horizon exists (`spikes/S6_LOST_RESPONSE_RECOVERY_2026-07-21.md:5-17`; harness review `:41-46`).
**Why it matters:** A create may be accepted while the response is lost. Blind retry can create duplicate sources and consume finite capacity.
**Failure mode:** Daily unattended runs either duplicate sources or accumulate indefinite `manual_reconcile` work after ordinary timeouts.
**Recommendation:** An authorized Enterprise synthetic spike must prove supported exact matching through notebook inventory after an intentionally discarded successful response. Zero matches must remain inconclusive unless Google documents or live evidence bounds visibility. Production automatic retry is prohibited until this closes.

#### 4. Production token custody has no implementation-ready home

**Evidence:** AI Brain settings are plaintext and backups retain them, so they are explicitly unsuitable for refresh tokens (`research/2026-07-21_security-privacy-assessment.md:57-65`). The fake credential lifecycle validates state transitions but not issuance, refresh, revocation, store integration, IAM, or subject claims (`spikes/S10_CREDENTIAL_LIFECYCLE_2026-07-21.md:3-17`).
**Why it matters:** A long-lived Google refresh token can grant access beyond a single sync run.
**Failure mode:** Token theft from SQLite, backup, `.env`, logs, or an over-privileged web process enables account access and persistent data exfiltration.
**Recommendation:** Approve an OS credential store for local operation or an envelope-encrypted/secret-manager design for service operation, with the master key accessible only to a trusted worker. Store only a credential reference, subject alias/HMAC, exact scopes, authorization time, and validation state in SQLite.

### P1 — High Risk

#### 1. Preview, licensing, and unattended-auth risks are coupled

The current Enterprise guides are Preview/Pre-GA and `v1alpha`, despite a conflicting older GA release note (`research/2026-07-21_google-platform-research.md:65-76`). A licensed user, Cloud project, API, IAM role, regional license, and notebook permissions are required (`:48-63`). Service-account operation of a licensed user notebook is not documented (`:115-123`). A licensed-user interactive credential may establish a spike, but it does not establish maintainable unattended daily production auth.

**Recommendation:** Treat API version, auth principal, license, project, region, scopes, and granted permissions as a pinned connection contract. Test unattended credential refresh separately; never infer service-account support from generic Discovery Engine documentation.

#### 2. Capacity makes per-item sources impossible and daily aggregation finite

One source per item exhausts every current source limit before 90 days, even at ten items/day (`CAPACITY_MODEL.md:41-52`). Enterprise daily immutable aggregates reach 365 sources in one year against a gross 300-source limit, before existing sources, pending deletions, and headroom (`:86-96,127-148`). Weekly aggregates can fit longer but weaken the requested daily freshness. Consumer/Workspace rolling Docs hit the 1.02-million-character limit and require manual re-import on every rotation (`:98-125`).

**Recommendation:** Reject per-item sources. Enterprise should evaluate one size-sharded daily aggregate plus an explicit rolling-retention horizon, or a weekly aggregate only if the latency change is accepted. Consumer/Workspace should use one bounded app-owned Doc rebuilt from the local publication ledger, with explicit manual rotation/import/removal. No design proceeds without current occupancy, measured eligible payload sizes, safety headroom, and a retention decision.

#### 3. Destination consent and privacy cannot reuse existing AI consent

Existing note `include_in_ai` consent does not authorize export to a bound Google identity/notebook (`research/2026-07-21_security-privacy-assessment.md:15-36`). Consumer feedback, Workspace service classification, and Enterprise usage logging have different review and retention boundaries (`:30-36,120-123`).

**Recommendation:** Add destination-specific, default-deny eligibility and consent bound to edition, subject alias, target alias, scopes, content policy, sharing state, and aggregation strategy. Exclude attached private notes by default. Do not publish a generic “Google does not train on your data” claim.

#### 4. Reversibility is multi-system and currently unproven

Enterprise cleanup requires deletion of exact adapter-owned sources and polling to absence or documented terminal deletion. Drive cleanup requires independent NotebookLM source removal, Drive-file disposition, and credential revocation; deleting a Drive file does not prove NotebookLM erasure (`research/2026-07-21_security-privacy-assessment.md:77-100`). Enterprise usage logs have independent retention (`:89,120-123`).

**Recommendation:** Treat pause, source cleanup, Drive cleanup, credential revocation, and logging retention as separate states. Never label disconnect as erasure. Require exact cleanup proof for every synthetic object before production reconsideration.

#### 5. Target drift can export private content to the wrong audience

The design requires subject, project/location/notebook or Drive-file binding, an ACL digest, and a stop on unexpected sharing (`research/2026-07-21_security-privacy-assessment.md:67-75`). Fakes passed cross-target and stale-fence cases, but no live identity or permission response has been observed (`reviews/CREDENTIAL_FREE_HARNESS_ADVERSARIAL_REVIEW_2026-07-21.md:13-25`).

**Recommendation:** Preflight the stable subject, exact target, ownership, and privacy-preserving ACL digest before the first write and after any material change. Never silently fall back or broaden permissions.

### P2 — Important Before Council Re-entry

#### 1. Observability must preserve edition-specific truth

Enterprise can poll documented source states, while Drive can prove only document revision success. Required status stages are: queued, authorized, provider write attempted, accepted/unknown, provider processing, terminal complete/error, Drive updated with NotebookLM refresh unverified, reconciliation required, cleanup pending, and cleanup verified. Only the evidence actually available in that edition may advance the status.

#### 2. The operational model is proven only against fakes

The durable harness passed ordered outbox discovery, target-specific baselines, trigger coalescing, crash recovery, fencing, poison isolation, retry caps, and truthful success (`spikes/S8_ORCHESTRATION_2026-07-21.md:5-17`). The adversarial review fixed meaningful P1/P2 defects and ended at 46/46 local tests (`reviews/CREDENTIAL_FREE_HARNESS_ADVERSARIAL_REVIEW_2026-07-21.md:11-39`). It intentionally lacks real adapters, aggregate composition, OAuth persistence, deployment scheduling, and provider behavior.

**Recommendation:** Preserve the tested invariants, but do not promote the prototype or Node 22 experimental SQLite usage into production code. Reimplement against AI Brain’s supported SQLite dependency with migration, restart, lock, and deployment tests.

#### 3. Research traceability contains a minor stale state

`COMPLIANCE_MATRIX.md:14-16` says S5/S6 execution or NotebookLM fake validation is pending, while the dated spike reports and reviewed combined suite record completed credential-free fake validation. This does not change the decision, but the matrix should be reconciled before publication so “pending live Google validation” is not confused with “pending local validation.”

### P3 — Low Risk or Polish

No P3 findings. The remaining issues affect platform feasibility, security, trust, or production operability rather than polish.

## Technical Recommendation

Do not build the production connector now. Preserve the research artifacts and take only the following next steps:

1. Complete Gate 0 with the minimum non-secret account/edition, existing entitlement, Preview permission, synthetic-target, official-auth, and manual-refresh answers.
2. Select exactly one official lane for live synthetic validation.
3. If Enterprise is selected, use a licensed user’s official local authorization, one private empty test notebook, and one raw-text source at a time. Pin API version/project/location/subject/target. Poll to a documented terminal state, test discarded-response reconciliation, and delete only recorded synthetic sources.
4. If consumer or Workspace is selected, treat the result as a separate Drive publication bridge. Use three-legged OAuth with PKCE and `drive.file`, one private app-created Doc, `appProperties`, `requiredRevisionId`, an ACL check, one manual NotebookLM import, and manual refresh/citation observation.
5. If the only viable interface is undocumented or browser-session based, stop.

If later authorized for implementation, use these boundaries:

- a transactional monotonic item outbox rather than `captured_at`;
- a target-scoped desired-state ledger and immutable safe attempt history;
- a deterministic connection-scoped opaque HMAC operation marker;
- renewable target leases with fencing tokens;
- separate manual/daily requests feeding one executor;
- per-item independent retries and poison isolation;
- `needs_reconcile` after any potentially accepted lost response;
- adapter capability flags for create, inventory/reconcile, status, delete, update, and refresh;
- one canonical, versioned, minimization-first formatter;
- separate status vocabularies for Enterprise terminal completion and Drive-only update success;
- no history, edit, delete, or attached-note export in the initial new-only scope.

## Security Recommendation

1. Keep Google credentials out of `.env`, plaintext SQLite settings, backups, reports, logs, and the web process.
2. Use authorization code with PKCE and OpenID subject binding for Drive. Request only `drive.file`; request email only when a visible account label is necessary.
3. For the first Enterprise spike, use the licensed user’s official credential and the narrow notebook role/permissions required. Do not grant project Owner/admin or infer service-account entitlement.
4. Store mutable tokens in an approved OS credential store, secret manager, or worker-only envelope-encrypted store. Persist only opaque references and safe authorization metadata locally.
5. Refresh once on expiry. `invalid_grant` or revocation becomes `reauth_required`; permission/license/scope failures fail closed and never trigger automatic privilege expansion.
6. Bind consent and every ledger key to owner, connection, Google subject alias, target alias, content version, mapping version, and strategy.
7. Default deny. Exclude attached notes, metadata-only Recall content, unsupported item types, signed/private URLs, raw IDs/hashes, filesystem paths, and capture internals unless a reviewed rule explicitly permits them.
8. Keep Enterprise usage logging off for the synthetic spike unless separately approved. If enabled later, document region, readers, sinks, retention, and deletion policy.
9. Log only event/run UUID, keyed aliases, counts, size estimates, source type, attempt, latency, status, normalized error, and state transition. Never log content, title, URL, email, raw Google identifier/error, token, code, credential path, or request/response body.
10. Make all target sharing explicit. Pause on subject, ownership, target, permission, or ACL drift.

## Anticipated Disagreements

### “The 46/46 local tests are enough to start implementation.”

They prove the local model can fail closed and survive specified crash/concurrency cases. They do not prove provider acceptance, inventory visibility, processing latency, refresh, quota, auth, IAM/license behavior, deletion, or revocation. The review itself states that boundary (`reviews/CREDENTIAL_FREE_HARNESS_ADVERSARIAL_REVIEW_2026-07-21.md:39-47`). Starting production code now would freeze interfaces before the account lane and observable provider contract are known.

### “The Drive path is official, so it is synchronization.”

The Drive write is official. NotebookLM refresh is not programmatically observable through the supported consumer/Workspace evidence. Calling the bridge synchronization would turn an unverified eventual UI behavior into a false terminal claim.

### “Paid consumer tiers solve the limitation.”

They increase notebook/source/chat limits. They do not establish Gemini Notebook Enterprise entitlement or expose a documented consumer source API (`research/2026-07-21_google-platform-research.md:20-32`).

### “Enterprise exposes an API, so remaining concerns are implementation details.”

Create idempotency, source visibility after an ambiguous response, principal/license behavior, Preview drift, unknown method quotas, retention, and cleanup are contract-level feasibility issues. They determine whether unattended daily writes are safe.

### “Aggregation solves capacity.”

Aggregation makes capacity manageable, not free. Daily Enterprise sources still exceed the gross 300-source limit within a year, weekly sources reduce freshness, and rolling Drive Docs require repeated manual imports as the character limit binds. Existing occupancy and deletion lag reduce usable capacity further.

### “Disconnect can just revoke OAuth.”

Revocation stops future access; it does not remove NotebookLM sources, Drive files, or retained usage logs. Reversibility must be modeled as independent cleanup actions.

## Missing Validation

- Gate 0 edition, entitlement, Preview acceptance, target, official-auth, and manual-verification answers.
- Current official documentation recheck against the selected account/project.
- Official OAuth issuance, subject binding, token refresh, revocation, and secure-store integration.
- Enterprise licensed-user IAM and regional license behavior.
- Enterprise create, status polling, failure taxonomy, source inventory visibility, ambiguous-response reconciliation, exact deletion, and deletion completion.
- Consumer/Workspace private Doc creation, ACL behavior, revision-guarded update, one-time import, actual refresh timing, citation freshness, rotation, and independent cleanup.
- Actual eligible item size distribution, daily volume, current source occupancy, pending deletions, safety headroom, and retention choice.
- Real quota behavior, method-specific quotas, batch maximum, `Retry-After`, and cost posture.
- Deployment identity, worker-only secret access, restart behavior, scheduler fencing, alerts, and operator reconciliation workflow.
- Destination consent UX, edition-specific privacy copy, account/target confirmation, disconnect/cleanup UX, and truthful status wording.

## Re-entry Criteria

The council should reconsider only when all common criteria and the selected lane’s criteria are satisfied.

### Common

1. Gate 0 identifies the exact edition and confirms use of a private synthetic target and official local auth without sharing secrets.
2. The applicable official docs and terms are revalidated within seven days of the live spike; API version, release stage, scopes, quotas, privacy classification, and pricing are recorded.
3. No new subscription or billable spend is required, or the owner separately authorizes it before execution.
4. The selected product promise and terminal status language are written before the spike.
5. A secure credential-store choice and trusted-worker boundary are approved.
6. Synthetic cleanup can be limited to exact spike-owned resources, with no pre-existing resource mutation or deletion.

### Enterprise lane

1. Existing license, project, region, Discovery Engine API, IAM role, notebook permission, and Preview/Pre-GA approval are confirmed.
2. Official licensed-user authentication creates one raw-text source and polls it to documented `COMPLETE`.
3. An intentionally discarded successful response is reconciled to exactly one source by supported inventory and opaque marker without a second create.
4. Zero/multiple-match behavior remains fail-closed; no undocumented visibility assumption is introduced.
5. Exact source deletion is requested and absence or a documented terminal deletion state is observed.
6. A viable unattended credential principal/refresh mechanism is documented or observed; interactive-only spike credentials are not silently promoted to production.
7. Capacity and retention fit measured eligible volume and actual target occupancy with safety headroom.

### Consumer or Workspace lane

1. The feature is explicitly accepted as a Drive publication bridge, not verified NotebookLM synchronization.
2. Exact Workspace service classification and edition-specific privacy terms are confirmed when applicable.
3. Official PKCE OAuth with `drive.file` creates one private app-owned Doc; subject, file, ACL, and revision are verified.
4. The user manually imports the Doc and manually observes refresh/citation behavior; AI Brain status remains `Drive document updated — NotebookLM refresh unverified`.
5. Rotation and prior-source removal are exercised manually, and Drive-file, NotebookLM-source, and OAuth cleanup are reported separately.
6. If verified programmatic NotebookLM completion remains a requirement, re-entry instead requires a new documented official source-management/observation API.

### Production council gate

After the selected synthetic lane passes, return to council with raw-content-free evidence for API version, scopes, identity/target binding, provider states, ambiguous-write behavior, retry counts, quota/capacity, cleanup, token lifecycle, privacy terms, and cost. Only then consider authorizing production implementation.

## Concrete Revalidation Date

**Revalidate on 2026-10-21**, or earlier if Google changes the NotebookLM/Gemini Notebook Enterprise API release stage, publishes consumer/Workspace source-management APIs, documents create idempotency or a visibility horizon, changes Docs quota pricing, or the owner supplies Gate 0 answers.

On that date, repeat the official documentation, pricing, terms, scope, IAM, quota, source-limit, and privacy review even if no live spike has occurred. This recommendation expires as a current-platform assessment after that review date; absence of new evidence does not automatically convert the decision.

## Final Council Position

The local engineering direction is credible, but platform eligibility and live safety are not established. Preserve the harness and research, complete Gate 0, and run at most one bounded official synthetic lane under the documented controls. Until that evidence exists, the only defensible product-council decision is **Defer**.
