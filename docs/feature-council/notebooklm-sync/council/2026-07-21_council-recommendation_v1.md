# AI Brain → NotebookLM Synchronization — Product Council Recommendation v1

**Decision date:** 2026-07-21
**Decision:** **Defer**
**Confidence:** **High (0.91)**
**Evidence cutoff:** 2026-07-21
**Revalidate:** **2026-08-21**, or immediately after Gate 0 and the applicable official synthetic spike, whichever comes first
**Implementation status:** Research complete; credential-free validation complete; not implemented

## Executive decision

Defer a product implementation and any user-facing promise that AI Brain keeps NotebookLM synchronized. Preserve only the bounded research path: resolve Gate 0 once, then—if authorized—run the smallest applicable official synthetic spike against one private test target. Do not create production migrations, dependencies, credentials, UI, workers, or real-content integrations on the current evidence.

All three independent PMs recommend **Defer**. Their agreement is not the reason for the result; the decision follows from the evidence boundary:

- the local mapper and durable fake-provider harness pass **46/46** credential-free checks and establish credible application-side invariants;
- no Google account, authorization flow, notebook, Drive file, source, real item, refresh, query, citation, cleanup, or provider failure was exercised;
- consumer, paid-consumer, and ordinary Workspace NotebookLM expose no documented source-management API in the reviewed official material;
- a Google Docs/Drive bridge can prove only `Drive document updated — NotebookLM refresh unverified`;
- Gemini Notebook Enterprise is a separate licensed Cloud product with a documented direct source surface, but the current guides are Preview/Pre-GA and `v1alpha`, account eligibility is unknown, and create idempotency/conclusive absence behavior is not documented; and
- AI Brain lacks a production-safe outbound change sequence, general content version, deletion tombstone, external-source ledger, and approved mutable Google token store.

This is **Defer**, not **No-go**, because an official Enterprise lane may satisfy the outcome after entitlement and live synthetic evidence. A consumer/Workspace Drive publisher may also offer narrower value if it is explicitly renamed and the user accepts manual import, refresh verification, rotation, and cleanup. Neither hypothesis currently supports a production build.

## Council process and individual recommendations

Each PM prepared a recommendation without reading the other PM outputs. The coordinator integrated them only after all three were complete.

| Council member | Recommendation | Confidence | Distinct emphasis | Revalidation |
|---|---|---:|---|---|
| [User Value and Engagement](individual/PM_USER_VALUE_2026-07-21.md) | Defer | 0.87 | Trustworthy freshness, time to first current citation, activation and recurring manual burden | 2026-08-21 or after Gate 0 + official spike |
| [Knowledge Management and Workflow](individual/PM_KNOWLEDGE_WORKFLOW_2026-07-21.md) | Defer | 0.86 | Retrieval/citation quality, aggregate granularity, snapshot truth, source lifecycle | 2026-08-21 or before official spike/decision |
| [Platform, Data, and Privacy](individual/PM_PLATFORM_DATA_PRIVACY_2026-07-21.md) | Defer | 0.93 | Edition/API eligibility, Preview risk, auth/IAM, token custody, reconciliation, privacy, reversibility | 2026-10-21 or material platform change |

The integrated decision adopts the earlier 2026-08-21 date. Platform evidence must also be rechecked within seven days before any live spike because Preview, pricing, quotas, scopes, terms, and edition boundaries can change.

## Evidence boundary

### Verified locally

- Ten fixed synthetic item identities exercise reachable and unsupported type/fidelity cases without consuming an eleventh identity.
- Five eligible fixtures map through a default-deny allowlist; five fail closed.
- Full connection-scoped HMAC markers, URL minimization, private/local host rejection, and Recall provenance stripping pass fixed and adversarial cases.
- File-backed synthetic outbox, target cursor, stable requests, frozen cutoffs, leases, fences, attempt history, poison isolation, lost-response states, and stable Drive revisions pass locally.
- A potentially accepted Enterprise create never blindly retries on an inconclusive zero result; it stops at `manual_reconcile`.
- Drive status never claims NotebookLM freshness.
- Capacity arithmetic rejects one-source-per-item and applies both NotebookLM word limits and the stricter Google Docs character limit.
- The capacity simulation is deterministic, with repeated output hash `bc959f91427ed04a16b59e28a871c24b9ab4dd04807d8264812ba7e1513e71be`.

