# AI Brain Item Recovery And Manual Enrichment V1 Package: Designer Adversarial Review

**Created:** 2026-07-22 16:43 IST
**Role:** Designer, AI Brain Product Council
**Reviewer stance:** Skeptical, evidence-first, consent- and recovery-focused
**Reviewed target:** Complete V1 product council, PRD, implementation plan, UX specification, HTML prototype, current-state audit, original Designer memo, and relevant current code
**Report path:** `docs/plans/youtube-item-recovery-enrichment/2026-07-22_designer_agent_v1_review.md`

## Executive Verdict

**NO-GO for treating the V1 package as implementation-ready or as a faithful UX validation artifact.** The core product direction is sound: Inspect, Add, and AI processing remain separate user actions; the transcript is durable before processing; the AI Digest surface owns the processing choice; and production browser capture remains blocked. However, the package currently promises a stronger consent and state contract than its proposed data model, HTTP contract, copy, and prototype can prove.

Four P0 issues block V2 approval:

1. The proposed provider fingerprints do not bind several facts the UI says the user approves, including received-data categories, coverage limits, retention/delete-by terms, manifest authorization, and consent-copy version.
2. A lost authorization response can be rendered as **Nothing was sent** even when the atomic queue commit succeeded. Reusing the mutation ID is necessary but does not make that copy true.
3. Provider-plan drift is represented as one stage-blind state. The proposed copy can claim nothing was sent after the digest provider has already received the transcript under the previously approved plan.

A fourth release-blocking policy gap is closely related: V1 requires retention disclosure but never defines the authoritative retention object or what happens when authorization, provider dispatch, source deletion, and policy expiry cross in time.

The HTML is useful as a visual sketch, but it does not yet test the V1 interaction contract. Its remote review is an inline section rather than the required dialog/sheet; it omits required retention and routing details; it overflows narrow viewports; it leaves duplicate Digest controls and IDs in the DOM; and it announces **Queued** before a durable receipt. These are not cosmetic differences. They affect consent, keyboard behavior, and whether the prototype can support a Council decision.

**Conditional GO remains appropriate only for inert research and V2 design work. Production browser capture remains a separate NO-GO.**

## Evidence Inspected

### Package and prior design

| Key | Evidence |
| --- | --- |
| `MEMO` | `docs/plans/youtube-item-recovery-enrichment/2026-07-22_designer_agent_v1_input.md` |
| `COUNCIL` | `docs/plans/youtube-item-recovery-enrichment/2026-07-22_ai_brain_item_recovery_manual_enrichment_product_council_v1.md` |
| `PRD` | `docs/plans/youtube-item-recovery-enrichment/2026-07-22_ai_brain_item_recovery_manual_enrichment_prd_v1.md` |
| `PLAN` | `docs/plans/youtube-item-recovery-enrichment/2026-07-22_ai_brain_item_recovery_manual_enrichment_implementation_plan_v1.md` |
| `UX` | `docs/plans/youtube-item-recovery-enrichment/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_spec_v1.md` |
| `PROTOTYPE` | `docs/plans/youtube-item-recovery-enrichment/prototype/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_prototype_v1.html` |
| `AUDIT` | `docs/plans/youtube-item-recovery-enrichment/2026-07-22_current_state_audit.md` |

### Current implementation

| Key | Evidence |
| --- | --- |
| `ITEM_PAGE` | `src/app/items/[id]/page.tsx` |
| `PILL` | `src/components/enriching-pill.tsx` |
| `ITEM_STATUS` | `src/lib/items/status.ts` |
| `REPAIR` | `src/lib/repair/item-repair.ts` |
| `UPGRADE` | `src/db/item-upgrades.ts` |
| `ENRICH_ROUTE` | `src/app/api/items/[id]/enrich/route.ts` |
| `WORKER` | `src/lib/queue/enrichment-worker.ts` |
| `BATCH` | `src/lib/queue/enrichment-batch.ts` |
| `PROMPTS` | `src/lib/enrich/prompts.ts` |
| `ENRICH_PIPELINE` | `src/lib/enrich/pipeline.ts` |
| `EMBED_PIPELINE` | `src/lib/embed/pipeline.ts` |

### Interactive prototype checks

The prototype was exercised in Chromium across ready, remote review, local, complete, provider-changed, transcript-changed, indexing-failure, feature-off, and production scenarios.

Measured observations:

| Check | Result |
| --- | --- |
| 390 CSS px viewport | `document.documentElement.scrollWidth` was 399 px; horizontal overflow present. |
| 320 CSS px viewport | `scrollWidth` remained 399 px; 79 px of horizontal content was inaccessible without scrolling. |
| Remote review semantics | Zero `dialog` or `[role="dialog"]` elements; no `aria-modal`; Escape did not close review. |
| Focus return | **Keep AI processing paused** returned focus to `BODY`, not the invoking button. |
| Disclosure relationship | Confirmation button had no `aria-describedby`. |
| Touch targets | Mobile scenario tabs and disclosure control measured 36 px high; V1 requires 44 px. |
| DOM uniqueness | Mobile and desktop Digest panels were both mounted, producing duplicate headings, controls, and disclosure IDs. |
| Complete output | No visible Category or Key Quotes section despite the PRD output contract. |
| OpenRouter review | No explicit downstream-provider or fallback disclosure. |
| Queue transition | The synthetic `starting` state visually marked **Queued** as the current stage before the durable-receipt transition. |

These measurements are review evidence, not production approval evidence. The prototype itself correctly carries an inert/research disclaimer.

## Severity Definitions

- **P0:** Blocks trustworthy implementation or release because consent, privacy, data integrity, or the defining product promise can be false.
- **P1:** High likelihood of a broken or misleading core journey; must be corrected before V2 is approved for implementation.
- **P2:** Meaningful comprehension, recovery, or consistency problem; should be corrected in V2 unless explicitly deferred with rationale.
- **P3:** Polish or validation-harness issue that does not independently invalidate the product contract.

## Findings

## P0

### P0-01: The consent fingerprint does not bind the consent disclosure

**Evidence**

- `COUNCIL:79-88` says a change to provider, model, destination, purpose, coverage, retention, manifest, or consent copy invalidates the reviewed snapshot.
- `PRD:343-355` repeats that received-data categories, prompt/index coverage, retention/delete-by, manifest authorization, and consent-copy version require renewed review.
- `PRD:388-390` makes this a P0 requirement: the final action must bind purposes, limits, manifest, and copy version.
- `PLAN:300-311` returns `receives` as display data, but `PLAN:314-326` hashes only purpose, provider, model, boundary, endpoint identity, downstream identity, fallback, and prompt/index contract.
- `PLAN:393-405` submits only two provider fingerprints plus a provider-plan version. `PLAN:160-178` persists the same incomplete split fingerprint set in the authorization receipt.
- `PLAN:443-450` says the transaction validates manifest, expiry, retention, and purpose, but those reviewed values are not represented in the submitted or persisted authorization identity.

