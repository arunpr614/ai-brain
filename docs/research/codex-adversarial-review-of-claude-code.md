---
title: Using ChatGPT Codex to Adversarially Critique Claude Code's Work
date: 2026-05-15
authored_by: Claude (Opus 4.7)
audience: Arun (non-technical) — primary user; future agent secondary
status: Research deliverable; ready to act on §6 today
sources:
  - https://github.com/openai/codex (v0.130.0, released 2026-05-08)
  - https://developers.openai.com/codex/cli/slash-commands
  - https://developers.openai.com/codex/agent-approvals-security
  - https://developers.openai.com/codex (product overview)
---

# Using ChatGPT Codex to Adversarially Critique Claude Code's Work

> **Plain-language summary, lead with the outcome.** You can pay $20/month for ChatGPT Plus (or use the plan you already have), install one CLI tool, and have a second AI read everything Claude Code just shipped — looking for bugs, missing tests, security holes, and bad reasoning. Codex has a built-in `/review` command made exactly for this. The whole loop, end-to-end, is a one-liner once it's set up. The rest of this doc walks you through which Codex surface to use, why, exact commands, what prompts to paste, and where the limits are.

---

## §1. The strategic question — why is this a good idea at all?

You already have one strong AI (Claude Code) that builds, fixes, and commits. The risk it can't address on its own is **agreement bias**: an AI that reviews its own diff is the same model with the same blind spots. Two-model review is the cheapest way to catch:

- Logic errors the author rationalized as fine.
- Security regressions the author didn't think to look for.
- Tests that pass but assert nothing meaningful.
- Plans that look thorough but skip a hard subproblem.
- "Self-critique" sections that perform humility without surfacing real issues.

Codex (GPT-5.x family) and Claude Code (Claude 4.x family) come from different labs, are trained on different data mixtures, and disagree often enough on style and architecture that the second pair of eyes is genuinely independent — not just "the same model in a different shirt." The user-visible payoff: fewer ship-breaking bugs caught by you-the-user, not by a CI run.

**This pattern has a name in industry: "AI peer review" or "two-model adversarial review."** It is now a standard step in serious agentic workflows.

---

## §2. The four Codex surfaces — pick the right one

OpenAI ships Codex in four shapes. Each fits a different review job.

| Surface | Where it runs | Best for | Reach for it when |
|---|---|---|---|
| **Codex CLI** | Your laptop terminal | Adversarial review of an uncommitted working tree or a specific branch | You want it RIGHT NOW on what Claude Code just changed |
| **Codex IDE extension** | VS Code / Cursor / JetBrains | Real-time, line-by-line second opinion while you watch | You're reviewing a single file or hunk and want inline annotations |
| **Codex cloud agent** | OpenAI cloud, browser UI | Long-running review of an entire repo without tying up your laptop | A weekend audit; deep multi-hour repo review |
| **Codex GitHub integration** | Triggered by PR / commit | Automated review on every push | You eventually want this as a CI step on `main` |

**Recommended primary surface for your AI Brain workflow: Codex CLI**, with the GitHub integration added later as a "belt and braces" pass on PRs to `main`. Reasons:

1. **Already the right scope.** Claude Code makes changes locally. You want the critique on the same uncommitted tree, before you push.
2. **Same auth model you already pay for.** ChatGPT Plus / Pro covers Codex CLI usage at standard caps; you're not buying a second tool.
3. **Read-only mode exists.** You can lock Codex into "look but don't touch" so it can't fight Claude Code over the same file.
4. **One built-in command does most of the job.** `/review` is purpose-built for this and uses a higher-effort model than the chat default.

The cloud agent is useful for the occasional "audit the whole `ai-brain` repo for security holes" run; not the daily loop.

---

## §3. Install and authenticate (one-time, ~3 minutes)

### 3.1. Install

```bash
# macOS — recommended (Homebrew keeps it updated)
brew install --cask codex

# alternative — npm
npm install -g @openai/codex
```

Confirm:

```bash
codex --version
# expect: codex 0.130.0 (or newer, released 2026-05-08+)
```

### 3.2. Authenticate

Run `codex` once, with no arguments. On first launch it prompts for auth. Pick:

- **Sign in with ChatGPT** (recommended) — uses your existing Plus / Pro / Business plan; no new billing. This is what you want.
- **API key** — alternative; you'd pay per-token to OpenAI on top of your ChatGPT plan. Skip unless you don't have a ChatGPT subscription.

ChatGPT login is browser-based: it pops a URL, you sign in, the CLI inherits the session.

### 3.3. Verify