### Official but not observed in this environment

- Gemini Notebook Enterprise documents direct notebook/source operations through a separate Cloud product surface.
- Current source guides are Preview/Pre-GA and `v1alpha`; applicable license, project, location, IAM, notebook permission, and licensed user are required.
- Enterprise exposes source processing state, but the reviewed documentation does not establish a caller idempotency key, caller source ID, source update, webhook, or conclusive visibility horizon after an ambiguous create.
- Consumer/paid-consumer/ordinary Workspace NotebookLM supports manually imported Drive sources and documented refresh behavior, but no supported programmatic refresh-observation contract was found.
- Native Google Docs are constrained by 1.02 million characters; NotebookLM source and word limits vary by edition.

### Unknown and decision-blocking

- The user's exact NotebookLM edition and Enterprise entitlement/Preview permission.
- Permission for one private synthetic notebook and one private app-created Doc.
- Ability to complete official local user authorization without sharing secrets.
- Acceptance of a consumer/Workspace workflow that needs manual import and visual refresh verification.
- Live auth, IAM/license behavior, source inventory visibility, processing latency, query/citation fidelity, Drive refresh, quota/error behavior, token refresh/revocation, and exact cleanup.
- Actual eligible volume, content-size distribution, current target occupancy, retention preference, source headroom, and acceptable freshness.

## Decision matrix

Ratings describe current evidence: **Conditional** means a supported hypothesis exists but a listed gate remains; **Blocked** means the required outcome is not established; **Fallback** means useful only under a narrower promise.

| Dimension | Gemini Notebook Enterprise direct lane | Consumer/paid-consumer/ordinary Workspace Drive lane | Manual Markdown export | Decision implication |
|---|---|---|---|---|
| User value | Conditional: potential hands-off publication into one notebook | Fallback: reduces copy/paste into one stable Doc, but shifts freshness work to the user | Fallback: explicit and predictable, but not automatic | No lane has proven the activation outcome: a correct current answer/citation from a newly eligible item |
| Supported editions | Separate licensed Cloud product only | Broadly available Drive substrate; paid tiers raise limits but do not grant Enterprise APIs | All editions accepting manual sources | Edition must be known before choosing a product promise |
| Official support | Conditional: documented `v1alpha` source surface | Drive/Docs calls are official; NotebookLM attachment/refresh remains manual or unobservable | Official UI workflow | Unofficial consumer RPC/browser automation is excluded |
| Reliability | Blocked live: no provider call; ambiguous accepted create remains contract risk | Drive revision can be reliable; NotebookLM freshness cannot be observed by the app | Human-controlled, no automation guarantee | Local 46/46 proves design semantics only |
| Source fidelity | Conditional: deterministic minimized text locally; provider conversion/query untested | Conditional: same local text; refresh and citation fidelity untested | User can inspect the exported file | Live retrieval and negative cross-item tests are required |
| Source-count viability | Conditional with bounded aggregation and retention; per-item rejected | Conditional only at low enough volume/size with recurring rotation/import/removal | User-managed | Capacity is a product constraint, not merely an implementation detail |
| Update behavior | Initial new-only immutable snapshots; no source update documented | Stable Doc revision is possible, but MVP remains new-only and NotebookLM refresh unverified | Manual replacement/import | No history, edits, repair propagation, or deletion propagation |
| Security | Blocked: IAM/license/principal and secure token custody unproven | Blocked: OAuth/subject/ACL and secure token custody unproven | Lowest automation exposure | No credential acquisition before lane selection and store approval |
| Privacy | Blocked: edition/logging/retention configuration unverified | Blocked until consumer or exact Workspace service terms are known | User makes each transfer explicitly | Destination-specific consent is required; existing AI consent is insufficient |
| Authentication complexity | High: Cloud project, API, region, license, IAM, notebook rights, official user identity | Medium: user OAuth with PKCE and `drive.file`, target/ACL binding | None beyond the user's existing UI session | Service-account compatibility must not be inferred |
| Cost | Blocked by USD 0 unless already entitled with no incremental cost | Likely no added API charge within quota, but future overage policy needs recheck | No new service spend | No subscription or billable action is authorized |
| Operational burden | High: Preview drift, reconciliation, retention, permission/auth failure, cleanup | High at scale: manual refresh verification and Doc rotation/source maintenance | Explicit recurring manual export/import | Burden must be measured as interventions per active week |
| Maintainability | Blocked: Preview/`v1alpha`, missing operations/quotas, auth uncertainty | Conditional only as a narrowly named Drive publisher; sync contract remains absent | High simplicity | No production adapter should be frozen now |
| User trust | Conditional only with exact terminal states and live proof | Weak for “sync”; acceptable only with unverified-refresh language | Strongly truthful but low convenience | Never display `Synced` for a Drive-only update |
| Reversibility | Blocked live: exact source deletion and log retention untested | Blocked live: NotebookLM source removal, Drive-file disposition, and OAuth revocation are separate | User controls imported files/sources | Disconnect is not erasure; exact owned-resource cleanup must be proven |