**Why this is P0**

The UI can display one data scope or retention rule, while the server accepts the click after one of those terms changes because the fingerprint remains identical. Server-side policy validation proves that the current policy is allowed; it does not prove that the current policy is the policy the user reviewed.

**Concrete failure mode**

1. The review says the semantic-index provider receives transcript chunks and retains them under policy A.
2. `receives`, retention, delete-by, manifest version, or consent wording changes.
3. Provider/model/endpoint remain unchanged, so both proposed provider fingerprints remain unchanged.
4. The old click is accepted under the new disclosure terms.

**Required V2 revision**

Replace the two narrow fingerprints as the consent authority with one canonical, server-produced authorization-plan fingerprint. The exact canonical object must include:

```text
contract_version
environment_class
item_id
active_transcript_source_id
content_revision
transcript_input_hash
authorization_expires_at
consent_copy_version
policy_manifest_id
policy_manifest_hash
policy_decision_hash
policy_decision_expires_at
for each ordered stage:
  purpose
  provider_identity
  model_identity
  local_or_remote_boundary
  normalized_endpoint_identity_hash
  downstream_provider_identity
  fallback_policy
  exact_received_data_categories
  exact_coverage_limit
  exact_outputs_written
  prompt_or_index_contract_version
  provider_retention_class
  provider_deletion_terms_version
local_source_delete_by
future_revision_excluded = true
future_ask_excluded = true
```

The status response must return display-safe fields plus `authorizationPlanFingerprint`. The POST must submit that fingerprint. The immutable receipt, enrichment job, embedding job, and attempts must bind it. Authorization, claim, provider dispatch, result apply, and stage-only retry must recompute and compare it or a documented stage projection of it.

Add a table-driven test that changes every field above one at a time and proves the old authorization returns a typed conflict and performs no provider call or derived write.

### P0-02: Network ambiguity can produce the false assurance "Nothing was sent"

**Evidence**

- `UX:197-199` labels the pre-receipt state **Starting enrichment...**, but maps a queue request failure to **Nothing was sent and the transcript was not changed.**
- `MEMO:234-235` contains the same absolute claim for a start-request failure.
- `PLAN:448-454` atomically commits the receipt, hold release, and pending job before constructing the response.
- `PLAN:657-660` correctly requires mutation-ID reuse and shows **Queued** only after `202`, but defines no "outcome unknown" state or receipt-recovery interaction.
- `PRD:445-480` defines authorization and retry responses but no status lookup keyed by mutation ID and no transport-ambiguity copy.

**Why this is P0**

A browser can lose the response after the server commits. The worker may then claim the durable job while the client displays **Nothing was sent**. Idempotency prevents duplicate jobs; it does not let the client infer that the first request had no effect.

**Required V2 revision**

Add a distinct client/server state and recovery contract:

- Effective client state: `authorization_outcome_unknown`.
- Heading: **Checking whether AI processing started**
- Body: **Brain did not receive a clear response. Do not approve again yet. We are checking the original request.**
- Persistent action after automatic checks fail: **Check status**
- Secondary action: **Keep this page open** is unnecessary; the state must survive reload.
- Never generate a new mutation ID for this recovery.
- Resolve by replaying the exact mutation or reading a receipt/status projection keyed to the original mutation ID.
- Only a typed, server-confirmed pre-commit rejection may use: **AI processing did not start. No provider request was created.**

Test response loss immediately before commit, immediately after commit, after `202` serialization, after the worker claim, during reload, and while offline. Each case must converge to the single durable result without a second consent action or false **Nothing was sent** copy.

### P0-03: Provider-plan drift is stage-blind and can misstate what was already disclosed or sent

**Evidence**

- `UX:205` says **Nothing was sent under the new plan**, while `UX:250-252` shortens this to the unqualified **Nothing was sent**.
- `PROTOTYPE:2878-2883` renders the unqualified **Nothing was sent** for the provider-changed scenario.
- `PLAN:621-632` gives `provider_review_required` one precedence position, without distinguishing pre-dispatch drift, digest-provider dispatch, digest completion, or drift before semantic indexing.
- `PLAN:610-615` acknowledges that digest success can be preserved while indexing requires renewed review, proving provider drift can occur between stages.
- V1 authorizes two potentially different processors and sends the full transcript to the semantic-index provider (`UX:124-145`, `UX:172-182`).

**Why this is P0**

The proposed conflict state answers "does the current plan match?" but not "what already happened under the accepted plan?" A provider can already have received the current transcript under the old authorization before the UI renders the generic conflict. This undermines the privacy receipt at the exact moment a user needs it most.

**Required V2 revision**

Track and project each stage separately with content-free events or immutable attempt fields:

```text
authorized_at
dispatch_started_at
dispatch_accepted_at
result_received_at
result_applied_at
provider_plan_fingerprint_at_dispatch
```

Use stage-aware copy:

| Condition | Required heading | Required body |
| --- | --- | --- |
| Plan changes before authorization | **AI provider details changed** | **Review the updated destinations and data scope before continuing. AI processing has not started for this transcript version.** |
| Authorized, no provider dispatch | **AI provider details changed before processing** | **The queued job is paused. No provider request was started. Review the updated plan to continue.** |
| Digest provider already dispatched or completed | **AI processing plan changed** | **The approved digest provider already received this transcript version. Brain will not use the changed plan for another stage until you review it.** |
| Digest complete, index plan changed before dispatch | **Digest ready. Search indexing is paused.** | **The digest provider will not be called again. Review the updated search-index provider before sending the full transcript.** |
| Index provider already dispatched | **Search-index plan changed after sending** | **The approved index provider already received the current transcript. The changed plan was not used. Brain is verifying whether the result can be applied.** |

No branch may use **Nothing was sent** without a durable proof that neither stage crossed its provider-dispatch barrier.

### P0-04: Retention is required copy but not a complete executable lifecycle

**Evidence**

- `UX:172-182` requires approved retention/delete-by wording in remote review.
- `PRD:345-355` says retention/delete-by changes invalidate approval.
- `PLAN:443-450` says retention and expiry are checked at authorization.
- `PLAN:690-702` describes item deletion barriers and backup truth, but no rule covers policy expiry after queueing, between digest and index dispatch, while retrying, or before applying a late result.
- `PROTOTYPE:2827-2841` has sent, stored, and excluded lists but no retention or delete-by disclosure.

