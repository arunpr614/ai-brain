# Adversarial Review: Android A4 Topic And Collection PRD v1

Created: 2026-06-16 12:20:00 IST
Reviewed artifact: `UX_v2/features/FEATURE_ANDROID_A4_TOPIC_COLLECTION_PRD_V1_2026-06-16_12-18-00_IST.md`
Reviewer stance: Skeptical product and release review
Verdict: No-go until P1 findings are resolved in PRD v2.

## Findings

### P1 - Empty topic acceptance is not grounded in route behavior

The PRD requires an empty topic route but does not prove that an unattached topic can be addressed by `/topics/[slug]`. If the route filters to attached topics or list navigation never exposes empty topics, the acceptance could become artificial and not representative.

Required revision: define the database fixture mechanism for empty topics and require the route to render an existing topic with zero attached items, not a fake missing-topic state.

### P1 - Scoped Ask acceptance can be satisfied by a link-only check

The PRD says scoped Ask links use existing semantics but does not require rendering the scoped Ask page. A broken query parameter or scope banner regression could pass if the browser proof only checks the href.

Required revision: browser evidence must navigate to both topic-scoped Ask and collection-scoped Ask and assert the correct scope banner labels.

### P1 - Mutation exclusions are too copy-oriented

The forbidden scan can catch visible words, but an icon-only add button or sheet trigger could still appear without matching the copy strings. Topic create-tag and collection add-items are specifically called out as conditional risks in the truth matrix.

Required revision: require browser assertions that populated and empty Topic/Collection pages do not expose create-tag, add-items, plus/sheet, or disabled fake mutation controls.

### P2 - Bottom-nav safe-area acceptance is implicit

The PRD asks for no horizontal overflow but not for fixed bottom-nav clearance. A page can pass horizontal checks while hiding bottom action controls behind the Android nav.

Required revision: require browser metrics for clipped controls and document that any overlap must be fixed or explicitly downgraded.

## Positive Notes

- Scope is appropriately small and follows A3.
- Exclusions align with A0 truth matrix rows A0-COV-028 through A0-COV-031.
- The completion wording correctly avoids APK and production claims.
