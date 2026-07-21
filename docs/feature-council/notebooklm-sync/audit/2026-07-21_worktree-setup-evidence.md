# Worktree Setup Evidence — 2026-07-21

## Result

The NotebookLM research package is isolated in a clean AI Brain worktree:

- **Repository:** `https://github.com/arunpr614/ai-brain.git`
- **Branch:** `research/notebooklm-sync`
- **Base/initial HEAD:** `ad78d77495dcaa90f62aab038fe63ae95cf36862`
- **Base subject:** `docs: record Library inbox release (#33)`
- **Base verification:** refreshed `origin/main` and live remote `main` matched on 2026-07-21.
- **Initial upstream:** `origin/main`; first publication must explicitly set `origin/research/notebooklm-sync` as upstream.

## Preservation checks

- The primary Git common directory is owned by a different worktree on `codex/note-focus-final` with five unrelated modified scripts. It was not switched, reset, cleaned, staged, or edited.
- Existing registered worktrees were preserved.
- A stale prunable `/private/tmp/ai-brain-prod-repro-6858529` registration was observed and left untouched.
- No `.env` or other credential file was copied or linked into the research worktree.
- No local or remote `research/notebooklm-sync` branch existed before creation.

## Nested-repository boundary

The requested destination is nested inside a separate dirty `arunpr614/open-brain-web` checkout. That parent reports the entire NotebookLM worktree as untracked. This matches existing Phase 21 sibling-worktree practice but creates a strict operating rule:

> Run all Git operations from the nested AI Brain worktree root. Never use broad stage, clean, reset, or commit commands from the parent `Arun_AI_Open_Brain` repository.

## Branch convention

`AGENTS.md` contains no branch-name mandate. Existing AI Brain branches include `research/youtube-transcript-enrichment` alongside `codex/*`, `feat/*`, `docs/*`, and `concept/*`; the requested `research/notebooklm-sync` name is consistent with current practice.

## Wiki baseline

- The code checkout has no Wiki remote configured.
- Live Wiki `master` resolved to `317e40e8de08fc492e0e2662b5f45b8bb7e48fcd` on 2026-07-21.
- A fresh temporary audit clone reports that commit as `docs: record YouTube transcript research decision`, committed 2026-07-19 03:39:41 +05:30.
- Live Wiki contains 89 Markdown pages; repository `docs/wiki/` at the base contains 86.
- Live-only pages are `Graphify-Opportunity-Decision.md`, `Graphify-Opportunity-Research.md`, and `YouTube-Transcript-Enrichment-Research.md`.
- Thirteen shared pages differ. Therefore final Wiki publication must begin from a fresh clone of live `master`, preserve remote-only history/content, and reconcile the new NotebookLM pages without replacing the Wiki from the stale repository baseline.

This evidence is publication-safe: it omits private account data, credentials, and absolute local paths.