**Why this is P0**

"Retention" currently mixes at least three different obligations: how long the browser-derived source may remain in Brain, what the remote provider may retain, and how long the authorization remains valid. A single check at click time cannot authorize a stage that starts after its policy window closes.

**Required V2 revision**

Define three separate server-authoritative values and disclose them separately:

1. **Brain source retention:** exact local delete-by timestamp or a stable policy class with a display-ready timestamp.
2. **Provider handling:** provider-specific retention/deletion statement version for each remote stage; do not imply provider deletion guarantees that are not evidenced.
3. **Authorization validity:** exact authorization expiry, always no later than the source/policy deadline.

Before every provider dispatch and result apply, enforce the exact authorization and policy deadline. If expiry occurs:

- an unstarted stage becomes `authorization_expired`, remains paused, and requires a new review only if the source still lawfully exists;
- an already-dispatched stage records that fact and may apply only if the accepted policy explicitly permits late response handling;
- a later stage cannot inherit authorization merely because an earlier stage completed;
- deletion wins over dispatch, retry, and apply.

Add deterministic clock-boundary tests for expiry one millisecond before and after authorization, claim, each provider dispatch, provider response, and apply.

## P1

### P1-01: V1 silently narrows the promised manual-enrichment behavior to one source kind

**Evidence**

- `MEMO:22` says manual enrichment may apply to an already-approved transcript regardless of how the transcript was added.
- `MEMO:302-336` separates processing eligibility from Chrome-capture availability and explicitly says paste/upload can lead to the same ready state on mobile.
- `PRD:143-165` limits P0 to `browser_visible_transcript` and moves paste/upload/official captions to P1.
- `PLAN:476-490` deliberately leaves paste/upload on `legacy_scheduled`, which still auto-queues processing.
- Current code does auto-queue: `REPAIR:117-163` and `UPGRADE:62-113` reset enrichment to pending and create/re-arm a job; `WORKER:144-160` claims pending jobs; `BATCH:115-165` also selects pending items.

**Risk**

The user-visible principle "adding a transcript is not permission to process it" becomes source-dependent without a visible reason. Mobile users cannot use the desktop Chrome handoff, and V1 also denies them the proposed held/manual behavior for paste/upload. The implementation would preserve two conflicting privacy models in one product.

**Required V2 revision**

Adopt one source-agnostic eligibility rule: any durable active transcript source carrying an explicit processing hold enters `awaiting_permission`. Browser-capture permission remains a separate capture gate. Define a source matrix for browser-visible, pasted, uploaded, official captions, ASR, and legacy article body with columns for capture approval, processing hold, provider eligibility, retention, and production availability.

If Council intentionally retains the browser-only P0, V2 must rename the scope to **Manual enrichment for held browser-recovery transcripts**, remove claims that the feature is the general post-transcript behavior, and surface why paste/upload behaves differently. The Designer recommendation is the generic held-transcript model.

### P1-02: The remote consent prototype is not the interaction specified by V1

**Evidence**

- `UX:161-187` requires a focused desktop dialog and mobile sheet, item/transcript identity, two processors, sent/not-sent scope, limits, outputs, retention, queue behavior, and exclusions.
- `UX:403-408` explicitly admits that V1 uses an inline section and defers the real semantics to V2.
- `PROTOTYPE:2909-2913` renders review as another `<section>` in the Digest panel.
- Runtime inspection found no dialog role, no modal semantics, no Escape close, no focus return, and no confirmation `aria-describedby`.
- `PROTOTYPE:2789-2841` omits remote retention/delete-by and does not render OpenRouter downstream/fallback in the review.

**Risk**

Council cannot evaluate the chosen two-step remote flow, mobile sheet density, focus behavior, or whether the complete dual-provider disclosure is comprehensible. The prototype currently validates a different interaction.

**Required V2 revision**

Implement one real responsive review component:

- native `<dialog>` where browser support and the app stack permit, otherwise an accessible dialog primitive;
- desktop centered dialog; mobile bottom sheet presentation from the same mounted component;
- labelled heading, description, close control, focus trap, Escape dismissal, inert background, scroll containment, and invoker focus return;
- no provider call, receipt, or state mutation on open/cancel;
- exact item title, source label, transcript revision, and added time;
- complete two-stage provider and retention details;
- final consent control linked to the full disclosure.

The V1 deviation from `MEMO:20` and `MEMO:52` is defensible only because V1 now authorizes two stages, potentially two remote destinations, and full-transcript indexing. Record that rationale. Treat the first action as navigation, not consent, and label it **Review AI processing**. The only remote consent action is **Agree and queue AI processing**.

### P1-03: The prototype fails its own narrow-layout and accessibility contract

**Evidence**

- `UX:269-312` requires no duplicate hidden action, 44 px touch controls, no horizontal scrolling at 320 px/200% zoom, and explicit focus semantics.
- At a 390 px viewport, runtime `scrollWidth` was 399 px. At 320 px, it remained 399 px.
- `PROTOTYPE:2306-2314` fixes the simulated mobile browser at 390 px inside additional outer spacing, causing the narrow-viewport crop.
- `PROTOTYPE:1156-1168` and `PROTOTYPE:1335-1352` use 36 px minimum heights for disclosure and scenario tabs.
- `PROTOTYPE:2940-2960` mounts both mobile and desktop Digest panels. The same generated component therefore creates duplicate headings, buttons, and disclosure identifiers in the DOM.

**Risk**

Hidden duplicate controls can become focusable after CSS or breakpoint changes, duplicate IDs break accessible relationships, and the 320 px requirement is currently untestable because the "device" itself is wider than the viewport.

**Required V2 revision**

Mount exactly one Digest command surface per viewport state. Do not rely on CSS hiding duplicate authorization controls. Make the simulated shell `width: min(390px, 100%)`, remove fixed minimum widths from its descendants, give provider/model strings `overflow-wrap: anywhere`, and require 44 px touch targets in the simulated product and scenario harness. Add automated checks for:

- `scrollWidth <= clientWidth` at 320, 360, 390, 768, 1024, and 1440 px;
- no duplicate IDs;
- exactly one visible and one mounted authorization action;
- 200% browser zoom/reflow;
- keyboard order, Escape, focus trap/return, and reduced motion;
- an accessibility scan with zero serious/critical findings.

