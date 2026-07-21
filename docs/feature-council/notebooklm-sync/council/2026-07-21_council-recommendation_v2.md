# AI Brain → NotebookLM Synchronization — Product Council Recommendation v2

**Decision date:** 2026-07-21
**Product decision:** **Defer**
**Research disposition:** **At most one applicable official synthetic lane after Gate 0; this cannot authorize a user-facing build**
**Confidence:** **High**
**Evidence cutoff:** 2026-07-21
**Evidence status:** Public and credential-free research complete; Gate 0 and live Google validation pending
**Implementation status:** Not implemented
**Revalidate:** **2026-08-21**, or earlier after Gate 0, an applicable official synthetic spike, or a material platform change

## Executive decision

Defer product implementation and any user-facing promise that AI Brain keeps NotebookLM synchronized. Resolve the minimum non-secret eligibility gate once and, if authorized, run only the smallest applicable official synthetic spike against one selected private target. Do not create production migrations, dependencies, credentials, UI, workers, or real-content integrations on the current evidence.

All three independent PMs recommend **Defer**. Their agreement is corroborating evidence, not a substitute for the decision record. The controlling facts are:

- the local mapper and durable fake-provider harness pass **46/46** credential-free checks and establish credible application-side invariants, including injected failure, timeout, ambiguity, delayed visibility, restart, and concurrency behavior;
- no **live** Google/provider failure, account, authorization flow, notebook, Drive file, source, real item, refresh, query, citation, cleanup, or quota behavior was exercised;
- consumer, paid-consumer, and ordinary Workspace NotebookLM expose no documented source-management API in the reviewed official material;
- a supported Google Docs/Drive bridge can prove only `Drive document updated — NotebookLM refresh unverified`;
- Gemini Notebook Enterprise is a separate licensed Cloud product with a documented direct source surface, but the current guides are Preview/Pre-GA and `v1alpha`, account eligibility is unknown, and create idempotency/conclusive absence behavior is not documented; and
- AI Brain lacks a production-safe outbound change sequence, general content version, deletion tombstone, external-source ledger, canonical remote formatter, publication-readiness rule, and approved mutable Google token store.

This is **Defer**, not **No-go**, because an official Enterprise lane may meet the outcome after entitlement and live evidence. A consumer/Workspace Drive publisher may also provide narrower value if it is explicitly renamed and satisfies a strict manual-burden gate. Neither hypothesis currently supports a product Limited-go or production build.

## What this decision authorizes

The decision intentionally separates two transitions:

1. **Research authorization:** Gate 0 may unlock one selected official lane and one-source/one-Doc synthetic account/API feasibility work. Passing it authorizes only further bounded research.
2. **Product Limited-go:** requires aggregate, successive-publication, retrieval/citation, finality, capacity, manual-burden, credential, privacy, operations, and cleanup evidence defined below. The one-source research spike cannot cross this gate.

No passage of a research spike is self-executing. Evidence returns to council before product design or implementation.

## Council process and individual recommendations

Each PM prepared a recommendation without reading the other PM outputs. The coordinator integrated them only after all three were complete.

| Council member | Recommendation | Self-reported confidence | Distinct emphasis | Revalidation |
|---|---|---:|---|---|
| [User Value and Engagement](individual/PM_USER_VALUE_2026-07-21.md) | Defer | 0.87 | Trustworthy freshness, time to first current citation, activation and recurring manual burden | 2026-08-21 or after Gate 0 + official spike |
| [Knowledge Management and Workflow](individual/PM_KNOWLEDGE_WORKFLOW_2026-07-21.md) | Defer | 0.86 | Retrieval/citation quality, aggregate granularity, snapshot truth, source lifecycle | 2026-08-21 or before official spike/decision |
| [Platform, Data, and Privacy](individual/PM_PLATFORM_DATA_PRIVACY_2026-07-21.md) | Defer | 0.93 | Edition/API eligibility, Preview risk, auth/IAM, token custody, reconciliation, privacy, reversibility | 2026-10-21 or material platform change |

The integrated confidence is intentionally qualitative; the PM values use different role-specific frames and are not averaged. The integrated decision adopts the earlier 2026-08-21 date. Platform evidence must also be rechecked within seven days before any live spike.

## Evidence boundary

### Verified locally

