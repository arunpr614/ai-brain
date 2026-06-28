# Recall Daily Sync Spike Requirements V1 - Adversarial Review

**Created:** 2026-06-24 09:11:53 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V1_2026-06-24_09-10-06_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V1_ADVERSARIAL_REVIEW_2026-06-24_09-11-53_IST.md`

## Executive Verdict

Conditional no-go for execution as written. The spike requirements are directionally right, but V1 still has three execution risks: it does not cleanly separate offline spikes from live-account spikes that require user input, some pass/fail criteria remain too subjective, and a few spikes quietly authorize implementation-shaped work without rollback boundaries. V2 should tighten scope, add stop conditions, add time boxes, and make user-gated steps explicit.

## Evidence Inspected

- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/recall-sync/RECALL_DAILY_SYNC_SPIKE_REQUIREMENTS_V1_2026-06-24_09-10-06_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/research/recall-sync/02_RECALL_DAILY_SYNC_RESEARCH_REPORT_V2_2026-06-24_09-07-04_IST.md`
- `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/spikes/README.md`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Live Recall API spikes require user inputs, but the execution plan does not define a blocked/offline fallback state

**Evidence:** SPIKE-013 requires a user-created Recall API key and controlled cards at lines 81-93. The user-input section repeats the need for API-key permission and content permissions at lines 430-438. The execution order at lines 396-406 still proceeds from SPIKE-015 into SPIKE-013 as if live access is available.
**Why it matters:** Without the key and controlled cards, the spike phase can stall or tempt an agent to use unsafe browser/session workarounds.
**Failure mode:** An agent tries to continue "end to end" by scraping Recall UI, reading local secrets, or fabricating API evidence.
**Recommendation:** V2 must split the execution order into Phase A offline spikes and Phase B user-gated live spikes. Add an explicit stop condition: if API key and controlled-card permission are absent, do not run live API spikes; complete only offline fixture/design spikes and mark live gates blocked.

### P1 - High Risk

#### 1. Some pass criteria still allow false confidence

**Evidence:** SPIKE-013 passes if the filtered response is "materially different" and no first-500 behavior is observed at lines 109-116. SPIKE-014 passes if every sample can be classified at lines 170-175. SPIKE-019 passes if at least one fallback can "preserve identity, retrieve useful content, and operate safely" at lines 382-385.
**Why it matters:** These phrases are not objective enough. A weak API response can look different but still be incomplete; classifying every sample as `blocked_unknown` would technically satisfy "can be classified"; "useful content" is not a pass/fail standard.
**Failure mode:** The spike reports pass even though REST cannot be trusted, content fidelity is poor, or fallback workflows are manual and fragile.
**Recommendation:** V2 must add measurable standards: expected controlled card count, positive and negative controls, boundary timestamps, "classification pass" requiring at least one non-blocked useful class per target content type, and fallback automation/security thresholds.

#### 2. Spike scope includes implementation-shaped work without rollback boundaries

**Evidence:** SPIKE-016 asks to prototype a migration, insert an AI Brain item, update `capture_source='recall'`, and verify UI display at lines 229-253. SPIKE-018 asks to design CLI behavior, run locks, caps, checkpointing, and exit codes at lines 304-341. Shared safety rules say no migrations or long-lived jobs unless a spike authorizes a disposable branch/harness at lines 45-57, but individual spikes do not define the harness, cleanup, or rollback.
**Why it matters:** A spike can mutate schema/data or create half-implemented code that later looks like approved implementation.
**Failure mode:** The workspace ends up with migrations, scripts, or DB data created during a spike, with unclear status and no cleanup path.
**Recommendation:** V2 must require disposable test databases, temporary branches/worktrees, or fixture-only harnesses for SPIKE-016 and SPIKE-018. Any code created during spikes must be marked prototype-only unless promoted by a later implementation plan.

#### 3. Privacy spike is too broad and not tied to concrete tests

**Evidence:** SPIKE-015 asks for redaction rules, synthetic fixtures, and log verification at lines 190-227, but the pass criteria allow redaction to be "tested or manually verified" at lines 213-217.
**Why it matters:** Privacy is the first gate. A manual-only check is not enough for a workflow involving private Recall content.
**Failure mode:** A later live API spike prints titles, URLs, or chunks into tracked reports because redaction was documented but not enforced by a reusable helper or test fixture.
**Recommendation:** V2 must require a reusable redaction helper or explicit test table of input strings and expected redacted output before live API calls are run.

### P2 - Medium Risk

#### 1. Planned report filenames are collision-prone and do not include full timestamps

**Evidence:** Planned filenames at lines 27-37 use only `2026-06-24_IST`, while the project artifacts elsewhere use full timestamps.
**Why it matters:** Multiple spikes or revisions on the same day can overwrite or confuse artifacts.
**Failure mode:** A later spike report reuses the same filename, or a reviewer cannot tell which version was reviewed.
**Recommendation:** V2 must use `<YYYY-MM-DD_HH-MM-SS_IST>` in every planned report filename.

