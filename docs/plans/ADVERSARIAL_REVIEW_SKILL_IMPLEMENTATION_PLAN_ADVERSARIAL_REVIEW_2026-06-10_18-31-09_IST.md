# Adversarial Review Skill Implementation Plan - Adversarial Review

**Created:** 2026-06-10 18:31:09 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/adversarial-review-skill-implementation-plan-2026-06-10_18-25-40_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/docs/plans/ADVERSARIAL_REVIEW_SKILL_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-10_18-31-09_IST.md`

## Executive Verdict

No-go as written.

The plan has the right instinct, but it is not yet a reliable implementation plan. It can produce files that look like a finished skill while failing to prove the skill is discoverable, triggerable, safe to rerun, or meaningfully better than a prompt template. The biggest problem is validation theater: the plan says "forward-test" but does not require a fresh Codex context, subagent validation, or any direct proof that the new skill metadata is actually loaded. A future agent could execute the plan, run all listed checks, and still leave the user with a skill that does not activate when they ask for an adversarial review.

There is also a concrete shell quoting bug in the skeleton command that would corrupt the default prompt before the skill is created. That is not theoretical; a shell expands `$adversarial-review` into `-review` when no `adversarial` variable is set.

## Evidence Inspected

- Target plan, lines 1-500.
- Skill initializer behavior in `/Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/init_skill.py`, especially lines 271-317 and 352-357.
- OpenAI YAML generator behavior in `/Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py`, especially lines 156-185.
- Skill validator behavior in `/Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/quick_validate.py`, especially lines 10-11 and 15-91.
- Skill creator guidance in `/Users/arun.prakash/.codex/skills/.system/skill-creator/SKILL.md`, especially the guidance that frontmatter drives triggering and forward tests should use subagents with minimal leaked context.
- Shell behavior check:
  - `printf '%s\n' "Use $adversarial-review to do a brutally honest adversarial review"`
  - Actual output: `Use -review to do a brutally honest adversarial review`
- Filesystem check:
  - `/Users/arun.prakash/.codex/skills/adversarial-review` does not currently exist.

## Findings

### P0 - Must Fix Before Execution

#### 1. The validation plan does not prove the skill will actually trigger

**Evidence:** The plan's forward tests are described as "manual scenario checks" at lines 422-443. Acceptance criterion 2 says the skill is complete when "It triggers for adversarial review, self-critique, and implementation plan critique prompts" at lines 458-460. But the plan does not define how to run those prompts in a fresh Codex context where the newly created skill is actually part of the available skill metadata.

**Why it matters:** A skill is only useful if Codex discovers it from metadata and loads it when the user speaks naturally. Creating `/Users/arun.prakash/.codex/skills/adversarial-review/SKILL.md` is not the same thing as proving the current or next agent will see and use it.

**Failure mode:** The agent executes the plan, creates files, manually simulates the review workflow, marks the skill accepted, and the user's next prompt "Do an adversarial review" still does not load the skill. The user gets a nice folder, not a working capability.

**Recommendation:** Add a hard validation phase:

1. Verify the skill appears in the available skill list in a fresh Codex turn or fresh thread.
2. Run at least one explicit invocation using `$adversarial-review`.
3. Run at least two implicit natural-language invocations without mentioning the skill name.
4. Use a separate subagent or fresh thread for at least one test, with only the target artifact and the user-style request.
5. Record whether the skill loaded automatically, not merely whether the current agent can follow the intended workflow manually.

#### 2. The implementation command corrupts the default prompt because `$adversarial-review` is double-quoted

**Evidence:** The plan's initializer command uses:

```bash
--interface default_prompt="Use $adversarial-review to do a brutally honest adversarial review of this implementation plan and create a timestamped Markdown report."
```

This appears at lines 352-359. A shell expands `$adversarial-review` before Python receives it. Confirmed shell output:

```text
Use -review to do a brutally honest adversarial review
```

The OpenAI YAML generator writes interface values exactly as received, per `/Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py` lines 156-185.

**Why it matters:** The default prompt is one of the few user-facing affordances for the skill. The skill-creator reference explicitly says the default prompt must mention `$skill-name`. The plan's command silently destroys that requirement.

**Failure mode:** `agents/openai.yaml` is generated with `Use -review...`, making the skill look broken in the UI and violating the platform's own metadata guidance.

**Recommendation:** Use single quotes or escape the dollar sign:

```bash
--interface default_prompt='Use $adversarial-review to do a brutally honest adversarial review of this implementation plan and create a timestamped Markdown report.'
```

Also add a post-generation assertion:

```bash
rg -n '\\$adversarial-review' /Users/arun.prakash/.codex/skills/adversarial-review/agents/openai.yaml
```

#### 3. The plan has no idempotent rerun or existing-skill path

**Evidence:** The initializer refuses to create the skill if the directory exists, per `/Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/init_skill.py` lines 274-277. The plan says to run the initializer at lines 352-359 but does not include an existing-directory path. The current filesystem check shows the skill does not exist now, but a rerun after a partial execution will hit this problem.

**Why it matters:** This user frequently asks "execute" after plan creation, then asks for revised plans and re-execution. A one-shot plan that fails on the second attempt is fragile.

**Failure mode:** The first execution creates the folder but fails later during validation. A second execution hits "Skill directory already exists" and stalls. Worse, a future agent may delete the folder to rerun the initializer and lose useful work.

**Recommendation:** Add a safe existing-skill branch:

- If the folder does not exist, initialize it.
- If the folder exists and has only generated placeholder content, update it in place.
- If the folder exists with meaningful content, inspect it and create a timestamped backup before editing.
- Never delete the skill directory just to satisfy the initializer.

#### 4. The acceptance criteria can pass while the skill remains a prompt template, not a robust workflow

**Evidence:** The plan lists adversarial review passes at lines 138-149 and report output structure at lines 190-258, but it does not include a test artifact with known seeded defects, a rubric for expected findings, or a threshold for "good enough." Forward-test scenarios at lines 426-443 only check that reports appear and include line references.

**Why it matters:** The skill's purpose is quality of judgment, not file generation. A weak skill can create a timestamped Markdown report with severity headings and still miss the hard issues.

**Failure mode:** The skill passes because it writes a report in the right place, even if the report is generic, shallow, polite, or misses known P0 flaws.

**Recommendation:** Add a seeded-fixture test:

- Create one tiny fake implementation plan with known defects.
- Expected findings should include at least:
  - an execution blocker
  - an ambiguous validation criterion
  - a missing rollback or safety step
  - a stale or unsupported assumption
- The test passes only if the report finds the seeded P0/P1 issues with evidence and recommendations.

### P1 - High Risk

#### 5. Trigger wording is too broad and may hijack normal review requests

**Evidence:** The recommended frontmatter at lines 56-60 says to use the skill for "review of recently completed work" and "a report of findings and recommendations." The plan also says the skill covers "a review of recently completed work" at lines 13-15.

**Why it matters:** Codex already has review behavior for code reviews. If this skill triggers on generic "review the work" requests, it may turn ordinary engineering review into a report-writing workflow. That is a bad user experience and can conflict with the built-in instruction that "review" should default to code review.

**Failure mode:** User asks for a normal review of local code changes. The adversarial review skill activates, creates a long Markdown report, and does not provide the concise file-line code findings the user expected.

**Recommendation:** Narrow trigger language:

- Trigger on adversarial, brutal, self-critique, fresh-perspective critique, implementation-plan critique, plan critique, or explicit report creation.
- Do not trigger on generic "review" unless paired with "adversarial", "brutal", "self-critique", "implementation plan", "work recently done", or "create a report."
- Add a body rule: if the user clearly wants code review, follow normal code-review behavior instead.

#### 6. "Redact secrets" is too weak to protect sensitive reports

**Evidence:** The plan only says "Redact secrets from reports" at line 326 and includes "Secret leakage" in the risk table at lines 477-478. It does not define redaction patterns, command-output handling, or what to do with private file paths, tokens, chat IDs, webhook URLs, cookies, or API keys.

**Why it matters:** This project has already involved production tokens, Telegram bot configuration, deploy scripts, and health checks. An adversarial review skill will inspect exactly the kinds of logs and files that can expose secrets.

**Failure mode:** The skill quotes a command output, environment variable, token-like value, webhook URL, or private identifier directly into a Markdown report saved under a synced Google Drive folder.

**Recommendation:** Add a concrete redaction checklist:

- Never paste full secrets from `.env`, deploy output, webhook URLs, signed payloads, cookies, API keys, bot tokens, or bearer tokens.
- Mask token-like strings as `<redacted:token>`.
- Quote only the key name and failure shape, not the value.
- Before writing a report, scan the draft for common secret patterns:
  - `TOKEN=`
  - `SECRET=`
  - `Bearer `
  - `bot[0-9]+:`
  - long base64-ish or hex strings
  - webhook query strings with signatures

#### 7. The plan overestimates `quick_validate.py`

**Evidence:** The plan says "Validate Skill Shape" at lines 407-420. But `quick_validate.py` only checks basic `SKILL.md` frontmatter and description constraints, per `/Users/arun.prakash/.codex/skills/.system/skill-creator/scripts/quick_validate.py` lines 15-91. It does not validate:

- `agents/openai.yaml`
- `references/report-template.md`
- `scripts/report_path.py`
- shell quoting
- trigger behavior
- report quality
- same-folder behavior
- redaction behavior

**Why it matters:** The plan creates a false sense of safety. The validator is useful, but it is not a meaningful end-to-end validation for this skill.

**Failure mode:** `quick_validate.py` prints "Skill is valid!" while the helper script is broken, the default prompt is corrupted, and the skill does not trigger.

**Recommendation:** Add explicit validation beyond `quick_validate.py`:

- Run `python3 -m py_compile scripts/report_path.py`.
- Run `report_path.py` for target-file, output-dir, collision, and invalid-directory cases.
- Parse `agents/openai.yaml` or at least assert required strings exist.
- Assert no generated placeholder TODOs remain in `SKILL.md`.
- Assert `$adversarial-review` appears in `agents/openai.yaml`.

#### 8. The helper script requirements contradict themselves

**Evidence:** The plan says the script should "Refuse to return a path that already exists; append a short numeric suffix only if collision occurs" at line 404.

**Why it matters:** Those are mutually different behaviors. Refusing and appending a suffix are not the same policy.

**Failure mode:** The implementer chooses one behavior, tests assume another, and a future report either fails unexpectedly or creates a suffixed file that the report did not predict.

**Recommendation:** Pick one policy. The better policy for this user's workflow is:

- Never overwrite.
- If the timestamped path exists, append `_02`, `_03`, and so on.
- Return the final path in JSON.
- Do not write report content.

#### 9. Same-folder behavior is underspecified for "recent work"

**Evidence:** The plan says file review reports go in the same directory at lines 77-83 and 155-158. For recent work, it says to use `ReviewReport/` when no single artifact is primary at lines 84-90 and 159-163. It does not define how to find the project root, what "nearest" means, or what to do inside nested folders or multiple worktrees.

**Why it matters:** The user's core requirement is "same folder" and timestamped files. Ambiguous placement is one of the easiest ways to make this skill feel unreliable.

**Failure mode:** The agent creates reports in the current shell working directory, the repo root, `docs/plans`, or `ReviewReport/` depending on incidental context. The user cannot find the report.

**Recommendation:** Add deterministic folder resolution:

1. If `--target-file` exists, always use its parent.
2. If reviewing recent work, find the nearest ancestor containing `.git`.
3. If that repo has `ReviewReport/`, use it.
4. Else if the repo has `docs/plans/`, ask whether that folder or repo root is preferred.
5. Else use repo root.
6. Always print the final absolute path in the final response.

#### 10. The plan does not force the report to include "what would change in the revised plan"

**Evidence:** The report template includes "Follow-Up Implementation Plan Inputs" at lines 249-251, but the skill body design at lines 300-327 does not make this a hard requirement. Acceptance criteria at lines 456-467 also do not require the report to be immediately usable as input to a revised plan.

**Why it matters:** The user's workflow is iterative: plan, adversarial review, revised plan, execute. If the critique is not structured as inputs to a revised plan, the next step becomes interpretation work.

**Failure mode:** The report lists problems but does not cleanly tell the next agent what must change in the plan.

**Recommendation:** Make "Plan Revision Inputs" mandatory:

- Required deletions from the old plan.
- Required additions.
- Required acceptance criteria changes.
- Required validation changes.
- Required no-go gates.

### P2 - Medium Risk

#### 11. The plan ignores the skill discovery lifecycle after file creation

**Evidence:** The plan says the skill should live in `/Users/arun.prakash/.codex/skills/adversarial-review/` at lines 27-33 and acceptance says it should appear as a valid skill at lines 456-459. It does not discuss whether the current Codex thread must be restarted, refreshed, or moved to a new turn before the skill metadata appears.

**Why it matters:** Skills are listed in the model context at session start or turn construction. A newly written skill may not be visible to the same running assistant immediately.

**Failure mode:** The executor tries to test the skill in the same context that created it, accidentally relying on the conversation memory rather than actual skill loading.

**Recommendation:** Add an explicit lifecycle note:

- After creating the skill, validate filesystem structure immediately.
- Validate actual invocation in a fresh Codex turn/thread if possible.
- If fresh-context testing is unavailable, state clearly that activation is not fully verified yet.

#### 12. The skill is stored outside the project without a versioned source-of-truth

**Evidence:** The plan creates the skill under `/Users/arun.prakash/.codex/skills/` at lines 27-33. That folder is personal runtime state, not part of the AI Brain project repo. The plan does not specify whether to copy the final skill definition into the project docs or commit it anywhere.

**Why it matters:** The skill can be lost, overwritten, or drift without history. The implementation plan itself is versioned in project docs, but the actual skill may not be.

**Failure mode:** Months later, the user asks why the skill changed or disappeared. There is no project-level source-of-truth for what was installed.

**Recommendation:** Add one of these:

- Store a read-only copy of the final `SKILL.md` under project docs after installation.
- Or update a running log with the installed skill path and hash.
- Or create a small manifest report that records file paths, checksums, and validation status.

#### 13. `agents/openai.yaml` policy expectations do not match the generator

**Evidence:** The plan recommends:

```yaml
policy:
  allow_implicit_invocation: true