- Ten fixed synthetic item identities exercise reachable and unsupported type/fidelity cases without consuming an eleventh identity.
- Five eligible fixtures map through a default-deny allowlist; five fail closed.
- Full connection-scoped HMAC markers, URL minimization, private/local host rejection, and Recall provenance stripping pass fixed and adversarial cases.
- File-backed synthetic outbox, target cursor, stable requests, frozen cutoffs, leases, fences, attempt history, poison isolation, lost-response states, and stable Drive revisions pass locally.
- Injected fake-provider failure paths cover accepted-create/lost-response, delayed visibility, zero/multiple reconciliation, crash/restart, transient retries, pending state, and stale writers.
- A potentially accepted Enterprise create never blindly retries on an inconclusive zero; it stops at `manual_reconcile`.
- Drive status never claims NotebookLM freshness.
- Capacity arithmetic rejects one-source-per-item and applies independent NotebookLM word and Google Docs character bounds.
- The capacity simulation is deterministic, with repeated output hash `bc959f91427ed04a16b59e28a871c24b9ab4dd04807d8264812ba7e1513e71be`.

### Official but not observed here

- Gemini Notebook Enterprise documents direct notebook/source operations through a separate Cloud product surface.
- Current source guides are Preview/Pre-GA and `v1alpha`; applicable license, project, location, IAM, notebook permission, and licensed user are required.
- Enterprise exposes source processing state, but the reviewed documentation does not establish a caller idempotency key, caller source ID, source update, webhook, or conclusive visibility horizon after an ambiguous create.
- Consumer/paid-consumer/ordinary Workspace NotebookLM supports manually imported Drive sources and documented refresh behavior, but no supported programmatic refresh-observation contract was found.
- Native Google Docs are limited to 1.02 million characters; NotebookLM source and word limits vary by edition.

### Unknown and decision-blocking

- Exact NotebookLM edition and Enterprise entitlement/Preview permission.
- Permission for exactly one selected private synthetic target.
- Ability to complete official local user authorization without sharing secrets.
- Acceptance of a consumer/Workspace workflow requiring manual import and visual refresh verification.
- Live auth, IAM/license behavior, source inventory visibility, processing latency, query/citation fidelity, Drive refresh, quota/error behavior, token refresh/revocation, usage-logging configuration, and exact cleanup.
- Actual eligible volume, content-size distribution, target occupancy, retention preference, source headroom, finality/readiness rule, and acceptable freshness/manual burden.

## Decision matrix

Ratings describe current evidence: **Conditional** means a supported hypothesis exists but a gate remains; **Blocked** means the required outcome is not established; **Fallback** means useful only under a narrower promise.

| Dimension | Gemini Notebook Enterprise direct lane | Consumer/paid-consumer/ordinary Workspace Drive lane | Manual Markdown export | Decision implication |
|---|---|---|---|---|
| User value | Conditional: potential hands-off publication | Fallback: less copy/paste, but freshness work remains human | Fallback: explicit and predictable, not automatic | No lane has proven a correct current answer/citation from a newly eligible item |
| Supported editions | Separate licensed Cloud product only | Broad Drive substrate; paid tiers do not grant Enterprise API entitlement | All editions accepting manual sources | Edition selects the product promise and controls |
| Official support | Conditional: documented `v1alpha` source surface | Docs/Drive calls official; NotebookLM attachment/refresh manual or unobservable | Official UI workflow | Unofficial RPC/browser automation excluded |
| Reliability | Blocked live: no provider call; ambiguous accepted create remains contract risk | Drive revision may be reliable; NotebookLM freshness cannot be observed by AI Brain | Human-controlled | Local 46/46 proves fake-provider design semantics only |
| Source fidelity | Conditional: deterministic minimized text locally; provider conversion/query untested | Conditional: same local text; refresh/citation fidelity untested | User can inspect file | Aggregate retrieval and negative cross-item checks required |
| Source-count viability | Conditional with bounded aggregation and retention; per-item rejected | Conditional only at low enough volume/size with repeated rotation/import/removal | User-managed | Actual occupancy, payload distribution, reserve, and retention required |
| Update behavior | New-only immutable snapshots; no source update documented | Stable Doc revision possible, but initial scope remains new-only and refresh unverified | Manual replacement/import | No history, repair/edit propagation, or deletion propagation |
| Security | Blocked: IAM/license/principal and token custody unproven | Blocked: OAuth/subject/ACL and token custody unproven | Lowest automation exposure | No credential before lane/store approval |
| Privacy | Blocked: edition/logging/retention state unverified | Blocked until consumer or exact Workspace service terms known | Each transfer explicit | Destination-specific consent required |
| Authentication complexity | High: project, API, region, license, IAM, notebook rights, licensed identity | Medium: user PKCE OAuth with `drive.file`, target/ACL binding | Existing UI only | Service-account compatibility cannot be inferred |
| Cost | Blocked by USD 0 unless already entitled with no incremental cost | No added charge expected within current quota; recheck pricing | No new service spend | No subscription or billable action authorized |
| Operational burden | High: Preview drift, reconciliation, retention, auth/permission failure, cleanup | High at scale: manual freshness verification and rotation/source maintenance | Explicit recurring work | Interventions per active week are a product metric |
| Maintainability | Blocked: Preview/`v1alpha`, missing operations/quotas, auth uncertainty | Conditional only as a narrowly named publisher | Simple | No production adapter should be frozen now |
| User trust | Conditional only with exact state and live proof | Weak for “sync”; viable only with unverified-refresh language | Truthful but inconvenient | Never display `Synced` for Drive-only update |
| Reversibility | Blocked: source deletion and log retention untested | Blocked: NotebookLM removal, Drive disposition, OAuth revocation separate | User-controlled | Disconnect is not erasure |

