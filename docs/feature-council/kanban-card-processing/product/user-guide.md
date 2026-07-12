# Processing — user guide

**Audience:** AI Brain owner
**Status:** Candidate behavior. The repository Wiki is updated to shipped status only after live production verification.

## What Processing is for

Processing is a focused place to turn captured sources into an intentional backlog. It adds a workflow state without changing the source, its Library membership, tags, AI Topics, content, enrichment, search/Ask eligibility, or My notes.

The four active states are **Inbox**, **To Do**, **In Progress**, and **Done**. Archiving removes a Done source from the active Processing views but does not delete or hide it from the rest of AI Brain.

## Open Processing

- On desktop, choose **Processing** in the main navigation or command palette.
- On mobile, open **More**, then choose **Processing**.
- The Library summary can also open the Processing Inbox.

If Processing is still being rolled out, the page may be unavailable or read-only. Your Library and notes remain unchanged.

## Work through Inbox

1. Open **Inbox**.
2. Choose **Process next**. Nothing is preselected until you ask for the next source.
3. Review the oldest source in its current Inbox episode.
4. Use **Move to** and choose Inbox, To Do, In Progress, or Done.
5. After a confirmed change, Processing advances to the next matching source.

**Leave in Inbox** keeps the source in its current Inbox position. Opening a card uses the existing item-detail page, where you can review or edit My notes independently.

## Review the workload

- **Board** shows bounded groups with a separate Load more path for each group.
- **List** shows the same sources and actions in a compact list.
- **Archived** shows sources archived from Processing and offers **Restore to Done** or **Reprocess to Inbox**.

Use **Group & sort** to group by workflow state, User tag, AI Topic, source type, capture channel, capture quality, capture age, or no grouping. Sorting never changes a source's workflow state.

Use filters for User tags and AI Topics. Multiple selections inside one facet are OR; User-tag and AI-Topic facets combine with AND. **No user tags** and **No AI topics** are explicit choices. Filters stay in the URL, so browser Back/Forward restores context.

## Understand the counts and metrics

- The four status counts are exact for the whole active set, not just loaded cards.
- A filtered count shows how many match while retaining the unfiltered total.
- **Processed Today** counts a source leaving a current Inbox episode through an effective owner action.
- **Completed Today** counts the first effective lifetime move into Done.
- The weekly line shows Processed, Added, and Completed since owner-local Monday.

These are neutral inventory signals, not goals, streaks, or productivity scores. Changing the owner timezone re-buckets the calendar view without rewriting history.

## Undo and permanent reversal

After an effective change, the tab shows one **Undo** action for at least 30 seconds. A later confirmed action in the same tab replaces the earlier Undo target. Another tab or an intervening change can cause a version conflict rather than overwriting newer truth.

If Undo expires or is superseded, use the ordinary controls:

- Move to the desired active state;
- Restore an archived source to Done;
- Reprocess an archived source to Inbox.

These permanent controls are always the accessible equivalent of the timed action.

## Add existing Library sources

New captures enter Inbox automatically. Existing pre-feature sources remain outside Processing until you explicitly add them.

1. Choose **Add existing sources**.
2. Select **Recent captures**, **All existing sources**, or an exact selection carried from Library.
3. Choose **Preview exact set**.
4. Review the frozen count and owner timezone. Nothing has changed yet.
5. Choose **Confirm**.

Large enrollments run in durable batches. You can close the dialog, cancel at a batch boundary, or resume a safely paused job without duplicating completed work.

## Offline and failure behavior

Loaded sources remain readable offline, but Processing changes are disabled and never queued as fake successes. A failed load does not display stale counts as zero. A conflict asks you to refresh current truth. If a response outcome is uncertain, refresh before retrying; the server's durable mutation receipt prevents a confirmed action from being applied twice.

## Accessibility

Every workflow operation has a native button or select; drag-and-drop is not required or enabled. The experience supports keyboard navigation, visible focus, live status/alert announcements, reduced motion, touch targets of at least 44 px on mobile, and the same permanent reversal paths for screen-reader and switch users.
