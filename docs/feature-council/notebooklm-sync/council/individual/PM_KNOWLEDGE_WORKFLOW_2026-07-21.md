# Product Council — Knowledge Management and Workflow

**PM:** Knowledge Management and Workflow
**Decision date:** 2026-07-21
**Independent recommendation:** **Defer** product implementation and any user-facing “sync” promise. Permit only the already-bounded, account-gated official synthetic validation needed to decide whether one lane can re-enter council review.
**Confidence:** **High (0.86)** that a product decision is premature; **medium (0.65)** that Enterprise weekly aggregation can become useful after live validation.
**Revalidate:** **2026-08-21**, or immediately before any official live spike or implementation decision, whichever is earlier.

This memo was prepared independently, without reading or relying on another council member’s recommendation.

## Evidence key

- **[L] Local verification:** observed in the credential-free mapper, durable harness, tests, or deterministic capacity simulation.
- **[O] Official claim:** reported from current Google documentation in the research package; still edition- and account-dependent.
- **[I] Inference:** product judgment derived from the evidence, not observed behavior.
- **[U] Unknown:** requires an applicable account and official live validation. Unknown is not treated as a passing result.

Primary evidence: [focused current-state audit](../../audit/focused-current-state-audit.md), [research synthesis v2](../../research/RESEARCH_SYNTHESIS_V2_2026-07-21.md), [source-mapping matrix](../../SOURCE_MAPPING_MATRIX.md), [capacity model](../../CAPACITY_MODEL.md), [spike register](../../SPIKE_REGISTER.md), and [credential-free harness review](../../reviews/CREDENTIAL_FREE_HARNESS_ADVERSARIAL_REVIEW_2026-07-21.md).

## Decision rationale

The local work establishes a credible safety and durability design, not a useful knowledge workflow. **[L]** The ten-item catalog maps five eligible text items, fails closed on five intentionally unsupported or insufficient-fidelity cases, prevents known identifier/URL leakage, survives the modeled crash windows, isolates poison items, and passes 46/46 local tests. It also demonstrates source-count and character-limit pressure.

The core user value remains untested. **[U]** There is no observation that either candidate preserves item-level retrieval, disambiguates facts across a dense aggregate, produces useful citations, refreshes within an acceptable interval, or avoids stale answers after local corrections/deletions. No Google account, source, Doc, notebook, query, citation, refresh, or cleanup was exercised. The harness review explicitly says the fakes cannot establish those behaviors.

Accordingly:

- **Gemini Notebook Enterprise is the only plausible automated knowledge workflow**, and only as a size-sharded immutable aggregate publisher—not yet as a proven sync. Weekly aggregation is the strongest capacity candidate, but it trades away freshness and item-level source granularity. **[O+I]**
- **Consumer/Workspace is a Drive publishing bridge.** The application can prove that its Doc changed, but cannot prove that NotebookLM ingested the revision. It must never be labeled “synced.” **[O]** At low volume it may be useful to a user who accepts periodic manual verification; at medium/high volume its rotations and source housekeeping become brittle. **[I]**
- **One source per AI Brain item is no-go.** It exhausts every modeled 90-day/year scenario at the documented source limits. **[L+O]**
- **The initial boundary is a published snapshot of new eligible items, not a mirror.** Updates, capture repairs, deletion, and historical backfill are unsupported. **[L]** This distinction is material to user trust, not merely an implementation detail. **[I]**

## Assumptions

1. Gate 0 remains unanswered, so the applicable edition, entitlement, account policy, target occupancy, and manual-workflow tolerance are unknown.
2. The intended experience uses one target notebook; rotating across notebooks is not silently acceptable.
3. The product’s value is reliable retrieval and attribution, not merely successful bytes written to Google.
4. Initial scope remains new eligible items created after connection, append-only, with private attached notes excluded by default.
5. Actual word/character distributions are unknown. Capacity fixtures are conservative planning cases, not a forecast of the user’s library.
6. No new subscription or spend is permitted, and only supported official interfaces are eligible.
7. Google processing fidelity, citations, latency, source visibility, refresh, and cleanup semantics are all unverified for the target account.

