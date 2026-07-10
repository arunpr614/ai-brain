# AI Brain Agent Documentation and Wiki Implementation Plan

Date: 2026-07-10 IST
Revision: 2
Status: executed 2026-07-10; canonical documentation and GitHub Wiki published
Primary audience: AI agents and engineers working on AI Brain

Execution records:

- Canonical documentation commit: `cc524b23d7dde343751351476efa264f18ceaa95`
- Wiki commit: `dab9267124b55571f03ad56c6776c6827723229a`
- Publication report: `docs/agent-docs/wiki-publication-report.md`

## 1. Outcome

Build a source-backed documentation system that allows a new AI agent to understand AI Brain's shipped, deployed, branch-only, internal, and planned functionality without rediscovering the repository or confusing source presence with production reality.

The documentation system will have three layers:

1. Versioned, public-safe canonical Markdown under `docs/wiki/` in the main repository.
2. Independent GitHub Wiki pages published from that canonical source.
3. Private operational runbooks stored outside the repository and outside the Google Drive-mounted workspace.

The GitHub Wiki is a published projection, not the only copy of the documentation. The tracked `docs/wiki/` files are the reviewable and maintainable source of truth.

## 2. Non-Negotiable Safety Constraints

This documentation project must not perform any production application operation.

Do not:

- Call the live Recall API.
- Read, print, copy, move, rotate, or replace any Recall API key.
- Use any Recall credential supplied in chat.
- Run a Recall apply, checkpoint advance, scheduler change, first-apply path, catch-up path, or live diagnostic.
- Deploy or restart production services.
- Run database migrations, restores, backfills, destructive scripts, or production write paths.
- Run commands merely because their names contain `check`, `smoke`, `status`, or `test`; command safety must be classified first.
- Publish private evidence, private Recall data, credentials, approval strings, production identifiers, or executable production-write instructions.

The existing Recall credential must remain only in the ignored private env file recorded in the project handover. Documentation may refer to that file conceptually but must never inspect or reproduce its contents.

Permitted external operations are limited to:

- Read-only Git and GitHub metadata inspection.
- Fetching/cloning public repository and wiki history.
- Pushing the reviewed documentation commit to the project branch.
- Publishing the reviewed canonical pages to the GitHub Wiki after all gates pass and publication remains authorized by the documentation request.

## 3. Documentation Truth Model

### 3.1 Required Baselines

Documentation must distinguish three baselines rather than treating the checked-out worktree as universal truth:

| Baseline | Purpose | Resolution rule |
|---|---|---|
| Default-branch baseline | Latest merged public source | Fetch `origin`, then record the exact `origin/main` SHA |
| Worktree baseline | Current branch-only or unmerged functionality | Record branch name, HEAD SHA, upstream, and divergence from `origin/main` |
| Production baseline | Last verifiably deployed source | Resolve from the newest trustworthy deployment evidence without contacting production |

If the production SHA cannot be established from existing evidence, record `unknown`. Do not infer it from the newest commit, package version, roadmap, or current branch.

Before inventory work, run only read-only baseline commands:

```bash
git status --short --branch
git fetch --prune origin
git rev-parse origin/main
git rev-parse HEAD
git rev-list --left-right --count origin/main...HEAD
git log -1 --format='%H %cI %s' origin/main
git log -1 --format='%H %cI %s' HEAD
```

Do not merge, rebase, reset, or switch branches as part of baseline collection.

### 3.2 Baseline Record

Create `docs/agent-docs/source-baseline.json` with this public-safe shape:

```json
{
  "generatedAt": "ISO-8601 timestamp",
  "defaultBranch": "main",
  "defaultBranchSha": "full SHA",
  "worktreeBranch": "branch name",
  "worktreeSha": "full SHA",
  "worktreeDivergence": {
    "mainOnlyCommits": 0,
    "worktreeOnlyCommits": 0
  },
  "productionSha": "full SHA or null",
  "productionEvidence": "public-safe repo-relative path or null",
  "productionStatus": "verified or unknown",
  "wikiBaseSha": "full SHA"
}
```

Do not include hostnames, IP addresses, private paths, credentials, or private evidence content in this file.

### 3.3 Feature Status Vocabulary

Every documented feature must carry all three status dimensions:

| Dimension | Allowed values |
|---|---|
| Product status | `Shipped`, `Partial`, `Internal`, `Planned`, `Deprecated` |
| Code status | `Main`, `Branch-only`, `Not found` |
| Runtime status | `Deployed-verified`, `Deployed-unverified`, `Not deployed`, `Unknown` |

