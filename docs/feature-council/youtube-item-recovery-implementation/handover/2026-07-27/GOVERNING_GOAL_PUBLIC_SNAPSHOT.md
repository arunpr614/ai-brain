# Governing Goal Public Snapshot

## Status and provenance

This is the privacy-scrubbed, repository-portable operational snapshot of the
user-supplied implementation goal that governed this project.

- Original input length: 899 lines.
- Original input SHA-256:
  `cc36749e07396736baa30515ea5b18cad6038c3024f9ab57fb7d5fa4e2a68235`.
- This file is not byte-identical to that input. It removes machine-local paths
  and consolidates the instructions required for a cold restart.
- The source-precedence and safety rules below remain binding. Current
  repository and approved decision evidence supersede stale implementation
  facts, but never silently weaken an explicit safety or release boundary.

## Mission

Implement the approved AI Brain foundations for:

1. exact-item, explicit-consent recovery of a user-visible YouTube transcript
   through the existing Chrome companion;
2. separately authorized manual enrichment of an already attached, held browser
   transcript; and
3. separately gated metadata-only link saving.

Extend the existing Manifest V3 companion. Do not create a second extension.

## Non-negotiable feature boundaries

### Exact-item transcript recovery

- Bind every request to the exact user, item, item revision, canonical video,
  extension version, and contract version.
- Require a successful server-side, content-free `authorize inspect` decision
  and the user's explicit **Inspect visible transcript** action before reading
  any transcript DOM.
- Read only the already visible, user-selected transcript from the top frame
  through a bounded isolated extractor.
- Show destination, language, cue count, completeness evidence, and disclosure
  locally before transfer.
- Require the user's separate explicit **Add** action before transfer.
- Keep transcript text out of extension storage, the service worker, Brain or
  other page-controlled DOM, URLs, clipboard, logs, analytics, and crash
  evidence.
- Recompute normalization, classification, hashes, policy, and exact-item
  authority on the server.
- Attach atomically and hold the source from AI processing.

### Held manual enrichment

- Capture consent never substitutes for processing consent.
- Show truthful held, authorized, running, partial, retry, drift, deletion, and
  completion states.
- Require a separate exact-revision processing authorization that binds the
  provider plan, input/context fingerprints, retention, expiry, and expected
  output.
- Use idempotent revision-bound requests and distinct digest and indexing stages.
- Keep provider work outside database transactions.
- Revalidate source, revision, authorization, generation, lease, hold, deletion,
  mode, and policy before claim, dispatch, and apply.
- Preserve a valid current digest across an index-only retry; that retry must
  make zero digest-provider calls.
- Prevent stale or deleted work from applying or recreating data.

### Metadata-only link save

- Save only the URL and approved metadata.
- Never read, attach, enqueue, backfill, or process transcript content.
- Never use transcript-success language.
- Keep link-only behavior independent of transcript recovery.

## Browser and privacy boundaries

- No persistent YouTube host permission.
- No static YouTube content script.
- Temporary `activeTab` only.
- No cookies, browser storage, account data, player responses, signed URLs,
  caption URLs, authorization material, audio, or ASR.
- No broad CORS, page-selected destination, transcript-bearing runtime message,
  or service-worker transcript queue.
- The production extension bundle must contain no recovery destination, recovery
  panel, transcript extractor, upload-grant, or recovery-handoff code.

## Environment and release authority

### Production

Production enablement of browser-visible transcript capture and held browser
transcript processing is denied. Do not:

- remove or bypass denial code;
- enable either feature through flags, manifests, environment values, request
  fields, or approval text;
- publish a capture-capable production extension;
- send browser transcripts to production providers;
- store browser transcripts in the production database; or
- describe either feature as live in production.

Only production-safe containment, backward-compatible foundations, and
separately approved true link-only behavior may advance after their own gates.

### Isolated live lab

A live canary remains blocked unless a reviewed external packet supplies:

- a target-specific platform-policy decision and authorized sample;
- separate deployment and extension identities;
- separate credentials, database, and data root;
- private manifests outside Git;
- approved retention, deletion, cleanup owner, and deadline;
- provider handling terms and a separate processing decision;
- restricted worker mode;
- monitoring, kill switch, rollback, and cleanup; and
- successful synthetic and packaged-local evidence first.

No missing lab gate may be inferred from code, repository access, or a green test.

## Source precedence

When sources disagree, use:

1. current protected `main`;
2. current merged pull-request state;
3. current heads of open dependent pull requests;
4. the latest final V2 post-planning verification;
5. final V2 PRDs and implementation plans;
6. final V2 UX specifications and prototypes;
7. final adversarial reviews and disposition matrices;
8. V1 artifacts; and
9. historical prototypes.

A newer source does not automatically supersede consent, privacy, lab, or
production-denial decisions. A non-negotiable boundary changes only through a
new explicit, versioned, independently reviewed decision.

## Repository and worktree rules

- Resolve the repository root with `git rev-parse --show-toplevel`.
- Preserve unrelated dirty files and nested worktrees.
- Never use destructive cleanup or broad staging.
- Inspect the current diff, remote refs, PR state, migration frontier, and
  frozen hashes before editing.
- Stage explicit reviewed paths only.
- Treat local, staged, committed, pushed, merged, deployed, enabled, released,
  and published as distinct states.
- Technical readiness never grants mutation, lab, deployment, or production
  authority.

## Required implementation order

1. Reconcile current sources, PRs, migration frontier, contracts, affected
   files, and P0 requirements.
2. Preserve reviewed old-schema-compatible production containment.
3. Complete the abrupt-stop/fresh-restart prerequisite.
4. Resolve D-021 with a fixed-source provenance and semantic-compatibility gate.
5. Implement and accept `028_youtube_browser_transcript.sql` and the complete
   Stage 2 runtime/package evidence.
6. Implement the existing Chrome-companion foundations with synthetic fixtures.
7. Implement exact-item recovery and separately gated link-only behavior.
8. Freeze, apply, and accept
   `029_manual_transcript_enrichment_expand.sql` before any manual-enrichment
   route, UI, worker, or provider behavior.
9. Implement held manual enrichment and prove dual-read/dual-write, backfill,
   retry, drift, deletion, and transition parity.
10. Drain incompatible work, block incompatible rollback binaries, apply
    `030_manual_transcript_enrichment_contract.sql`, and pass the post-contract
    matrix before Stage 7 can complete.
11. Complete UX, accessibility, full QA, documentation, production-negative,
    release, and rollback evidence.
12. Run an isolated live canary only if every external gate is explicitly
    approved.

If the migration frontier changes, shift 028/029/030 together after a fresh
protected-main and open-PR inventory.

## Evidence and adversarial-review gates

- Never mark a requirement verified without exact code, exact tests, executed
  commands/counts, environment, commit/hash, and durable evidence.
- A pre-push review covers exact source and local evidence only.
- After an authorized push, a mandatory post-hosted review must bind the exact
  commit, workflow/run/job IDs, commands, selected/pass/fail/skip counts, both
  required crash scenarios, and inspected logs.
- A green wrapper with zero selected tests is invalid evidence.
- Resolve every P0/P1 before the dependent stage advances.
- Carry any accepted lower-severity residual into the risk register with owner
  and release effect.

## Bounded delivery authority

The governing goal directs autonomous commit, push, and pull-request delivery
after final-diff review, exact exclusion of unrelated work, privacy/secret
checks, and every applicable evidence gate. The current request to address all
review items reaffirms that delivery lane.

Together they authorize only the exact sanitized handover Group E paths on
`feat/youtube-item-recovery-enrichment`. A zero-P0/P1 exact-byte review
authorizes the strict running-log append and exact Group E staging solely to run
publication verification. Only publication-verifier PASS authorizes the
resulting commit, push, and draft-PR update. They do not authorize the dirty
feature/crash/D-021 paths, merge, deployment, release, Wiki publication, live
lab, provider use, browser capture, manual processing, or production
enablement.

## Documentation and operational record

- Keep `RUNNING_LOG.md` append-only.
- Append after milestones, dependency or migration decisions, adversarial
  reviews, major test runs, lab validation, deployment, and final handoff.
- Keep tracker, traceability, decision, risk, PR, Wiki, and final-report status
  exact and content-free.
- Do not publish private paths, credentials, manifests, lab identifiers, target
  lists, or private item/content data.

## Completion rule

The parent implementation goal is complete only when every applicable P0
requirement has implementation and executed-test evidence, additive migrations
and binary/schema combinations pass, the existing companion is extended without
permission broadening, all P0/P1 findings are closed, production-negative
behavior is verified, all authorized deployment/release evidence exists, the
Wiki and running log are current, and blocked capabilities remain described as
blocked.

Absent lab or production authority is a truthful blocker, not permission to
invent evidence or enable the denied features.
