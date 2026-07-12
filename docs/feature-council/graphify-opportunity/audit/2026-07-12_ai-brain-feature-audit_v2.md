# AI Brain Feature Audit v2

**Audit date:** 2026-07-12  
**Repository baseline:** `8c1341100b174fe4ca518e6a745c30b9078df21c`  
**Wiki baseline:** `10a3e2b66bffbf362ffc87596d29fa5adb65b9f1`  
**Review addressed:** [AI Brain Feature Audit v1 adversarial review](AI_BRAIN_FEATURE_AUDIT_V1_ADVERSARIAL_REVIEW_2026-07-12_22-48-54_IST.md)  
**Scope:** Current source, tests, configuration, Wiki/history, and protected CI; not a fresh runtime, analytics, or user-research certification

## v2 verdict

AI Brain currently implements an item-centered technical substrate for capture, source quality/provenance, enrichment, tags/topics/collections, chunks/vectors, lexical/semantic/hybrid retrieval, cited Ask, private notes, and deliberate processing. Source inspection establishes intended affordances and implemented mechanisms. It does **not** establish current enablement, adoption, task success, problem frequency, or “highest value.”

AI Brain still does not implement a generalized knowledge graph, persisted semantic item-to-item edge model, multi-hop path query, community analysis, graph API, or graph UI. Two important qualifications now govern council work:

1. A prior reviewed council package, FCP-004 Relationship Graph and Connection Map v2, already chose **Proceed with reduced scope, P2**, with a proof-packet prerequisite. This goal must evaluate or amend that decision, not rediscover it from scratch.
2. `item_semantic_events` is an implemented partial graph-refresh substrate, but only the manual-note producer is implemented/tested and there is no consumer. It is not a complete invalidation bus.

## Adversarial-review disposition

| Finding | Disposition in v2 |
|---|---|
| P1-01 prior FCP-004 package omitted | Closed in “Prior council decision and current delta” below |
| P1-02 `item_semantic_events` omitted | Closed as an omission; exact enum/action coverage and deletion-tombstone limits are recorded. `purged` event assertion remains an explicit non-passing test gap because production-test edits are outside this goal. |
| P1-03 unsupported value claims | Closed: jobs/value are explicitly source-inferred hypotheses; adoption/outcome remain Unknown |
| P2-01 collapsed status axes | Closed by the per-capability [status/evidence ledger](2026-07-12_capability-status-evidence-ledger.csv), including per-axis confidence and verification date |
| P2-02 no coverage closure | Closed for classification and evidence accounting by [surface coverage closure](2026-07-12_surface-coverage-closure.csv) and [capability acceptance/test closure](2026-07-12_capability-acceptance-test-closure.csv); remaining test/runtime gaps stay explicit and non-passing |
| P2-03 browser unlock throttling omitted | Closed in security boundary below |
| P2-04 history manifest inconsistency | Closed in `SOURCE_INVENTORY.md`; PR #22/PR #23 mapping corrected in the discrepancy report |
| P2-05 no graph-input lifecycle contract | Closed as a current-state/no-go contract by [semantic-event and graph-input lifecycle matrix](2026-07-12_semantic-event-and-graph-input-lifecycle-matrix.md), including cascade/tombstone limits; implementation proof remains future work |
| P3-01 local-test root cause overstated | Closed: only observed dependency-resolution failure is retained; protected clean CI remains authoritative |

## Intended jobs inferred from current product surfaces

The following are code-supported intended jobs, not observed outcomes:

| Intended job | Implemented affordance | Runtime/adoption/outcome evidence |
|---|---|---|
| Save material from several channels | Web/clients capture notes, URLs, selected text, PDFs, transcripts | Exact code/tests; live channel availability/adoption Unknown |
| Judge capture fidelity | Quality/method/artifacts/warnings/Needs Upgrade/repair | Exact code/tests; outcome/frequency Unknown |
| Organize retained material | Categories, tags, topics, collections, notes, Processing | Some surfaces flag/readiness gated; adoption/value Unknown |
| Re-find material | FTS, semantic, hybrid, Related | Exact code/tests; current index/provider health and task success Unknown |
| Ask grounded questions | Scoped retrieval, streamed response, citations, chat | Exact code/tests; answer quality/user value Unknown |
| Preserve private context | Attached note with versions, search, optional AI eligibility | Default-off example flags and consent gates; adoption Unknown |

**Council rule:** code existence cannot pass the demonstrated-problem or measurable-value gates. Direct user/runtime/analytics evidence is limited; defer is required if a candidate depends on an Unknown.

## Prior council decision and current delta

### FCP-004 historical record

The June 28, 2026 council package at audited baseline `2b4db954…` records:

- Decision: **Proceed with reduced scope**, priority P2.
- Graph is a derived, rebuildable projection; owner tables remain source of truth.
- Initial nodes: items, tags, collections, source anchors, accepted evidence when available.
- Initial edge taxonomy: `tagged_with`, `in_collection`, `semantically_related`, `cites_anchor`, `supports_claim`, `same_source_url`.
- Required provenance, source quality, staleness/rebuild, filters, graph plus accessible outline/list alternative.
- Explicit non-goals: Neo4j/export, manual graph as truth, collaborative editing, auto tag/collection mutation, large-scale analytics.
- Next action: graph schema/event proof and scale budget before code.
- Package status is planning only; it is not implementation authorization.

Sources: `docs/wiki/Feature-Council-Decision-Log.md:32-40`, `Feature-Council-Project-Tracker.md:43`, and the FCP-004 PRD/UX/Technical v2 pages.

### Current-main delta

| FCP-004 assumption/edge | Current main at `8c134110…` | Delta implication |
|---|---|---|
| `tagged_with` | Manual/auto tags and joins implemented | Deterministic input exists; user vs model origin must remain visible |
| `in_collection` | Manual collections and joins implemented | Deterministic input exists |
| `semantically_related` | Query-time centroid/cosine Related exists | Still no stored/explained edge; threshold/version/staleness proof remains open |
| `cites_anchor` | No FCP-002 anchor owner record | Exclude from any current MVP |
| `supports_claim` | No FCP-003 accepted-evidence owner record | Exclude from any current MVP |
| `same_source_url` | Canonicalization/duplicate policy exists | Relationship semantics versus deduplication need a specific proof |
| Refresh events | `item_semantic_events` added in migration 023 | Partial manual-note producer only; not complete graph invalidation |
| Notes semantics | Attached notes/source-aware chunks/consent implemented behind flags | New possible input but strictly eligibility/consent/version governed |
| Workflow | Processing migration 025 and UI exist behind gates | Operational workflow is not automatically a semantic graph input |
| Runtime/analytics | Protected CI expanded; no general engagement analytics | Technical confidence improved; user-value evidence remains Unknown |

### Binding versus reopenable decisions

Binding safety constraints unless explicitly overturned with new evidence:

- graph remains derived/rebuildable;
- owner records remain source of truth;
- provenance and stale state are visible;
- non-visual accessible alternative is equal, not secondary;
- no Neo4j/export or graph-driven source mutation in initial scope;
- proof packet precedes implementation.

Reopenable through this Graphify council:

- whether any graph feature should proceed at all;
- whether the first wedge should be full map, connection explanation, bounded path, or another narrower capability;
- exact edge types and whether inferred edges belong in MVP;
- schema/event/watermark strategy, algorithms, metrics, and scale budgets.

Graphify research is amendment/validation evidence, not a reason to bypass the FCP-004 proof gate. Direct Graphify integration is separately rejected by the research package.

## Multi-axis capability status ledger

Axes: **Impl** = source completeness; **Entry/gate** = current product/operator entry and default/config gate; **External readiness** = provider/host/index/client dependency; **Runtime evidence** = freshest evidence, not an evergreen assertion; **Value evidence** = adoption/outcome evidence.