Rules:

- Source code alone never proves `Shipped` or `Deployed-verified`.
- A tracker alone never proves implementation.
- A migration or schema table alone never proves a user-facing feature.
- `Deployed-verified` requires dated deployment or runtime evidence tied to a source revision.
- Conflicting evidence must be described, not silently reconciled.
- Every page must state which baseline SHA or SHAs it was verified against.

## 4. Public and Private Documentation Architecture

### 4.1 Canonical Public Documentation

Store canonical public-safe pages under:

```text
docs/wiki/
```

These files are committed with the code, reviewed in normal diffs, and validated in CI. The GitHub Wiki is generated by copying this exact page set into a temporary wiki clone.

Do not hand-edit the GitHub Wiki without making the equivalent canonical change under `docs/wiki/`.

### 4.2 Private Documentation

Store new private runbooks outside the repository and outside the Google Drive-mounted workspace:

```text
~/.config/ai-brain/agent-docs/
```

Required permissions:

```text
directory: 0700
files:     0600
```

Private files:

```text
manifest.json
production-ops.md
recall-sync-ops.md
private-evidence-and-keys.md
```

The private manifest must record document versions, last-reviewed timestamps, the public documentation SHA, and whether an owner-managed encrypted backup exists. It must not contain credentials or secret values.

The initial storage model is explicitly single-machine. A new clone or another machine will not automatically receive these runbooks. Cross-machine access requires a separately approved encrypted or access-controlled storage design; it must not be improvised during this documentation work.

Create a tracked public-safe locator at `docs/agent-docs/private-docs-locator.md`. It may explain the logical document names, expected directory environment variable, permissions, absence behavior, and responsible owner. It must not include secret values, approval strings, private evidence, or live infrastructure identifiers.

If the private directory is absent, public documentation must say `private runbook unavailable on this machine`; it must not guess commands from historical plans.

### 4.3 Public Denylist

Never publish these in `docs/wiki/`, the GitHub Wiki, tracked locator files, execution reports, command output, or commit messages:

- Environment variable values, API keys, bearer tokens, bot tokens, webhook secrets, cookies, session IDs, signed URLs, private keys, one-time codes, or token-like strings.
- Exact dangerous approval strings.
- Private Recall item titles, URLs, IDs, manifests, samples, chunks, payloads, or diagnostic JSON.
- Live host IPs, SSH details, tunnel UUIDs, DNS record IDs, account identifiers, or private infrastructure paths.
- Commands that directly deploy, restore, migrate, apply, backfill, rotate keys, enable schedulers, move checkpoints, or write production state.
- Screenshots or logs containing personal library data or private operational evidence.

Public pages may describe security and operational concepts, gates, failure classes, and read-only verification patterns without executable production instructions.

## 5. Deliverables

### 5.1 Main Repository Deliverables

```text
docs/plans/agent-documentation-wiki-architecture-plan-2026-07-10.md
docs/agent-docs/source-baseline.json
docs/agent-docs/source-inventory.md
docs/agent-docs/feature-coverage-ledger.md
docs/agent-docs/command-safety-registry.md
docs/agent-docs/private-docs-locator.md
docs/agent-docs/wiki-publication-report.md
docs/wiki/*.md
scripts/check-agent-wiki-privacy.mjs
scripts/check-agent-wiki-structure.mjs
scripts/check-agent-doc-coverage.mjs
scripts/smoke-agent-wiki-privacy.mjs
scripts/smoke-agent-wiki-structure.mjs
scripts/smoke-agent-doc-coverage.mjs
.github/workflows/agent-docs.yml
```

The publication report is created only after publication. It records public-safe source, repository, and wiki SHAs plus validation results.

### 5.2 Canonical and Published Wiki Pages

```text
Home.md
_Sidebar.md
Agent-Onboarding.md
Product-Overview.md
Source-Baselines-and-Status.md
Feature-Catalog.md
System-Architecture.md
Data-Model.md
Capture-and-Ingestion.md
Search-RAG-and-Ask.md
Enrichment-and-AI-Providers.md
Mobile-Extension-and-Pairing.md
Security-Privacy-and-Redaction.md
Command-Safety.md
Deployment-and-Operations.md
Agent-Workflows.md
Troubleshooting.md
Documentation-Maintenance.md
```

