# Revised Adversarial Review Skill Implementation Plan

**Created:** 2026-06-10 19:12:41 IST
**Supersedes:** `adversarial-review-skill-implementation-plan-2026-06-10_18-25-40_IST.md`
**Adversarial review addressed:** `ADVERSARIAL_REVIEW_SKILL_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-10_18-31-09_IST.md`
**Objective:** Create a reusable personal Codex skill named `adversarial-review` that can perform brutally honest, evidence-first adversarial reviews of implementation plans or recently completed work, then write a timestamped Markdown report in the right folder.

## 1. Revised Verdict

The original plan had the right product idea but was not safe to execute. This revised plan fixes the execution blockers:

- The skill must prove it can trigger, not merely exist on disk.
- The initializer command must preserve `$adversarial-review` instead of letting the shell corrupt it.
- The install must be rerun-safe.
- The validation must test report quality, not just file creation.
- The trigger wording must avoid hijacking normal code review requests.
- Secret redaction must be concrete.
- Report location must be deterministic.
- The final install must leave a traceable manifest.

## 2. Non-Negotiable Requirements

1. **Do not confuse file creation with capability creation.**
   The skill is not done until it is structurally valid, has working helper scripts, has correct metadata, and has been tested in the most realistic fresh-context path available.

2. **Do not use broad trigger wording.**
   The skill should trigger for adversarial critique requests, not ordinary "review this code" requests.

3. **Do not lose `$adversarial-review` in shell commands.**
   Every command that includes `$adversarial-review` must single-quote it or escape the dollar sign.

4. **Do not overwrite prior reports.**
   Timestamp collision must result in `_02`, `_03`, and so on.

5. **Do not leak secrets.**
   Reports must never include raw tokens, cookies, bearer values, Telegram bot tokens, signed webhook URLs, or full secret values from environment files.

6. **Do not ask for confirmation when the user already asked to create the report.**
   Ask only when the target artifact or output folder is ambiguous.

7. **Do not create a polite summary pretending to be adversarial.**
   The report must lead with findings, evidence, failure modes, and recommendations.

## 3. Final Skill Location

Install the runtime skill here:

```text
/Users/arun.prakash/.codex/skills/adversarial-review/
```

Final skill files:

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

Final project traceability file:

```text
/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/adversarial-review-skill-install-manifest-<timestamp>.md
```

The manifest is not part of the skill. It records what was installed, where it was installed, checksums, and validation outcomes.

## 4. Safe Preflight

Before creating or modifying the skill:

1. Check whether `/Users/arun.prakash/.codex/skills/adversarial-review/` exists.
2. If it does not exist, initialize it with `init_skill.py`.
3. If it exists and still contains generated placeholder TODO content, update it in place.
4. If it exists with meaningful custom content:
   - read `SKILL.md`, `agents/openai.yaml`, `references/report-template.md`, and `scripts/report_path.py` if present
   - create a timestamped backup directory before editing:

```text
/Users/arun.prakash/.codex/skills/adversarial-review.backup-<timestamp>/
```

5. Never delete the existing skill directory just to rerun the initializer.

## 5. Corrected Initializer Command

Only run this if the skill directory does not already exist.

Important: the default prompt must be single-quoted so the shell does not expand `$adversarial-review`.

```bash
python3 /Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  adversarial-review \
  --path /Users/arun.prakash/.codex/skills \
  --resources scripts,references \
  --interface display_name="Adversarial Review" \
  --interface short_description="Brutally honest plan and work reviews" \
  --interface default_prompt='Use $adversarial-review to do a brutally honest adversarial review of this implementation plan and create a timestamped Markdown report.'
```

Post-generation assertion:

```bash
rg -n '\$adversarial-review' /Users/arun.prakash/.codex/skills/adversarial-review/agents/openai.yaml
```

Expected:

```text
default_prompt: "Use $adversarial-review ...
```

If the file contains `Use -review`, the install is invalid and must be fixed before continuing.

## 6. Revised Trigger Design

The frontmatter must be narrow enough to avoid replacing normal code review behavior.

Recommended `SKILL.md` frontmatter:

```yaml
---
name: adversarial-review
description: Use this skill when the user explicitly asks for an adversarial review, brutal review, brutally honest critique, self-critique, fresh-perspective critique, implementation plan critique, plan critique, recent-work self-critique, or asks to create a Markdown report of adversarial findings and recommendations. Do not use for ordinary code review requests unless the user asks for adversarial, brutal, self-critical, or report-style review. The skill inspects evidence, identifies severe risks and hidden failure modes, and writes a timestamped Markdown adversarial review report in the target artifact's folder or a deterministic review folder.
---
```

