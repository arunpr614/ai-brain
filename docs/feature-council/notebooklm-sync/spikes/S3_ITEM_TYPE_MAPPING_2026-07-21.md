# Spike S3 — Item-type mapping

- **Run time:** 2026-07-21 18:20–18:48 IST
- **Gate outcome:** Eligibility uncertain. D-013 permits credential-free work only.
- **Hypothesis:** A pure allowlist mapper can represent currently reachable eligible AI Brain text without exposing raw IDs, hashes, private URLs, Recall identifiers, paths, or capture metadata, and can fail closed for insufficient/unreachable types.
- **Interface/version:** Local Node.js 22.22.3 modules only; mapper `map-v1`; no Google interface.
- **Authorization/scopes:** None. No credential, account, target, network, or production environment used.
- **Synthetic input:** The fixed ten-item catalog in `prototype/synthetic-fixtures.mjs`: note, tokenized generic URL, YouTube URL, extracted PDF, full-text Recall URL, metadata-only Recall note, legacy Telegram type, podcast, EPUB, and DOCX.
- **Expected result:** Fixtures 1–5 produce allowlisted canonical entries; fixtures 6–10 produce explicit no-payload skips. Generic query URL is omitted, YouTube is reconstructed with only `v`, Recall preamble/card/signed URL is removed, and generated summary is labeled.
- **Observed result:** Exactly five `prepared`, one `blocked_policy`, and four `unsupported`. Fixed 256-bit HMAC item vectors and aggregate-source vector matched. Raw ID/hash and all synthetic secret needles were absent from eligible payloads; skipped items made no adapter payload.
- **Command:** `node --test docs/feature-council/notebooklm-sync/spikes/prototype/sync-model.test.mjs`
- **Combined evidence:** 21/21 mapper/model tests passed; 46/46 when run with the durable suite; zero failures or skips.
- **Attempts/retries:** One local execution; zero retries.
- **Created source IDs:** None. Fake/local payloads are not NotebookLM sources.
- **Cleanup:** No persistent remote state. The tests create no credential files; the shared catalog is committed research data.
- **Verdict:** **Pass for credential-free mapping; live Google processing remains inconclusive.**
- **Limitations/next action:** The current product Markdown exporters are intentionally not reused because they expose raw correlators/URLs. If Gate 0 permits a live lane, reuse a subset of the same ten identities rather than creating new synthetic items.