Remove the temporary wiki test page during publication:

```text
Codex-Wiki-Write-Test.md
```

## 6. Complete Source Inventory and Coverage Ledger

### 6.1 Inventory Scope

Inventory both the default-branch baseline and current worktree baseline. Inspect file contents and wiring, not filenames alone.

The inventory must cover:

- Every `src/app/**/page.tsx` user surface.
- Every `src/app/**/route.ts` API endpoint.
- Every server-action file and exported action.
- Every migration and current table/domain represented by `src/db/**`.
- Every package script.
- Every background worker, queue, scheduler, cron, timer, backup, restore, deploy, repair, and backfill entrypoint.
- Android, Capacitor, extension, Telegram, Recall, auth, capture, search, Ask/RAG, enrichment, embeddings, taxonomy, export, repair, and health tooling.
- Default-branch-only and worktree-only files.
- Planned features named in current trackers that have no source implementation.

Use clean temporary worktrees or `git show` for baseline inspection. Do not modify the active worktree to inspect another revision.

### 6.2 Source Inventory

`docs/agent-docs/source-inventory.md` must contain:

```text
Artifact | Baseline | Kind | Domain | Classification | Feature row | Documentation page | Evidence
```

Allowed artifact classifications:

- `Documented user feature`
- `Documented internal capability`
- `Supporting implementation`
- `Operational tool`
- `Planned only`
- `Deprecated`
- `Excluded with rationale`

Completion requires zero unclassified artifacts in the defined inventory scope.

### 6.3 Feature Coverage Ledger

`docs/agent-docs/feature-coverage-ledger.md` and `Feature-Catalog.md` must use:

```text
Feature | Product status | Code status | Runtime status | User surface | API/action entrypoint | Core modules | Data touched | Jobs/scripts | Verification | Baseline SHA | Known gaps
```

At minimum, reconcile and classify:

- PIN setup, unlock, sessions, bearer auth, origin checks, API versioning, and token rotation.
- Library browsing, filters, selection, bulk actions, review/upgrade inboxes, exports, and item detail.
- Notes, URLs/articles, browser-selected text, YouTube, PDFs, user transcripts, owned-media transcripts, extension capture, Android share, Telegram, and Recall ingestion.
- Platform-specific capture helpers such as LinkedIn, Substack, RSS, metadata extraction, and deduplication, whether user-facing or internal.
- YouTube transcript recovery, provider cooldown/resilience, quality states, repair, and backfill operations.
- Capture artifacts, metadata cache, transcript sources/segments, and fidelity policy.
- Recall dry-run/apply architecture, locking, checkpoints, scheduling, reporting, and current runtime status without live calls.
- Enrichment queues, summaries, tags, topics, categories, retries, and provider status.
- Chunking, embedding jobs, vector storage, FTS, semantic search, hybrid retrieval, and related items.
- Ask/RAG scopes, citations, streaming, chat threads, and message persistence.
- Collections, tags, topics, and taxonomy actions.
- Android APK, pairing, reachability, share results, extension options, and client error reporting.
- Backups, off-site backup concepts, restore architecture, services, timers, health checks, and local status tooling.
- Planned parity features such as spaced repetition beyond schema, generated pages, flows, graph view, and Obsidian integration.

Any apparent feature omitted from the public catalog must still appear in the inventory as internal, supporting, deprecated, planned, or excluded with rationale.

## 7. Command Safety Registry

Create `docs/agent-docs/command-safety-registry.md` before publishing any verification command.

Classify every package script and every direct command recommended in the wiki:

| Classification | Meaning | Public execution guidance |
|---|---|---|
| `R0 read-only local` | Reads source or isolated fixtures only | May appear in the safe-first-command allowlist |
| `R1 network read` | Makes external read requests but does not mutate application state | Document side effects and require intentional use |
| `W1 local ephemeral write` | Writes only disposable test/temp data | Allowed only with exact cleanup and isolation notes |
| `W2 local persistent write` | Changes the developer database, config, generated app assets, or local evidence | Not a safe first command |
| `W3 external/public write` | Pushes Git, GitHub Wiki, webhooks, or another external system | Requires task authorization and final preflight |
| `W4 production write` | Deploys, restores, migrates, backfills, rotates, applies, schedules, or changes production state | Private runbook only; never public as an executable command |
| `Unknown` | Safety has not been proven | Must not be run or recommended |

Hard rules:

- Command names do not establish safety.
- `npm test` and aggregate smoke suites must be inspected before entering the R0/W1 allowlist.
- Public wiki pages may show only R0 commands and carefully described R1/W1 commands.
- W2-W4 commands must not appear as copy-paste public instructions.
- The registry may name a script for classification but must redact exact approvals, credentials, private arguments, and sensitive paths.
- Every workflow page must link to the registry classification for each recommended command.

## 8. Wiki Content Contract

### 8.1 Required Page Metadata

Every canonical page except `_Sidebar.md` must start with:

```text
Purpose:
Audience:
Verified against:
Runtime evidence through:
Last reviewed:
Owner:
```

Unknown runtime evidence must be written as `Unknown`, not omitted.

### 8.2 Required Page Shape

Each page must include, when relevant:

- Current-state summary using the approved status vocabulary.
- Absolute, public GitHub source links pinned to an exact SHA.
- A separate moving-main link only when useful and clearly labeled.
- Data and API touchpoints.
- Commands from the classified safe allowlist only.
- Failure modes, limitations, and unknowns.
- Links to adjacent wiki pages.
- A private-runbook pointer that degrades safely when the runbook is unavailable.

Do not use repository-relative source links from the wiki. Relative links are permitted only between wiki pages.

### 8.3 Page Requirements

`Home.md`

- Provide the agent entrypoint and start-here sequence.
- Explain the canonical-repo versus published-wiki relationship.
- State the public/private boundary.

`Agent-Onboarding.md`

- Explain repository orientation, baseline inspection, dirty-worktree safety, Node/package requirements, and the R0 safe-command allowlist.
- Explicitly prohibit running unknown, production, migration, restore, backfill, deploy, or Recall write commands.

`Product-Overview.md`

- Map user jobs across capture, organize, ask, enrich, sync, mobile, and operations.
- Separate deployed behavior, available source, branch-only work, and future goals.

`Source-Baselines-and-Status.md`

- Publish the baseline model, exact public SHAs, evidence dates, divergence explanation, and status vocabulary.
- Explain why package versions and old README claims are not sufficient release evidence.

`Feature-Catalog.md`

- Publish the complete feature ledger.
- Include zero unexplained inventory entries and explicit missing-test notes.

`System-Architecture.md`

- Cover Next.js, server actions, API routes, SQLite, queues/workers, auth boundaries, clients, integrations, and hosted/runtime concepts.
- Include a Mermaid diagram that is later verified in rendered GitHub Wiki output.

`Data-Model.md`

- Group schema by domain and tie each table to migrations and owning modules.
- Distinguish schema support from shipped product behavior.
- Explain item lifecycle, capture quality, enrichment, embedding, retrieval, and sync state.

`Capture-and-Ingestion.md`

- Cover each classified capture path, deduplication, extraction, quality, artifacts, repair, and ingestion attribution.
- Separate public architecture from private Recall operations.

`Search-RAG-and-Ask.md`

- Explain FTS, vectors, hybrid retrieval, chunking, scopes, citations, streaming, and chat persistence.
- State verification coverage and known retrieval limitations.

`Enrichment-and-AI-Providers.md`

- Explain provider factories, queue behavior, prompts, retries, usage/error logging, summaries, taxonomy, and embeddings.
- List only providers proven wired at the selected baseline.

`Mobile-Extension-and-Pairing.md`

- Explain Capacitor, APK distribution status, pairing exchange, bearer handling, reachability, share flows, extension capture, and failure states.
- Do not publish pairing codes, tokens, private endpoints, or infrastructure identifiers.

`Security-Privacy-and-Redaction.md`

- Explain auth layers, redaction, origin policy, API versioning, token rotation concepts, Telegram verification, public/private boundaries, and the full wiki denylist.

`Command-Safety.md`

- Explain R0-R1 and W1-W4 classifications.
- Publish the safe allowlist and conceptual restricted-operation categories.
- Keep executable production commands and approval strings private.

`Deployment-and-Operations.md`

- Describe architecture, service/timer concepts, backups, restore concepts, health signals, logging, and rollback principles.
- Do not include executable production-write instructions.

`Agent-Workflows.md`

- Provide playbooks for UI, APIs, schema design, capture quality, retrieval, enrichment, Android, Telegram, Recall read-only debugging, and documentation updates.
- Every playbook must identify baselines, files, tests, command classes, stop conditions, and private escalation points.

`Troubleshooting.md`

