# Capture and Ingestion

Purpose: Explain how content enters AI Brain and how fidelity and provenance are preserved.
Audience: AI agents working on capture, integrations, quality, or repair.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-09; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Entry Paths

| Path | Entry point | Key behavior |
|---|---|---|
| Note | Web form, Android note share, API | Stores user text directly with source attribution |
| URL/article | Web, extension, Android, Telegram | Normalizes URL, deduplicates, extracts readable text and metadata |
| Browser selection | Main-only extension flow | Stores selected user-provided text with URL context |
| YouTube | URL capture | Resolves metadata and transcript state with recovery/provider policy |
| PDF | Web/API/native file share | Validates file, extracts text, and records quality warnings |
| Transcript | User upload or owned-media route | Applies transcript source and ownership policy |
| Telegram | Authenticated webhook | Validates update, enforces chat policy, deduplicates, then dispatches capture |
| Recall | Scheduled/manual guarded runner | Maps external cards through fidelity policy, locks, checkpoints, and reports |

Pinned source anchors: [URL capture](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/capture/capture-url.ts), [capture policy](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/capture/policy.ts), [Telegram dispatch](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/telegram/dispatch.ts), and [Recall importer](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/lib/recall/importer.ts).

## Capture Pipeline

The common flow is source validation, canonicalization, deduplication, extraction, metadata composition, quality classification, persistence, and downstream enrichment. Platform helpers handle Open Graph, JSON-LD, RSS, Substack, LinkedIn, YouTube, and generic Readability extraction.

Capture provenance is separate from content type. For example, a URL may arrive through Android, Telegram, extension, Recall, or the web UI. Preserve both the source URL/type and the client capture source.

## Quality and Repair

Quality is not binary. Items may contain full text, transcripts, metadata-only content, warnings, or failed enrichment. Capture artifacts and metadata cache retain evidence needed for repair and prevent unnecessary refetching. Repair and upgrade paths should be idempotent and should not overwrite better user-provided content with weaker fetched content.

The default branch contains a newer review inbox and transcript-recovery model. The worktree contains a needs-upgrade/repair model and Recall fidelity integration. Do not merge their state machines without explicit reconciliation.

## Recall Safety

Recall has dry-run and apply modes, source mapping, fidelity gates, locks, checkpoints, backup proof, redacted reports, and scheduler controls. Public documentation does not provide executable live/apply instructions. Use current private runbooks and explicit authorization for any live or write operation.

## Common Failures

- Dynamic or protected pages return metadata only.
- YouTube providers return no transcript or trigger cooldown.
- PDFs contain scans or truncated text.
- Duplicate URLs arrive through multiple clients.
- A capture succeeds but enrichment or embeddings fail later.
- Recall scheduler runs but fidelity policy blocks import.

See [Troubleshooting](Troubleshooting) and [Data Model](Data-Model).