| IDs | Capability group | Impl | Entry/gate | External readiness | Runtime evidence | Value evidence |
|---|---|---|---|---|---|---|
| F01–F03 | PIN, bearer auth, device pairing | Implemented | Product/API entry; single-owner/shared-token limits | Host/session/token state required | Dated production evidence; not freshly probed | Unknown |
| F04–F08 | Shell, Library, item detail, bulk actions, export | Implemented | Direct product entries | Browser/device for UX verification | Code/tests; some dated runtime evidence | Unknown |
| F09–F12 | Note/URL/YouTube/PDF capture | Implemented; YouTube has inactive adapter subpaths | Direct/private-client routes | Network/source/provider varies | Code/tests and historical runtime evidence; not all channels fresh | Unknown |
| F13 | Owned-media STT | Inactive | Route deliberately unavailable | Provider absent | Code/test only | Unknown |
| F14–F16 | Capture quality/repair and private clients | Partial-to-implemented | Channel-specific; Review not primary navigation | Client/source/runtime dependent | Code/tests; client distribution/live state not fully fresh | Unknown |
| F17 | Recall scheduled import | Implemented | Host integration | Recall credentials/timer/host | Historical; current host Unknown | Unknown |
| F18 | Recall manual sync | Implemented, feature-flagged | Default off; trusted worker/flags required | Host identity/credentials/units | Merged code/CI; host state Unknown | Unknown |
| F19–F24 | Enrichment, providers, categories, tags, topics, collections | Implemented; topic semantics limited | Product entries; providers required for enrichment | Provider/queue readiness | Code/tests; current provider health Unknown | Unknown |
| F25–F28 | FTS, semantic/hybrid, Related, cited Ask | Implemented | Product/API entries | Vector/provider/index readiness | Code/tests; current index/quality Unknown | Unknown |
| F29–F30 | Attached notes and AI/Related eligibility | Implemented, feature-flagged + consent/policy | Example flags default off | Worker/provider/index readiness | Code/tests and dated release evidence; current flags Unknown | Unknown |
| F31 | Chat persistence | Implemented | Ask history | Provider for new answers | Code/tests | Unknown |
| F32 | Processing | Implemented, feature/readiness gated | Example flags default off | Readiness/host/schema state | Dated production evidence; not freshly probed | Unknown |
| F33–F36 | Workers, backups, observability, hosted release | Implemented operator mechanisms | Operator-only/host | Host/systemd/off-site/provider | Protected CI + dated operations; current host not probed | Operational value not product adoption |
| F37 | Relationship graph/connection map | Planning v2 complete; no production implementation | No route/API/UI | Proof packet absent | No runtime | Historical council hypothesis only |
| F38 | Spaced repetition | Inactive schema/planned product | No entry | No scheduler/service | No runtime | Unknown |

Detailed capability behavior, routes, data, tests, and limitations remain in [feature audit v1](2026-07-12_ai-brain-feature-audit_v1.md) and [traceability](2026-07-12_feature-to-code-traceability.md). This ledger prevents “implemented” from being stripped of gate/runtime/value boundaries.

## Corrected Graphify-adjacent primitive inventory

| Primitive | Current state | Graph relevance | Critical limit |
|---|---|---|---|
| Item/tag/topic/collection joins | Stored | Deterministic nodes/edges | Topic semantics mirror tags and confidence is null |
| Source-aware chunks/citations | Stored | Evidence/provenance references | Not semantic claim truth |
| Related similarity | Query-time | Candidate derived edge score | No stored edge, explanation, path, version, or stale state |
| Capture provenance/quality/artifacts | Stored across DB/artifacts | Eligibility/trust | Artifact bytes outside DB backup and lifecycle differs |
| Note consent/provider policy | Stored/gated | Private semantic eligibility | Consent revocation must invalidate derived data |
| `item_semantic_events` | Schema plus manual-note producer/test | Potential refresh input | No consumer; original/AI/legacy producers absent |
| Workflow events | Stored append-only | Operational history | Not semantic meaning |
| FCP-004 planning package | Reviewed historical plan | Binding safety constraints and prior decision | No proof packet, implementation, runtime, or user-value validation |