Trigger examples that should load the skill:

- "Do a brutal adversarial review of this implementation plan."
- "Self-critique the work we just did and create a report."
- "Review this plan from a fresh perspective and be brutally honest."
- "Create an adversarial review report for the latest implementation."
- "Use `$adversarial-review` on this plan."

Requests that should not automatically use this skill:

- "Review this PR."
- "Review my local code changes."
- "Can you look over this function?"
- "Do a code review."

If a request is ambiguous, default to the normal review posture unless the user asks for adversarial, brutal, self-critical, or report-style output.

## 7. `SKILL.md` Body Requirements

Keep `SKILL.md` concise and under 500 lines.

The body must include:

1. **Role**
   Act as an evidence-first adversarial reviewer.

2. **Definition of "brutal"**
   Brutal means:
   - evidence-first
   - no praise-first framing
   - every claim tested against failure modes
   - no invented severity
   - explicit no-go recommendation when warranted
   - concrete revision inputs

3. **Target resolution**
   - If a target file is provided, review that file and write the report beside it.
   - If recent work is requested, inspect git status, recent commits, relevant docs, created reports, and changed files.
   - If the target is ambiguous, ask one concise clarification question.

4. **Evidence rules**
   - Separate confirmed findings, likely risks, open questions, and assumptions.
   - Use file paths and line references when available.
   - For screenshots, cite the image path and observed visual evidence.
   - For PDFs or documents, extract or inspect content before reviewing.
   - For folders, inspect the folder contents, nearby docs, and git state.

5. **Adversarial passes**
   - reality check
   - staleness check
   - failure-mode check
   - data-safety check
   - deployment and rollback check
   - observability check
   - acceptance-criteria check
   - scope check
   - user-experience check
   - security and privacy check

6. **Severity model**
   - P0: execution, release, data, trust, or user-outcome blocker
   - P1: high risk likely to cause broken behavior, false confidence, data problems, or expensive rework
   - P2: meaningful gap that should be fixed soon
   - P3: polish, clarity, or future hardening

7. **Report-writing rule**
   - If the user asks to create the report, create it directly.
   - Ask only when the target or output folder cannot be determined.

8. **Template loading rule**
   - Read `references/report-template.md` only when writing the report.
   - Keep the full report structure out of `SKILL.md` to avoid duplicate drift.

9. **Secret redaction rule**
   - Never quote raw secrets.
   - Mask suspicious values as `<redacted:token>`, `<redacted:secret>`, or `<redacted:url>`.

10. **No implementation rule**
    - Do not fix code or revise the reviewed plan unless the user explicitly asks.

## 8. Report Template Requirements

Create:

```text
/Users/arun.prakash/.codex/skills/adversarial-review/references/report-template.md
```

The template must be the single source of truth for report structure.

Required structure:

```markdown
# <Subject> - Adversarial Review

**Created:** <YYYY-MM-DD HH:MM:SS IST>
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** <file path, commit range, folder, screenshot, or recent-work scope>
**Report path:** <absolute path>

## Executive Verdict

<Direct no-go / conditional-go / go verdict. No praise-first framing.>

## Evidence Inspected

- <Files, diffs, screenshots, docs, commands, logs, or commits inspected>

## Findings

### P0 - Must Fix Before Execution Or Release

<If none, explicitly write: No P0 findings found.>

#### 1. <Finding title>

**Evidence:** <specific evidence>
**Why it matters:** <impact>
**Failure mode:** <how this breaks>
**Recommendation:** <specific fix>

### P1 - High Risk

<Same format>

### P2 - Medium Risk

<Same format>

### P3 - Low Risk Or Polish

<Same format>

## What The Original Plan Or Work Gets Wrong

<Contradictions, stale assumptions, overclaims, missing constraints.>

## Missing Validation

<Tests, smoke checks, fresh-context checks, rollback checks, observability gaps.>

## Revised Recommendations

<Concrete changes required before execution or release.>

## Go / No-Go Recommendation

<Clear recommendation and conditions.>

## Plan Revision Inputs

### Required Deletions

- <What must be removed from the old plan>

### Required Additions

- <What must be added>

### Required Acceptance Criteria Changes

- <What acceptance criteria must change>

### Required Validation Changes

- <What validation must be added>

### Required No-Go Gates

- <Conditions that must block execution or release>

## Residual Risks

<Risks that remain even after recommendations.>
```