#### 2. Time boxes and owners are missing

**Evidence:** The standard spike template expects time box, author, trigger, blocks, and verdict. The requirements doc lists triggers/blocks for some spikes but does not assign time boxes or owner roles per spike.
**Why it matters:** Without time boxes, broad spikes expand into implementation. Without owner roles, the PM/architect/QA responsibilities requested by the user are not visible.
**Failure mode:** SPIKE-016 and SPIKE-018 consume large implementation effort before the team has decided whether REST is viable.
**Recommendation:** V2 must add estimated time boxes and owner roles for each spike.

#### 3. SPIKE-014 does not define what happens if all content is partial

**Evidence:** SPIKE-014 classifies samples into fidelity states at lines 153-168 and fails if the API returns too little content at lines 177-182, but it does not define a decision threshold between "partial but acceptable" and "block import."
**Why it matters:** Partial content may be acceptable for notes/articles but unacceptable for PDFs/videos.
**Failure mode:** The team approves one product promise for all content types even though only some types meet it.
**Recommendation:** V2 must define per-content-type outcomes: full snapshot import, partial snapshot import, metadata-only import, or blocked.

### P3 - Low Risk Or Polish

#### 1. The final synthesis artifact lacks required inputs

**Evidence:** The final synthesis artifact is named at lines 39-43, and milestone exit criteria require it at lines 440-447, but the doc does not say what tables or decisions it must contain.
**Why it matters:** The final options report is the bridge into PRD and implementation planning. It needs a consistent decision matrix.
**Failure mode:** Future agents write a narrative summary that does not clearly choose Option A/B/C/D/E.
**Recommendation:** V2 should require the final synthesis to include a gate results table, viable product option, blocked options, required user decisions, and PRD readiness verdict.

## What The Original Plan Or Work Gets Wrong

- It treats user-gated live API work as part of the normal execution flow instead of a blocking dependency.
- It lets subjective pass criteria survive in the most important spikes.
- It gives some spikes permission to touch schema/import behavior without defining disposable harnesses.
- It does not fully align planned filenames with existing timestamped artifact practice.

## Missing Validation

- Redaction helper or test cases before live API calls.
- Positive and negative controls for REST date filtering.
- Clock-boundary checks for `date_from` and `date_to`.
- Disposable DB/worktree/harness rules for any prototype migrations or inserts.
- Per-content-type decision matrix for fidelity outcomes.
- Time boxes and owner roles.

## Revised Recommendations

1. Split execution into Phase A offline, Phase B user-gated live API, Phase C local integration, and Phase D fallback.
2. Add explicit blocked-state handling when user API key or sample-card permissions are not available.
3. Convert vague pass criteria into measurable checks.
4. Require prototype isolation and cleanup rules for schema/import spikes.
5. Add time boxes, owner roles, and full timestamped output filenames.
6. Require a final options matrix that can feed a PRD directly.

## Go / No-Go Recommendation

No-go for executing the spike plan exactly as written. Go for creating V2 of the spike requirements with the changes above.

## Plan Revision Inputs

### Required Deletions

- Remove date-only planned report filenames.
- Remove any wording that allows live API spikes to proceed without explicit user-provided API access and sample-card permission.
- Remove manual-only privacy verification as a pass condition.

### Required Additions

- Phase-based execution plan with blocked states.
- Time boxes and owner roles per spike.
- Disposable harness/cleanup requirements.
- Objective pass/fail controls for enumeration, fidelity, fallback viability, and privacy.
- Final synthesis decision matrix requirements.

### Required Acceptance Criteria Changes

- SPIKE-013 must require exact controlled-card expected count and positive/negative controls.
- SPIKE-014 must require per-content-type outcome decisions.
- SPIKE-015 must require reusable redaction validation.
- SPIKE-016 must require disposable DB or branch isolation.
- SPIKE-019 must distinguish manual fallback from automation-ready fallback.

### Required Validation Changes

- Validate redaction before live API evidence is captured.
- Validate no tracked real Recall payload files are created.
- Validate prototype cleanup after import/scheduler spikes.
- Validate final report filenames contain full timestamps.

### Required No-Go Gates

- No live API spike without user-provided API key mechanism and content-sample permission.
- No prototype migration/import against the real working DB unless the user explicitly approves it.
- No full content snippet in reports unless user approves that exact sample.
- No implementation plan if final synthesis cannot choose a viable option.

## Residual Risks

Even with V2, live Recall API behavior may still block the project. The cleanest next move is to complete offline redaction/fixture requirements first, then pause for user-approved API access before running any live Recall probes.
