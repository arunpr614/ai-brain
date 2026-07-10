# F08 Production Release Validation — 2026-07-10

## Result

**GO — deployed, enabled, production-verified, and synthetic data fully cleaned.**

The hosted application was built from clean source commit `8654f293d0f8615617df883e4703c0ca098a6029`. The application service and existing Recall timer remained active, authenticated health passed, and strict production provider checks passed for Anthropic generation and Gemini embeddings.

## Guarded migration and repair

- A mode-600 SQLite-aware pre-deploy backup passed `quick_check` before migration.
- Startup applied 25 recorded migrations through `023_source_aware_chunks.sql`; `quick_check` remained `ok`.
- The first live content-free audit was exactly `362a10a6e642abedfe937ed2ac5bbc24f5f552ad6eda220603f6b9471983e696`, matching the rehearsed manifest without drift.
- The approved repair removed 44 legacy vec0 rows lacking bridge ownership and two allowlisted stale queue rows.
- Atomic post-repair audit `233e85f3539ff3991dc6dd3c3b715ac1a6e1af7d4192dd76e974e22fb0eb5459` had zero chunks, bridges, vectors, mappings, foreign-key violations, or integrity findings. The monotonic allocator remained at 45.

## Production lifecycle smoke

Two isolated synthetic parent items and attached notes exercised the real authenticated production paths. No existing user item or note was used.

| Gate | Result |
|---|---|
| Note save and canonical generation | Passed for both notes at epoch 1/generation 1 |
| Exact note-only search | Passed; one parent result, manual-note provenance, bounded note snippet |
| Provider disclosure and acknowledgement | Passed for the effective Gemini semantic and Anthropic Ask destinations |
| Opt-in semantic indexing | Passed for both notes at generation 2 |
| Related items | Passed; the second synthetic item appeared for the first |
| Ask | Passed against both note chunks with two manual-note provenance records and two valid citation markers |
| Opt-out and semantic purge | Passed; both notes advanced to generation 3 and manual chunks converged to zero |
| Provider revocation | Passed; zero approved effective providers remained |
| Note and parent cleanup | Passed; both note deletes returned 204 and all synthetic item/note/job/chunk rows were removed |

The first Ask smoke exposed that the stream carried chunk IDs but omitted the already-available source provenance needed by citation chips. Commit `8654f293d0f8615617df883e4703c0ca098a6029` fixed the stream contract, added a regression test, was redeployed, and then passed the production Ask provenance check.

## Final state

- `MANUAL_NOTES_UI_ENABLED`, `MANUAL_NOTES_WRITE_ENABLED`, and `MANUAL_NOTES_WORKER_ENABLED` are enabled.
- Remote note AI is still blocked for real content because both effective provider acknowledgements were revoked after the synthetic test. The first owner opt-in presents the exact provider/model-purpose acknowledgement flow.
- Final content-free audit `0168c4db26d9e1e92ed2dea8ead9738c27957b5e40d989c163b96434c060a90f` reports zero chunks, bridges, vectors, mappings, foreign-key violations, or integrity findings; the safe monotonic allocator is 47 after the two synthetic embeddings.
- Application service, Recall timer, authenticated health, strict provider reachability, SQLite `quick_check`, and foreign-key checks all pass.

## Rollback

The first rollback action is to disable UI, write, and worker flags and restart the service. Schema down-migration is unsupported. The verified pre-deploy backup and owner-only content-free audit/repair reports are retained outside public documentation.