## Strategy disposition

| Strategy | Disposition | Rationale |
|---|---|---|
| Direct Gemini Notebook Enterprise API | **Promising; deferred pending Gate 0 and official synthetic evidence** | Only direct officially documented lane; Preview/licensing/auth/reconciliation/cleanup gaps remain |
| Stable Google Doc for consumer/Workspace | **Narrow fallback; not NotebookLM sync** | Can prove Drive state only; requires manual import, refresh observation, rotation, and independent cleanup |
| Size-bounded aggregate sources | **Required capacity pattern if a lane re-enters** | Avoids immediate source exhaustion; cadence, shard composition, attribution, and retention still need validation |
| One source per AI Brain item | **Rejected as default** | Exhausts modeled source budgets rapidly and magnifies duplicate/cleanup risk |
| Manual Markdown export/import | **Retain as safe fallback** | Truthful, reversible, supported, and available without connector risk |
| Unofficial consumer connector/browser automation | **No-go in this goal** | Relies on internal RPC/session state and creates disproportionate security, policy, breakage, and maintenance risk |

## Technical recommendation

Do not implement a production connector. Retain the research-only harness as evidence, not as production code.

If Gate 0 later permits an official spike, select exactly one lane and reuse only the ten existing synthetic fixture identities:

1. **Enterprise:** bind the licensed subject, project, location, notebook, API version, and permission set; create one raw-text source; poll documented status; exercise an intentionally lost successful response; reconcile only by supported exact identity/marker evidence; leave a non-conclusive zero at `manual_reconcile`; and prove deletion of only the recorded synthetic source.
2. **Consumer/Workspace:** call the result a Drive publishing bridge; use official user OAuth with PKCE and `drive.file`; create one private app-owned Doc; verify subject/file/ACL/revision; import once manually; perform two revision-guarded updates; manually observe freshness/citation behavior; and keep app status at `Drive document updated — NotebookLM refresh unverified`.

If later implementation is separately authorized, it must start with a transactional monotonic outbound outbox, target-scoped desired-state ledger, immutable attempt history, canonical versioned minimization-first formatter, target leases/fences, explicit `needs_reconcile`, provider capability flags, independent retries, secure worker-only mutable credentials, and edition-specific status. `captured_at`, existing Markdown exporters, Recall inbound tables, plaintext settings, and the experimental research harness are not production substitutes.

