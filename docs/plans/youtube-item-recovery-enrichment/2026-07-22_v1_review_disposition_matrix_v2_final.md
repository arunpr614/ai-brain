# Held Browser Transcript Manual Enrichment: V1 Review Disposition Matrix

**Date:** 2026-07-22
**Status:** V2 decision lock and completion checklist
**Baseline:** `cbaed78e879a84adcd3a5acbc489bd3ae82bb3b8` on `codex/youtube-item-recovery-enrichment-plan`
**Purpose:** Reconcile the V1 artifact reviews into one authoritative set of V2 changes without modifying V1 evidence.

## Inputs

- Product Council V1 adversarial review
- PRD V1 adversarial review
- Implementation Plan V1 adversarial review
- UX Specification V1 adversarial review
- Current-State Audit adversarial review
- V1 package cross-artifact consistency review
- UX Prototype V1 adversarial review
- Designer Agent V1 package review
- Product Manager Agent V1 package review
- Technical Architect Agent V1 package review
- Current application source at the baseline commit

## Decision Summary

1. The feature is named and scoped as **Held Browser Transcript Manual Enrichment**. P0 applies only to an approved `browser_visible_transcript` with an exact active processing hold. Other transcript sources retain their existing behavior and do not inherit this feature's privacy copy. A source-agnostic held-transcript policy requires a separate Council decision.
2. Inspect, Add, and AI Processing remain three independent user actions. The extension cannot authorize AI processing.
3. The complete user-reviewed context is represented by one server-generated, expiring `authorizationContextFingerprint`, not by provider fingerprints alone.
4. Any remote processing stage uses **Review AI processing** followed by one final **Agree and queue AI processing** consent action in a real dialog or mobile sheet. An all-local plan uses one explicit inline action while its complete disclosure remains visible and non-collapsible.
5. The command is queue-only. A durable receipt must exist before the UI says **Queued**.
6. A lost response enters `reconciling_authorization`; transport failure never proves that no provider request occurred.
7. Provider/content drift is stage-aware. Copy distinguishes no dispatch, digest dispatch/completion, and index dispatch.
8. Brain source delete-by, provider handling terms, and authorization expiry are separate disclosed and enforced facts.
9. Job generations never reset or reuse an earlier identity.
10. V2 uses a new run resource for consent-bearing work. The legacy `/enrich` route is inventoried and separately contained; it cannot release or process an active hold.
11. The real item information architecture remains intact: desktop rail, tablet reading order, and the existing five/six mobile tabs.
12. Production browser capture and production processing remain blocked by their independent gates.

## Dispositions

