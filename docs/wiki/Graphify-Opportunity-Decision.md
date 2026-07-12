# Graphify Opportunity Council Decision

Purpose: Record the final 2026-07-13 council disposition for Graphify-inspired opportunities and the older FCP-004 plan.
Audience: Product, design, engineering, security, documentation maintainers, and AI agents.
Verified against: AI Brain code baseline `8c1341100b174fe4ca518e6a745c30b9078df21c` and council artifact commit `bad4fbd2af6a480aa8c208324bbb23e7234990a2`.
Runtime evidence through: None; this decision made no runtime change.
Last reviewed: 2026-07-13.
Artifact source commit: `bad4fbd2af6a480aa8c208324bbb23e7234990a2`.
Audited AI Brain baseline: `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Research evidence date: 2026-07-12 through 2026-07-13.
Runtime verification: None; no production feature, dependency, deployment, or configuration change.
Lifecycle: Final decision for the Graphify opportunity council.
Supersedes: The active implementation posture of FCP-004; historical planning evidence remains preserved.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

## Final decision

**DEFER feature selection. Explored / Proposed — not implemented.**

- **Retrieval Evidence Upgrade:** Defer.
- **Organization Hygiene:** Defer.
- **Relationship Inspection / FCP-004:** No-go for current selection; future reopening requires new user-value and proof gates.
- **Graphify production adoption:** No-go for raw runtime, HTTP MCP, viewer, installers/hooks, fork, copied code, or raw artifacts.

No feature was selected. No charter, PRD, UX/UI package, prototype, technical implementation plan, production code, dependency, deployment, or merge is authorized.

## Council process

The council used an audited AI Brain baseline, exact Graphify source/release baseline, two isolated fictional POCs, separate technical/security/license research, v1 adversarial reviews and v2 revisions, and five blind independent evaluations from these perspectives:

- user value and engagement;
- memory, knowledge, and trust;
- platform, data, and architecture;
- security, privacy, and licensing;
- UX and accessibility.

All five used the same frozen packet hash and independently recommended no feature Go. All preferred bounded evidence gathering over feature selection, deferred the two smaller current-surface hypotheses, and rejected the relationship family for the current round.

## Gate result

| Gate | Retrieval evidence | Organization hygiene | Relationship inspection |
|---|---|---|---|
| Demonstrated user problem | Unknown | Unknown | Unknown |
| Clear AI Brain product fit | Pass | Pass | Unknown |
| Meaningful advantage over current behavior | Unknown | Unknown | Unknown |
| Technically feasible MVP | Unknown | Unknown | Unknown |
| Acceptable privacy/security | Unknown | Unknown | Unknown |
| Acceptable licensing/dependencies | Pass only while native/no-new-dependency | Pass only while native/no-new-dependency | Unknown |
| Measurable outcome | Unknown | Unknown | Unknown |
| Clear rollback/exit | Unknown | Unknown | Unknown |

Unknown is non-passing. No candidate has eight Pass gates.

## Conditional evidence action

The council did **not** automatically authorize more research. Current behavior remains the default unless a separate decision accepts all start conditions for a maximum 28-day natural-problem/current-baseline study: named owner, recruitable evidence source or actual-owner diary plan, value-of-information statement, privacy/accessibility/retention protocol, healthy dated baseline, fixed readout, and immediate-no-go fallback.

Prompted task sessions cannot establish natural problem frequency. A recurring job needs at least three unprompted episodes with consequence/severity across two participants or three distinct weeks for the actual single owner. Candidate-specific concept or prototype comparison requires another council authorization after recurrence passes.

## FCP-004 status

The June 2026 FCP-004 package remains a historical planning record. Its former “Proceed with reduced scope” implementation posture is superseded by this decision.

**Current status: Deferred; not active for implementation.**

Retained safety constraints if the family is ever reopened:

- owner records remain source of truth;
- any graph-like state is derived and rebuildable;
- provenance and stale state are visible;
- visual tasks have equal nonvisual completion;
- no Neo4j/export or graph-driven source mutation in initial scope;
- proof packet before code.

## Re-entry conditions

The relationship family may return only after a recurring relationship-inspection job is demonstrated and a separately authorized comparison materially beats Retrieval Evidence Upgrade, Related, selected Ask, grouping pages, and text lists. Only one smallest pair/path/inspector variant may then enter a new proof council.

Any persisted derivative additionally requires complete consent/deletion/watermark/tombstone/replay/gap/rebuild/cancel/failure/cleanup/rollback behavior, representative scale, privacy-safe metrics, named ownership, exact dependency/license/security review, and accessible text-first parity.

## Evidence and status links

- [Graphify research summary](Graphify-Opportunity-Research)
- [Feature Catalog](Feature-Catalog)
- [Ideas and Exploration](Ideas-and-Exploration-Catalog)
- [Historical Feature Council Decision Log](Feature-Council-Decision-Log)
- [Historical FCP-004 PRD v2](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2)
- [Documentation Changelog](Documentation-Changelog)
- [Publication-safe repository artifacts](https://github.com/arunpr614/ai-brain/tree/codex/research-graphify-feature-council/docs/feature-council/graphify-opportunity)