## 9. `report_path.py` Requirements

Create:

```text
/Users/arun.prakash/.codex/skills/adversarial-review/scripts/report_path.py
```

Responsibilities:

- Use standard library only.
- Accept:
  - `--target-file`
  - `--output-dir`
  - `--subject`
  - `--timezone`
  - optional `--now` for deterministic tests
- Default timezone: `Asia/Kolkata`.
- If `--target-file` is supplied, default output directory to the parent of that file.
- If `--output-dir` is supplied, use that directory.
- If both are supplied, `--output-dir` wins for output location, but target file may still be used for subject inference.
- If neither target file nor output directory is supplied, exit non-zero with a clear error.
- If the target file does not exist, exit non-zero with a clear error.
- If the output directory does not exist, exit non-zero with a clear error.
- Sanitize subject to uppercase ASCII with underscores.
- Use filename format:

```text
<SUBJECT_SLUG>_ADVERSARIAL_REVIEW_<YYYY-MM-DD_HH-MM-SS_IST>.md
```

- Never overwrite an existing file.
- If the generated path exists, append `_02`, `_03`, and so on before `.md`.
- Print JSON only.

Expected JSON keys:

```json
{
  "report_path": "...",
  "timestamp_display": "YYYY-MM-DD HH:MM:SS IST",
  "timestamp_filename": "YYYY-MM-DD_HH-MM-SS_IST",
  "subject_slug": "...",
  "directory": "..."
}
```

The script must not write the report content. It only returns the destination path.

## 10. Redaction Requirements

Before writing the final report, the skill must scan the draft mentally or with local search where appropriate for likely secret patterns.

Never include raw values for:

- `.env` secrets
- API keys
- bearer tokens
- Telegram bot tokens
- webhook URLs with signatures
- cookies
- session identifiers
- signed payloads
- private one-time credentials
- SSH credentials
- long unclassified token-like strings

Suspicious patterns to treat carefully:

```text
TOKEN=
SECRET=
PASSWORD=
PRIVATE_KEY=
Bearer
bot[0-9]+:
api_key
webhook
signature=
```

Allowed:

- secret key names
- redacted shapes
- short non-sensitive error messages
- paths to files that contain secrets, if the file path itself is not sensitive

Examples:

```text
BRAIN_API_TOKEN=<redacted:token>
Authorization: Bearer <redacted:token>
https://example.com/webhook?<redacted:url-query>
```

## 11. Deterministic Report Folder Rules

For a file target:

1. Report goes in the same folder as the target file.
2. This rule applies to Markdown, text, screenshots, PDFs, docs, and other file artifacts.

For recent-work review:

1. Find the nearest ancestor containing `.git`.
2. If that repo has `ReviewReport/`, use it.
3. If it does not have `ReviewReport/` but has `docs/plans/`, ask one concise question:
   "Should I put the report in `docs/plans/` or the repo root?"
4. If neither exists, use the repo root.
5. Always report the absolute path in the final response.

For ambiguous targets:

- Ask one concise question.
- Do not create a placeholder report.

## 12. Implementation Phases

### Phase 0 - Preflight And Backup

1. Resolve timestamp.
2. Check whether the skill directory exists.
3. If needed, create a timestamped backup.
4. Record preflight status for the final manifest.

Acceptance:

- The executor knows whether this is a fresh install or update.
- No existing skill content is lost.

### Phase 1 - Create Or Update Skill Skeleton

Fresh install path:

- Run the corrected initializer command from section 5.

Existing install path:

- Do not run the initializer.
- Update existing files in place after backup.

Acceptance:

- Skill directory exists.
- `SKILL.md` exists.
- `agents/openai.yaml` exists.
- `references/` exists.
- `scripts/` exists.

### Phase 2 - Write `SKILL.md`

Replace generated placeholder content with final instructions.

Hard checks:

```bash
rg -n 'TODO|\\[TODO|placeholder' /Users/arun.prakash/.codex/skills/adversarial-review/SKILL.md
```

Expected:

- No TODO or generated placeholder text remains.

Acceptance:

- Frontmatter is present.
- Description is narrow and includes "Do not use for ordinary code review requests..."
- Body includes target resolution, severity, redaction, direct-write, and template-loading rules.
- Body stays under 500 lines.

