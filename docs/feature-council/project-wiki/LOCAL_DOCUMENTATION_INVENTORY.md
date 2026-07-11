# Local Documentation Inventory

**Inventory date:** 2026-07-11
**Method:** Recursive file inventory with `.git`, dependencies, build output, caches, coverage, vendor, and generated folders excluded. All remaining files were readable; there were no office documents.

The audit-level file manifest is `LOCAL_DOCUMENTATION_FILE_INVENTORY.csv`. It contains 17,989 relevant file rows after excluding 393 generated `.npm-cache` entries. Rows record source alias, publication-safe relative path or redacted-path hash, type, purpose, evidence role, reliability, feature tags, duplicate/conflict markers, publication-safety decision, exclusion reason, and inspection depth. Publication-candidate rows also retain size, recency, and hash/large-file marker. It records 8,176 byte-identical mappings among non-sensitive rows and 6,236 restricted/excluded candidates. Sensitive rows omit their original name, size, time, and content hash; their hashes are intentionally unavailable for duplicate mapping.

| Supplied folder | Inventory | Primary purpose | Reliability and treatment |
|---|---:|---|---|
| Source 1 — historical Recall app | 14 Markdown files, about 252 KB | Original strategy, feature research, design, and roadmaps | Historical precursor. `PROJECT_CLOSURE.md` confirms zero implementation at closure. |
| `ai-brain` parent container | 12,584 files after generated-cache exclusion, about 4.5 GB before exclusion | Multiple embedded clones/worktrees plus large research programs | Deduplicate by Git commit/path. Never treat the parent as one repository. |
| `ai-brain-feature-council-20260628` | 664 files, about 7.5 MB | Feature Council planning packages and supporting repository snapshot | Planning only; package explicitly states no production implementation. |
| `ai-brain-feature-council-wiki-research-20260710` | 2,273 files, about 61 MB | Earlier wiki research/publication work | Best snapshot of the 2026-07-10 research publication, but predates late Notes releases. |
| `ai-brain-git-main` | 2,454 files, about 1.1 GB | Most recent local application/documentation clone | Strong recent source, but checkout has five unrelated user modifications; use clean worktree instead. |

## High-value sources

- Current code, migrations, tests, and manifests on freshly fetched `origin/main`.
- `docs/wiki/` and `docs/agent-docs/` for the existing agent documentation model.
- Manual Content Notes and Note Focus `README`, validation, release, and adversarial records.
- Feature Council `LIVE_FEATURE_AUDIT`, `FEATURE_GAP_MATRIX`, `FEATURE_COUNCIL_DECISION_LOG`, and v2 packages.
- Select UX v2 evidence only when it has a pinned source revision and publication-safe content.
- Recall exploration material for idea history, not shipped-status claims.

## Duplicate and overlap findings

- `phase2` and `phase2-agent-docs-wiki` share 2,149 paths; 2,145 are byte-identical.
- `Phase3` and `Phase3-note-focus-mode` share 2,410 paths; 2,396 are byte-identical.
- The current clone and wiki-research worktree share 2,273 paths; 2,205 are byte-identical. The important additions are Manual Content Notes, Note Focus, later migrations/review code, and publication records.
- File modification times often reflect copies. Git commit identity and dates are authoritative.

## Conflicts and cautions

- The README's opening product version and `package.json` version lag the current feature set.
- Older agent docs describe main/worktree divergence that later merges resolved.
- Historical migration number `017` was used for different changes in divergent branches; current main contains both with distinct filenames.
- Feature Council PRDs and prototypes are detailed but remain intention evidence.
- Existing wiki production metadata mixes the manual-notes release SHA with the later Note Focus release.

## Publication-safety exclusions

Exclude raw `data/brain.sqlite`, `data/private/`, secrets/configuration handovers, Recall credentials and live diagnostic records, device pairing/logcat output, session summaries, private hosts/identifiers, and executable production-write instructions. Publication may summarize safe behavior without copying private records.
