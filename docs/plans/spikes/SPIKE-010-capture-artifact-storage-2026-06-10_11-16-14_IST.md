# SPIKE-010 — Should Brain Store Raw Capture Artifacts?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-010 |
| **Date** | 2026-06-10 11:16 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Planned 3-5h; actual about 30m |
| **Triggered by** | Recommendation to support reprocessing/debugging capture artifacts |
| **Blocks** | `capture_artifacts` table and artifact file storage |
| **Verdict** | PROCEED-WITH-CHANGES |

## Question

Should Brain persist raw or sanitized capture artifacts now, and what is the storage/backup impact?

## Method

Created spike script:

```text
scripts/spikes/capture-artifact-storage.mjs
```

Created prototype SQL:

```text
data/spikes/capture-artifacts/014_capture_artifacts_prototype.sql
```

The script created a throwaway SQLite DB and wrote artifacts under a timestamped spike directory:

```text
data/spikes/capture-artifacts/run-2026-06-10_11-11-56/
```

It sampled:

- 5 YouTube artifacts
- 5 Substack artifacts
- 3 LinkedIn metadata artifacts

Summary evidence:

```text
data/spikes/capture-artifacts/run-2026-06-10_11-11-56/artifact-storage-summary.json
```

## Evidence

Artifact storage summary:

| Metric | Value |
|---|---:|
| Items sampled | 13 |
| Total artifact bytes before cleanup | 2,224,467 |
| Average artifact bytes per item | 171,113 |
| Max artifact bytes per item | 343,337 |
| Prototype SQLite DB bytes | 16,384 |

Bytes by platform after deleting one YouTube artifact directory:

| Platform | Artifact Rows | Bytes |
|---|---:|---:|
| YouTube | 4 | 3,267 |
| Substack | 10 | 1,254,704 |
| LinkedIn | 6 | 965,774 |

Deletion check:

| Field | Value |
|---|---|
| Deleted item | `yt-public-original` |
| DB artifact rows after item delete | 0 |
| File cleanup strategy | application deletes artifact directory after deleting item |

The DB cascade removed metadata rows, but filesystem files require application cleanup. The script explicitly removed `artifacts/<item_id>/` after item deletion.

## Findings

Artifact storage is feasible for a personal app, but raw HTML should be capped and optional.

YouTube JSON artifacts are tiny. Substack and LinkedIn raw HTML are often 200-350 KB each. That is still manageable for personal use, but it should not silently grow without limits.

Filesystem storage is better than DB blobs:

- SQLite remains small and backup-friendly.
- Large raw HTML does not bloat the main DB.
- Artifact deletion can be managed per item directory.

The design needs clear privacy and backup behavior. Raw HTML may contain page shell metadata, tracking links, or publication/user context. Store sanitized JSON whenever possible; store raw HTML only when useful for debugging/reprocessing and within caps.

## Implementation Recommendation

Proceed with artifact storage in a constrained form:

- Add `capture_artifacts` metadata table.
- Store artifact files under `data/artifacts/captures/<item_id>/`.
- Use relative paths in DB.
- Always allow deleting artifacts with item deletion.
- Store small JSON/XML artifacts by default.
- Store raw HTML only for selected capture types and cap per file/item.
- Exclude cookies, headers, local storage, and session data.
- Decide whether artifacts are included in backup/offsite backup before enabling by default.

Likely files:

```text
src/db/migrations/014_capture_artifacts.sql
src/db/capture-artifacts.ts
src/lib/capture/artifacts.ts
src/db/items.ts
scripts/backup-offsite.sh
```

Suggested starting cap:

```text
max_raw_html_artifact_bytes = 512 KB
max_artifact_bytes_per_item = 1 MB
```

## Risks / Gaps Surfaced

- Filesystem cleanup must be explicit; DB cascades do not delete files.
- Backup scripts currently focus on SQLite snapshots and need artifact policy.
- Sanitization rules are not yet implemented.
- HTML artifacts can include unrelated page shell data.
- Artifact storage should not capture private browser/email/session data without a separate user decision.