## Security and privacy boundary corrected in v2

- Browser PIN unlock has a four-character minimum and no discovered throttle/lockout/durable attempt record in `src/app/auth-actions.ts:64-80`. Bearer API rate limiting in `src/proxy.ts` is a separate control.
- Relationship views can concentrate sensitive titles, notes, people/projects, affinities, and inferred connections. Candidate acceptance must cover unlock/access control, owner scope, redaction, private-note eligibility, deletion, and non-leaking empty/error/diagnostic states.
- No candidate may publish raw titles, URLs, content, local paths, or relationship data in support telemetry or public artifacts.
- A future multi-user graph requires explicit tenant ownership and denial tests; current single-owner auth is not proof of that model.

## Coverage closure and evidence limits

The [surface coverage closure CSV](2026-07-12_surface-coverage-closure.csv) maps every current page, API route, SQL migration, named external client, principal worker/service, and deployment unit to an F-ID or explicit infrastructure classification. The [capability status/evidence ledger](2026-07-12_capability-status-evidence-ledger.csv) supplies per-axis status, confidence, and verification date for all F01–F38. The [capability acceptance/test closure](2026-07-12_capability-acceptance-test-closure.csv) maps positive and critical negative evidence, explicitly marking partial and negative closures. These are accounting controls, not substitutes for runtime, usability, or implementation acceptance.

Protecting tests remain cited in traceability. Exact-baseline protected Product CI run `29200243743` is the full-suite authority: 894/894 tests across 95 suites plus static/build/docs/release gates. The local nested worktree could not resolve a declared dependency; the exact-SHA locked clean install passed. No causal claim about the local module-resolution mechanism is required.

Fresh runtime evidence was intentionally not collected because source/Wiki audit did not require production mutation or access. If a selection materially depends on current flags/provider/index/host state, a separate read-only runtime verification must timestamp each observation. Runtime evidence still would not establish user value.

## Wiki correction conclusions retained

The v1 discrepancy report remains valid:

1. Recall manual-sync planning language is stale after merge; merge, deployment, and enablement must remain separate.
2. Current-main code verification should be added without erasing dated runtime SHAs.
3. Deployment documentation understates protected Product CI.
4. Topic semantics must say current labels mirror auto-tags, confidence is null, and evidence is generic.
5. Dated runtime claims are historical, not live-now health assertions.

Add one further clarification during Wiki publication: FCP-004 is a completed historical planning package with proof gates, not a live feature and not a blank-sheet idea.

## v2 conclusion for council use

This audit is approved as technical and historical input only after pairing it with the research v2 and the following non-negotiable interpretation rules:

- AI Brain has no implemented generalized graph.
- Related similarity and organization joins are substrate, not a graph feature.
- FCP-004 already exists as a reduced-scope historical planning decision; the current council must evaluate its delta and may go, narrow, defer, or reject.
- `item_semantic_events` is partial and cannot provide complete graph freshness.
- Graph data must remain derived, owner-scoped, evidence-bearing, consent-aware, deletable, rebuildable, and accessible without a canvas.
- Implemented code does not prove enabled runtime, adoption, problem frequency, or value.
- An Unknown user-value/trust/privacy/exit gate is non-passing.

## Residual risks carried to council

- Direct user-problem frequency and durable outcome evidence remain insufficient.
- FCP-004 may still be too broad even after reduced scope.
- Relationship precision, sensitive-topic policy, and correction behavior are unproven.
- Complete invalidation/rebuild semantics, realistic scale, and accessible interaction need proof.
- The browser unlock boundary increases the cost of exposing concentrated relationship summaries.