- Organize by symptoms and include only classified safe diagnostics.
- Cover startup, auth, capture, quality, enrichment, embeddings, Ask, Recall status, Telegram, Android, extension, and wiki publication.

`Documentation-Maintenance.md`

- Define ownership, review cadence, change triggers, canonical edit flow, drift detection, publication workflow, and rollback.

## 9. Validation Tooling

### 9.1 Public Privacy Scanner

Implement `scripts/check-agent-wiki-privacy.mjs` with an explicit path argument and `--require-files`.

Requirements:

- Scan only Markdown source files under the supplied root; exclude `.git`, build artifacts, and binary files.
- Fail when zero Markdown files are scanned.
- Detect credential assignments, common provider keys, bearer tokens, bot-token shapes, cookies, session IDs, signed/tokenized URLs, private key blocks, webhook secrets, suspicious high-entropy assignments, exact dangerous approval text, and prohibited live infrastructure identifiers.
- Support a public-safe allowlist for placeholders and documentation examples.
- Redact matched values in all output; report only file, line, rule, and redacted preview.
- Never read the Recall private env file or private evidence directories.

The smoke test must inject synthetic examples for every rule and prove that failure output does not echo the synthetic secret.

### 9.2 Structure and Link Validator

Implement `scripts/check-agent-wiki-structure.mjs` to verify:

- Exact required page set.
- Removal of the temporary test page.
- Required metadata and sections.
- `_Sidebar.md` links resolve to canonical page files.
- Internal wiki links resolve.
- Source links use the public repository and contain an approved baseline SHA.
- No repo-relative source links are used.
- Mermaid fences are balanced and each diagram has content.
- No empty tables or placeholder markers remain.
- The feature catalog contains the required columns and no blank status cells.

### 9.3 Coverage Validator

Implement `scripts/check-agent-doc-coverage.mjs` to verify:

- Every inventoried artifact has an allowed classification.
- Every documented feature has status, baseline, implementation, and verification evidence.
- Every package script has a command-safety classification.
- Every public command is present in the command registry and is allowed for public guidance.
- Planned or unknown items cannot be labeled shipped or deployed-verified.

### 9.4 Existing Safety Checks

Retain existing Recall privacy checks as defense in depth, but do not treat their default scopes as wiki validation:

```bash
npm run check:recall-public-privacy
npm run check:recall-public-docs-privacy
npm run check:recall-private-ignore
```

The new wiki checks must run explicitly against canonical files and the temporary wiki clone:

```bash
node scripts/check-agent-wiki-privacy.mjs --require-files docs/wiki
node scripts/check-agent-wiki-structure.mjs docs/wiki docs/agent-docs/source-baseline.json
node scripts/check-agent-doc-coverage.mjs docs/agent-docs
```

### 9.5 CI

Add `.github/workflows/agent-docs.yml` to run privacy, structure, coverage, and smoke checks when changes touch:

- `docs/wiki/**`
- `docs/agent-docs/**`
- documentation validation scripts
- application routes/actions
- migrations and database modules
- package scripts
- integration or deployment source

CI validates canonical public documentation only. It must never access private runbooks or credentials.

## 10. Execution Phases

### Phase 0: Safety Preflight

1. Confirm the working tree and preserve unrelated user changes.
2. Confirm no production or live Recall command will be run.
3. Confirm the GitHub repository is public and the wiki remote is the intended destination.
4. Confirm the current GitHub identity has access without changing repository settings.
5. Record the plan file's pre-execution status.

Exit gate: repository identity and no-production-write boundaries are explicit.

### Phase 1: Establish Baselines

1. Fetch remote Git metadata read-only.
2. Record default-branch, worktree, production-evidence, and wiki SHAs.
3. Create `source-baseline.json`.
4. Verify that every later status claim can cite one of these baselines.

Exit gate: no page drafting begins until the baseline record exists and ambiguity is represented as `Unknown`.

### Phase 2: Build Validation Before Content

1. Implement privacy, structure, and coverage validators.
2. Implement synthetic smoke tests, including redacted failure output.
3. Add package script aliases and CI.
4. Prove validators reject missing files, unclassified inventory rows, unsafe public commands, broken links, unpinned source links, and synthetic secrets.

Exit gate: validators fail closed before the documentation corpus is populated.

### Phase 3: Build Complete Inventory

