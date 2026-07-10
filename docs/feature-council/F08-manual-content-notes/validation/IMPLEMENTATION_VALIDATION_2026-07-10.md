# F08 Manual Content Notes - Implementation Validation

**Date:** 2026-07-10  
**Branch:** `codex/manual-content-notes`  
**Integrated production baseline:** merge commit `a50ba82`, including attested source `8178117`  
**Verdict:** PASS for guarded release execution; production enablement still requires the live audit/repair and synthetic smoke sequence

## Automated release gate

| Check | Result |
|---|---:|
| Complete Node test suite | PASS — 785 tests, 92 suites, 0 failures |
| Focused post-adversarial regressions | PASS — 20/20 |
| TypeScript | PASS |
| ESLint | PASS |
| Next.js standalone production build | PASS |
| Dependency audit | PASS — 0 known vulnerabilities |
| Build artifact privacy | PASS — no standalone runtime database |
| Recall scheduler artifact static gate | PASS |
| Recall public-doc privacy gate | PASS |
| Diff whitespace check | PASS |

The existing `unpdf` webpack `import.meta` warning remains unchanged; compilation, TypeScript, page generation, traces, and standalone artifact all complete successfully.

## Capability evidence

- One separately stored canonical Markdown note per item; opening a blank shell creates no row.
- Normalization, 100 KiB UTF-8 limit, content hash, optimistic epoch/generation, exact idempotency, tombstone, explicit recreation, bounded revisions, restore, export, and immediate FTS.
- Per-editor IndexedDB journal with monotonic sequence, 750 ms idle / 5 s maximum autosave, one in-flight request, explicit retry/conflict/recovery, and manual Save.
- Safe Markdown Preview without raw-HTML execution; only `http`, `https`, and `mailto` links remain active; images do not load remote content.
- Separate AI digest/My notes companion surfaces on desktop and a dedicated Notes tab on mobile.
- Exact search returns the parent once with My-notes provenance and bounded plain-text snippet.
- Semantic sources distinguish legacy item context, original content, AI digest, and manual note; Ask and persisted citations keep source kind/version.
- Note-aware Related uses one centroid per item/source with bounded 0.7 baseline / 0.3 manual weighting.
- Provider-named remote consent, synchronous opt-out/delete eligibility, generation-safe background indexing, and explicit vector cleanup.
- UI, write, and semantic worker flags are independently default off; provider processing requires all three.

## No-loss and concurrency evidence

- Same mutation/payload replay succeeds only while its accepted epoch/generation remains current.
- Reusing a mutation ID for a different payload is rejected.
- A delayed replay after a newer save becomes a visible conflict, never a false Saved state.
- Two tabs preserve independent local drafts; a later tab sees the advisory and server CAS opens review with both versions.
- A stale index claim makes zero provider calls; a stale purge cannot delete a newer completed index.
- Editing while a request is in flight produces a new mutation and queued save; explicit Save intent and newest Clear/Recreate/Save operation are retained.
- Delete leaves a durable epoch tombstone; old offline drafts cannot recreate it.

## Privacy and deletion evidence

- Note-bearing JSON, revisions, export, search, and Ask responses are authenticated, dynamic, private/no-store, cookie-varying, and `nosniff` where applicable.
- Mutations require a verified HMAC session and exact same origin through local and reverse-proxy host/protocol resolution.
- No note text is logged by new diagnostics, included in default library export, or stored in citation sidecars.
- Note Delete removes current/revision/FTS state, blocks retrieval immediately, queues physical semantic purge, and removes persisted assistant messages proven to cite the note.
- Ordinary item Delete now removes vec0 rows before relational cascades and also purges note-derived library-thread answers.
- Ask completion rechecks manual citation eligibility so deletion/opt-out during a stream cannot re-persist derived text.

## Browser and responsive validation

- Autosave reached Saved through the real API and local journal.
- Exact note-only search returned one parent labeled `Matched in My notes`.
- Two-tab conflict preserved both versions; Keep this draft resolved through a newer generation.
- Preview rendered headings, task lists, emphasis, strike, quote, code, and safe links; a `javascript:` destination was inert and raw `<script>` remained text.
- Desktop and mobile implementation screenshots were compared with the selected prototype in the same visual review.
- 390 x 844 and 320 x 700 states were checked; the 320 px viewport had no horizontal document overflow and retained 44 px core touch targets.

## Operational evidence

- The live source baseline was attested before implementation and merged without flattening history.
- A WAL-safe production backup was copied byte-exact for rehearsal; its SHA-256 matched the server copy and SQLite quick check passed.
- The untouched snapshot rehearsal applied migrations 021-023, classified the legacy vector/queue anomalies, repaired only the exact approved content-free manifest, and ended safe.
- Production was not mutated during rehearsal. Live rollout remains flags-off until the production audit matches the rehearsed class.
