# Card Processing Workflow — Constraints and Opportunities

## Constraints

1. **Single owner, one SQLite store.** Team roles, assignees, permissions, due dates, and collaboration are out of scope.
2. **`items` is canonical.** The existing SRS `cards` table cannot be repurposed.
3. **No workflow/archive substrate exists.** Status history and restore are net-new planning, not UI-only work.
4. **Capture has many channels.** Web, Android, extension, Telegram, Recall, URL, PDF, note, and repair/duplicate paths must share correct defaults.
5. **Taxonomy is already crowded.** Category, generated tags, AI topics, manual tags, and collections overlap; UI terms must be exact.
6. **Library queries are bounded, not board-scale.** The 100-row page cap and second client filter can produce misleading loaded results/counts for a large backlog.
7. **Current item deletion is destructive.** Archive must remain visibly recoverable and separate.
8. **Notes have a stronger trust contract than other mutations.** Workflow must match CAS/idempotency/cross-tab rigor without weakening note recovery.
9. **Mobile navigation is full.** Processing should prove daily value before taking a bottom-nav slot.
10. **Applied SQLite migrations are not down-migrated.** Any later implementation needs additive schema, snapshot rehearsal, flags-off rollback, and integrity checks.
11. **No central product analytics.** Metrics require a content-free event source and explicit timezone rules.
12. **This phase cannot touch production code.** All HTML/CSS/JS must remain isolated in docs prototypes.

## Opportunities

1. **One canonical insert.** A database Inbox default can protect every creation channel, including callers that omit the new field.
2. **Existing card/detail primitives.** Library source rows, quality badges, tag/topic UI, and the canonical item route reduce UX invention.
3. **Strong note precedent.** Generation/version, mutation IDs, 409 snapshots, BroadcastChannel, recovery, and no-store APIs provide proven trust patterns.
4. **Clear product distinction.** Library can answer “what is saved?” while Processing answers “what needs a decision?”
5. **Inbox-first is mobile-native.** A chronological triage list scales better than a miniature four-column board.
6. **Events make useful metrics possible.** First Inbox exit and first Done entry are actionable without rewarding transition churn.
7. **Archive can remain workflow-local.** Knowledge stays searchable/readable while the active processing surface becomes manageable.
8. **Existing filters establish language.** Source/quality filters can be secondary; manual tag and AI topic facets can be introduced explicitly.
9. **Prototype can test scope cheaply.** Drawer vs full route, metric density, legacy cohort onboarding, and mobile board posture can be validated before migration/API work.

## High-risk hypotheses to test

- Whether a truthful all-history Inbox motivates or overwhelms.
- Whether a focused Inbox makes Kanban secondary without disappointing board-oriented users.
- Whether “Processing” is clearer than Workflow, Queue, Board, Tasks, or Backlog.
- Whether users need manual intra-column ranking after deterministic ordering and filters.
- Whether a detail drawer improves triage enough to justify duplicated state.
- Whether archived items remaining in Library/search/Ask is understandable with a badge.
- Whether processed/completed metrics encourage healthy backlog reduction rather than gamification.
