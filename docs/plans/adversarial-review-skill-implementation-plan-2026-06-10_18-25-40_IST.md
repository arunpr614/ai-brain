# Adversarial Review Skill Implementation Plan

**Created:** 2026-06-10 18:25:40 IST
**Request:** Create an implementation plan for a reusable Codex skill that performs brutally honest adversarial reviews of implementation plans or recently completed work, then writes a timestamped Markdown report in the same folder as the reviewed artifact.

## 1. Goal

Create a personal Codex skill named `adversarial-review` that can be invoked when the user asks for:

- an adversarial review
- a brutal self-critique
- a fresh-perspective critique
- a review of an implementation plan
- a review of recently completed work
- findings and recommendations as a Markdown report

The skill must make the agent adopt an evidence-first skeptical reviewer stance, inspect the relevant artifact or recent work, identify concrete risks and gaps, and create a timestamped Markdown report in the correct folder every time.

## 2. Non-Goals

- Do not replace normal code review skills.
- Do not automatically fix findings unless the user explicitly asks.
- Do not modify the reviewed implementation plan or code while creating the adversarial review.
- Do not create broad project-management documents beyond the requested review report.
- Do not write generic motivational critique. The report must be evidence-backed and actionable.

## 3. Skill Location

Create the skill under the user's personal Codex skills directory:

```text
/Users/arun.prakash/.codex/skills/adversarial-review/
```

Planned files:

```text
adversarial-review/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   └── report-template.md
└── scripts/
    └── report_path.py
```

Do not add extra files such as `README.md`, `INSTALLATION_GUIDE.md`, or `CHANGELOG.md`. The skill should stay lean.

## 4. Trigger Design

The `SKILL.md` frontmatter should use a clear description so the skill triggers for both explicit and natural-language requests.

Recommended frontmatter:

```yaml
---
name: adversarial-review
description: Use this skill when the user asks for an adversarial review, brutal self-critique, fresh-perspective critique, hard-nosed review, implementation plan critique, review of recently completed work, or a report of findings and recommendations. The skill inspects the target artifact or recent work, looks for root risks beyond the obvious, and creates a timestamped Markdown adversarial review report in the same folder as the reviewed artifact when possible.
---
```

Trigger examples the skill should cover:

- "Do a brutal adversarial review of this implementation plan."
- "Self-critique the work we just did."
- "Review the plan from a fresh perspective and create a report."
- "Be brutally honest and tell me what is wrong with this."
- "Create an adversarial review report for the latest implementation."

## 5. Core Skill Behavior

### 5.1 Resolve The Review Target

The skill must first determine what is being reviewed.

If the user provides a file path:

- Use that file as the primary artifact.
- Read the file.
- Capture line numbers for evidence where useful.
- Create the report in the same directory as that file.

If the user refers to "recent work":

- Inspect the current repository or workspace.
- Use git status, recent commits, changed files, created reports, test outputs, and deployment notes where available.
- If there is a single obvious primary artifact, place the report beside it.
- If there is no single artifact, place the report in the nearest project `ReviewReport/` folder when present.
- If neither can be inferred safely, ask one concise question for the output folder.

If the user gives neither a file nor enough recent-work context:

- Ask one concise clarification question.
- Do not fabricate a review target.

### 5.2 Gather Evidence

The skill should gather enough evidence before writing findings.

For implementation plans:

- Read the full plan.
- Inspect related code or docs if the plan references concrete systems, files, or behaviors.
- Check whether the plan is stale against current repo state.
- Check whether acceptance criteria are testable and difficult to game.
- Check whether sequencing, rollback, observability, data safety, and production risks are covered.

For recently completed work:

- Inspect git status and recent commits.
- Inspect relevant diffs and files touched.
- Review test/build/deploy evidence if available.
- Check whether the implementation actually matches the plan.
- Check whether documentation and reports overstate what was verified.

The skill should distinguish:

- confirmed findings
- likely risks
- open questions
- assumptions

### 5.3 Adopt The Adversarial Stance

The skill must explicitly push past polite summary mode.

Required stance:

- Be skeptical, not theatrical.
- Start from how this could fail in the real world.
- Assume good intent but verify claims.
- Prefer concrete evidence over confidence.
- Do not praise before findings.
- Do not soften P0/P1 risks to protect the plan.
- Do not invent issues just to sound severe.

Required adversarial passes:

1. **Reality check:** Is the plan or claimed work aligned with the current system?
2. **Staleness check:** Does it assume old behavior that has already changed?
3. **Failure-mode check:** What breaks in production, in edge cases, or during retries?
4. **Data-safety check:** Could this corrupt, duplicate, hide, or stale important user data?
5. **Deployment check:** Is rollout, rollback, and verification sufficient?
6. **Observability check:** Would the owner know whether it worked after release?
7. **Acceptance-criteria check:** Could the criteria pass while the user problem remains unsolved?
8. **Scope check:** Is the plan too broad, too vague, or hiding risky dependencies?
9. **User-experience check:** Does the user see the right thing at the right time?
10. **Security/privacy check:** Are secrets, tokens, private content, or logs handled safely?

## 6. Report Output Rules

### 6.1 File Placement

Default rule:

- If reviewing a file, create the report in the same folder as that file.

Recent-work fallback:

- If reviewing recent work and no single file is primary, use `<project>/ReviewReport/` if present.
- If no `ReviewReport/` exists, use the project root.
- If the project root is unclear, ask one concise question.

### 6.2 File Naming

Use local Asia/Kolkata time.

Filename format:

```text
<SUBJECT_SLUG>_ADVERSARIAL_REVIEW_<YYYY-MM-DD_HH-MM-SS_IST>.md
```

Examples:

```text
V0_8_0_SAFE_CAPTURE_UPGRADES_ADVERSARIAL_REVIEW_2026-06-10_18-25-40_IST.md
RECENT_WORK_ADVERSARIAL_REVIEW_2026-06-10_18-25-40_IST.md
```

Rules:

- Use uppercase subject slugs.
- Replace spaces and punctuation with underscores.
- Collapse repeated underscores.
- Keep the date and time in every filename.
- Never overwrite an existing report.

### 6.3 Report Structure

The generated report should follow this structure:

```markdown
# <Subject> - Adversarial Review

**Created:** <YYYY-MM-DD HH:MM:SS IST>
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** <file path, commit range, or recent-work scope>
**Report path:** <absolute path>

## Executive Verdict

<Direct conclusion. No praise-first framing. State whether this is ready, conditionally ready, or not ready.>

## Evidence Inspected

- <Files, diffs, commands, commits, screenshots, logs, or docs inspected>

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. <Finding title>

**Evidence:** <file/line/command/output>
**Why it matters:** <impact>
**Failure mode:** <what could go wrong>
**Recommendation:** <specific fix>

### P1 - High Risk

...

### P2 - Medium Risk

...

### P3 - Low Risk Or Polish

...

## What The Original Plan Or Work Gets Wrong

<Contradictions, stale assumptions, missing design constraints, overclaims.>

## Missing Validation

<Tests, smoke checks, production checks, observability, rollback checks.>

## Revised Recommendations

<Concrete changes required before execution or next release.>

## Go / No-Go Recommendation

<Clear recommendation with conditions.>

## Follow-Up Implementation Plan Inputs

<Bullet list of changes that should be fed into the revised implementation plan.>

## Residual Risks

<Risks that remain even after recommendations.>
```

If there are no P0 findings, the report must say so explicitly and still list residual risks.

## 7. Deterministic Helper Script

Add `scripts/report_path.py` to reduce filename and folder mistakes.

Responsibilities:

- Accept `--target-file`, `--output-dir`, `--subject`, and `--timezone`.
- Default timezone to `Asia/Kolkata`.
- If `--target-file` is provided, use its parent directory.
- If `--output-dir` is provided, use that directory.
- Generate a timestamped Markdown filename.
- Print JSON with:
  - `report_path`
  - `timestamp_display`
  - `timestamp_filename`
  - `subject_slug`
  - `directory`

Example usage:

```bash
python3 /Users/arun.prakash/.codex/skills/adversarial-review/scripts/report_path.py \
  --target-file "/path/to/v0.8.0-plan.md" \
  --subject "v0.8.0 safe capture upgrades"
```

Expected output:

```json
{
  "report_path": "/path/to/V0_8_0_SAFE_CAPTURE_UPGRADES_ADVERSARIAL_REVIEW_2026-06-10_18-25-40_IST.md",
  "timestamp_display": "2026-06-10 18:25:40 IST",
  "timestamp_filename": "2026-06-10_18-25-40_IST",
  "subject_slug": "V0_8_0_SAFE_CAPTURE_UPGRADES",
  "directory": "/path/to"
}
```

The script should not write the review content itself. It only standardizes the destination path.

## 8. Skill Body Design

The `SKILL.md` body should stay concise but prescriptive. It should include:

1. Role and stance.
2. Target resolution rules.
3. Evidence-gathering checklist.
4. Adversarial review passes.
5. Severity definitions.
6. Report location and naming rules.
7. Final response expectations.

Recommended severity definitions:

- **P0:** Blocks execution, deployment, or user trust. Must fix before proceeding.
- **P1:** High risk likely to cause broken behavior, bad data, false confidence, or expensive rework.
- **P2:** Meaningful gap that should be fixed soon but does not block immediate progress.
- **P3:** Polish, clarity, or future-hardening issue.

The skill should explicitly tell the agent:

- Findings must lead the report.
- Each P0/P1 finding needs evidence, impact, failure mode, and recommendation.
- Do not bury risk in a summary.
- Do not make a revised implementation plan unless the user asks for one.
- Do not edit code or the reviewed plan unless the user asks for execution.
- Redact secrets from reports.

## 9. UI Metadata

Create `agents/openai.yaml` using the skill-creator guidance.

Recommended values:

```yaml
interface:
  display_name: "Adversarial Review"
  short_description: "Brutally honest plan and work reviews"
  default_prompt: "Use $adversarial-review to do a brutally honest adversarial review of this implementation plan and create a timestamped Markdown report."

policy:
  allow_implicit_invocation: true
```

No icon is required for v1 unless the user wants one later.

## 10. Implementation Steps

### Step 1 - Create The Skill Skeleton

Run the skill creator initializer:

```bash
python3 /Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  adversarial-review \
  --path /Users/arun.prakash/.codex/skills \
  --resources scripts,references \
  --interface display_name="Adversarial Review" \
  --interface short_description="Brutally honest plan and work reviews" \
  --interface default_prompt="Use $adversarial-review to do a brutally honest adversarial review of this implementation plan and create a timestamped Markdown report."
```

Expected result:

- `/Users/arun.prakash/.codex/skills/adversarial-review/SKILL.md`
- `/Users/arun.prakash/.codex/skills/adversarial-review/agents/openai.yaml`
- `/Users/arun.prakash/.codex/skills/adversarial-review/scripts/`
- `/Users/arun.prakash/.codex/skills/adversarial-review/references/`

### Step 2 - Write `SKILL.md`

Replace the generated template with the final trigger description and workflow.

Keep it under 500 lines.

Important content:

- Review target resolution.
- Same-folder report rule.
- Recent-work fallback rule.
- Evidence requirements.
- Adversarial passes.
- Severity levels.
- Report creation rules.
- Final answer format.

### Step 3 - Add `references/report-template.md`

Create one reusable report template with placeholders.

The template should be loaded only when writing a report, not for every invocation.

It should include the full report structure from section 6.3.