### P1-04: The synthetic Starting state claims Queued before the receipt exists

**Evidence**

- `UX:197-199` and `UX:393-395` distinguish Queueing from Queued and require Queued only after a durable receipt.
- `PLAN:657-660` repeats that transition rule.
- `PROTOTYPE:2898-2906` maps `starting` to the `queued` progress row, making **Queued** the active step while the request is still pending.

**Risk**

The prototype trains reviewers and implementers to collapse the central trust distinction the package is trying to create.

**Required V2 revision**

Before receipt, show a separate non-complete row:

- Heading: **Authorizing AI processing**
- Body: **Securing this transcript version and recording your choice.**
- Status chip: **Authorizing**
- Progress rows: **Authorization** current; **Queued**, **Create digest**, and **Build search index** not started.

Only a durable `202` or recovered accepted receipt may mark **Queued** current or complete.

### P1-05: The prototype and placement plan do not match the actual item information architecture

**Evidence**

- `UX:283-289` describes only Original/Digest segmented tabs on mobile.
- `ITEM_PAGE:791-820` currently renders five or six link-based tabs: Original, Digest, Ask, Related, Details, and optionally Notes.
- `ITEM_PAGE:836-849` selects the actual Digest/Ask/Related/Details content from query-driven navigation.
- `ITEM_PAGE:381-489` renders a two-column layout only at `lg`; at `md`, the article and aside are one-column siblings. The transcript appears at `ITEM_PAGE:430`, followed by the full body at `ITEM_PAGE:432`, while Digest is in the later aside at `ITEM_PAGE:474-489`.
- `UX:278-281` and `PLAN:646-651` say tablet Digest appears directly after Transcript, which requires an explicit DOM/layout restructure not acknowledged in the implementation steps.

**Risk**

A prototype with a simplified two-tab shell hides tab crowding, query preservation, return behavior, Notes interaction, and the real tablet reading order. "Place after Transcript" is not a styling-only change in the current DOM.

**Required V2 revision**

The prototype must preserve all current tabs and use the real interaction model. The Chrome return must navigate to the same item with a receipt reference and `tab=digest` while preserving allowed query state. It must focus the one-time transcript-added heading, never the authorization control. V2 implementation steps must explicitly describe how the Digest component is shared without duplicate actions across desktop rail, tablet flow, and mobile route/tab rendering.

### P1-06: Required recovery and concurrency scenarios are absent from the prototype

**Evidence**

- `MEMO:362-383` asks for provider unavailable, starting-network failure, retries, terminal error, stale digest, session expiry, and accessibility paths.
- `PROTOTYPE:2484-2494` exposes only Full journey, Ready, Local, Complete, Provider changed, Transcript changed, Indexing failed, Feature off, and Production.
- `PLAN:664-674` lists only a subset of the PRD state model.
- `UX:265-267` specifies two-tab/double-click convergence, but the prototype has no such scenario.

**Risk**

The package has copy for states that no reviewer can exercise. The most trust-sensitive branch, ambiguous start failure, is absent.

**Required V2 revision**

Add deterministic direct scenarios for:

1. provider not configured;
2. provider policy unavailable/unknown OpenRouter downstream;
3. authorization denied before commit;
4. authorization response lost after commit;
5. offline during status recovery;
6. duplicate click and two-tab race;
7. automatic digest retry 1/3, 2/3, and exhausted;
8. digest terminal failure and manual retry review;
9. index failure and index-only retry;
10. provider drift before dispatch, after digest dispatch, and between stages;
11. transcript change before click, while queued, during digest, and during indexing;
12. authorization/policy expiry while held, queued, and between stages;
13. session expiry before click and during recovery;
14. item deletion while queued and while provider work is in flight;
15. stale prior digest with current transcript;
16. mobile return with all existing tabs;
17. 320 px, 200% zoom, high contrast, reduced motion, and keyboard-only review.

Each scenario needs a direct query-string entry and a reset that restores deterministic state.

### P1-07: Complete-state output and status copy do not match the PRD

**Evidence**

- `PRD:359-377` requires a three-paragraph digest, key quotes, category, AI topics, and current-version chunks; it explicitly forbids replacing the title.
- `MEMO:218-240` also defines category, summary, quotes, and topics as the visible completed output.
- `PROTOTYPE:2861-2868` renders one short summary paragraph and topic chips only.
- Runtime complete-state inspection found no Category or Key Quotes labels.
- `PROTOTYPE:2916-2928` collapses starting, queued, digesting, and indexing into a generic title status rather than mirroring the specified durable state labels.
- The actual UI already has Category and quote sections at `ITEM_PAGE:1840+`, so the omission is not an existing-product constraint.

**Risk**

Council is evaluating the density and hierarchy of an unrealistically small success state. It also cannot assess the partial-success transition when a full digest remains visible but indexing fails.

**Required V2 revision**

Render representative three-paragraph summary, Category, three Key Quotes, Topics, provider/revision footer, and the three-stage status list. Use exact distinct pills: **AI paused**, **Authorizing**, **Queued**, **Creating digest**, **Building search index**, **Index needs attention**, **Ready**, and **Needs review**. Show the same complete digest in the index-error scenario and change only the index stage and recovery controls.

### P1-08: The proposed "monotonic" generation resets to zero and permits ABA ambiguity

**Evidence**

- `PLAN:123-130` calls `items.enrichment_generation` nonnegative and monotonic.
- `PLAN:133-138` then says body replacement resets it to `0`.
- `PLAN:189-226` uses generation as part of current-job identity and stale-attempt safety.

**Risk**

Resetting an identity counter allows an old generation number to be reused after transcript replacement. That weakens stale-result rejection and can make the UI associate an older attempt with a newer body revision if another check regresses.

**Required V2 revision**

Never decrement or reset an identity sequence. Use separate fields:

- `next_enrichment_generation`, strictly increasing per item; and
- `current_applied_enrichment_generation`, nullable and cleared on source replacement.

Every job/attempt/receipt binds both content revision and unique generation. Add an ABA regression: revision 7/generation 3 starts, source is replaced and cleared, revision 8/generation 4 succeeds, then generation 3 returns; no old output, status, title, topic, tag, chunk, or vector may apply or flash as current.

### P1-09: Replacing the current enrich endpoint with a `410` lacks a compatibility inventory

**Evidence**