### Phase 3 - Write `references/report-template.md`

Create the full report template from section 8.

Acceptance:

- Template includes `Plan Revision Inputs`.
- Template says "No P0 findings found" must be explicit when applicable.
- Template includes `Go / No-Go Recommendation`.

### Phase 4 - Write `scripts/report_path.py`

Implement the helper script from section 9.

Acceptance:

- Script is executable or runnable through `python3`.
- Uses standard library only.
- Prints JSON only.
- Never overwrites existing files.
- Suffixes collisions with `_02`, `_03`, and so on.

### Phase 5 - Fix And Validate `agents/openai.yaml`

Expected content:

```yaml
interface:
  display_name: "Adversarial Review"
  short_description: "Brutally honest plan and work reviews"
  default_prompt: "Use $adversarial-review to do a brutally honest adversarial review of this implementation plan and create a timestamped Markdown report."
```

Policy decision:

- Do not add `policy.allow_implicit_invocation` unless the local schema explicitly supports it.
- The current generator writes only `interface:` fields, so the revised plan does not require a policy block.
- Rely on default implicit invocation behavior and validate actual triggering separately.

Hard checks:

```bash
rg -n 'default_prompt: "Use \\$adversarial-review' /Users/arun.prakash/.codex/skills/adversarial-review/agents/openai.yaml
rg -n 'Use -review' /Users/arun.prakash/.codex/skills/adversarial-review/agents/openai.yaml
```

Expected:

- First command finds the default prompt.
- Second command finds nothing.

### Phase 6 - Structural Validation

Run:

```bash
python3 /Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  /Users/arun.prakash/.codex/skills/adversarial-review
```

Known runtime caveat:

- If this fails because `yaml` is missing, fix the validation runtime by using a Python environment that has PyYAML or installing PyYAML in a local user environment.
- Do not mark structural validation complete until `quick_validate.py` runs successfully.

Also validate:

```bash
python3 -m py_compile /Users/arun.prakash/.codex/skills/adversarial-review/scripts/report_path.py
```

### Phase 7 - Helper Script Test Matrix

Use a temporary directory for test files.

Test cases:

1. **Target file only**
   - Input: existing target file and subject.
   - Expected: report path is in target file parent.

2. **Output directory only**
   - Input: output dir and subject.
   - Expected: report path is in output dir.

3. **Both target file and output directory**
   - Input: existing target file, output dir, subject.
   - Expected: output dir wins.

4. **Neither target file nor output directory**
   - Expected: non-zero exit.

5. **Missing target file**
   - Expected: non-zero exit.

6. **Missing output directory**
   - Expected: non-zero exit.

7. **Collision**
   - Create a file at the first generated path using `--now`.
   - Run script again with same inputs.
   - Expected: second path ends in `_02.md`.

8. **Subject sanitization**
   - Input: `v0.8.0 safe capture upgrades!`
   - Expected: `V0_8_0_SAFE_CAPTURE_UPGRADES`.

Acceptance:

- All eight test cases pass.
- The script emits valid JSON for success cases.

### Phase 8 - Seeded Defect Quality Test

Create a temporary flawed plan artifact outside the final skill folder.

The seeded plan must intentionally include:

- a command with a shell quoting bug around `$adversarial-review`
- broad trigger wording that hijacks normal code review
- validation that only checks file existence
- no redaction rule
- ambiguous output folder behavior
- no rerun-safe existing-skill branch

Prompt a fresh reviewer context or available subagent with only:

```text
Use $adversarial-review to do a brutally honest adversarial review of this implementation plan and create a timestamped Markdown report.
<path to seeded plan>
```

Minimum pass threshold:

- Report is created beside the seeded plan.
- Report includes at least one P0.
- Report catches the shell quoting bug.
- Report catches insufficient trigger validation.
- Report catches broad trigger risk.
- Report catches missing redaction rules.
- Report includes Plan Revision Inputs.

If a subagent/fresh context is unavailable:

- Run the scenario manually.
- Mark "fresh-context quality validation" as not fully verified in the manifest.
- Do not claim complete skill activation validation.

### Phase 9 - Trigger And Non-Trigger Validation

Best path:

- Use a fresh Codex thread, fresh turn, or subagent so the skill metadata can be loaded from disk.

Validation prompts:

1. Explicit invocation:

```text
Use $adversarial-review to critique this plan and create a report: <path>
```

Expected:

- Skill loads.
- Report is created beside the plan.

2. Natural language adversarial invocation:

```text
Do a brutal adversarial review of this implementation plan and create a markdown report: <path>
```

Expected:

- Skill loads or behavior matches skill instructions.
- Report is created beside the plan.

3. Self-critique invocation:

```text
Self-critique the work we just did, be brutally honest, and create a report.
```

Expected:

- Skill behavior activates.
- If scope is ambiguous, agent asks one concise question.

4. Non-trigger ordinary code review:

```text
Review my local code changes.
```

Expected:

- Agent uses normal code-review stance, not the adversarial report-writing skill.

Acceptance:

- Record actual behavior in the install manifest.
- If true fresh-context testing is not possible in this turn, state that clearly and leave it as a remaining verification step.

### Phase 10 - Real Artifact Smoke Test

Use the original skill implementation plan as the target:

```text
/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/adversarial-review-skill-implementation-plan-2026-06-10_18-25-40_IST.md
```

Expected:

- Report is created in the same `docs/plans/` folder.
- Filename includes timestamp.
- Findings lead the report.
- It catches at least the known prior findings:
  - shell quoting bug
  - missing fresh-context activation validation
  - missing existing-skill path
  - weak acceptance criteria

This smoke test may create a duplicate conceptual report, but it is acceptable because the skill must prove same-folder behavior on a real artifact.

### Phase 11 - Install Manifest

Create:

```text
/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/adversarial-review-skill-install-manifest-<timestamp>.md
```

Manifest contents:

- timestamp
- install path
- whether this was fresh install or update
- backup path if created
- files installed
- checksums for:
  - `SKILL.md`
  - `agents/openai.yaml`
  - `references/report-template.md`
  - `scripts/report_path.py`
- validation outcomes:
  - `quick_validate.py`
  - `py_compile`
  - helper script matrix
  - metadata assertions
  - seeded defect test
  - trigger validation
  - non-trigger validation
  - real artifact smoke
- any remaining unverified items

## 13. Acceptance Criteria

The skill is complete only when all required criteria pass:

1. Skill exists at `/Users/arun.prakash/.codex/skills/adversarial-review/`.
2. `SKILL.md` frontmatter validates.
3. `SKILL.md` has no generated TODO placeholders.
4. `agents/openai.yaml` contains `$adversarial-review`, not `-review`.
5. `references/report-template.md` exists and includes `Plan Revision Inputs`.
6. `scripts/report_path.py` compiles.
7. `report_path.py` passes the eight-case helper test matrix.
8. `quick_validate.py` succeeds using a Python environment with PyYAML.
9. Seeded defect test catches the required seeded risks.
10. Explicit `$adversarial-review` invocation is tested in the freshest available context.
11. Natural-language adversarial invocation is tested in the freshest available context.
12. Ordinary code review prompt does not get converted into an adversarial report workflow.
13. Real artifact smoke test creates a report in the target artifact's folder.
14. Redaction rules are present in the skill body.
15. Install manifest is created with paths, checksums, and validation outcomes.

## 14. No-Go Gates

Do not mark the skill complete if any of these happen:

- `$adversarial-review` is corrupted to `-review`.
- The skill directory exists and no backup/update decision was made.
- `quick_validate.py` is skipped without a documented runtime reason.
- `report_path.py` fails any helper test.
- The seeded defect report misses the shell quoting bug.
- The skill trigger is not tested in a fresh or near-fresh context.
- The skill triggers for plain "Review my local code changes" without adversarial wording.
- The final manifest is missing.

## 15. Execution Order

1. Run preflight.
2. Initialize or safely update skill directory.
3. Write `SKILL.md`.
4. Write `references/report-template.md`.
5. Write `scripts/report_path.py`.
6. Validate `agents/openai.yaml`.
7. Run structural validation.
8. Run helper script test matrix.
9. Run seeded defect quality test.
10. Run trigger and non-trigger validation in the freshest available context.
11. Run real artifact smoke test.
12. Create install manifest.
13. Report final status, including any unverified activation caveat.

## 16. Residual Risk

Even after this plan is executed, one residual risk remains: a skill can guide judgment, but it cannot make judgment deterministic. The practical mitigation is repeated use on real plans, then tightening `SKILL.md` when the skill misses important issues or produces generic findings.

## 17. Next User Action

To create the actual skill, the next user action is:

```text
execute
```

Execution should follow this revised plan, not the superseded original plan.