1. Inventory default-branch source in a clean temporary worktree or with `git show`.
2. Inventory current worktree source without changing it.
3. Resolve production evidence from existing public-safe records only.
4. Reconcile every in-scope artifact into `source-inventory.md`.
5. Build the feature coverage ledger and mark omissions explicitly.

Exit gate: coverage validator reports zero unclassified artifacts.

### Phase 4: Classify Command Safety

1. Inspect every package script and recommended direct command.
2. Classify side effects, network behavior, data paths, and approval requirements.
3. Create the R0 safe-first-command allowlist.
4. Keep W4 executable instructions out of public documentation.

Exit gate: every public command resolves to an allowed registry entry.

### Phase 5: Create Private Runbooks

1. Create the private directory outside the synced workspace with mode `0700`.
2. Create files with mode `0600`.
3. Write operational guidance without copying key values.
4. Record source-document versions and review dates in `manifest.json`.
5. Create the tracked public locator and document single-machine limitations.
6. Verify no private file is inside the repository, wiki clone, staging area, or Git index.

Exit gate: permissions, location, manifest, absence behavior, and no-secret content are verified.

### Phase 6: Draft Canonical Wiki Pages

1. Create all pages under `docs/wiki/`.
2. Generate or verify pinned source links against approved baseline SHAs.
3. Populate status dimensions and runtime evidence dates.
4. Add only classified public-safe commands.
5. Link each feature row to implementation and verification evidence or an explicit coverage gap.

Exit gate: canonical privacy, structure, and coverage checks pass.

### Phase 7: Public-Safety and Quality Review

Run:

```bash
git diff --check
npm run typecheck
npm test
node scripts/check-agent-wiki-privacy.mjs --require-files docs/wiki
node scripts/check-agent-wiki-structure.mjs docs/wiki docs/agent-docs/source-baseline.json
node scripts/check-agent-doc-coverage.mjs docs/agent-docs
npm run check:recall-public-privacy
npm run check:recall-public-docs-privacy
npm run check:recall-private-ignore
```

The command registry must classify `npm test` as safe before this phase runs it. If it is not proven safe, replace it with classified isolated tests.

Then manually review the complete staged public diff for semantic privacy leaks that pattern matching cannot detect.

Exit gate: all automated checks pass and manual review finds no denylisted content.

### Phase 8: Commit Canonical Documentation

1. Stage only the plan, canonical public docs, public agent-doc artifacts, validators, tests, and CI workflow.
2. Confirm no private path or unrelated user change is staged.
3. Commit the canonical documentation before publishing the wiki.
4. Push the current documentation branch.
5. Record the canonical documentation commit SHA.

Exit gate: canonical source is durable and publicly reviewable before wiki publication.

### Phase 9: Publish Wiki with Concurrency Protection

Clone the wiki into a new temporary directory and record its base SHA:

```bash
wiki_tmp="$(mktemp -d /tmp/ai-brain-wiki-docs-XXXXXX)"
git clone https://github.com/arunpr614/ai-brain.wiki.git "$wiki_tmp"
wiki_base_sha="$(git -C "$wiki_tmp" rev-parse HEAD)"
```

Copy only the canonical page set from `docs/wiki/`. Remove `Codex-Wiki-Write-Test.md`. Do not copy private docs, inventory working files, or repository-only reports.

Validate the clone explicitly:

```bash
node scripts/check-agent-wiki-privacy.mjs --require-files "$wiki_tmp"
node scripts/check-agent-wiki-structure.mjs "$wiki_tmp" docs/agent-docs/source-baseline.json
```

Immediately before commit/push, check for concurrent wiki changes:

```bash
git -C "$wiki_tmp" fetch origin master
test "$(git -C "$wiki_tmp" rev-parse origin/master)" = "$wiki_base_sha"
```

If the comparison fails, stop. Review the incoming wiki changes, rebuild the temporary clone from the new base, rerun every check, and only then continue. Do not force-push.

After checks pass:

```bash
git -C "$wiki_tmp" add -A
git -C "$wiki_tmp" commit -m "Document AI Brain architecture for agents"
git -C "$wiki_tmp" push origin HEAD:master
```

Record both the before and after wiki SHAs in the public-safe publication report.

Exit gate: normal fast-forward push succeeds and before/after SHAs are retained outside temporary shell state.

### Phase 10: Post-Publish Verification