## Strategy disposition

| Strategy | Disposition | Rationale |
|---|---|---|
| Direct Gemini Notebook Enterprise API | **Promising; deferred pending Gate 0 and official synthetic evidence** | Only direct officially documented lane; Preview/licensing/auth/reconciliation/logging/cleanup gaps remain |
| Stable Google Doc for consumer/Workspace | **Narrow fallback; not NotebookLM sync** | Proves Drive state only; manual import, refresh observation, rotation, and cleanup remain |
| Size-bounded aggregate sources | **Required capacity pattern for product re-entry** | Avoids immediate source exhaustion; cadence, composition, attribution, finality, and retention need validation |
| One source per AI Brain item | **Rejected as default** | Exhausts source budgets rapidly and magnifies duplicate/cleanup risk |
| Manual Markdown export/import | **Retain as safe fallback** | Truthful, reversible, supported, and available without connector risk |
| Unofficial consumer connector/browser automation | **No-go in this goal** | Internal RPC/session state creates disproportionate security, policy, breakage, and maintenance risk |

## Capacity interpretation

The model always uses the minimum of the applicable word and character bounds. Its published scenarios assume a 20% reserve and, unless otherwise labeled, six characters per word. Under that planning fixture, the 1.02-million-character Docs limit binds before the 500,000-word NotebookLM limit. This is a fixture result, not a universal content fact.

One-source-per-item fails every modeled 90-day and one-year scenario. Enterprise weekly aggregates fit many 1,000-word scenarios but add up to a week of publication latency; daily sources exceed the 300-source gross limit within one year without retention. Drive rotation can become frequent because of both character/word size and source occupancy. No workload distribution, cadence, retention, or history-loss policy is selected until account-specific, privacy-safe inputs are available.

## Technical recommendation

Do not implement a production connector. Retain the research-only harness as evidence, not production code.

After a conditional Gate 0 selection, research may use only the applicable lane and existing synthetic fixtures:

1. **Enterprise research spike:** bind licensed subject, project, location, notebook, API version, and permission set; create one raw-text source; poll documented state; exercise an intentionally lost successful response; reconcile only by supported exact evidence; leave a non-conclusive zero at `manual_reconcile`; record project usage-logging state; and prove deletion of only the recorded source.
2. **Consumer/Workspace research spike:** call it a Drive publishing bridge; use official PKCE OAuth with `drive.file`; create one private app-owned Doc; verify subject/file/ACL/revision; import once manually; perform two revision-guarded updates; manually observe freshness/citation behavior; and keep status at `Drive document updated — NotebookLM refresh unverified`.

If implementation is later authorized, it must start with a transactional monotonic outbound outbox, target-scoped desired-state ledger, immutable attempt history, deterministic aggregate composer, canonical versioned minimization-first formatter, explicit publication-readiness rule, target leases/fences, `needs_reconcile`, provider capability flags, independent retries, secure worker-only mutable credentials, and edition-specific status. `captured_at`, current Markdown exporters, Recall inbound tables, plaintext settings, and the experimental harness are not production substitutes.

## Security recommendation

