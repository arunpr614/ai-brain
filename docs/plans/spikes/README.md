# Spike Reports

This directory holds focused, time-boxed investigations that inform planning
and execution decisions. Each spike produces a structured report (one file,
one spike) with learning + implementation recommendation.

**Purpose:** spikes are how we de-risk plan decisions ahead of time. A spike
report answers a specific question with evidence (grep output, command
results, doc citations) so the plan drafter isn't guessing.

**When to run a spike:** dead-time windows (waiting for external systems
like DNS propagation, CI runs, or user actions), or immediately before
drafting a plan document when a specific technical claim needs verification.

## Spike naming convention

```
SPIKE-<NNN>-<short-slug>.md
```

- `NNN` = three-digit sequence, zero-padded (001, 002, ...)
- `short-slug` = 2-5 hyphenated lowercase words describing the question

Example: `SPIKE-001-sse-buffering-audit.md` — investigates whether Brain's
SSE endpoints stream correctly without relying on Cloudflare.

## Report structure (use verbatim)

Every spike report uses this structure:

```markdown
# SPIKE-NNN — <one-line question>

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-NNN |
| **Date** | YYYY-MM-DD HH:MM |
| **Author** | AI agent (Claude) |
| **Time box** | <estimate at start; actual at end> |
| **Triggered by** | <what prompted this spike — critique finding, plan gap, user question> |
| **Blocks** | <which plan task(s) depend on the outcome> |
| **Verdict** | <CLEAR | PROCEED-WITH-CHANGES | BLOCKER | INCONCLUSIVE> |

## Question

<One-paragraph statement of the specific question the spike answers.>

## Method

<How the spike was conducted. Grep patterns, commands run, docs fetched,
code inspected. Be explicit so the result is reproducible.>

## Evidence

<Raw output, code excerpts, doc citations. Include enough raw material
that a future agent can re-verify without re-running the spike.>

## Findings

<Synthesis. What was learned. Be honest about confidence level.>

## Implementation recommendation

<Concrete directive for the plan / code. Cite file paths + line numbers.
Note any follow-up spikes surfaced by this one.>

## Risks / gaps surfaced

<Anything the spike touched but did not fully resolve.>
```

## Spike index

| ID | Date | Topic | Verdict | Blocks |
|---|---|---|---|---|
| 001 | 2026-05-10 | SSE buffering audit of our own code | CLEAR | R-1, plan v2.0 §SSE |
| 002 | 2026-05-10 | URL / hostname hardcode inventory | PROCEED-WITH-CHANGES | T-CF-2..12 |
| 003 | 2026-05-10 | SSE test coverage audit | BLOCKER | R-1 regression test |
| 004 | 2026-05-10 | Deletion blast radius (mDNS, bonjour, getLanIpv4) | CLEAR | T-CF-2 |
| 005 | 2026-05-10 | share-handler URL default + next.config audit | PROCEED-WITH-CHANGES | T-CF-2, T-CF-11 |

## When a spike is NOT appropriate

- If the question can be answered by reading a single file, just read it.
- If the question requires running code against a live external service
  (e.g., real Cloudflare tunnel), that's a gate in plan v2.0, not a spike.
- If the answer would change a locked decision, stop and escalate to the
  user — spikes inform plans, they don't reverse approvals.