### Step 4 - Add `scripts/report_path.py`

Implement a small deterministic script for timestamped file paths.

Design details:

- Standard library only.
- Use `zoneinfo.ZoneInfo("Asia/Kolkata")`.
- Sanitize subject to uppercase ASCII with underscores.
- Ensure target directory exists.
- Refuse to return a path that already exists; append a short numeric suffix only if collision occurs.
- Print JSON.

### Step 5 - Validate Skill Shape

Run:

```bash
python3 /Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  /Users/arun.prakash/.codex/skills/adversarial-review
```

Known environment note:

- On this machine, direct `python3` currently lacks `yaml`, so `quick_validate.py` may fail with `ModuleNotFoundError: No module named 'yaml'`.
- If that happens during execution, use an available Python environment with PyYAML or install `pyyaml` into a local user environment before rerunning validation.
- Do not treat the missing `yaml` module as a skill failure; treat it as a validator runtime dependency.

### Step 6 - Forward-Test With Real Prompts

Run at least four manual scenario checks:

1. **Implementation plan review**
   - Input: a known plan file.
   - Expected: report appears in the same folder as the plan.
   - Expected: findings cite concrete lines or sections.

2. **Recent work review**
   - Input: "Do an adversarial review of the work done recently."
   - Expected: agent inspects git status/log/diff.
   - Expected: report appears in `ReviewReport/` if no single artifact is primary.

3. **Ambiguous target**
   - Input: "Do an adversarial review."
   - Expected: agent asks one concise clarification question.
   - Expected: no report is fabricated.

4. **No P0 case**
   - Input: a small low-risk plan.
   - Expected: report says no P0 findings found, then lists residual risks.

### Step 7 - Iterate

After forward tests:

- Tighten trigger wording if the skill does not activate.
- Tighten report rules if the output becomes too polite or too generic.
- Reduce `SKILL.md` if it becomes too long.
- Move extra examples into `references/` only if needed.

## 11. Acceptance Criteria

The skill is complete when:

1. `adversarial-review` appears as a valid skill in `/Users/arun.prakash/.codex/skills/adversarial-review`.
2. It triggers for adversarial review, self-critique, and implementation plan critique prompts.
3. It writes a Markdown report with date and time in the filename.
4. When reviewing a file, the report is created in the same folder as that file.
5. When reviewing recent work, the report is created in the appropriate project review folder or asks for clarification.
6. Reports lead with findings and severity, not a friendly summary.
7. P0/P1 findings include evidence, impact, failure mode, and recommendation.
8. The skill distinguishes confirmed findings from assumptions.
9. The skill does not edit reviewed files or code unless explicitly asked.
10. Validation and at least four forward-test scenarios have been completed.

## 12. Risks And Mitigations

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Skill becomes generic criticism | Reports lose usefulness | Force evidence, severity, failure mode, recommendation |
| Skill is too harsh without proof | Creates noise and false urgency | Require evidence and separate hypotheses from confirmed findings |
| Report lands in the wrong folder | Breaks user expectation | Use `report_path.py` and same-folder rules |
| Recent-work scope is ambiguous | Agent may invent a target | Ask one concise clarification question |
| Skill modifies files under review | Review becomes mixed with implementation | Hard rule: no target edits unless explicitly requested |
| Secret leakage in reports | Could expose tokens or private content | Redact secrets and summarize sensitive evidence |
| Validation script dependency missing | Could block execution incorrectly | Treat PyYAML as validator dependency, not skill failure |

## 13. Recommended Execution Order

1. Create skill skeleton.
2. Write `SKILL.md`.
3. Add report template.
4. Add report path helper script.
5. Validate structure.
6. Run forward-test prompts.
7. Revise skill based on observed behavior.
8. Report back with created files and validation status.

## 14. Next User Action

If the user wants to proceed, the next command is simply:

```text
execute
```

Execution should create the skill files, validate them, and run the forward-test scenarios.