- Acquire no Google credential until edition/lane and exact scopes are approved.
- Never place refresh tokens in `.env`, plaintext settings, backups, logs, reports, browser-visible status, or the web process. Approve an OS credential store, secret manager, or worker-only envelope-encrypted store first.
- Use the official licensed user for the first Enterprise spike; do not infer service-account entitlement. Use PKCE and `drive.file` for Drive.
- Bind every run to owner, connection, Google subject alias, exact target alias, edition, mapping version, strategy, and privacy-preserving ACL state; fail closed on drift and never choose a fallback destination.
- Default-deny content export. Exclude attached notes, metadata-only Recall items, unsupported schema-only types, private/signed URLs, raw IDs/hashes, capture internals, and unapproved derived fields.
- Observe the Enterprise project's usage-logging state. Before any non-synthetic content, verify whether logging is enabled and, if so, its region, readers, sinks, retention, and deletion limits. If the runtime owner cannot control or verify it, require explicit disclosure/consent or keep the lane blocked. Source deletion and log retention remain independent.
- Log safe event aliases, counts, sizes, attempt/state transitions, and normalized error classes only—never titles, bodies, URLs, emails, raw provider identifiers/errors, request/response bodies, tokens, codes, or credential paths.
- Treat pause, credential revocation, NotebookLM source cleanup, Drive-file disposition, and retained provider logs as separate states. Do not label disconnect as deletion.

## Preserved disagreements and integrated choices

1. **Enterprise cadence:** Knowledge/workflow favors at most a one-week immutable period for many capacity cases; platform/security notes daily sources better match freshness but require rolling retention. No cadence is selected.
2. **Drive viability threshold:** Knowledge/workflow requires rotation no more often than monthly and no mandatory daily action. Other PM reasoning would allow any measured burden the user explicitly accepts. The integrated product Limited-go gate adopts the stricter monthly/no-daily ceiling **and** requires explicit user acceptance; user acceptance alone cannot waive the ceiling. The more permissive position remains recorded dissent.
3. **Terminal success:** Enterprise `COMPLETE` may establish provider processing; knowledge/user-value also require correct retrieval/citation before knowledge success. Both facts remain separate.
4. **Publication finality:** A new-only immutable snapshot can become stale after capture repair or enrichment. Product re-entry must either withhold an item until a testable readiness condition or disclose and obtain acceptance for a final-at-publication snapshot that will not receive corrections.
5. **Revalidation:** Platform proposed 2026-10-21; the other PMs proposed 2026-08-21. The integrated date is 2026-08-21.
6. **Drive naming:** All agree it is not verified NotebookLM sync. Whether “Publish to Google Drive for NotebookLM” has enough value remains a future product question.

## Assumptions

1. Required outcome is a truthful one-way daily/manual destination workflow, not a local request or Drive write.
2. One explicitly bound private notebook is the target; no fallback target or silent sharing change is acceptable.
3. Initial scope is new eligible items after connection, append-only, with no backfill, edit/delete propagation, or attached private notes.
4. USD 0, no new subscription, synthetic-only, supported-interface, and no-production-change constraints remain in force.
5. Aggregates are acceptable only after cadence, granularity, citation, retention, and capacity are observed and accepted.
6. Unknown is not a pass. Documentation is not observed account behavior.

## Principal risks retained

- wrong edition or absent entitlement;
- Preview/`v1alpha` drift;
- accepted-but-unobserved Enterprise creation;
- Drive success mistaken for NotebookLM freshness;
- token compromise, over-broad IAM, subject/target/ACL drift;
- Enterprise usage logging with unverified retention/access;
- aggregate omission, duplication, boundary error, poor retrieval, or misleading citation;
- source/character limits forcing unaccepted latency, rotation, or history loss;
- provisional content or later correction/deletion leaving an immutable stale snapshot;
- disconnect mistaken for erasure; and
- local fake evidence mistaken for provider or production readiness.

See [the risk register](../RISK_REGISTER.md). None of these is closed by the local result.

## Re-entry criteria

### Gate 0: select one lane and one resource

The earlier Gate 0 wording requested permission for both an Enterprise-style notebook and a Drive Doc. The minimum request is conditional:

1. First identify consumer, exact Workspace edition, or Gemini Notebook Enterprise; existing Enterprise entitlement/Preview permission; official local-auth ability; and whether the manual Drive boundary is acceptable.
2. Then authorize exactly the selected synthetic resource: **one private Enterprise test notebook**, or **one private consumer/Workspace notebook plus one private app-created Doc**.

Do not repeat the user request or ask for URLs, identifiers, screenshots, credentials, tokens, codes, cookies, or secret files. If the existing response already grants both resource types, use only the one selected lane.