- `AUDIT:157-169` recommends a run-oriented contract such as `POST /api/items/:id/enrichment-runs` because the current endpoint is behaviorally ambiguous.
- `PLAN:378-427` instead evolves the existing route and makes bodyless/`force` calls return `410`.
- Current `ENRICH_ROUTE:11-39` documents queue and `force=realtime` behavior as an operational API; `ENRICH_ROUTE:58-130` implements both paths.
- Source search found no current item-page caller, but repository runbooks, tests, and historical operational documentation refer to enrichment workflows. "No UI caller" is not evidence that no operator or integration depends on the route.

**Risk**

A destructive contract swap can break recovery tooling while the new UI remains feature-flagged off. It also overloads one URL with incompatible historical and consent-bearing meanings.

**Required V2 revision**

Prefer the audit's new run resource:

```text
POST /api/items/:id/enrichment-runs
GET  /api/items/:id/enrichment-runs/current
GET  /api/items/:id/enrichment-runs/by-mutation/:mutationId
```

Keep the old route disabled for browser-held transcripts, inventory every source/test/runbook/operator caller, and publish a deprecation/removal step. If Council keeps the existing URL, V2 must provide equivalent caller inventory, an explicit compatibility window, metrics proving no legacy use, and a rollback path.

### P1-10: The effective state model lacks facts needed for honest recovery copy

**Evidence**

- `PLAN:349-364` and `PLAN:621-632` omit authorization-outcome unknown, per-stage provider dispatch, authorization expiry, cancellation/deletion, and retry-in-progress as distinct effective states.
- `PRD:397-407` nonetheless requires queueing, retry, conflict, blocked, deletion, and kill-switch behavior.
- Current `PILL:6-122` only understands pending/running/batched/done/error; current `ITEM_STATUS:3-89` relies on legacy item state and chunk counts. V1 correctly proposes replacing these, but its proposed replacement still cannot select truthful copy for P0-02 through P0-04.

**Risk**

When the model lacks an observable fact, the UI guesses. The current false **Nothing was sent** and stage-blind provider conflict are examples of that structural problem.

**Required V2 revision**

The read model must expose, at minimum:

```text
awaiting_permission
reviewing_plan                 client overlay only
authorizing
authorization_outcome_unknown client overlay with durable recovery
queued
digest_retrying
digest_running
digest_error_retryable
digest_error_terminal
index_queued
index_retrying
index_running
index_error_retryable
index_error_terminal
ready
provider_review_required_before_dispatch
provider_review_required_after_digest
content_changed_before_dispatch
content_changed_in_flight
authorization_expired
policy_blocked
provider_unavailable
cancelling
cancelled
not_applicable
```

This can be represented as a smaller top-level union plus structured stage facts, but copy selection must never depend on a lossy state alone. Include `lastDurableTransitionAt`, stage attempt number/max, dispatch truth, current/accepted plan relation, and allowed actions.

## P2

### P2-01: The first remote CTA implies that review itself may start processing

**Evidence:** `UX:161-167`, `COUNCIL:202-205`, and `PROTOTYPE:2913` use **Review and enrich transcript**, even though opening the review performs no processing and the final button is the consent action.

**Revision:** Rename the first control to **Review AI processing**. Use **Agree and queue AI processing** only inside the complete review surface. Supporting text: **Review where the current transcript will be sent before deciding. Opening the review does not start processing.**

### P2-02: "No AI provider has received it" is too broad and loses revision/history scope

**Evidence:** `UX:116-120`, `UX:193-196`, and `PROTOTYPE:2913` use an item-wide absolute claim. The same item may have an older processed transcript or an unrelated prior enrichment result.

**Revision:** Use **AI Brain has not started AI processing for this transcript version.** When dispatch history is durably known and useful, add **No provider request has been made for this version.** Do not use an item-lifetime claim.

### P2-03: The held-state chip "Ready" conflicts with the paused privacy state

**Evidence:** `PROTOTYPE:2913` pairs heading **AI processing is paused** with chip **Ready**. `COUNCIL:198` allows **Ready to enrich** or **AI paused**, but bare **Ready** can be read as output readiness.

**Revision:** Use **AI paused** in the title and held panel. Reserve **Ready** for completed digest plus current semantic index.

### P2-04: "Semantic index" is accurate but not sufficient user-facing meaning

**Evidence:** V1 repeatedly asks users to authorize a "semantic index" (`UX:120-145`) while also saying future Ask questions are separate. It does not explain the practical purpose of the index.

**Revision:** Present the stage as **Search index** in primary UI. Supporting copy: **Makes this transcript available to meaning-based search and retrieval. Asking an AI question is a separate action.** Keep `semantic_index` as the internal purpose identifier.

### P2-05: Manual retry copy does not state which provider will be contacted again

**Evidence:** `UX:203-205` uses **Retry enrichment** and **Retry semantic indexing**. The index path correctly says the digest provider will not be called, but digest retry does not restate provider/data scope or whether existing authorization remains valid.

**Revision:** When the exact plan remains valid, show **Retry digest with {provider}** and body **This sends the same bounded transcript input under the plan approved on {date}.** For index-only retry, use **Retry search indexing with {provider}** and body **This resends the full current transcript and saved digest to the approved search-index provider. The digest provider will not be called.** Any material change reopens review rather than offering retry.

### P2-06: The one-time Chrome return receipt has no defined lifecycle

**Evidence:** `MEMO:77-87` and V1 require a transcript-added banner and return focus, but the package does not specify replay, dismissal, refresh, back navigation, or whether an old receipt can repeatedly trigger the banner.

**Revision:** Bind the banner to a server-validated, single-item receipt reference. Show it on the first successful return and safe idempotent refresh, allow dismissal, and stop auto-focusing it after dismissal or after the receipt ages out. Never put transcript/provider data in the URL. Add back/forward and stale-receipt tests.

### P2-07: Provider-unavailable copy conflates user settings and environment policy

**Evidence:** `UX:207` always offers **Open AI settings**, while `PRD:486-493` distinguishes provider unavailable, quota/billing, policy expiry, and feature-disabled states. In a managed Hetzner/research environment, the viewer may not have authority to fix the provider.

**Revision:** Project an allowed recovery action. Use **Open AI settings** only when the current user can change the configuration. Otherwise use **AI processing is unavailable** with **The transcript remains attached. The Brain administrator must restore the approved provider plan.** Do not expose billing or endpoint details to unauthorized viewers.

### P2-08: The 12,000-character digest cap is disclosed but its quality consequence is underplayed

**Evidence:** `PROMPTS:43` enforces a 12,000-character maximum. `UX:141` and `UX:177` state the number, and `UX:235` avoids "complete video summary," but the user is not told this means the beginning of a long transcript rather than representative coverage.