## Security recommendation

- Acquire no Google credential until the edition/lane and exact scopes are approved.
- Never place refresh tokens in `.env`, plaintext settings, backups, logs, reports, browser-visible status, or the web process. Approve an OS credential store, secret manager, or worker-only envelope-encrypted store first.
- Use the official licensed user for the first Enterprise spike; do not infer service-account entitlement. Use PKCE and `drive.file` for the Drive lane.
- Bind every run to owner, connection, Google subject alias, exact target alias, edition, mapping version, strategy, and privacy-preserving ACL state; fail closed on drift and never choose a fallback destination.
- Default-deny content export. Exclude attached notes, metadata-only Recall items, unsupported schema-only types, private/signed URLs, raw IDs/hashes, capture internals, and unapproved derived fields.
- Keep Enterprise usage logging off unless separately approved. Document edition-specific service terms, retention, readers, region, and deletion limits without generic training claims.
- Log safe event aliases, counts, sizes, attempt/state transitions, and normalized error classes only—never titles, bodies, URLs, emails, raw provider identifiers/errors, request/response bodies, tokens, codes, or credential paths.
- Treat pause, credential revocation, NotebookLM source cleanup, Drive-file disposition, and retained provider logs as separate states. Do not label disconnect as deletion.

## Preserved disagreements and tensions

The PMs agreed on Defer but emphasized several unresolved choices:

1. **Enterprise cadence:** Knowledge/workflow favors a maximum one-week immutable period for many modeled capacity cases; platform/security notes that daily sources may better match freshness but require explicit rolling retention and still exceed annual gross capacity. No cadence is selected until actual volume and latency tolerance are known.
2. **Drive viability threshold:** Knowledge/workflow would reconsider only when mandatory source rotation is no more frequent than monthly and no daily manual action is required. User-value and platform views allow the bridge only after the exact manual burden is observed and accepted. The integrated decision adopts the stricter measured-burden gate rather than a universal volume cutoff.
3. **Meaning of terminal success:** Platform accepts Enterprise `COMPLETE` as a possible truthful provider-processing terminal state; knowledge/user-value require a separate retrieval/citation check before calling the knowledge outcome successful. Both states must remain distinct.
4. **Revalidation timing:** Platform proposed 2026-10-21; the other PMs proposed 2026-08-21. The integrated date is 2026-08-21 because Preview and Gate 0 uncertainty warrant the earlier review.
5. **Drive product naming:** All agree it is not verified NotebookLM sync. Whether it has sufficient value as a separate “Publish to Google Drive for NotebookLM” feature remains a user/workflow question, not an assumed fallback launch.

## Assumptions

1. The required outcome is a truthful one-way daily/manual destination workflow, not merely a successful local request or Drive write.
2. One explicitly bound private notebook is the target; no fallback target or silent sharing change is acceptable.
3. Initial scope remains new eligible items after connection, append-only, with no historical backfill, edit/delete propagation, or attached private notes.
4. The USD 0, no-new-subscription, synthetic-only, supported-interface, and no-production-change constraints remain in force.
5. Aggregate sources are acceptable only if the user accepts their cadence, granularity, citation behavior, retention, and capacity envelope.
6. Unknown is not a passing evidence result. A documented capability is not treated as observed account behavior.

## Principal risks retained

- wrong edition or absent entitlement makes the selected lane unavailable;
- Preview/`v1alpha` drift changes Enterprise operations, terms, or availability;
- an accepted-but-unobserved Enterprise create duplicates or stalls unattended work;
- a successful Drive update is mistaken for NotebookLM freshness;
- token compromise or over-broad IAM exposes more than the bound target;
- subject/target/ACL drift exports private content to the wrong audience;
- aggregation loses item-level fidelity or produces misleading citations;
- source/character limits force unaccepted latency, rotation, or history loss;
- snapshots outlive corrected or deleted AI Brain items;
- disconnect is mistaken for erasure across NotebookLM, Drive, credentials, and logs; and
- local fake success is mistaken for provider or production readiness.

