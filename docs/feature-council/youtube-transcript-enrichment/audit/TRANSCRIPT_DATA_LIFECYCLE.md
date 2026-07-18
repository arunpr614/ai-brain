# Transcript Data Lifecycle and Deletion Audit

**Baseline:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`<br>
**Status:** Current-state audit; not an implementation plan<br>
**Verified:** 2026-07-16

The current schema records a retention class but does not enforce source expiry/revocation across every derived copy. Whole-item deletion has meaningful cascades, but it is not a transcript-specific deletion lifecycle and does not establish backup/log/provider expiry.

## Current copies and controls

| Copy/derivation | Current location/behavior | Whole-item deletion | Source-specific revocation/expiry | Audit finding |
|---|---|---|---|---|
| Uploaded raw file | Multipart bytes buffered in memory; no durable raw-file row observed | Process memory only | None needed after request, but request is buffered before service-level file-size validation | Raw SHA is not retained in transcript-source provenance; pre-buffer limit gap |
| Normalized full transcript | `items.body` | Deleted with item | No source-only executor | Full text deliberately duplicated for legacy search/enrichment compatibility |
| Source/provenance | `capture_policy_decisions`, `transcript_sources` | Item-linked rows cascade; policy/source relationships are not a complete historical retention engine | Status/retention fields exist; no expiry/revocation worker observed | Auto-asserted rights/retention and stored class are not enforcement |
| Timestamped segments | `transcript_segments` | Cascades | Current replacement deletes prior segments and marks sources superseded; no timed expiry | Supersession removes segments rather than retaining a complete version history |
| FTS | `items_fts` triggers mirror `items` | Delete trigger removes row | No transcript-source-only purge | Item-level search only; cannot revoke transcript while retaining metadata item |
| Chunks/vectors | `chunks`, `chunks_rowid`, `chunks_vec` | `deleteItem` explicitly deletes vec rows before cascades | Repair removes old chunks/vectors; no source-retention executor | Vector table is outside FK cascade and relies on application deletion order |
| Summary/quotes/category | Columns on `items` | Deleted with item | Repair clears these fields; no expiry/revocation graph | Chapters are not a current first-class table; all derived text still needs source-aware policy |
| Auto tags/topics | Join tables plus shared tag/topic tables | Item joins cascade; shared labels may remain | Repair removes item auto-tags/topics | Shared taxonomy labels may be harmless, but source-derived association lifecycle needs proof |
| Cards/collections/workflow | Item-linked tables | Mostly FK cascade | No transcript-source-only behavior | Derived card content would be deleted only with the item |
| Enrichment/embedding/transcript jobs | Item-linked queues/attempts | Mostly cascade | Repair resets/deletes some work but does not enact a retention class | Pending/running external calls can race deletion; no provider recall is demonstrated |
| Chat/RAG messages and citations | Chat messages contain content and citation JSON; item-scoped thread is `ON DELETE SET NULL` | General transcript-derived message/citation purge is not demonstrated | None observed | A response can preserve transcript-derived text after source/item deletion |
| Application/error logs | Structured/unstructured runtime sinks | Outside database cascade | No transcript-source expiry demonstrated | Safe-log discipline exists in parts, but end-to-end source linkage/expiry is absent |
| Exports/caches | No complete transcript-specific inventory/executor observed | Not proven | Not proven | Must be explicitly inventoried before production readiness |
| Database backups | Whole database backups | Persist until external backup retention expires | No immediate purge from historical backups | Logical deletion and backup expiry are distinct requirements |
| Benchmark inputs/results | New private research workspace plus publication-safe hashes | Outside product cascade | Governed by benchmark manifest only | Must carry source-specific expiry and never commit restricted complete text/media |
| External provider copies | Possible future enrichment/STT prompts/outputs | Provider-specific | No recall/deletion workflow demonstrated | Requires separate affirmative consent and provider retention/ZDR evidence |

## Current deletion boundary

`deleteItem()` first removes capture artifacts, chunks/vector rows, and certain manual-note citations, then deletes the item so foreign-key/FTS cascades can run. This is a useful whole-item deletion contract. It does not prove:

- revoking one transcript source while retaining the saved YouTube metadata item;
- deletion of derived chat content, logs, caches, exports, or already-sent provider data;
- immediate cancellation/isolation of in-flight workers;
- expiry-driven deletion; or
- historical backup expiry within the applicable source contract.

## Gate 6 requirement

Before current-product readiness can pass, a disposable-database test must enumerate the source graph before import, after import, after enrichment/indexing, immediately after source revocation, after whole-item deletion, and at the declared backup-expiry boundary. Every expected copy must be zero or explicitly retained under a documented rule. Provider calls remain prohibited in this research; their deletion evidence is therefore blocked/not run.