**Revision:** Use **The AI digest uses only the first 12,000 transcript characters; later parts of a long video are not summarized in P0. The search index uses the full transcript.** Retain the Council's follow-up to replace prefix-only summarization. Add a long-transcript scenario so the limitation is visible before authorization.

### P2-09: The comprehension gate is defined as reviewer agreement, not user comprehension

**Evidence:** The Council/PRD requires a five-of-five review but does not define participant profile, questions, failure threshold, or whether reviewers can distinguish Add, remote digest, full-text index, and future Ask.

**Revision:** Define a short moderated protocol. A participant passes only if, without hints, they can answer: what Add did; whether processing has started; which destination receives bounded versus full text; what is excluded; whether Ask is authorized; and what cancel does. Record answers and revise any copy missed by more than one of five representative users. Council-member inspection remains a separate design QA gate.

## P3

### P3-01: Prototype scenario tabs lack complete tab semantics

`PROTOTYPE:2484-2494` uses `role="tablist"` and `role="tab"`, but the harness does not expose associated tab panels or documented arrow-key behavior. Either implement the complete ARIA tab pattern or make these ordinary toolbar buttons with `aria-pressed` for the active scenario.

### P3-02: The prototype's icon dependency weakens offline/research reproducibility

The prototype loads Lucide from a remote CDN while claiming an offline-friendly inert artifact. Bundle the small icon set, use installed assets, or guarantee text-first fallback with layout tests. Icons must remain decorative when adjacent text names the state.

### P3-03: Several labels use visual status as a substitute for precise state

Generic **In progress**, **Complete**, and **Ready** labels in the prototype reduce scan value. Use the exact stage terms from the read model and keep color/icon secondary to text.

## What V1 Changes Or Gets Wrong Relative To The Original Designer Memo

### Preserved correctly

1. Inspect and Add remain extension-owned, while AI processing remains Brain-owned (`MEMO:12-22`; `COUNCIL:16-24`).
2. The extension success copy explicitly says AI enrichment has not started (`MEMO:18`; `PRD:200-220`).
3. The persistent action belongs in AI Digest, not Transcript or a transient banner (`MEMO:40-44`; `PLAN:646-651`).
4. Opening the item, selecting Digest, or opening review does not authorize processing.
5. Current transcript revision and provider plan are intended to bind the action.
6. Production browser capture restrictions remain honest and separate.

### Material deviations that V1 does not yet justify or validate

1. `MEMO:20`, `MEMO:52`, and `MEMO:161-179` recommend one adjacent, provider-named explicit click without a modal. V1 adds a remote review dialog/sheet and a second click. This can be the better design for two remote stages and full-text indexing, but V1 does not prototype or test it.
2. `MEMO:22` and `MEMO:302-336` make the post-transcript processing gate source-agnostic. V1 narrows P0 to browser-visible transcripts and preserves automatic scheduling elsewhere.
3. `MEMO:48` requires destination-aware action copy. V1's remote entry action and final consent action name no provider, even when both provider rows are visible.
4. `MEMO:56-60` requires exact state and transcript-version truth. V1's prototype marks Starting as Queued and uses revision-insensitive provider copy.
5. `MEMO:226-248` includes provider unavailable, network failure, retries, terminal error, session expiry, stale digest, and in-flight conflicts. Most are absent from the prototype harness.
6. `MEMO:340-358` sets 320 px, 200% zoom, 44 px touch, `aria-describedby`, focus-return, and high-contrast requirements. The current prototype fails several measurable checks.

### New V1 decisions that should remain, after correction

1. Digest and semantic indexing are separate processing stages with separate provider disclosure.
2. Index-only retry must not call the digest provider again.
3. Interactive user-authorized work must not enter a nightly batch.
4. Durable receipt precedes Queued.
5. Remote review can remain a dialog/sheet because the dual-stage disclosure is materially denser than the original memo assumed, provided the prototype and comprehension evidence validate it.

## Missing Validation

### Consent and policy tests

- Every authorization-plan field mutation invalidates an old click.
- Exact sent/not-sent disclosure is generated from the same canonical object used for authorization.
- OpenRouter downstream identity and fallback unknown states fail closed.
- Local endpoint classification fails closed when loopback/locality cannot be proven.
- Authorization expiry and source delete-by are checked at authorization, every dispatch, and every apply.
- No provider request occurs on panel render, tab selection, review open, review close, return from Chrome, or transcript Add.

### Idempotency and recovery tests

- Response loss before and after atomic commit.
- Same mutation replay from the same tab, second tab, reload, and new session.
- Same mutation with changed body returns mismatch and never mutates.
- Two valid mutation IDs converge on one job and one visible outcome.
- Provider plan changes during unknown-outcome recovery.
- Client crash after final consent and before UI receives `202`.

### Stage and stale-result tests

- Transcript replacement before claim, during digest, between stages, during embedding, and before each apply.
- Provider plan drift at the same boundaries.
- Old batch result and old realtime result arrive after a new revision/generation.
- Digest succeeds and index fails; index-only retry preserves digest and never calls digest provider.
- Existing chunks from an old revision cannot cause `EMBED_PIPELINE:71-79` to short-circuit a new revision as successful.
- Existing batch behavior that keys provider work by item ID (`BATCH:92-100`, `BATCH:222-277`) is eliminated or guarded by opaque attempt aliases and exact revision/generation checks.
- Current enrichment title mutation is removed for this path; `ENRICH_PIPELINE:153-268` and batch apply must preserve the user-visible item title.

### UI and content tests

- Every effective state has exact heading, body, action, pill, live-region behavior, and focus behavior.
- Complete output includes category, three-paragraph digest, key quotes, topics, provider, and revision.
- Partial index failure preserves the complete digest and labels only the index as failed.
- Old digest never flashes as current after source replacement.
- Ask/Search/Related do not consume stale or partially invalid current-version chunks.
- Chrome return preserves item identity and existing mobile query/tab behavior.
- Receipt banner lifecycle passes refresh, back, forward, duplicate return, dismissal, and expiry.

### Responsive and accessibility tests

- Real item shell at 320, 360, 390, 768, 1024, 1080, and 1440 CSS px.
- 200% zoom with no horizontal scroll or clipped provider/model/action text.
- Real desktop dialog and mobile sheet, including long content scroll.
- Exactly one mounted authorization action and no duplicate IDs.
- Keyboard-only full Inspect -> Add -> return -> review -> consent -> recovery journey.
- Focus does not land on consent after Chrome return; cancel returns to invoker; completion does not steal focus.
- Screen-reader announcements occur once per durable transition and never on unchanged polls.
- Reduced motion uses static status; high contrast preserves boundaries and focus.
- Touch targets are at least 44 by 44 CSS px.