These risks are tracked in [the risk register](../RISK_REGISTER.md); none is closed by the 46/46 local result.

## Re-entry criteria

### Common gate

1. Gate 0 identifies the exact edition and existing entitlement, authorizes one private synthetic target, confirms official local auth capability, and records whether manual import/visual verification is acceptable—without sharing identifiers or secrets.
2. Applicable official documentation, release stage, terms, scopes, IAM, quotas, limits, privacy, and pricing are revalidated within seven days before execution.
3. The selected lane requires no new subscription or billable spend, unless separately authorized.
4. Product promise and terminal status language are fixed before the spike.
5. Only exact spike-owned objects may be created, changed, or removed; cleanup identifiers stay in an ignored `0600` manifest.
6. Credentials remain local and official; target/subject/ACL mismatch stops before any write.

### Enterprise evidence needed for reconsideration

- existing license, Preview permission, project/location/API/IAM/notebook rights, and licensed-user auth are confirmed;
- one existing synthetic fixture creates one source, reaches documented `COMPLETE`, and can be retrieved by exact integration-owned identity;
- a distinguishing fact is queryable/citable from the intended notebook without cross-item confusion;
- a deliberately lost accepted response reconciles to exactly one source after restart; zero/multiple cases remain fail-closed;
- token expiry/revocation, permission drift, quota/error classification, and truthful recovery states are observed; and
- exact source cleanup reaches a documented terminal outcome, with measured latency/capacity evidence recorded.

### Consumer/Workspace evidence needed for a separately named bridge

- exact edition and Workspace service classification, where applicable, are confirmed;
- official PKCE OAuth with `drive.file` creates one private app-owned Doc bound to the correct subject and ACL;
- the same file receives two exact revision-guarded updates without duplicate files;
- after one manual import, the user manually observes the newest synthetic marker and citation behavior for both updates, recording steps and elapsed time without converting that observation into an API guarantee;
- status remains `Drive document updated — NotebookLM refresh unverified` until separate user confirmation;
- measured volume/size/occupancy produces an accepted refresh, rotation, import/removal, retention, and headroom burden; and
- NotebookLM source removal, Drive-file disposition, OAuth revocation, and cleanup evidence remain separate.

### Production decision gate

Even a passing synthetic lane returns to council first. A future Go/Limited-go requires an approved secure credential boundary, production-grade outbox/ledger design, deterministic aggregate composer, representative privacy-safe workload evidence, monitoring/operations plan, destination consent and truthful status UX, exact cleanup, release/privacy review, and an explicitly bounded capacity/retention envelope.

## Conditional artifact disposition

Because the decision is **Defer**, do **not** create a PRD, UX/UI package, HTML prototype, or production technical plan. Those artifacts are inapplicable until a future council issues Go or Limited-go. The credential-free harness remains spike evidence only.

## Revalidation and expiry

Revalidate on **2026-08-21**, or earlier when any of these occurs:

- Gate 0 is answered;
- an applicable official synthetic spike completes;
- Google changes the Enterprise API stage/version, identity model, quota, pricing, or terms;
- Google documents a consumer/Workspace source-management or refresh-observation API;
- Google documents create idempotency or a conclusive source-visibility horizon; or
- the intended volume, retention, target occupancy, freshness, or privacy requirement materially changes.

No evidence change means the result remains Defer; time passing does not promote the feature.

## Council v1 conclusion

The application-side design is credible enough to test, but the product outcome, supported account lane, live provider semantics, secure credential boundary, and end-to-end trust contract are unproven. The council therefore issues **Defer** with high confidence, preserves one bounded official synthetic re-entry path, rejects unofficial consumer automation, and authorizes no production implementation.