```

at lines 334-342. But `generate_openai_yaml.py` writes only `interface:` keys, per lines 171-185. It does not generate a `policy:` block.

**Why it matters:** This creates confusion about whether implicit invocation is explicitly configured. The skill may still default to implicit invocation, but the plan implies a file content that the initializer will not produce.

**Failure mode:** The executor believes the policy is present because the plan said so. It is not. Or the executor manually edits it without validating whether this schema is accepted in this environment.

**Recommendation:** Decide:

- If default implicit invocation is enough, remove the policy block from the expected generated metadata.
- If explicit policy is required, add a manual edit step and validate `agents/openai.yaml` afterward.

#### 14. The report template is likely to duplicate too much content from `SKILL.md`

**Evidence:** The plan includes a full report structure at lines 190-256 and says to create `references/report-template.md` at lines 386-392. The skill body design at lines 300-327 may also include report rules. Skill-creator guidance warns to avoid duplication between `SKILL.md` and references.

**Why it matters:** Duplicate instructions drift. When a future agent changes one copy, the skill may start producing inconsistent reports.

**Failure mode:** `SKILL.md` says one structure, `report-template.md` says another, and reports become inconsistent depending on which content the agent loaded.

**Recommendation:** Keep only the minimal report contract in `SKILL.md`. Put the full template in `references/report-template.md`, and explicitly instruct the agent to read that template only when writing a report.

#### 15. There is no "do not ask for confirmation" rule for report writing

**Evidence:** The user asked for a skill that creates the Markdown report each time. The plan says reports should be created, but it does not explicitly say whether the skill should write the report directly or ask for confirmation after drafting. The running-log skill has a confirmation model; this skill should not copy that accidentally.

**Why it matters:** The user's pattern is explicit: create the report as a Markdown file. Asking for a confirmation every time would add friction and violate the intended workflow.

**Failure mode:** Agent drafts a report in chat and asks "Should I create it?", forcing an extra turn.

**Recommendation:** Add a hard behavior rule:

- If the user asks to create the adversarial review report, write it directly.
- Ask only when the target artifact or output folder is ambiguous.

#### 16. The plan does not define how to handle screenshots or non-Markdown targets

**Evidence:** The plan assumes a file path can be read as text at lines 77-83 and that report evidence can cite file/line references. The user's review requests may involve screenshots, PDFs, generated artifacts, browser state, or work done recently rather than a single Markdown file.

**Why it matters:** The skill will be used in messy real work. A brittle text-only review process will fail on common artifacts.

**Failure mode:** The agent cannot review a screenshot-backed implementation plan, a browser UI, or a folder of work and either refuses too early or fabricates evidence.

**Recommendation:** Add artifact handling rules:

- For images, inspect visually and reference the image path.
- For PDFs/docs, extract or inspect with appropriate tools before reviewing.
- For folders, inspect manifest, git status, and relevant docs.
- For browser/UI work, use screenshots only when the user specifically asks or the UI is central to the reviewed work.

### P3 - Low Risk Or Polish

#### 17. The plan's filename is lower-case while its own proposed report filenames are upper-case

**Evidence:** The implementation plan file is lower-case with hyphens. The report naming rule at lines 169-188 requires uppercase subject slugs and underscores.

**Why it matters:** Not a functional issue, but it reveals a naming convention split. The skill should not force all outputs into a style that conflicts with surrounding project conventions unless there is a reason.

**Recommendation:** Keep report filenames uppercase if that is the desired report style, but note that implementation plans may remain lower-case project docs. Do not generalize one convention to all artifacts.

#### 18. "Brutal" needs a definition, not just attitude words

**Evidence:** The stance section at lines 124-136 says be skeptical and do not soften findings. That is useful, but "brutal" is still subjective.

**Why it matters:** Without a concrete standard, different agents will interpret "brutal" as either performative harshness or normal critique.

**Recommendation:** Define brutal as:

- evidence-first
- no praise-first framing
- every claim tested against failure modes
- no invented severity
- explicit no-go recommendation when warranted
- concrete revision inputs

## What The Original Plan Gets Wrong

The plan confuses file creation with capability creation. A Codex skill is not "done" when `SKILL.md` exists. It is done when the model can discover it, select it for the right user prompts, avoid selecting it for the wrong prompts, and produce reliably useful output.

The plan also treats validation as a checklist of surface properties. The user's desired skill is fundamentally a judgment workflow. A report that exists in the right folder is not enough. A report with headings is not enough. A report with P0/P1 labels is not enough. The skill needs seeded adversarial tests to prove it can catch real defects.

Finally, the plan contains an actual execution bug in the command that creates UI metadata. This is exactly the kind of simple-but-costly issue an adversarial review should catch.

## Missing Validation

The plan must add validation for:

- Fresh-context skill discovery.
- Explicit `$adversarial-review` invocation.
- Natural-language implicit invocation.
- Non-triggering for ordinary code review requests.
- Seeded-defect finding quality.
- `report_path.py` compile and behavior tests.
- `agents/openai.yaml` content and `$adversarial-review` preservation.
- Placeholder cleanup from generated templates.
- Secret redaction checks.
- Existing-skill rerun behavior.

## Revised Recommendations

Revise the plan before executing it.

Required changes:

1. Fix the shell quoting bug by single-quoting or escaping `$adversarial-review`.
2. Add an existing-skill/idempotency branch.
3. Add fresh-context or subagent validation for actual skill triggering.
4. Add seeded-defect tests so report quality is evaluated, not only file creation.
5. Narrow trigger wording to avoid hijacking normal code-review requests.
6. Add concrete redaction rules and a pre-write secret scan.
7. Define deterministic recent-work output folder resolution.
8. Add explicit tests for `report_path.py`.
9. Clarify collision behavior: suffix, do not refuse.
10. Clarify whether `policy.allow_implicit_invocation` is expected in `openai.yaml`.
11. Keep the full report template in `references/report-template.md`; keep `SKILL.md` concise.
12. Add a rule to write reports directly when the user asks to create one.

## Go / No-Go Recommendation

No-go for execution as written.

It is safe to execute only after the P0 findings are resolved. The revised plan should be treated as a small skill engineering task with real validation, not as a document-copying exercise.

## Follow-Up Implementation Plan Inputs

The revised implementation plan should include:

- A corrected initializer command using single quotes around the default prompt.
- A preflight step that checks whether `/Users/arun.prakash/.codex/skills/adversarial-review` already exists.
- A safe update path for an existing skill.
- A deterministic `report_path.py` test matrix:
  - target file
  - output directory
  - both arguments
  - neither argument
  - collision
  - invalid directory
- A validation matrix:
  - structural validation
  - helper-script validation
  - UI metadata validation
  - fresh-context trigger validation
  - non-trigger validation
  - seeded-defect report quality validation
- A redaction checklist.
- A final installed-skill manifest with paths, checksums, and validation outcomes.

## Residual Risks

Even after the fixes, one risk remains: skills guide model behavior, they do not guarantee deterministic reasoning quality. The best mitigation is not more prose. It is forward-testing against real artifacts and seeded flawed plans, then tightening the skill based on what it misses.