| ID | Severity | Finding | Disposition | V2 evidence target |
| --- | --- | --- | --- | --- |
| `R-001` | P0 | Provider fingerprints omit material consent terms. | Accepted. Define one canonical scope containing content identity, ordered stages, received data, coverage, outputs, retention, manifest/policy, environment, expiry, and consent-copy version. Persist and recheck it throughout execution. | Council D3; PRD provider/data contract; Implementation provider-plan, receipt, job, attempt, and HTTP sections. |
| `R-002` | P0/P1 | A dropped POST response can falsely render **Nothing was sent**. | Accepted. Add mutation receipt lookup, same-ID reconciliation, and `reconciling_authorization`. Only authoritative pre-dispatch denial may claim no provider request was created. | Council state contract; PRD state/API/error copy; UX durable states; prototype scenarios; implementation HTTP/tests. |
| `R-003` | P0 | Provider drift is stage-blind. | Accepted. Persist stage dispatch facts and use distinct before-dispatch, after-digest, and after-index copy/actions. | Council D7; PRD state model; UX conflicts; implementation attempts/status; prototype direct scenarios. |
| `R-004` | P0/P1 | Retention disclosure is not an executable lifecycle. | Accepted. Separate local delete-by, provider terms, and authorization expiry; enforce at authorization, claim, dispatch, retry, and apply. | Council privacy contract; PRD provider/data and retry rules; implementation gates/tests; UX review and expiry state. |
| `R-005` | P1 | Browser-only scope conflicts with generic manual-enrichment language. | Accepted through explicit narrowing. Rename the capability and state that only held browser transcripts receive this behavior in P0. Remove mobile paste/upload claims. | Titles, scope/non-goals, eligibility, copy caveats, current audit. |
| `R-006` | P1 | Remote review prototype is not the specified dialog/sheet. | Accepted. Implement one mounted responsive dialog/sheet with complete semantics and disclosure. | UX authorization/accessibility; V2 prototype and browser QA. |
| `R-007` | P1/P2 | Prototype overflows mobile and mounts duplicate Digest controls/IDs. | Accepted. One mounted action surface, fluid shell, 44 px touch controls, wrapping, no duplicate IDs, 320/360/390 checks. | UX responsive acceptance; prototype CSS/DOM; final QA report. |
| `R-008` | P1 | Starting is visually marked Queued before receipt. | Accepted. Add Authorizing as a pre-receipt state; Queued appears only from durable truth. | Council/PRD/UX state tables; prototype; implementation status tests. |
| `R-009` | P1 | Prototype mobile IA does not match the item page. | Accepted. Preserve Original, Digest, Ask, Related, Details, and optional Notes; return uses the existing Digest query/tab path. | UX IA; implementation placement; prototype mobile shell. |
| `R-010` | P1/P2 | Risk-critical scenarios are absent. | Accepted. Add provider missing, session expiry, pre-commit denial, unknown outcome, offline recovery, retries, stage drift, expiry, deletion, and concurrency scenarios. | UX scenario requirements; prototype controls; implementation test matrix. |
| `R-011` | P1 | Complete prototype output is smaller than the PRD contract. | Accepted. Render category, three-paragraph digest, key quotes, topics, stage list, providers, and revision; preserve it on index failure. | PRD output; UX output; prototype complete/partial states. |
| `R-012` | P1 | The supposedly monotonic generation resets to zero. | Accepted. Add a strictly increasing allocator and separate nullable applied generation; never reset the allocator. | Implementation migration/ABA tests; Council revision identity. |
| `R-013` | P1 | Legacy route replacement lacks compatibility evidence. | Accepted with architecture change. Use `/enrichment-runs` for the new consent command. Inventory and contain the legacy route; it may not release active holds. | Council route decision; audit architecture direction; implementation HTTP/PR-0. |
| `R-014` | P1/P2 | Effective states are too lossy for truthful copy. | Accepted. Return structured authorization, stage, dispatch, retry, drift, expiry, deletion, and allowed-action facts. | Council blocked reasons; PRD state model; implementation status projection; UX copy. |
| `R-015` | P1 | Attempt authorization lineage is implicit. | Accepted. Every enrichment/embedding attempt carries receipt mutation ID, full scope fingerprint, stage/provider fingerprint, generation, claim token hash, and outcome. | Implementation migration and attempts sections. |
| `R-016` | P1 | Provider-usage migration retains an architecture fork. | Accepted. Select generalized `provider_usage`; include compatibility view, copy/parity verification, ownership, and rollback. | Implementation schema-evolution/provider-usage sections. |
| `R-017` | P2 | The upstream migration is not frozen, and its planned `026_youtube_browser_transcript.sql` now collides with committed `026_notebooklm_export.sql`. | Accepted as a hard stop. Rebase to the next free number, shift the downstream nominal sequence together, and require source commit, final filename/hash, schema snapshot, and passing gate report before downstream migration work. | Audit integration note; Council/PRD/implementation no-go gates. |
| `R-018` | P2 | Requirement-to-test traceability is incomplete. | Accepted. Map every P0 functional requirement to implementation section, test layer, owner, evidence, and no-go gate. | Implementation final traceability matrix. |
| `R-019` | P2 | Remote CTA implies review may start processing. | Accepted. Use **Review AI processing**; reserve **Agree and queue AI processing** for the final consent. | Council, PRD, UX, prototype. |
| `R-020` | P2 | **No AI provider has received it** is item-wide and revision-insensitive. | Accepted. Use **AI Brain has not started AI processing for this transcript version.** Use stronger no-dispatch copy only from durable stage facts. | UX copy; prototype. |
| `R-021` | P2 | Bare **Ready** conflicts with paused state. | Accepted. Use **AI paused** while held; reserve **Ready** for current digest plus index. | UX pills; prototype. |
| `R-022` | P2 | **Semantic index** lacks plain-language purpose. | Accepted. Use **Search index** in primary UI and explain meaning-based retrieval; retain internal purpose identifier. | Council/PRD/UX/prototype. |
| `R-023` | P2 | Retry copy omits which provider/data is sent again. | Accepted. Name provider, stage, coverage, and whether the other provider is called. Material drift reopens review. | PRD retry/error; UX states; prototype. |
| `R-024` | P2 | Chrome return receipt lifecycle is undefined. | Accepted. Define exact-item validation, safe replay, dismissal, focus, age-out, and query behavior. | PRD Chrome return; UX banner/accessibility; implementation UI tests. |
| `R-025` | P2 | Provider-unavailable copy assumes viewer can change settings. | Accepted. Server returns allowed recovery action; only authorized operators see Settings. | Council blocked reasons; PRD/UX copy; prototype. |
| `R-026` | P2 | The 12,000-character limit hides prefix bias. | Accepted. Say the digest uses only the first 12,000 characters and later portions are omitted; search indexing uses full text. | Audit, Council disclosure, PRD, UX, prototype. |
| `R-027` | P2 | Comprehension gate is reviewer agreement, not a user protocol. | Accepted. Add defined questions, participant profile, pass/fail threshold, and iteration rule. | Council acceptance; PRD metrics/DoD; UX acceptance. |
| `R-028` | P2 | Local one-click can be enabled while terms are collapsed. | Accepted. Full local scope is visible and non-collapsible whenever the action is enabled. | Council D3; UX local interaction; prototype. |
| `R-029` | P2 | Audit route recommendation contradicted the package and evidence snapshot was not pinned. | Accepted. V2 audit is pinned and now records the selected new run resource plus legacy containment. | Current-State Audit V2 Final. |
| `R-030` | P3 | Scenario controls misuse ARIA tab semantics. | Accepted. Use toolbar buttons with `aria-pressed` or implement the complete tabs pattern. | Prototype. |
| `R-031` | P2/P3 | Prototype depends on remote icons/thumbnail. | Accepted. Provide deterministic local or embedded visual fallbacks; no-network remains legible. | Prototype and QA. |
| `R-032` | P3 | Generic visual labels obscure exact stage. | Accepted. Mirror durable state names in text; color/icons are secondary. | UX/prototype. |

## Superseded V1 Decisions

- Evolving `POST /api/items/:id/enrich` into the consent command is superseded by the new run resource because deployed-client/access-log compatibility evidence is absent.
- Provider fingerprints alone are not consent authority.
- A transport-level queue error is not proof that no work exists.
- A resettable generation is not an execution identity.
- The V1 inline remote review is exploration only, not implementation guidance.
- The V1 two-tab mobile shell is not product information architecture.
- Generic **manual enrichment after a transcript is added** language is superseded by the explicit held-browser scope for P0.

## Completion Gate

This matrix is complete only when:

- every accepted disposition is present in each applicable V2 artifact;
- V2 files are materially different from V1 and identify themselves as V2 Final;
- the V2 prototype is exercised at desktop, tablet, 390, 360, and 320 px;
- dialog/sheet, focus, duplicate-ID, target-size, and overflow checks pass;
- a final cross-artifact review finds no unresolved P0/P1 contradiction;
- all artifacts are committed and pushed without changing V1 evidence.