## Workflow scorecard

| Dimension | Enterprise size-sharded immutable aggregate | Consumer/Workspace rolling Doc | Evidence and PM assessment |
|---|---|---|---|
| Source text fidelity | **Conditional** | **Conditional** | **[L]** Canonical text, headings, quality labels, safe public URLs, and opaque markers are deterministic. Existing PDFs provide extracted text, not the original binary; full-text Recall can map only after its provenance envelope is stripped. **[U]** Google-side conversion fidelity is unobserved. |
| Retrieval usefulness | **Unknown** | **Unknown** | **[U]** No question/answer retrieval test ran. **[I]** Large heterogeneous digests may dilute relevance or blend adjacent items even when local formatting is correct. |
| Item attribution and citations | **Weak/unknown** | **Weak/unknown** | **[L]** Per-item headings and safe attribution can exist inside the payload. **[U]** No citation was observed to navigate to the correct item section. **[I]** A citation to a weekly digest or mutable Doc is less precise than a citation to a native item source. |
| Daily freshness | **Conditional to weak** | **Unverifiable by the app** | **[I]** Weekly immutable publication can lag by up to one period; daily aggregates exceed the 300-source gross limit over a year without retention. **[O]** Drive updates are observable, but NotebookLM refresh is periodic/on-open/manual and lacks a supported observation interface in the reviewed evidence. |
| Manual “sync now” | **Undefined** | **Conditional** | **[I]** Closing an Enterprise weekly period early fragments sources and changes capacity; merely queuing it does not satisfy “now.” A Drive manual run can update the Doc, but terminal truth is only “Drive document updated — NotebookLM refresh unverified.” |
| Updates and deletes | **Not supported** | **Not supported** | **[L]** AI Brain lacks general content versions and deletion tombstones. **[O]** No Enterprise source-update operation was documented; Drive can update its file, but the MVP intentionally excludes local edits/deletes. Remote content can diverge from AI Brain. |
| Unsupported-type handling | **Locally strong; product UX absent** | **Locally strong; product UX absent** | **[L]** Insufficient-fidelity Recall, legacy Telegram typing, and schema-only podcast/EPUB/DOCX fail closed; poison items do not block later work. **[I]** Users still need visible skip counts and reasons or they will assume broader coverage than exists. |
| Source-count viability | **Good only in a bounded aggregate envelope** | **Low-volume conditional; medium/high brittle** | **[L]** Weekly Enterprise aggregation fits the 1,000-word fixtures within the modeled 235-source usable budget. Rolling Docs rotate on the stricter Docs character ceiling. Actual occupancy and item sizes remain unknown. |
| Maintenance burden | **Material** | **High** | **[I]** Enterprise needs Preview revalidation, retention, exact cleanup, permission checks, and manual handling of inconclusive creates. Drive adds recurring import, refresh verification, rotation, and retain/remove decisions. |
| Truthful user promise | **Potentially “published and processed” after live proof** | **“Drive document updated”; never “synced”** | **[O+U]** Enterprise documents a processing state, but exact mapping/retrieval still needs validation. Drive has no supported NotebookLM freshness proof. |

## Strategy and volume viability

### Enterprise

The best current candidate is a **size-bounded aggregate with a maximum one-week period**, immutable after publication. It should preserve a stable per-item heading, safe title/type/capture time, quality label, optional proven-safe public URL, and the opaque connection marker. That format is locally plausible, but the research harness explicitly does not implement or validate a real aggregate composer. **[L]**

At the deterministic 1,000-word, six-character-per-word, 20%-reserve fixture, Enterprise weekly source counts are:

| Items/day | 30 days | 90 days | 365 days |
|---:|---:|---:|---:|
| 10 | 5 | 13 | 53 |
| 50 | 5 | 13 | 53 |
| 100 | 9 | 26 | 105 |

