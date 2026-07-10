# Adversarial Review Skill Implementation Plan - Adversarial Review

**Created:** 2026-06-10 19:52:38 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/adversarial-review-skill-implementation-plan-2026-06-10_18-25-40_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/ADVERSARIAL_REVIEW_SKILL_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-10_19-52-38_IST.md`

## Executive Verdict

No-go as an execution plan. It describes a useful skill, but it leaves several ways to declare success while the skill is broken, overwritten, over-triggered, or unsafe to use.

## Evidence Inspected

- `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/adversarial-review-skill-implementation-plan-2026-06-10_18-25-40_IST.md`
- Line-level review of trigger design, report placement, helper script design, UI metadata, implementation steps, validation steps, acceptance criteria, and risks.

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. The initializer command can corrupt explicit skill invocation

**Evidence:** Line 359 passes `default_prompt="Use $adversarial-review..."` inside double quotes.
**Why it matters:** The shell expands `$adversarial` and leaves `-review`, so the generated `openai.yaml` can advertise the wrong invocation text.
**Failure mode:** The skill appears installed, but the default prompt is broken and explicit invocation guidance becomes `Use -review...`.
**Recommendation:** Single-quote the default prompt or escape the dollar sign, then assert that `agents/openai.yaml` contains `$adversarial-review` and does not contain `Use -review`.

#### 2. The plan has no safe existing-skill path

**Evidence:** Lines 348-367 only describe creating a new skeleton. There is no preflight for an existing `/Users/arun.prakash/.codex/skills/adversarial-review/` directory and no backup/update branch.
**Why it matters:** Personal skills are mutable user assets. Re-running the plan can fail, overwrite, or tempt deletion of working custom content.
**Failure mode:** A future execution either crashes on an existing directory or destroys a prior skill revision to make the initializer run.
**Recommendation:** Add explicit preflight: absent means initialize; placeholder means update in place; meaningful existing content means back up before editing.

### P1 - High Risk

#### 1. Trigger wording is too broad for normal review requests

**Evidence:** Lines 58-59 include "report of findings and recommendations" without the stronger "Do not use for ordinary code review" exclusion. Lines 63-69 include natural review phrasing that could overlap with non-adversarial review.
**Why it matters:** Ordinary code review and adversarial report generation have different user expectations.
**Failure mode:** A user asking for a normal code review may get a report-writing workflow instead of concise code-review findings.
**Recommendation:** Narrow the frontmatter and explicitly exclude normal code review unless the user asks for adversarial, brutal, self-critical, or report-style treatment.

#### 2. Validation can pass without proving capability

**Evidence:** Lines 407-420 cover structural validation. Lines 422-443 list manual scenarios, but the acceptance criteria at lines 458-467 do not require seeded defect quality checks, metadata assertions, helper matrix tests, collision tests, or fresh-context activation proof.
**Why it matters:** A skill can be structurally valid while still failing the actual user outcome.
**Failure mode:** The plan declares success even if reports are generic, trigger behavior is wrong, filenames collide, or the prompt is corrupted.
**Recommendation:** Add no-go gates for metadata assertions, helper script matrix, seeded defect review, real artifact smoke test, and the freshest available trigger/non-trigger validation.

#### 3. Secret redaction is named but not operationalized

**Evidence:** Line 326 says "Redact secrets from reports" and line 478 lists secret leakage as a risk, but the plan does not define secret patterns, allowed redacted forms, or what must never be quoted.
**Why it matters:** Durable Markdown reports are exactly the wrong place to preserve raw credentials.
**Failure mode:** A reviewer may copy raw bearer tokens, bot tokens, signed URLs, cookies, or `.env` values into a report while thinking the plan's redaction requirement is satisfied.
**Recommendation:** Define concrete patterns and required replacements, such as `Bearer <redacted:token>` and signed URL query redaction.

### P2 - Medium Risk

#### 1. The metadata policy block is not proven against the local generator

**Evidence:** Lines 334-342 include `policy.allow_implicit_invocation: true`, but the plan does not verify whether the local generator supports that block.
**Why it matters:** Unsupported or manually added metadata can drift from generated skill UI metadata and create false assumptions about activation behavior.
**Failure mode:** The plan claims implicit invocation is configured when the actual generated file only contains `interface:` fields.
**Recommendation:** Rely on supported `interface:` metadata unless the schema is confirmed, and validate activation separately.

#### 2. Report structure is embedded in the plan and can drift from the skill template

**Evidence:** Lines 190-256 define a full report structure, while lines 386-392 also require a reusable template file.
**Why it matters:** Duplicated report structure creates two sources of truth.
**Failure mode:** The skill body, plan, and template diverge; future reviews become inconsistent.
**Recommendation:** Keep the full structure in `references/report-template.md` and make `SKILL.md` reference it only when writing a report.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

It underestimates skill activation risk. The plan focuses on creating the right files, but the real capability depends on correct metadata, trigger scope, rerun safety, report quality, deterministic output, and redaction discipline.

## Missing Validation

- Assertion that `$adversarial-review` survived the shell.
- Non-trigger check for plain "Review my local code changes."
- Seeded defect quality test.
- Helper script collision and error-path matrix.
- Rerun-safe preflight test.
- Fresh or near-fresh activation validation.
- Concrete redaction check.

## Revised Recommendations

Execute only after revising the plan to include safe preflight, single-quoted prompt generation, narrow trigger text, deterministic report path tests, concrete redaction rules, seeded defect validation, real artifact smoke testing, and an install manifest with checksums and caveats.

## Go / No-Go Recommendation

No-go for the original plan. The revised plan may proceed only if it treats fresh-context activation as a real validation item rather than assuming that a valid folder means a working skill.

## Plan Revision Inputs

### Required Deletions

- Remove unsupported assumptions around `policy.allow_implicit_invocation` unless the schema is confirmed.
- Remove broad trigger phrasing that can overlap with ordinary review.

### Required Additions

- Add safe preflight and backup/update behavior.
- Add a single-quoted initializer command.
- Add hard metadata checks for `$adversarial-review` and `Use -review`.
- Add concrete secret redaction rules.
- Add an install manifest with checksums.

### Required Acceptance Criteria Changes

- Require helper script matrix tests.
- Require seeded defect test.
- Require real artifact smoke test.
- Require fresh or near-fresh trigger/non-trigger validation, or record it as unverified.

### Required Validation Changes

- Validate prompt quoting.
- Validate no ordinary code-review hijack.
- Validate collision-safe report paths.
- Validate that reports include `Plan Revision Inputs`.
- Validate that structural success is not confused with behavior success.

### Required No-Go Gates

- Block completion if `$adversarial-review` becomes `-review`.
- Block completion if an existing skill can be overwritten without backup.
- Block completion if helper tests fail.
- Block completion if seeded review misses the shell quoting bug.
- Block completion if fresh-context activation remains untested without a documented caveat.

## Residual Risks

Even after revision, skill quality depends on the next agent's judgment. The practical mitigation is to keep running adversarial reviews on real artifacts and tighten the skill when it misses important risks.
