# AI Brain — Backlog

| Field | Value |
|-------|--------|
| **Document version** | v0.3.1-backlog |
| **Date** | 2026-05-08 |
| **Owner** | Arun |
| **Update cadence** | at every phase kickoff; whenever an item is promoted, deferred, or closed |

> Single source of truth for work that is **not in the active phase plan** but is known-needed, nice-to-have, or idea-captured. Items promoted from here land in `BUILD_PLAN.md` under a phase heading. Items closed here get a strikethrough and a closing commit SHA.

---

## 1. Active deferrals (carried from v0.3.0 → v0.3.1)

| ID | Title | Source | Size | Notes |
|---|---|---|---|---|
| F-207 | Library bulk-select UI (multi-select + batch tag/collection/delete) | v0.3.0 scope | M | Backend primitives exist (`tags.ts`, `collections.ts`, `items.ts`). See [`docs/plans/v0.3.1-polish.md`](./docs/plans/v0.3.1-polish.md) §4. |
| B-301 | Title hyphenation post-processor | v0.3.0 QA finding | S | Qwen 2.5 emits `Growth-Loops-Messy-Draft` from filename slugs. Post-process in [`src/lib/enrich/pipeline.ts`](./src/lib/enrich/pipeline.ts) when hyphens > spaces. |
| F-301 | Wire `CollectionEditor` into item detail | v0.3.0 partial | XS | Component exists at [`src/components/collection-editor.tsx`](./src/components/collection-editor.tsx); page is [`src/app/items/[id]/page.tsx`](./src/app/items/[id]/page.tsx). |
| F-302 | Inline tag editor on item detail | v0.3.1 polish | S | `addTagToItemAction` + `removeTagFromItemAction` already exist in [`src/app/taxonomy-actions.ts`](./src/app/taxonomy-actions.ts). |

---

## 2. Research spikes queued

| ID | Question | Blocks | Priority | Plan |
|---|---|---|---|---|
| R-VEC | sqlite-vec perf at 10k+ chunks on M1 Pro | v0.4.0 | P1 | [`docs/plans/R-VEC-spike.md`](./docs/plans/R-VEC-spike.md) |
| R-FSRS | SRS algorithm choice (SM-2 / FSRS) | v0.8.0 | P1 | — |
| R-CLUSTER | Topic clustering (JS vs Python vs LLM-only) | v0.6.0 | P2 | — |
| R-YT | yt-dlp reliability on YouTube auto-subs | v0.10.0 | P2 | — |
| R-WHISPER | whisper.cpp vs faster-whisper on M1 Pro | v0.10.0 | P2 | — |

---

## 3. Open self-critique findings

25 of 35 findings from [`docs/research/SELF_CRITIQUE.md`](./docs/research/SELF_CRITIQUE.md) remain open. Address opportunistically per phase rather than as a dedicated sprint — capture fix commit SHAs in that file, not here.

---

## 4. Ideas / seeds (not scheduled)

| ID | Idea | Notes |
|---|---|---|
| I-01 | Auto-collection suggestion from enrichment tags | Would sit behind a user toggle; needs R-CLUSTER first. |
| I-02 | Per-item "regenerate enrichment" button | Already safe: `enrichItem` is idempotent. UI work only. |
| I-03 | Export Obsidian vault directly (not just zip) | Requires D-4 (Obsidian vault path) — still open. |

---

## 5. Recently closed

*(none yet — first backlog entry)*

---

## 6. Update rules

1. **Promote:** when an item enters an active phase plan, move its row into that phase's `BUILD_PLAN.md` section and leave a one-line breadcrumb here with a `→ promoted to v0.X.Y` note.
2. **Close:** strike through the row and add closing commit SHA, e.g. `~~F-302~~ Inline tag editor (closed abc1234)`. Move closed items into §5 at next phase rollover.
3. **Defer:** if a planned item is bumped to a later phase, record the new target version and the reason in a nested bullet.
4. **Never delete rows** — history matters for retrospectives.