Those fit the modeled `U=235` usable-source example. **[L]** Daily aggregation requires 365 sources/year in the same fixture and therefore exceeds Enterprise’s documented 300-source gross limit before occupancy/headroom. **[L+O]** At 2,500 words/item and 100 items/day, weekly aggregation needs 261 sources/year, exceeding `U=235` and leaving almost no room under the 300 gross limit. **[L]** Thus “Enterprise weekly works” is valid only inside a measured size, occupancy, headroom, and retention envelope.

Weekly granularity also creates a product conflict: a daily scheduler may discover and prepare items, but NotebookLM may not receive the immutable source until the period closes. A manual request either closes a partial aggregate—raising source count and fragmenting retrieval units—or honestly reports that publication is still scheduled. **[I]** This semantic choice must be resolved before UX can call the action “sync now.”

Selective native URL/YouTube sources could improve direct attribution, but using them routinely restores per-item source pressure and heterogeneous processing behavior. **[I]** They should not enter the MVP automatically; a later, explicitly budgeted “pin as native source” workflow could be evaluated separately.

### Consumer/Workspace Drive bridge

The rolling Doc is viable only when all three are true: volume is low, entry size is small, and the user accepts unobservable refresh plus manual source lifecycle. **[I]** With the 20% reserve and 1,000 words/item, one Doc holds only 13 complete days at 10 items/day, two days at 50/day, and one day at 100/day. Retaining every rotated Doc creates 27, 135, or 269 Docs/year respectively. **[L]** At 2,500 words/item and 100/day, a complete day does not fit and must itself be sharded. **[L]**

For 10 items/day, the modeled rotation burden ranges from roughly seven Docs/year at 250 words/item to 27/year at 1,000 words/item. That may be acceptable only after observed refresh behavior and an explicit user choice. At 50 or 100 items/day, recurring import/removal and source-count growth are operationally brittle. **[I]** Removing old Docs preserves capacity but removes older knowledge; retaining them preserves history but consumes notebook sources. There is no free rolling strategy beyond the Doc character ceiling.

My workflow threshold for reconsidering this lane is: mandatory source rotation no more than monthly, no mandatory daily manual action, and a user-accepted freshness target that the manual observation can consistently meet. **[I]** If the target requires programmatically proven freshness, the Drive lane remains no-go.

## Gaps that could make the workflow misleading

1. **Capture finality is undefined.** AI Brain can repair title/body and enrich content after creation without a general version. **[L]** Publishing immediately can freeze incomplete text or a provisional transcript forever under the append-only boundary. **[I]** A future design needs a publication-readiness barrier or must omit mutable derived fields.
2. **Deletion does not propagate.** A user can remove or correct an AI Brain item while the published source remains. **[L]** The product must say “snapshot published,” disclose retention, and offer exact integration-owned cleanup; “mirror” or “kept in sync” would be false. **[I]**
3. **Aggregate citations may hide item provenance.** Stable headings help local readability, but only live queries can show whether NotebookLM cites the right item rather than the enclosing digest. **[U]**
4. **Freshness state can be overstated.** A successful Drive revision is not NotebookLM ingestion. An Enterprise `COMPLETE` source is stronger but still does not prove useful retrieval or item attribution. **[O+I]**
5. **Coverage can be overstated.** The five skipped fixtures prove fail-closed behavior, not the skip rate in a real library. **[L]** Product status must show eligible, published, pending, skipped-by-reason, ambiguous, and cleanup-pending counts without exposing titles/content.
6. **The aggregate itself is not yet proven.** Tests validate individual canonical entries and lifecycle state, not shard ordering, boundary-item placement, duplicate-free composition, or retrieval across a realistic aggregate. **[L]**
7. **Manual and scheduled semantics are unresolved.** Coalescing and fencing pass locally, but a weekly immutable Enterprise strategy has no defined user promise for a mid-period manual request. **[L+I]**
8. **Maintenance failures can stall knowledge freshness.** Enterprise’s undocumented conclusive visibility horizon makes an ambiguous zero match a manual-reconciliation state; Drive requires human refresh/rotation decisions. **[O+L]** A safe stop is correct engineering but can still be a poor daily workflow.

## Evidence that would change this recommendation