1. Fresh-clone the wiki and rerun privacy and structure checks against the clone.
2. Open every published page in GitHub.
3. Verify sidebar navigation, internal links, pinned source links, tables, headings, and code blocks.
4. Confirm the Mermaid architecture diagram renders.
5. Confirm the temporary test page is absent.
6. Confirm no private content appears in rendered pages, page history, commit message, or publication report.
7. Complete and commit `docs/agent-docs/wiki-publication-report.md`.

If any public-safety issue is found, revert the wiki commit immediately with a new revert commit and verify the reverted public state. Do not rewrite wiki history.

If a non-sensitive rendering or link defect is found, prepare a corrective canonical commit, rerun all gates, and republish through the same concurrency check.

## 11. Maintenance and Drift Prevention

### 11.1 Ownership and Review Metadata

Every page must include an owner, review date, baseline SHA, and runtime-evidence date. `Documentation-Maintenance.md` must define the owner role even if the named owner changes later.

### 11.2 Change Triggers

Documentation review is required when a change affects:

- User-visible routes or workflows.
- API routes or server actions.
- Migrations or persistent data behavior.
- Authentication, redaction, or privacy boundaries.
- Capture, Recall, Telegram, Android, extension, provider, queue, search, or Ask behavior.
- Package scripts or command safety.
- Deployment, backup, restore, service, timer, or operational behavior.
- Feature lifecycle status or production deployment state.

### 11.3 Drift Rules

- Canonical `docs/wiki/` changes must precede or accompany wiki changes.
- Feature changes must update the coverage ledger.
- Script changes must update the command-safety registry.
- Baseline changes must update source links and page metadata.
- A page verified only against an older baseline must say so; it must not silently claim current status.
- The wiki publication report must identify the exact canonical and wiki commits.

### 11.4 Periodic Review

Run a full documentation audit after major releases and at least quarterly while the project is active. The audit must rerun baseline capture, inventory reconciliation, privacy scans, structure checks, coverage checks, and rendered wiki verification.

## 12. Acceptance Criteria

The documentation project is complete only when all conditions pass:

- The revised plan is tracked.
- Exact default-branch, worktree, production, and wiki baselines are recorded without guessing unknown production state.
- Canonical public pages exist under `docs/wiki/` and match the required page set.
- The GitHub Wiki contains the same page content and hierarchy.
- The temporary test page is absent.
- Every inventory artifact is classified or explicitly excluded with rationale.
- Every feature has product, code, and runtime status plus baseline evidence.
- Default-branch-only and worktree-only features are represented accurately.
- Every package script and public command has a safety classification.
- Public pages contain only allowed commands.
- Wiki privacy scanning explicitly covers both `docs/wiki/` and the temporary/fresh wiki clones.
- Privacy failure output is proven to redact synthetic secret values.
- Internal links, sidebar links, pinned source links, tables, metadata, and required sections validate.
- Rendered GitHub pages and Mermaid output are manually verified.
- New private runbooks are outside the repository and synced workspace, use `0700`/`0600` permissions, and have a version manifest.
- Private runbook absence and single-machine limitations are documented publicly and safely.
- Canonical documentation is committed and pushed before wiki publication.
- Wiki publication verifies no remote drift and uses no force-push.
- Before/after wiki SHAs and the canonical documentation SHA are recorded.
- CI validates canonical documentation on future relevant changes.
- Final handoff lists validation results, known gaps, unknown runtime states, canonical commit, and wiki commit.

## 13. Rollback

Public wiki rollback:

1. Revert the published wiki commit with a normal revert commit.
2. Push the revert to `master` without rewriting history.
3. Fresh-clone and verify the reverted state.
4. Correct canonical `docs/wiki/` source before any republish.

Canonical documentation rollback:

1. Revert only the documentation commit if required.
2. Do not revert unrelated code or user changes.
3. Keep the publication report as historical evidence, clearly marked reverted.

Private runbook recovery:

1. Follow the owner-managed encrypted backup policy recorded in the private manifest.
2. Never reconstruct secrets or approval text from public documents.
3. If the private runbooks are unavailable, stop sensitive operations and report the missing private-operational context.

## 14. Non-Goals

- Redesigning or changing application behavior.
- Reconciling or merging divergent code branches.
- Changing production configuration.
- Running live Recall or production diagnostics.
- Performing deploy, restore, migration, backfill, scheduler, checkpoint, key, or database-write operations.
- Publishing private runbooks or credentials.
- Claiming complete runtime verification where only source evidence exists.
- Creating a cross-machine private-document distribution system without separate approval.