### Migration and compatibility tests

- Migration 026 dependency is present and attested before this feature migration runs.
- Production-shaped snapshot rehearsal proves holds, job reconstruction, attempt history, vector/chunk integrity, and no auto-claim for held rows.
- The generation sequence cannot reset or reuse a prior identity.
- Old enrich-route caller inventory is complete before any `410` behavior ships.
- Feature flags off leave transcript reading/export intact and do not strand a released claimable job.
- Rollback disables authorization, claim, and apply without relabeling already-sent work as unsent.

## Exact V2 Revision Inputs

## 1. Product Council V2 decisions

Add or replace Council decisions with the following:

| ID | Required V2 decision |
| --- | --- |
| `D-V2-01` | Inspect, Add, and AI Processing are three separate boundaries. A processing authorization covers exactly the displayed transcript revision, ordered processor stages, data scopes, outputs, retention terms, and expiry. |
| `D-V2-02` | Use one canonical authorization-plan fingerprint. Stage fingerprints may support execution but cannot substitute for the full user-reviewed authorization identity. |
| `D-V2-03` | Any remote stage uses **Review AI processing** followed by one final **Agree and queue AI processing** action in a real dialog/sheet. Opening/canceling is navigation only. All-local uses one adjacent **Enrich on this Brain** action. |
| `D-V2-04` | Adopt a generic held-transcript eligibility model across approved transcript sources. Browser capture approval remains separate. If rejected, explicitly rename and constrain the feature. |
| `D-V2-05` | Add `authorization_outcome_unknown`; no transport error may imply no provider activity without durable proof. |
| `D-V2-06` | Provider/content conflict copy is stage-aware and discloses already-started dispatch under the accepted plan. |
| `D-V2-07` | Retention has three separate authorities: Brain source delete-by, provider handling terms, and authorization expiry. Every dispatch/apply enforces them. |
| `D-V2-08` | **Queued** appears only after a durable accepted receipt or recovered replay. **Authorizing** is a separate state. |
| `D-V2-09` | Keep the current mobile item IA; the return selects the existing Digest tab and preserves the other tabs. No duplicate action is mounted. |
| `D-V2-10` | Prefer a new run-oriented endpoint; remove or deprecate the legacy route only after a caller inventory and compatibility plan. |

## 2. PRD V2 edits

1. Replace the browser-only P0 scope with the source matrix described in P1-01, or explicitly rename the feature and state the excluded user impact.
2. Make the canonical authorization-plan fields from P0-01 functional requirements, not implementation notes.
3. Add the transport-ambiguity and stage-aware provider-drift states and copy.
4. Separate source retention, provider retention, and authorization expiry.
5. Add exact receipt-banner lifecycle and mobile return requirements.
6. Add a requirement that all displayed disclosure text is derived from the same canonical plan object whose hash is authorized.
7. Add a requirement that no stale digest/chunks feed Ask, Search, or Related.
8. Replace `ME-F17` with structured state/stage facts sufficient to prove dispatch history, retry, expiry, and cancellation.
9. Add compatibility acceptance for legacy enrich-route callers.
10. Add measurable comprehension questions, viewport criteria, duplicate-ID checks, and the missing deterministic scenarios.

## 3. Implementation Plan V2 edits

1. Replace resettable `items.enrichment_generation` with a strictly increasing sequence plus nullable current-applied generation.
2. Expand the immutable receipt to include the canonical authorization-plan fingerprint, policy/consent versions, authorization expiry, and accepted stage scope.
3. Bind jobs and attempts to the canonical plan and stage-specific execution projection.
4. Add stage dispatch facts needed for honest copy without storing transcript/provider payloads.
5. Add a mutation-receipt recovery read path and `authorization_outcome_unknown` client logic.
6. Recompute authorization/policy at authorization, claim, dispatch, and apply. Define exact behavior for a provider response arriving after expiry or deletion.
7. Prefer `/enrichment-runs`; include old-route inventory/deprecation if a route migration occurs.
8. Make held scheduling generic for approved transcript sources; remove `legacy_scheduled` auto-processing where the product promise applies.
9. Explicitly restructure the item page for tablet and share one Digest component without mounting duplicate commands.
10. Preserve all existing mobile tabs and query semantics.
11. Remove title mutation from this path and version chunks/vectors by source revision and enrichment generation.
12. Expand deterministic failure injection to the missing commit/dispatch/expiry/deletion boundaries.

## 4. UX Specification V2 copy replacements

| State/surface | V2 heading | V2 body/action |
| --- | --- | --- |
| Held | **Transcript added. AI processing is paused.** | **AI Brain has not started AI processing for this transcript version.** Action: local **Enrich on this Brain** or remote **Review AI processing**. |
| Remote review | **Review AI processing for this transcript** | Show exact item/revision, both stages, bounded/full data, outputs, exclusions, retention, expiry, queue behavior. Actions: **Agree and queue AI processing** / **Keep AI processing paused**. |
| Authorizing | **Authorizing AI processing** | **Securing this transcript version and recording your choice.** No Queued marker. |
| Unknown outcome | **Checking whether AI processing started** | **Brain did not receive a clear response. Do not approve again yet. We are checking the original request.** |
| Confirmed pre-commit denial | **AI processing did not start** | **No provider request was created. Review the issue and try again.** |
| Queued | **AI processing queued** | **Your choice was recorded. You can leave this page.** |
| Digest running | **Creating AI digest** | **{Provider} is processing the approved bounded input for this transcript version.** |
| Index running | **Digest ready. Building search index** | **{Provider} is processing the full current transcript and saved digest. The digest provider will not be called again.** |
| Pre-dispatch provider drift | **AI provider details changed before processing** | **The queued job is paused. No provider request was started. Review the updated plan to continue.** |
| Between-stage provider drift | **Digest ready. Search indexing is paused.** | **The digest provider will not be called again. Review the updated search-index provider before sending the full transcript.** |
| Index partial failure | **AI digest ready. Search indexing needs attention.** | **The digest remains available. Retrying search indexing resends the full transcript and digest only to the approved index provider.** |
| Authorization expired | **AI processing approval expired** | **Processing is paused. Review the current providers, data scope, and retention terms before deciding again.** |
| Complete | **AI digest and search index ready** | **Created from transcript revision {revision} with {digest provider} and {index provider} on {date}.** |

Replace user-facing **semantic index** with **search index**, while retaining the internal purpose name. Replace bare **Ready** in a held state with **AI paused**.