```bash
codex
# At the prompt, type: /status
# Expect: model = gpt-5.4 (or gpt-5.3-codex), approval = on-request, sandbox = workspace-write
# Then: /quit
```

---

## §4. The mental model — how Codex differs from Claude Code

| Concept | Claude Code | Codex CLI | Implication for your workflow |
|---|---|---|---|
| Approval default | "Default" mode (you approve risky tool calls) | `on-request` (Codex asks before edits / shell / network) | Both are safe by default; Codex's `read-only` is stricter for review |
| Sandbox model | Permission profiles + project trust | Three explicit modes: `read-only`, `workspace-write`, `danger-full-access` | Use `--sandbox read-only` for review |
| Slash commands | `/skill`, `/compact`, custom skills | `/review`, `/diff`, `/model`, `/permissions`, `/init`, `/mcp`, `/fork`, `/side` | `/review` is the killer feature |
| Memory | File-based memory under `~/.claude/.../memory/` | `AGENTS.md` at repo root + `~/.codex/AGENTS.md` global | Co-exist fine; both files can live in the repo |
| Non-interactive | `claude -p "..."` | `codex exec "..."` | Both scriptable; same idea |
| Custom commands | `/commands/*.md` | Plugins + `~/.codex/prompts/*.md` | Reusable critique prompts go here |
| Subagents | Native (`Agent` tool, many subagent types) | Subagent parallelization for complex flows | Codex catching up; CLI side simpler |

**The takeaway:** treat them as peers with different reflexes. Don't ask Codex to fix Claude Code's bug — ask it to point out what's wrong. Hand the criticism back to Claude Code (or a fresh Claude Code session) for the actual fix. This keeps each model in its strength: Codex critiques cleanly, Claude Code edits cleanly.

---

## §5. The `/review` command — what it actually does

`/review` is the single most important built-in for this workflow.