Before execution, revalidate the applicable official documentation, release stage, terms, scopes, IAM, quotas, limits, privacy, logging, and pricing within seven days. Require no new subscription or billable spend. Fix the exact product promise and terminal state. Create/change/delete only exact spike-owned objects tracked in an ignored `0600` manifest. Stop before any write on subject/target/ACL mismatch.

### Transition 1: research authorization and account/API feasibility

A Gate 0 pass permits only the lane-specific synthetic research spike described in the technical recommendation. Its output may justify further research but cannot authorize product design, migration, dependency, UI, worker, or real-content work.

### Transition 2: Product Limited-go

After a successful account/API spike, all applicable criteria below must pass and return to council:

1. A deterministic size-bounded aggregate uses all five eligible fixed fixtures with no omission, duplication, boundary error, content leakage, or unstable ordering; size overhead is included.
2. Successive scheduled publications plus one overlapping manual request preserve ordering, idempotency, and truthful status. Enterprise manual-period closure semantics are explicit; Drive remains a separate publisher.
3. Every eligible fixture's distinguishing fact is retrievable and cited to the correct item heading/snippet. Paired negative questions do not blend facts across items; wrong-item attribution is a failure.
4. A publication-readiness rule either withholds late-changing title/text/transcript/summary until a testable condition, or the user explicitly accepts a final-at-publication immutable snapshot with no correction propagation.
5. Actual privacy-safe daily volume, word/character distribution, target occupancy, pending deletion, reserve, retention, and cadence demonstrate a bounded one-year envelope.
6. Enterprise demonstrates exact identity/state, lost-response reconciliation without duplicate, zero/multiple fail-closed behavior, token expiry/revocation, permission drift, quota/error classification, exact cleanup, and measured latency. Project usage logging is observed; before non-synthetic content, enabled logging's region/readers/sinks/retention/deletion are approved and disclosed.
7. A Drive bridge demonstrates two stable revisioned updates, manual refresh/citation observations, separate NotebookLM/Drive/OAuth cleanup, rotation no more often than monthly, no mandatory daily user action, and explicit acceptance of the measured recurring burden.
8. Destination consent, secure credential custody, trusted-worker boundary, privacy terms, status vocabulary, monitoring, reconciliation runbook, and exact cleanup are approved.

Only the applicable lane's provider criteria apply, but common aggregate, finality, retrieval/citation, capacity, consent, credential, status, and operations criteria remain mandatory. Even then, council must issue a new Limited-go or Go before implementation begins.

## Conditional artifact disposition

Because the product decision is **Defer**, do **not** create a PRD, UX/UI package, HTML product prototype, or production technical plan. Those are inapplicable until a future council issues Go or Limited-go. The credential-free harness remains spike evidence only.

## Revalidation and expiry

Revalidate on **2026-08-21**, or earlier when Gate 0 is answered, an official synthetic spike completes, the Enterprise API stage/version/identity/quota/pricing/terms changes, a consumer/Workspace source-management or refresh-observation API appears, create idempotency/visibility is documented, or workload/privacy requirements change.

No evidence change means the product decision remains Defer; time passing does not promote the feature.

## Review disposition

[The independent adversarial review](2026-07-21_council-recommendation_adversarial-review.md) reported 0 P0, 3 P1, and 3 P2 findings. V2 resolves them as follows:

| Finding | Resolution |
|---|---|
| P1-1 Drive disagreement reversed | Adopted monthly/no-daily ceiling plus acceptance; recorded permissive dissent |
| P1-2 product re-entry under-tested | Split research and product transitions; added aggregate, successive/manual, citation, capacity, and finality gates |
| P1-3 usage logging not observable | Added project-state observation and non-synthetic disclosure/approval gate |
| P2-1 decision/evidence/confidence mixed | Split product decision/research disposition, qualified live vs fake failures, used qualitative confidence |
| P2-2 character claim universalized fixture | Labeled 20% reserve/six-character assumption and min-of-bounds rule |
| P2-3 Gate 0 requested both resources | Made resource authorization conditional on the selected lane; request remains one-time and non-secret |

## Final council position

The application-side design is credible enough for one gated official research spike, but the product outcome, supported account lane, provider semantics, aggregate knowledge quality, finality rule, credential/privacy boundary, operating burden, and reversibility are unproven. The final council decision is therefore **Defer** with high confidence. It preserves one bounded official research path, rejects unofficial consumer automation, and authorizes no product implementation.
