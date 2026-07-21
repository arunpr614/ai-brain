# AI Brain → NotebookLM Synchronization — Capacity Model

**State:** Public limits and deterministic synthetic scenarios modeled; actual AI Brain volume and average item size remain intentionally unmeasured.
**Verified:** 2026-07-21 against current official Google documentation.

## Projected item volume

| Items/day | 30 days | 90 days | 365 days |
|---:|---:|---:|---:|
| 10 | 300 | 900 | 3,650 |
| 50 | 1,500 | 4,500 | 18,250 |
| 100 | 3,000 | 9,000 | 36,500 |

## Strategy source-count formulas

| Strategy | Approximate sources after `d` days | Principal tradeoff |
|---|---:|---|
| One source per item | `items_per_day × d` | Best traceability; worst capacity pressure |
| Daily digest | `d × shards(items_per_day)` | Predictable cadence; more than one source/day when a digest exceeds a size ceiling |
| Weekly digest | Full weeks plus a remainder, each size-sharded | Lower source growth at modest volumes; larger retrieval units and latency |
| Category daily digest | Sum of the size-sharded category periods | Better segmentation; depends on stable categories and raises source count |
| Rolling document replacement | `Drive shards(all retained items)` rotations/imports | Low live occupancy only if prior NotebookLM sources are manually removed after replacement |
| Rotating notebooks | Per-notebook bounded | Violates the intended single-target experience unless explicitly accepted |

One-source-per-item is not viable under the current limits. Every projection below applies both source-count and applicable per-source size limits; a period is split deterministically when it cannot fit in one source.

## Verified source limits

| Edition/access level | Sources/notebook | File-size cap | Word cap/source |
|---|---:|---:|---:|
| Consumer/Workspace Standard | 50 | 200 MB local upload | 500,000 |
| Consumer/Workspace Plus or More | 100 | 200 MB local upload | 500,000 |
| Consumer Pro / Workspace Higher | 300 | 200 MB local upload | 500,000 |
| Workspace Expanded | 400 | 200 MB local upload | 500,000 |
| Consumer Ultra 20 TB | 500 | 200 MB local upload | 500,000 |
| Consumer Ultra 30 TB / Workspace Highest | 600 | 200 MB local upload | 500,000 |
| Gemini Notebook Enterprise | 300 | 500 MB | 500,000 |

Native Google Docs also documents a 1.02-million-character limit. This independent ceiling applies to the Drive rolling-Doc lane and can bind earlier than NotebookLM's word ceiling.

## One-source-per-item exhaustion

| Source limit | 10 items/day | 50 items/day | 100 items/day |
|---:|---:|---:|---:|
| 50 | 5 days | 1 day | <1 day |
| 100 | 10 days | 2 days | 1 day |
| 300 | 30 days | 6 days | 3 days |
| 400 | 40 days | 8 days | 4 days |
| 500 | 50 days | 10 days | 5 days |
| 600 | 60 days | 12 days | 6 days |

This fails the 90-day and one-year scenarios for every current edition, even at 10 items/day.

## Size-aware aggregate model

Let:

```text
U  = max(0, source_limit - existing_sources - pending_deletion_sources - source_headroom)
Bw = floor(500,000 × (1 - size_headroom))
Bc = floor(1,020,000 × (1 - size_headroom))
```

The deterministic research scenarios use `size_headroom=20%`: `Bw=400,000` words, `Bc=816,000` characters, and six characters per word. Those are planning fixtures, not production measurements.

```text
Enterprise shards(items) =
  max(1, ceil(items × average_words_per_item / Bw))

Drive shards(items) =
  max(
    1,
    ceil(items × average_words_per_item / Bw),
    ceil(items × average_characters_per_item / Bc)
  )

daily_sources(D) = D × shards(items_per_day)

weekly_sources(D) =
  floor(D/7) × shards(7 × items_per_day)
  + (D mod 7 == 0 ? 0 : shards((D mod 7) × items_per_day))

rolling_docs_created(D) = Drive shards(D × items_per_day)
```

At 1,000 words and 6,000 characters per item with the 20% reserve:

| Lane/strategy | 10/day: 30 / 90 / 365d | 50/day: 30 / 90 / 365d | 100/day: 30 / 90 / 365d |
|---|---:|---:|---:|
| Enterprise daily | 30 / 90 / 365 | 30 / 90 / 365 | 30 / 90 / 365 |
| Enterprise weekly | 5 / 13 / 53 | 5 / 13 / 53 | 9 / 26 / 105 |
| Drive daily | 30 / 90 / 365 | 30 / 90 / 365 | 30 / 90 / 365 |
| Drive weekly | 5 / 13 / 53 | 13 / 39 / 157 | 26 / 77 / 313 |
| Drive rolling Docs created if retained | 3 / 7 / 27 | 12 / 34 / 135 | 23 / 67 / 269 |

Size makes `one source per period` false at larger volumes. At 2,500 words/item and 100 items/day, Drive needs two daily shards: 60 / 180 / 730 sources over 30 / 90 / 365 days. Drive weekly needs 56 / 168 / 678; Enterprise weekly needs 22 / 64 / 261.

## Rolling-Doc rotation boundary

The Drive lane rotates before whichever source limit binds:

```text
rotation_days = min(
  floor(Bw / (items_per_day × average_words_per_item)),
  floor(Bc / (items_per_day × average_characters_per_item))
)
```

With six characters per word and no reserve, the maximum number of **complete** days in one rolling Doc is:

| Average words/item | 10/day | 50/day | 100/day |
|---:|---:|---:|---:|
| 250 | 68 days | 13 days | 6 days |
| 1,000 | 17 days | 3 days | 1 day |
| 2,500 | 6 days | 1 day | 0 days |

With the deterministic 20% size reserve:

| Average words/item | 10/day | 50/day | 100/day |
|---:|---:|---:|---:|
| 250 | 54 days | 10 days | 5 days |
| 1,000 | 13 days | 2 days | 1 day |
| 2,500 | 5 days | 1 day | 0 days |

Zero means that one complete day cannot fit and the day itself must be split. Formatting, headings, markers, and future edits consume both budgets. Each rotation requires a manual import on the consumer/Workspace path. Live source count remains nearly constant only if the user also removes or archives the previous source after verifying the replacement.

## Usable source capacity

Gross edition limits are not safe creation limits. Pending deletion remains occupied until terminal absence is proven.

```text
usable_new_sources = documented_limit
  - current_existing_sources
  - pending_deletion_sources
  - reserved_headroom
```

| Limit / existing / pending / reserve | Usable `U` |
|---|---:|
| `50 / 12 / 1 / 5` | 32 |
| `300 / 30 / 5 / 30` | 235 |
| `600 / 599 / 1 / 1` | 0 |

For `U=32` at 1,000 words/item, daily sources fit only the 30-day horizon. Weekly sources fit 10/day through 90 days and 50/day or 100/day through 30 days. Retained rolling Docs fit 10/day through one year and 50/day or 100/day through 30 days. If old Docs are manually removed from NotebookLM only after a verified replacement, live occupancy can remain one, but the manual import/rotation count is unchanged.

For Enterprise `U=235`, one source/item fails even at 10/day for 30 days. A size-aware weekly aggregate fits every 1,000-word scenario above, including 100/day for one year (`105 <= 235`).

The target's current occupancy remains unknown until a supported preflight or manual observation. Stop safely at `needed > U`; do not evict user sources, subtract an unconfirmed deletion, or silently use another notebook.

## Recommended capacity posture

- **Enterprise Preview API:** prefer size-sharded weekly immutable aggregates only if the latency tradeoff is accepted. Daily aggregation reaches a 300-source cap before one year. Preserve headroom for user-created and pending-deletion sources, and delete only by an integration-owned source ID under explicit retention policy.
- **Consumer/Workspace:** maintain one bounded integration-owned Google Doc and rebuild it from the local publication ledger. Rotate before the smaller word/character budget, present the next Doc for one-time manual import, and require an explicit retain/remove decision for the prior source.
- **Multiple-notebook rotation:** not an MVP recommendation because the intended experience specifies one target notebook.

## Evidence limitations

- Google does not document per-method source API quotas or a batch-create maximum.
- Content expansion during conversion can make displayed word counts understate processed size, particularly for XLSX.
- Actual AI Brain item volume and word distributions were not measured because this research goal does not authorize reading or exporting real content.
- Average characters/item, current target occupancy, and the user's retention choice remain unknown.

## Additional official reference

- [Google Drive file-size and Google Docs character limits](https://support.google.com/drive/answer/37603?hl=en)