## 5. Prototype V2 edits

1. Preserve the complete existing item tab set and actual query-driven Digest selection.
2. Render one Digest action component, not hidden desktop/mobile copies.
3. Implement the real remote dialog/mobile sheet from one component.
4. Add exact item/revision, OpenRouter downstream/fallback, retention/delete-by, authorization expiry, and provider-stage scope.
5. Link the final button to the disclosure with `aria-describedby`.
6. Add the full output contract and partial-index state.
7. Correct Authorizing versus Queued.
8. Add all scenarios listed in P1-06 as direct deterministic entries.
9. Remove fixed 390 px overflow and meet 320 px/200% zoom requirements.
10. Add a visible state-inspection/debug panel outside the product frame showing synthetic receipt, revision, plan fingerprint suffix, dispatch stage, and focus target. Keep it clearly labelled prototype-only.

## 6. V2 acceptance criteria

V2 is acceptable for implementation planning only when all are true:

- [ ] Every P0 finding has a corresponding Council decision, PRD requirement, implementation contract, UX copy, and automated test.
- [ ] The canonical authorization-plan fingerprint covers every user-visible material term.
- [ ] Response-loss recovery never claims no processing without durable proof.
- [ ] Provider/content conflict copy is selected from stage dispatch facts.
- [ ] Retention/expiry behavior is executable at every dispatch/apply boundary.
- [ ] Source scope is resolved rather than silently split between manual and automatic privacy models.
- [ ] Prototype remote review is the actual dialog/sheet interaction.
- [ ] Prototype matches the actual mobile tabs and desktop/tablet structure.
- [ ] Exactly one authorization control exists in the DOM.
- [ ] Authorizing and Queued are visibly distinct.
- [ ] Complete and partial output match the PRD.
- [ ] All missing error, race, expiry, deletion, and accessibility scenarios are directly exercisable.
- [ ] 320 px, 200% zoom, keyboard, screen reader, reduced motion, high contrast, and focus-return checks pass.
- [ ] Migration 026 and production-shaped migration rehearsal remain hard prerequisites.
- [ ] Production browser capture remains blocked independently of manual-enrichment UI readiness.

## Go / No-Go

### V1 package

**NO-GO for implementation approval.** It is not yet internally consistent enough to serve as the implementation contract, and its prototype does not validate the chosen remote consent experience.

### V2 design work

**GO** to revise the package and prototype using the inputs above.

### Inert fixture/lab prototype

**CONDITIONAL GO** provided it remains synthetic, performs no provider call, stores no transcript, and cannot be mistaken for production approval.

### Production browser capture or production manual processing of browser-derived transcripts

**NO-GO remains unchanged.** This review does not clear browser capture, YouTube session handling, manifest, legal, retention, migration 026, worker-containment, or production evidence gates.

## Required Plan Revision Inputs

### Deletions or replacements

- Delete the claim that the existing narrow provider fingerprints constitute the reviewed consent snapshot.
- Delete all unconditional **Nothing was sent** copy from transport failures and generic provider-change states.
- Delete the rule that a supposedly monotonic generation resets to zero.
- Delete the two-tab mobile simplification from the product UX specification and prototype.
- Delete bare **Ready** from held/paused state.
- Replace the inline remote review prototype with the specified dialog/sheet.
- Replace fixed 390 px simulated-mobile width with a responsive constraint.
- Replace the unproven immediate `410` endpoint removal with a new-resource or measured deprecation plan.

### Additions

- Canonical full authorization plan and fingerprint.
- Stage dispatch history and stage-aware conflict copy.
- Authorization-outcome-unknown recovery.
- Executable retention/expiry lifecycle.
- Generic held-transcript source policy or explicit product-scope rename.
- Strictly increasing generation identity.
- Real item IA and one mounted Digest action.
- Full output and partial-success fidelity.
- Missing deterministic prototype/test scenarios.
- Defined receipt-banner and return-focus lifecycle.

### Validation evidence required before V2 approval

- Field-mutation consent-fingerprint test matrix.
- Commit/response-loss/idempotency recovery test matrix.
- Provider/content drift at every stage boundary.
- Clock-controlled retention/expiry tests.
- Production-shaped migration and queue-containment rehearsal.
- Browser E2E evidence at required breakpoints/zoom and accessibility modes.
- Moderated comprehension results for Add versus AI processing and bounded versus full-text destinations.
- Legacy endpoint caller inventory and disposition.

### No-go conditions

Do not approve V2 for implementation if any of the following remains true:

- a user-reviewed material term is absent from the authorization identity;
- the UI can say nothing was sent after an indeterminate request;
- provider drift copy cannot distinguish pre- and post-dispatch;
- retention expiry can occur without deterministic stage behavior;
- held content is claimable by realtime or batch workers;
- the prototype still substitutes an inline panel for the required remote consent surface;
- duplicate authorization controls or IDs remain mounted;
- the narrowest supported viewport scrolls horizontally;
- browser-only scope and generic manual-enrichment language remain mixed;
- migration 026 or production-shaped rehearsal evidence is absent;
- production browser capture restrictions are softened by implication.

## Residual Risks After V2

1. Prefix-only 12,000-character summarization will remain biased for long videos until representative or full-transcript summarization is implemented.
2. Provider retention and OpenRouter downstream/fallback facts can change outside application code; the plan service needs versioned evidence and fail-closed refresh behavior.
3. "Local" endpoint classification can be wrong behind proxies or tunnels unless network identity is conservatively proven.
4. Browser-derived transcript legality, YouTube policy, account/session handling, and capture reliability remain independent blockers.
5. A two-stage remote consent surface may still be cognitively dense; comprehension testing can reduce but not eliminate that risk.
6. Existing legacy items and automatic enrichment workflows will need an explicit migration/product policy even if new held transcript sources are corrected.
7. Exact stale-chunk exclusion must be verified across Ask, Search, Related, and any background repair path, not only the item detail page.

## Council Recommendation

Proceed to a V2 package, but do not merely polish the current prototype. First correct the authorization identity, unknown-outcome recovery, stage-aware dispatch truth, retention lifecycle, source scope, and generation model. Then rebuild the prototype around the real item information architecture and the actual remote dialog/mobile sheet. Use that artifact to validate exact copy, comprehension, focus, and narrow-layout behavior before implementation approval.

The core experience should remain simple in the user's mind: the transcript is attached; AI processing is paused; the user can see exactly where bounded and full text will go; one deliberate processing decision is recorded; and every later state tells the truth about what has and has not happened.
