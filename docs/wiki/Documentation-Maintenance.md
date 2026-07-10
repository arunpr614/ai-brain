# Documentation Maintenance

Purpose: Keep canonical and published agent documentation accurate, safe, and synchronized.
Audience: Documentation maintainers and AI agents changing architecture or features.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-09; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

## Source of Truth

Canonical pages live under `docs/wiki/` in the application repository. The GitHub Wiki is a published copy. Update canonical files first, review them with code, and publish only after checks pass.

## Change Triggers

Review documentation when a change touches routes/actions, migrations/database behavior, authentication/redaction, capture/integrations, queues/providers, search/Ask, package scripts, Android/extension behavior, deployment/backup/scheduling, or feature lifecycle/runtime status.

Feature changes update the coverage ledger. Script changes update the command-safety registry. Baseline changes update page metadata and pinned source links.

Feature Council research pages are generated from `docs/feature-council/` through the versioned manifest at `docs/agent-docs/feature-council-wiki-manifest.json`. Update the source artifacts and manifest, regenerate, then commit the generated `Feature-Council-*.md` pages. Do not hand-edit generated research pages.

## Canonical Validation

```bash
npm run smoke:agent-docs
npm run check:agent-docs
```

The privacy check must scan actual canonical Markdown and fail when no files exist. Structure validates the exact page set, metadata, links, source revisions, tables, and Mermaid fences. Coverage validates inventory classifications, feature status, every package script, and public command safety.

The Feature Council generator check additionally proves one-to-one source mapping, checksums, lifecycle successors, sanitized disclosure state, immutable prototype references, and normalized wiki filenames.

## Publication Sequence

1. Commit and push canonical documentation.
2. Clone the wiki and record its base SHA.
3. Replace its page set from `docs/wiki/` and remove the temporary test page. The expected set is 18 core files plus 44 Feature Council research files.
4. Run privacy and structure checks against the clone.
5. Fetch the wiki remote again and verify the remote SHA still equals the recorded base.
6. Commit and push normally; never force-push.
7. Fresh-clone and rerun checks.
8. Inspect every rendered page, sidebar link, table, code block, pinned source link, Feature Council lifecycle banner, and Mermaid diagram.
9. Record canonical, before-wiki, and after-wiki SHAs in the publication report.

## Rollback

For a public-safety problem, revert the wiki commit immediately with a normal revert, verify the public state, then correct canonical source. For a rendering defect, fix canonical source, rerun all checks, and republish through the same concurrency gate.

## Review Cadence

Run a full audit after major releases and at least quarterly while active. Preserve Unknown runtime state until new dated evidence establishes it. Do not silently refresh a date without rechecking the referenced baseline and evidence.

## Ownership

The AI Brain maintainer owns the baseline record, public/private boundary, feature status vocabulary, publication authorization, and final rendered review. An AI agent may prepare updates but must report unresolved evidence gaps rather than smoothing them over.
