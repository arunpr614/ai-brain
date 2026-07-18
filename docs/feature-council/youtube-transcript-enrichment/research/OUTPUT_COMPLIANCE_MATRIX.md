# Transcript-Derived Output Compliance Matrix

**Status:** Research classification — no legal/policy approval claimed<br>
**Verified:** 2026-07-18

This matrix prevents “transcript permission” from being treated as blanket permission for every derived copy. `Conditional` means the exact source grant and product purpose must expressly cover the output. `Unresolved` blocks production use until a written determination identifies the governing term/permission.

| Stored/derived output | ACQ-SIDECAR source-published/private input | ACQ-OAUTH official YouTube captions API data | Required evidence/control |
|---|---|---|---|
| Raw uploaded file | Conditional | Conditional, API-data lifecycle | Source/transcript rights; raw-byte hash; retention/expiry; access controls |
| Normalized full text / `items.body` | Conditional | Unresolved | Explicit full-text storage and transformation permission; applicable API refresh/delete rule |
| Timestamped segments | Conditional | Unresolved | Same plus cue/timing provenance, completeness, deletion propagation |
| Quotes/snippets | Conditional | Unresolved | Quotation/republication right, attribution, length/context rule |
| Summary | Conditional | Unresolved | Derivation permission and written API-policy determination |
| Chapters | Conditional | Unresolved | Derivation permission; evidence timestamps; written API-policy determination |
| Tags/entities/topics | Conditional | Unresolved; derived-metrics amendment may be relevant but is not automatic clearance | Additive labeling disclosure, accepted use case/amendment if applicable |
| Embeddings/chunks/vector index | Conditional | Unresolved | Explicit embedding/ML permission, retention, reversibility/deletion, provider transfer |
| Search/FTS index | Conditional | Unresolved | Purpose limitation, retention/deletion, access controls |
| Local-model prompt/output with zero transfer | Conditional | Unresolved | Exact source derivation/ML permission, private processing boundary, model/runtime disclosure, retention/deletion, and no external transfer |
| External-model prompt/output | Conditional on separate affirmative consent and provider posture | Unresolved; Google Limited Use/transfer plus YouTube policy review | Provider, region, retention/training/ZDR, user disclosure/consent, deletion |
| Aggregate reliability metrics | Conditional and publication-safe | Unresolved; amendment/audit may apply | No raw transcript disclosure; denominator/provenance; accepted analytics use if API data |
| Logs/caches/exports/backups | Conditional | Conditional/unresolved | Data minimization, safe logs, immediate logical deletion, separately bounded backup expiry |

An independently supplied original sidecar is analyzed under its source grant; that is an inference about source classification, not permission. Local processing removes third-party transfer but does not create derivation, model-use, storage, or publication rights. A Studio export may still be API/platform-related data and needs a written source-specific determination. Public availability, edit permission, or file possession is insufficient.

Primary sources: [YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies), [derived metrics/storage policy](https://developers.google.com/youtube/terms/derived-metrics-policy), [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), and the exact per-corpus rights sources.
