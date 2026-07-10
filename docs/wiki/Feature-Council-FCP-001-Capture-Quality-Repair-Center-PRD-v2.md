# PRD FCP-001 Capture Quality And Repair Center v2

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

Status: v2 final planning package  
Review addressed: [reviews/FCP001_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-001-v1-Adversarial-Review)  
Council outcome: Proceed  
Priority: P0

## Review Response

v2 adds a concrete result taxonomy, channel mapping requirements, repair lifecycle, security/privacy constraints, and release gates for web, API, Android, and extension.

## Goal

Create a trustworthy capture and repair system so every saved item has an understandable quality state, clear repair path, and accurate Ask/search eligibility.

## User Problem

The current app can store captures that are weak, partial, duplicated, stale, or not indexed. Users need to know whether an item is useful for memory and what action will fix it.

## Target Users

- Daily capturer saving web pages, PDFs, YouTube, Telegram, notes, selected text.
- Mobile user sharing from Android.
- Browser user saving page/link/selection with the Chrome extension.

## Scope

### Result Taxonomy

| State | Meaning | Default action |
| --- | --- | --- |
| `saved_full_text` | New item has sufficient body text and is queued/indexed normally | Open item |
| `saved_with_warning` | Item saved but extraction warning exists | Review warning |
| `metadata_only` | Item exists but is not source-complete | Repair |
| `duplicate_existing` | Source already exists and was not changed | Open existing |
| `updated_existing` | Existing item was upgraded or repaired | Open item |
| `failed_no_item` | Nothing durable was saved | Try again |
| `failed_item_saved` | Durable partial item exists after failure | Open repair |
| `repair_running` | Recovery/index reset is in progress | View status |
| `repair_complete` | Source content and derived state are refreshed | Open item |
| `repair_failed` | Repair failed and needs manual action | Paste text / retry / ignore |

### Channels

- Web capture page.
- Capture API responses.
- Android share handler.
- Chrome extension notification and popup/options copy.
- Telegram capture summaries if surfaced.
- Review queue.
- Item Source Health panel.

## Non-Goals

- Offline queue claims unless a queue is actually implemented.
- New ingestion channels.
- Full PDF annotation UI.
- Automatic deletion of user-provided repair text without explicit retention policy.

## User Journeys

1. Save a URL from web. The result says "Saved full text" or "Saved metadata only" with one next action.
2. Share YouTube from Android. The result page shows transcript status and repair options if transcript failed.
3. Save selected text from extension. The extension reports selected text saved and links to the item.
4. Open Review. Filter weak captures, retry transcript recovery, paste text, ignore, or delete.
5. After repair, the item shows refreshed summary, chunks, search eligibility, and repair history.

## Data Needs

- Canonical result DTO returned from capture and repair APIs.
- `capture_quality`, `extraction_warning`, `source_platform`, `capture_source`, and artifact metadata retained.
- Repair attempt history with action, actor/channel, started/completed timestamps, result state, and sanitized error code.
- Derived state invalidation marker for summary, chunks, vector rows, related-item cache, and jobs.
- Ask/search eligibility flags or computed policy based on quality/index readiness.

## Edge Cases

- Duplicate URL where user chooses "save anyway".
- Metadata-only item later upgraded with pasted transcript.
- Repair succeeds but embedding provider is down.
- User deletes item while transcript job is running.
- Android shares multiple PDFs; UI must either support all or truthfully say only first file is handled.
- Extension token expired.
- Enrichment worker and batch mode both active; result must not show conflicting state.

## Acceptance Criteria

- All capture entry points map to the result taxonomy.
- Metadata-only or failed-with-item states never display plain success copy.
- Review queue and item Source Health panel agree on state and actions.
- Repair invalidates and rebuilds derived state transactionally or marks pending rebuild.
- Ask/search can filter or warn on weak/unindexed sources.
- Extension and Android receive parity QA before release.
- Diagnostics/logs use error codes and counts, not raw captured content by default.
- New repair APIs use a shared verified session/bearer guard.

## Analytics / Events

For local/internal analytics only if FCP-005 allows it:

- capture_result_state
- repair_action_started
- repair_action_completed
- repair_action_failed
- ask_excluded_weak_source_count

Events must not include raw URLs, titles, body text, transcript text, query text, or source excerpts.

## Risks And Open Questions

- Should capture orchestration be refactored into a shared service before adding repair flows? Recommended: yes.
- Should realtime enrichment or batch enrichment own repaired items? Required decision before implementation.
- Should repair history be user-visible forever or pruned? Open.