I would move from **Defer** to **Limited-go for a user-facing prototype** only after all applicable criteria pass:

1. **Lane and target confirmed:** Gate 0 identifies the exact edition, entitlement/Preview approval where applicable, a private synthetic target, official local user authorization, and the user’s tolerance for the manual boundary.
2. **Aggregate composer validated locally:** the five eligible existing fixtures are composed deterministically into size-bounded shards with no item omitted, duplicated, or split ambiguously; word/character overhead is included; skip records stay local; raw identifiers and secret needles remain absent.
3. **Retrieval/citation acceptance passes on the official lane:** after supported processing or a manually observed Drive refresh, every eligible fixture’s distinguishing fact is retrievable, paired negative questions do not blend facts between items, and citations navigate to the correct item heading/snippet. Any wrong-item attribution is a fail, not a retry-until-pass result.
4. **Freshness is observed longitudinally:** a short synthetic run records publish-to-usable latency across successive scheduled updates and one overlapping manual request. Enterprise must define period-close behavior; Drive must distinguish file revision time from manually observed NotebookLM freshness.
5. **Ambiguity and cleanup are bounded:** Enterprise can identify exactly one integration-owned source after a potentially accepted create, or the product explicitly stops for manual reconciliation with an acceptable expected burden. Every spike-owned object can be identified and removed without touching user sources.
6. **Capacity is recomputed for the actual plan:** privacy-safe aggregate counts/word/character distributions, current target occupancy, pending deletion, headroom, retention, and expected manual requests demonstrate at least a one-year envelope. If the plan exceeds usable capacity, the workflow must reduce retention or be rejected explicitly.
7. **The user accepts the snapshot boundary:** setup copy states new-after-connection only, supported types only, no backfill, no edit/delete propagation, private notes excluded, and destination cleanup separate from disconnect. The user can see skipped/ambiguous work without assuming the library is complete.
8. **Operational burden meets the selected lane:** Drive requires no more than monthly mandatory rotation and no mandatory daily action; Enterprise has an owner and runbook for Preview changes, permission loss, ambiguous creation, retention, and exact cleanup.

A **Go** recommendation would require evidence beyond the current research goal: stable official interface terms, production-grade credential storage, an implemented outbox/ledger, representative non-sensitive workload validation, monitoring, and release/privacy review.

## Anticipated disagreements

- A reliability-focused PM may regard the 46/46 local tests as enough for Limited-go. I agree they justify a live synthetic spike, but they do not test the knowledge outcome; correct retry behavior cannot compensate for irrelevant retrieval or wrong citations.
- A platform-focused PM may prefer daily Enterprise sources for freshness. Without bounded retention, 365 daily sources exceed the 300-source gross limit in one year, before existing sources and headroom. Weekly aggregation is more viable but must own its latency tradeoff.
- A UX-focused PM may accept the honest Drive status as sufficient. It is sufficient for a publishing bridge, not for “NotebookLM sync.” At medium/high volume, manual refresh, rotation, and retain/remove decisions become part of the primary workflow rather than an edge case.
- A fidelity-focused reviewer may favor native URL/YouTube sources. Those can improve direct attribution, but automatic per-item use reintroduces source-count exhaustion; selective native promotion should be a separately budgeted future workflow.
- Some stakeholders may consider append-only new items a small MVP compromise. I consider it a defining product constraint because capture repairs and user deletions can leave the external knowledge base permanently stale. The interface and name must frame it as publication, not mirroring.

These are anticipated fault lines, not claims about the positions of other council members.

## Final recommendation

**Defer.** The Enterprise aggregate has a credible capacity envelope and the Drive lane has a narrowly plausible low-volume bridge, but neither has yet demonstrated the retrieval, citation, freshness, and maintenance behavior that makes it a trustworthy knowledge workflow. Run at most the applicable official synthetic validation, keep the product boundary “published snapshot of new eligible items,” and reconvene with observed evidence. If Gate 0 remains unresolved or the live lane cannot prove useful attribution and bounded operations, retain manual Markdown as the honest fallback.