**Purpose** (from OpenAI's docs, verbatim): *"Run after Codex completes work or when you want a second set of eyes on local changes."*

**Default behavior:**
- Analyzes the working tree (uncommitted changes by default).
- Focuses on behavioral changes and missing test coverage.
- Uses the current session model **unless `review_model` is configured in `~/.codex/config.toml`**.

**What it produces:** a structured critique. In practice you'll see findings tagged by severity (bug / smell / missing test / suggestion) with a code citation per finding.

**The non-obvious part: configure `review_model` separately.** You'd typically chat with a smaller / faster model and only escalate to the more expensive reasoning model for review. Add this to `~/.codex/config.toml`:

```toml
# ~/.codex/config.toml
model = "gpt-5.4"            # default for chatty work
review_model = "gpt-5.4"     # equal or stronger model for /review
# review_model = "gpt-5.3-codex"  # alternate — code-specialized variant
```

This costs more per review but is the whole point of bringing in a second model.

---

## §6. The recommended workflow — copy-paste ready

This is the one section you'll come back to. Three review modes, escalating in depth.

### 6.1. Quick critique (30 seconds — every Claude Code session)

After Claude Code finishes a task and **before you commit**:

```bash
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
codex --sandbox read-only
```

At the prompt:

```
/review
```

That's it. Codex reads the uncommitted diff (`git diff` + untracked files), critiques it, prints findings. You skim, decide what to act on, hand the actionable findings back to Claude Code: paste them into Claude Code with the prompt "Codex flagged these — address each".

**Why `--sandbox read-only`:** prevents Codex from editing files, running tests, or hitting the network. It's a critique, not a rewrite. Important when Claude Code might be running in another window — you don't want the two agents fighting.

### 6.2. Deep critique (5–15 minutes — for ship gates)

Before tagging a release (e.g. before `v0.5.6` ship), spend more time:

```bash
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
codex --sandbox read-only
```

Use a custom adversarial prompt instead of bare `/review` (paste this in literally):

```
You are an adversarial code reviewer. The author is another AI agent (Claude Code, Anthropic Claude 4.x family). Your job is to find what it missed.

Scope: every file changed by the most recent feature branch versus origin/main. Use `git diff origin/main...HEAD --stat` to enumerate files, then read each fully.

For each finding, classify by severity:
  [BLOCKER] — would break a user-visible flow, lose data, or open a security hole
  [BUG]     — incorrect behavior in a non-critical path
  [SMELL]   — unsafe patterns, leaky abstractions, or hidden coupling
  [TEST-GAP]— behavior that ships untested, or test that asserts nothing meaningful
  [DOC-LIE] — comment or doc that contradicts the code

Be specific: cite file:line for every finding. No hedge words ("might", "consider").
If you find nothing in a category, write "[OK] no findings" — do not invent issues.

Skip stylistic preferences. Skip suggestions that boil down to "I'd write it differently".
Focus on what would burn a real user or maintainer.

Pay special attention to:
  - Authentication / authorization paths (src/proxy.ts, src/lib/auth/)
  - Service worker logic (public/sw.js) — caches, race conditions, RSC handling
  - SQLite mutation paths (src/db/) — race conditions, missing transactions
  - Any code that touches user data on the device (src/lib/outbox/, src/lib/library-store/)

Report at the end:
  Summary: <N findings, by severity>
  Top 3 things you most want fixed before ship.
```

Save this prompt as `~/.codex/prompts/adversarial-review.md` and you can recall it via Codex's prompt menu in future sessions.

### 6.3. Full-repo audit (one-off — for milestones)

Use the Codex cloud agent for this, not the CLI. Reasons:
- Long-running (hours).
- Doesn't tie up your laptop.
- Cloud agent has internet access and can cross-reference current best practices.

Steps:
1. Open https://chatgpt.com/codex.
2. Connect your GitHub account; select `arunpr614/ai-brain`.
3. New task, prompt:

   > "Adversarial security + correctness review of this repo at HEAD. Output a structured `AUDIT.md` listing findings by severity (blocker / bug / smell / test-gap / doc-lie) with file:line citations. Do not propose fixes; only document issues. No stylistic feedback."

4. Let it run. Come back when it's done.
5. Copy the output, hand to Claude Code in a fresh session: "Address every BLOCKER and BUG from this audit; ignore SMELL and DOC-LIE for now."

### 6.4. Continuous (eventual — for `main`)

Once you start landing PRs to `main` (post lane-collapse), turn on the Codex GitHub integration so every PR gets an automated Codex review comment. This catches drift from agreed patterns without you having to remember to run it.

Setup: https://github.com/apps/openai-codex (or via the cloud-agent UI). One-time toggle per repo. No further work.

---

## §7. Hard constraints and gotchas

These will save you time. Read once, refer back when something breaks.

1. **`read-only` blocks shell commands.** Codex cannot run `npm test`, `git log`, or even `cat` files via shell in `read-only`. It can read files via its own internal file-reading tool. If you want it to run tests as part of review, use `--sandbox workspace-write --ask-for-approval on-request`. You'll approve each command — slower, but safer than `danger-full-access`.

2. **Don't run Codex and Claude Code at the same time on the same files in `workspace-write`.** Locks aren't coordinated; whichever finishes second wins the conflict. Either run Codex `read-only` (review only) or quit Claude Code first.

3. **`AGENTS.md` is shared.** Both Claude Code (via the SKILL system) and Codex read `AGENTS.md` at repo root. If you author an `AGENTS.md`, it'll inform both. Caveat: each tool has its own opinions; one file can't perfectly satisfy both. Keep it minimal — repo-level facts, not stylistic preferences.

4. **Codex review uses your token budget.** A single deep `/review` of a large diff can cost a meaningful slice of your daily ChatGPT Plus quota. Pro plan gives more headroom. If you hit caps, switch to API key (pay-per-use) — but only for `/review` runs; chat in ChatGPT app for the cheap stuff.

5. **The `review_model` config is per-session, not per-command.** Set it in `~/.codex/config.toml` or via `/model` before invoking `/review`. There's no `/review --model gpt-5.4` flag.

6. **Codex's findings can be wrong.** Treat its output the same way you'd treat a strict junior reviewer: lots of signal, some noise. If Codex flags something Claude Code says is fine, ask Claude Code to *justify in writing*, then decide. Don't auto-trust either model — that's the whole point of the dual-model setup.

7. **Sandbox modes (the exact names — memorize):**
   - `read-only` — file reads + Q&A. No edits, no shell, no network without approval.
   - `workspace-write` — reads + edits + commands inside the workspace. Approval needed for outside-workspace or network. **Default** for git repos.
   - `danger-full-access` — no sandboxing. Shortcut: `--yolo`. Don't use this for review.

8. **Approval policies:**
   - `on-request` — default. Codex asks before risky actions.
   - `never` — fully autonomous. **Don't use for review** (you want it to ask).
   - `untrusted` — strictest. Approve everything.

---

## §8. Concrete prompts to paste — copy-ready

The single biggest lever you have is the prompt. The default `/review` is fine; these custom prompts are stronger.

### 8.1. After Claude Code ships a phase plan or design doc

```
Adversarial review of the design doc at <path>.

Treat this as a senior engineer's review of a junior agent's plan.
Your job: find every place the plan
  (a) hand-waves a hard subproblem,
  (b) skips a failure mode,
  (c) over-promises a timeline,
  (d) assumes infrastructure that doesn't exist yet,
  (e) lacks a clear definition of done,
  (f) duplicates existing functionality the author missed.

Cite the section / line for each finding.
Output:
  Plan strengths (1-3 bullets, max).
  Plan gaps (numbered, by severity).
  Top 3 questions the user should ask before approving.
```

### 8.2. After Claude Code claims a feature is done

```
The author (Claude Code) claims feature <X> is complete and verified.
Verify the claim.

Steps:
1. Read the running-log entry or commit message that describes what was done.
2. Compare against the actual diff.
3. For each claim of the form "I did Y", confirm or refute by reading the code.
4. Find: claims that are TRUE-but-incomplete, claims that are TRUE-but-have-side-effects-the-author-didn't-mention, and claims that are FALSE.

Output as a table: Claim | Status (TRUE / TRUE-INCOMPLETE / TRUE-WITH-SIDE-EFFECT / FALSE) | Evidence.
```

### 8.3. Self-critique-of-the-self-critique

Claude Code routinely writes a "Session self-critique" in `RUNNING_LOG.md`. Paste this prompt to Codex to critique that critique:

```
Read the most recent self-critique block in RUNNING_LOG.md (last entry, "Session self-critique" section).

Your job: spot the things the self-critique missed.
- What patterns appear in the diff that the self-critique didn't mention?
- Where did the author soften a real problem ("might want to" vs "this will break")?
- What's NOT in the diff that the author should have flagged as missing (tests, docs, error handling)?

Output: 3-7 additional self-critique items the author missed.
```

### 8.4. Review of a specific file

```
Adversarial review of <path>.
Reading order: full file, top to bottom, no skipping.

For each function:
  Inputs: are all paths handled? What happens on null / undefined / "" / very large input?
  Side effects: does this function do anything beyond what its name implies?
  Concurrency: can this be called twice at once? What goes wrong?
  Error paths: every throw, every catch, every Promise — what happens if the inner call rejects?
  Tests: is there a test that exercises this exact function? Does the test actually assert behavior, or does it just test that the function runs?

Output: numbered list, file:line cite per finding.
```

---

## §9. Concrete recipes for the AI Brain repo specifically

These are tuned to the project state today (2026-05-15, post-v0.5.6, pre-lane-collapse).

### 9.1. Critique the lane-collapse plan before you execute it

```bash
cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain
codex --sandbox read-only
```

Paste:

```
Read Handover_docs/Handover_docs_15_05_2026_LANE_COLLAPSE/HANDOVER.md.
Adversarial review.

Goal of the doc: hand the project off to a new AI session that will merge lane-c/v0.6.0-cloud and lane-l/feature-work into main.

Find:
  - Steps that will fail in practice (wrong git command, wrong order, missing precondition).
  - Risks the doc minimizes (force-push hazards, stash drops, untested merge conflict resolution).
  - Things that should be in §13 Definition of Done but aren't.
  - Any place the doc assumes the executing agent has context it doesn't have.

Cite section numbers. Be specific.
```

### 9.2. Critique the library-offline-from-DB plan

```bash
codex --sandbox read-only
```

Paste:

```
Read docs/plans/v0.6.x-library-offline-from-db.md.
Adversarial review.

Use this lens:
  - The author is Claude Opus 4.7. Look for typical Claude failure modes:
    over-confident architecture, optimistic LOC estimates, plans that lack a real first-90-minutes path.
  - Each task LIBOFF-1 through LIBOFF-12: is it actually atomic? Does it have a clear DoD?
  - Watch §10 Open Questions: any questions that should NOT have a default ("ASK user") because the default is dangerous?
  - Watch §9 Risk Register: any risks listed as "Low" that are actually Medium/High?
  - The hardest subproblem is RSC vs HTML rendering split (LIBOFF-8). Audit it specifically.
  - Are the tests in each task actually meaningful, or are they smoke tests dressed up?

Output:
  3 strongest parts of the plan.
  All gaps, ranked by what would burn the executor.
  3 questions the user should ask before approving.
```

### 9.3. Critique the v0.5.6 service worker before tagging

```bash
codex --sandbox read-only
```

Paste:

```
Adversarial security + correctness review of public/sw.js.

Context: this service worker landed today. It went through three iterations (v1, v2, v3) under one ship cycle because each fix exposed a new bug. The cache name is "brain-*-v3" right now.

Specific concerns to investigate:
  1. RSC handling (isRscRequest, strippedKey) — can it leak a text/x-component response into a document navigation?
  2. cache.addAll vs per-URL cache.add — is the install path actually robust?
  3. SHELL_RUNTIME_PATHS — what happens if the user is unauthenticated on first visit? Does the SW cache the redirect to /unlock?
  4. activate handler — is the cache cleanup safe under racing controllers?
  5. The KNOWN_CACHES purge — what happens if the array is wrong?
  6. Compare against industry-standard Workbox patterns: where does this hand-rolled SW deviate? Are the deviations justified?

Output: blocking findings only — anything that would cause a user-visible regression. No style notes.
```

---

## §10. Cost and rate considerations

| Plan | Codex CLI access | Approx daily review capacity (rough) |
|---|---|---|
| ChatGPT Plus ($20/mo) | Yes, with rate limits | 5–15 deep `/review` runs + chat |
| ChatGPT Pro ($200/mo) | Yes, much higher caps | 50+ deep `/review` runs |
| ChatGPT Business / Enterprise | Yes | Org-managed caps |
| API key only (pay-per-use) | Yes | No quota; pay per token |

For your use (one personal repo, daily-ish reviews), Plus is sufficient. Pro becomes worth it if you start running multi-hour cloud-agent audits regularly.

**Cost-saving tactic:** chat in ChatGPT.com (free / cheap), only invoke `codex` CLI for actual code review. The CLI's per-call cost is the expensive part.

---

## §11. What to do with Codex's output

A common failure mode: getting a long Codex review and not knowing what to do with it. The discipline:

1. **Read it once, all the way through.** Don't act mid-read.
2. **Categorize each finding into one of three buckets:**
   - **ACT**: real, fix now. Goes to Claude Code as a task.
   - **DEFER**: real but not now. Goes to `BACKLOG.md` with a note.
   - **DROP**: noise / bikeshedding / wrong. Ignore.
3. **For ACT items, paste them verbatim into Claude Code** with the framing:

   > "Codex review flagged these. Treat each as authoritative until proven otherwise. For each: either fix it or write one paragraph explaining why Codex is wrong. No middle ground."

4. **Don't let Claude Code triage Codex's findings.** That defeats the purpose. You triage. Claude Code only acts on what you hand to it.

5. **If Codex and Claude Code disagree, you decide.** Two good rules of thumb: (a) defer to whichever one cites the actual code; (b) when both cite code, ask each to write a one-paragraph defense, then pick.

---

## §12. Limits — what this approach won't catch

Honest disclosure of where two-model review still fails:

- **Domain-specific bugs.** Both models lack your specific user data and usage patterns. They cannot tell you that "this offline-mode flow is annoying for the actual user." Only you can.
- **Bugs that need runtime evidence.** Static review of `public/sw.js` won't catch a Capacitor-specific behavior; only `chrome://inspect` on a real device does. Auto-memory `feedback_empirical_evidence_first` still applies.
- **Architectural drift.** Both models are good at reviewing what's in front of them; they're weaker at "this whole subsystem should be redesigned." That judgment stays with you.
- **Adversarial collusion.** If both models share a training-data blind spot (say, an obscure Next.js behavior nobody's documented), neither will catch it.
- **Documentation lying about behavior.** If a doc says "X works" and the code is wrong but consistent with itself, both models may be fooled. You catch this by occasionally running the actual feature.

The dual-AI loop reduces bug-shipping rate by a meaningful margin. It does not get to zero. Treat it as one layer in defense-in-depth, not the whole shield.

---

## §13. The 30-second cheat sheet

If you remember nothing else from this doc, remember this:

```bash
# After Claude Code finishes any meaningful work
cd <repo>
codex --sandbox read-only
> /review
# Read findings. Hand actionable items back to Claude Code. Ship.
```

Set up once: `brew install --cask codex` + sign in with your existing ChatGPT account.
Add `review_model = "gpt-5.4"` to `~/.codex/config.toml`.
Save the §6.2 adversarial prompt as `~/.codex/prompts/adversarial-review.md` for deep reviews.
That's the whole loop.

---

## §14. References

- OpenAI Codex GitHub: https://github.com/openai/codex (v0.130.0, 2026-05-08)
- Codex CLI slash commands: https://developers.openai.com/codex/cli/slash-commands
- Codex sandbox + approval modes: https://developers.openai.com/codex/agent-approvals-security
- Codex product overview: https://developers.openai.com/codex
- Latest models (as of 2026-05-15): GPT-5.4 (default), GPT-5.3-Codex (code-specialized variant)

*End of doc. Total length: ~17 KB. Authored 2026-05-15 14:50 IST.*
