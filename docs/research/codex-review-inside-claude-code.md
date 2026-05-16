---
title: Calling Codex for Adversarial Review From Inside Claude Code
date: 2026-05-15
authored_by: Claude (Opus 4.7) via guide subagent
audience: Arun (non-technical) — primary; future agent secondary
status: Research deliverable; §6 is ready to copy-paste today
companion_doc: docs/research/codex-adversarial-review-of-claude-code.md (covers standalone Codex CLI usage; this doc covers integration INSIDE Claude Code)
sources:
  - https://github.com/AmirShayegh/codex-claude-bridge (npm: codex-claude-bridge v1.0.0, 16★ as of 2026-05-15)
  - https://github.com/spyrae/claude-concilium (8★, 2026-05-07)
  - https://github.com/sipyourdrink-ltd/bernstein (365★, 2026-05-15) — orchestrator, NOT a Claude Code plugin
  - https://github.com/jaspertvdm/mcp-server-openai-bridge (1★, 2026-01-24) — dormant
  - https://code.claude.com/docs/en/discover-plugins.md (official Anthropic marketplace)
  - https://modelcontextprotocol.io
---

# Calling Codex for Adversarial Review From Inside Claude Code

> **Plain-language summary, lead with the outcome.** You don't need to leave Claude Code to get a Codex review. You can either (1) install a community npm package that adds 5 review tools to Claude (5-min install, but small project, 16 stars), or (2) write a one-file custom skill that shells out to `codex` and pastes the result into the current turn (15-min setup, zero dependencies, fully under your control). The second option is what I recommend. The whole loop becomes typing `/codex-review` inside Claude Code.

---

## §1. The honest sourcing note up front

The user has been burned before by plausible-sounding-but-fabricated tool names. So here is the verification status of every option below:

| Item | Verified? | Stars / freshness |
|---|---|---|
| `codex-claude-bridge` (npm + GitHub) | YES — npm v1.0.0 published; repo exists | 16★, last commit 2026-05-14 |
| `spyrae/claude-concilium` | YES — repo exists | 8★, 2026-05-07 |
| `sipyourdrink-ltd/bernstein` | YES — repo exists, but wrong tool for this job (it's an orchestrator, not a Claude Code plugin) | 365★, 2026-05-15 |
| `jaspertvdm/mcp-server-openai-bridge` | YES, but dormant | 1★, 2026-01-24 |
| Generic `codex-review`, `second-opinion`, `gpt-review`, `dual-model-review` plugins/skills | **NO** — searched the official marketplace, MCP registry (modelcontextprotocol.io), glama.ai (~23k servers), GitHub. No published plugin or skill with those names exists from a well-maintained source as of 2026-05-15. Don't let a future agent invent one. | n/a |

If a future doc references a tool not on this table, treat it as unverified.

---

## §2. The five integration patterns — at a glance

| # | Pattern | Effort | Trust dependency | When to use |
|---|---|---|---|---|
| 1 | **Custom skill** (Bash + `codex` CLI) | 15 min | Zero — fully your code | **Recommended primary** |
| 2 | **`codex-claude-bridge` MCP server** | 5 min | npm package, 16★, single maintainer | If you want named tool calls and tolerate small-project risk |
| 3 | **Custom subagent** (delegates to Codex via Bash) | 30 min | Zero | When Codex output volume is hurting your main context window |
| 4 | **Stop / PostToolUse hook** (auto-fires) | 30 min | Zero | Almost never — noisy + expensive |
| 5 | **Published plugin from the marketplace** | n/a | n/a | **Does not exist** for this use case as of today |

The rest of this doc is each pattern in detail, then a recommendation.

---

## §3. Pattern 1 — custom skill (RECOMMENDED)

A "skill" is a markdown file with frontmatter that Claude Code loads on demand. The skill body can use the special `` ```! `` fenced block to inject shell-command output directly into the prompt — meaning you can run `git diff` and `codex` once, and Claude sees both outputs as if they were typed by you.

**Where the file goes:**

- Personal use across all projects: `~/.claude/skills/codex-review/SKILL.md`
- Project-only: `.claude/skills/codex-review/SKILL.md`

**The complete file (copy verbatim):**

````markdown
---
name: codex-review
description: Runs an adversarial Codex review of the current staged diff or a named target (HEAD / file path). Use when the user asks for a second opinion, a Codex review, a GPT review, or an adversarial review.
disable-model-invocation: true
allowed-tools: Bash(git diff *) Bash(codex *)
argument-hint: "[staged|HEAD|<file-path>]"
---

## Adversarial Codex Review

Target: $ARGUMENTS (defaults to staged diff if empty)

## Current diff

```!
TARGET="${ARGUMENTS:-HEAD}"
if [ "$TARGET" = "staged" ]; then
  git diff --cached
elif [ -f "$TARGET" ]; then
  git diff HEAD -- "$TARGET"
else
  git diff "$TARGET"
fi
```

## Codex review output

```!
TARGET="${ARGUMENTS:-HEAD}"
if [ "$TARGET" = "staged" ]; then
  DIFF=$(git diff --cached)
else
  DIFF=$(git diff "${TARGET:-HEAD}")
fi
printf '%s' "$DIFF" | codex exec --sandbox read-only --skip-git-repo-check \
  "You are an adversarial code reviewer. Review this diff for: 1) logic bugs, 2) security issues, 3) missing edge cases, 4) API misuse, 5) anything the original author may have missed. Cite line numbers. Output as a numbered list with severity tags [BLOCKER|BUG|SMELL|TEST-GAP|DOC-LIE]."
```

## Instructions for Claude

Present the Codex output above as a structured review. For each finding:
- State whether you agree, disagree, or partially agree, and why.
- Suggest a concrete fix if you agree.
- Flag false positives explicitly.

End with a verdict: PASS, NEEDS-MINOR-FIXES, or NEEDS-MAJOR-FIXES.
````

**How to invoke:**

```
/codex-review                  # reviews uncommitted diff vs HEAD
/codex-review staged           # reviews what's staged for commit
/codex-review src/proxy.ts     # reviews changes to a specific file
```

**What happens under the hood:**
1. Claude Code loads the skill, sees two `` ```! `` blocks.
2. The shell runs both blocks (`git diff` + piped `codex exec`).
3. The text output of both is inlined into the prompt.
4. Claude reads Codex's findings + your diff, synthesizes the review, gives a verdict.
5. All in **one turn**, no context switch out of Claude Code.

**Prerequisites:**
- `codex` CLI installed + authenticated (`brew install --cask codex` + `codex login`). See companion doc `codex-adversarial-review-of-claude-code.md` §3.
- `Bash(codex *)` allow-listed in `~/.claude/settings.json` `permissions.allow` (otherwise Claude prompts on every run).

**Pros:** Zero third-party dependency. Fully under your control. Edit the prompt anytime. Inline output. Works on Codex CLI v0.130+.

**Cons:** Codex's full stdout enters Claude's context window — for very large diffs that's tokens you'd save with the subagent pattern (§5). One file per skill; if you want a "review just this design doc" variant, add a sibling skill like `codex-doc-review` rather than overloading one.

---

## §4. Pattern 2 — `codex-claude-bridge` MCP server

The most "click-and-go" option, with the dependency-on-a-small-project caveat.

**What it is:** An npm package (`codex-claude-bridge`) that runs as an MCP server. Once registered with Claude Code, it adds 5 tools that Claude can call directly: `review_plan`, `review_code`, `review_precommit`, `review_status`, `review_history`. Each tool sends content to Codex/GPT-5 and returns structured JSON.

**Repo:** https://github.com/AmirShayegh/codex-claude-bridge

**Trust profile:** 16 stars, single maintainer, last commit 2026-05-14. Active but not battle-tested. Pin a version when you install.

**Install (one-time):**

```bash
# Prereq: Codex CLI installed and logged in
codex login        # OR set OPENAI_API_KEY

# Register the MCP server with Claude Code
claude mcp add codex-bridge -- npx -y codex-claude-bridge@1.0.0
# (pin the version explicitly — npm `latest` may break you)
```

**Verify:**

```
/mcp
# Expect to see "codex-bridge" listed with 5 tools
```

**Use:** In any Claude Code session, ask naturally:

> "Use the codex-bridge `review_code` tool on `git diff HEAD`."

Claude runs the diff, calls the MCP tool, presents Codex's structured response.

**Config knobs** (per the repo's README): a project-level `.reviewbridge.json` overrides the model (defaults to `gpt-5.5`; you can set `gpt-5.4` or `gpt-5.3-codex`).

**Pros:** Five named tools instead of one skill — Claude can pick the right one based on intent. JSON-structured output is easier to synthesize than free-form text.

**Cons:** 16★ project, single maintainer, only v1.0.0 released — non-trivial fork-or-fix risk if the model string lags OpenAI's actual catalog. The default `gpt-5.5` model name should be verified against your account's available models before relying on it.

**Decision rule:** If you start with the skill (§3) and find yourself wanting "named review tools" for plan vs code vs precommit, upgrade to this. If the skill works, don't.

---

## §5. Pattern 3 — custom subagent

A subagent runs in its own context window and returns a compact summary to the parent. Useful when Codex output is bulky and you want it kept out of your main conversation.

**Critical constraint:** The `model` field in a Claude Code subagent definition only accepts Claude model IDs (`sonnet`, `opus`, `haiku`, `claude-opus-4-7`, `inherit`). **There is NO way to make the subagent itself run on GPT-5/Codex inference.** The subagent runs on Claude, and calls Codex as an external command via Bash. This is the same shape as the skill, just in an isolated context.

**Where the file goes:** `.claude/agents/codex-reviewer.md` (project) or `~/.claude/agents/codex-reviewer.md` (personal).

**The file:**

```markdown
---
description: Adversarial code reviewer that delegates to Codex CLI for a second opinion. Invoke when the user asks for a Codex review, second opinion, or adversarial review.
model: haiku
tools: Bash(git diff *) Bash(codex *)
---

You are an adversarial code review coordinator. When invoked:

1. Run `git diff HEAD` to capture the current diff.
2. Pipe the diff to `codex exec --sandbox read-only --skip-git-repo-check` with this prompt:
   "Adversarial review. Find bugs, security issues, missing edge cases, API misuse. Tag each finding [BLOCKER|BUG|SMELL|TEST-GAP|DOC-LIE]. Cite line numbers."
3. Read Codex's findings.
4. For each finding, note agreement/disagreement and a concrete fix.
5. Return a SHORT summary to the parent: verdict (PASS/NEEDS-MINOR-FIXES/NEEDS-MAJOR-FIXES) plus the top 3 findings.
```

**Use Haiku** as the model — the subagent's only inference work is wrapping Codex output. Cheap.

**Pros:** Raw Codex output stays out of your main session context. Better for high-frequency review use.

**Cons:** Subagents don't inherit your conversation context. You must brief them every time ("review the staged changes"). Setup is bulkier than a skill. The Codex CLI must be on `PATH` in the subagent's spawn environment.

**Decision rule:** Start with the skill (§3). Promote to a subagent if reviews start pushing your context window past comfortable thresholds.

---

## §6. Pattern 4 — hooks (don't, but here's why)

Two hook events could in principle fire Codex automatically:

1. **`Stop`** — fires when Claude finishes a turn.
2. **`PostToolUse` with matcher `Write|Edit`** — fires when Claude modifies a file.

Either can shell out to `codex` and inject the result back via `additionalContext`. Mechanically it works.

**Why not to:**

| Concern | Stop hook | PostToolUse hook |
|---|---|---|
| Fires on trivial turns | Yes (typo replies, clarifications) | No |
| Fires per file edit (could be 5+ per task) | n/a | Yes — every Edit triggers a full Codex review |
| Adds latency to every turn | Yes | Yes |
| Token cost of `additionalContext` accumulating | High | Medium |
| Risk of feedback loop (Codex flags → Claude fixes → Codex flags again) | Real | Real |

The whole point of adversarial review is *deliberate* deployment — you choose when to invite the second voice. Automating it dilutes the signal and burns tokens.

**Verdict:** skip hooks for this. The skill (§3) is explicit, fast, and keeps you in control of when Codex speaks.

---

## §7. What does NOT exist (don't let an agent fabricate these)

To save the next session from inventing tooling that isn't there:

- ❌ No official Anthropic plugin named `codex-review`, `second-opinion`, `gpt-review`, `dual-model-review`, or `openai-review`.
- ❌ No purpose-built MCP server in the official MCP registry (modelcontextprotocol.io) for adversarial Codex review. The closest real option is `codex-claude-bridge` (community npm, 16★).
- ❌ No way to set `model: gpt-5.4` or any OpenAI ID on a Claude Code subagent — subagent inference is Claude-only.
- ❌ `bernstein` (sipyourdrink-ltd, 365★) is real but wrong tool — it's a parallel-CLI orchestrator, not a Claude Code plugin. Output goes to a TUI dashboard, not inline in Claude Code.
- ❌ `jaspertvdm/mcp-server-openai-bridge` exists but is dormant (1★, 4 months stale). Don't bet on it.

If you read a future doc claiming any of the above, suspect fabrication and verify before installing.

---

## §8. The recommended path for this project

Given the AI Brain repo's setup (you on Claude Opus 4.7, GSD-style planning + execution rhythm, daily-ish review need, allergy to new dependencies), here is the order:

### Step 1 — Install Codex CLI (5 min, prerequisite)

Per `docs/research/codex-adversarial-review-of-claude-code.md` §3:
```bash
brew install --cask codex
codex login
```

### Step 2 — Add `Bash(codex *)` to your Claude Code allow-list (1 min)

Edit `~/.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "...existing entries...",
      "Bash(codex *)",
      "Bash(git diff *)"
    ]
  }
}
```

### Step 3 — Drop the `codex-review` skill in place (5 min)

Create `~/.claude/skills/codex-review/SKILL.md` with the contents from §3 above.

### Step 4 — Test it on a real diff (5 min)

Make a trivial edit (or use the currently uncommitted `RUNNING_LOG.md` change), then in any Claude Code session type:
```
/codex-review
```

Expected: Claude shows your diff, Codex's findings, then Claude's synthesis with a verdict. All in one turn.

### Step 5 — (Optional, only if §3 isn't enough) install `codex-claude-bridge`

If after a week of using the skill you wish you had distinct "review_plan" vs "review_code" tools, add the MCP server:
```bash
claude mcp add codex-bridge -- npx -y codex-claude-bridge@1.0.0
```

### Step 6 — (Optional, later) promote to subagent

When you're running 5+ reviews per session and context cost shows up, copy the skill prompt into `~/.claude/agents/codex-reviewer.md` per §5.

**Skip these:** hooks, bernstein, claude-concilium, jaspertvdm bridge, marketplace-search-for-plugin (none exists).

---

## §9. Cheat sheet

```bash
# One-time setup
brew install --cask codex && codex login
# Add Bash(codex *) to ~/.claude/settings.json permissions.allow
# Drop ~/.claude/skills/codex-review/SKILL.md (template in §3)

# Inside any Claude Code session
/codex-review                          # diff vs HEAD
/codex-review staged                   # what's staged
/codex-review docs/plans/v0.6.x-foo.md # specific file
```

That's the whole loop. Codex's findings appear inside the Claude turn; Claude synthesizes them; you decide what to act on.

*End of doc. Total length: ~12 KB. Authored 2026-05-15 15:15 IST.*
