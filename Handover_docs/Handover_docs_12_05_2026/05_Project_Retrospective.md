# M5 — Project Retrospective (session 2026-05-12)

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** `Handover_docs_11_05_2026/05_Project_Retrospective.md`
**Baseline:** full
**Scope:** decisions locked this session, bets made, surprises, things I'd do differently
**Applies to:** both lanes
**Status:** COMPLETE (documentation)

> **For the next agent:** this is an honest retrospective, not a victory lap. If the self-critique reads as "everything went great," that's the filler signal you should reject. Read this to understand why we picked what we picked and what might not survive contact with reality.

---

## 1. What the session set out to do

1. Complete the v0.6.0 cloud-migration research program (9 spikes).
2. Pick a cloud host, AI provider, embedding path, and backup strategy.
3. Design an enrichment flow that respects user-stated preferences (daily batch default + manual override).
4. Honest-accounting the privacy + threat delta.
5. Get user sign-off on an architecture direction and start provisioning.

## 2. What got done

- **9 spikes shipped** — S-1..S-9. Every deliverable file at its planned path.
- **Locked decisions:** AWS Lightsail Mumbai (superseded later by Hetzner Helsinki), Claude Haiku batch + Sonnet realtime, Gemini embeddings (flipping my pre-session assumption), Backblaze B2 backups with client-side gpg, daily batch cron + manual Enrich-now.
- **Budget-host follow-up:** user pushed back on $10 Lightsail; deep-research spawned; Helsinki CX23 at $5.59/mo replaces Lightsail; Singapore falsely suggested at $5.35 (hallucinated, corrected to $10 actual).
- **Hetzner server provisioned** (then discovered SSH key wasn't attached — unresolved at end of session).
- **Dual-lane split designed + scaffolded** — full handoff plan, Lane L bootstrap, running-log v2 schema, OWNERSHIP BLOCK, auto-memory entry, both branches pushed.
- **Running-log updated** with the session's first `[Lane C]`-tagged entry.
- **This handover package** created.

## 3. Decisions locked (and why)

### 3.1 Hetzner Helsinki CX23 over Lightsail Mumbai or Singapore

**Why:** user explicitly pushed back on $10/mo as too expensive. Helsinki at $5.59 is ~47% cheaper. Latency delta (~85ms added to Ask first-token with Anthropic in the loop) is imperceptible.

**Bet:** that ~145ms RTT from India to Helsinki is fine for all Brain usage. If Ask feels laggy post-cutover, fallback is to absorb the cost and move to Singapore (though Singapore is $10, defeating the purpose) or Contabo Mumbai (~$3.92 annual, oversold reputation).

**Evidence:** `docs/research/budget-hosts.md`.

### 3.2 Gemini embeddings over local Ollama on VM

**Why:** S-5 spike flipped this mid-research. 2GB RAM too tight for Ollama + Node + SQLite concurrently. Gemini free tier covers volume. Dim matches (768), no schema change. Quality slightly higher (MTEB 56.9 vs 53.0).

**Bet:** Brain's volume stays under Gemini's 1M tokens/day free tier indefinitely. If we somehow push past it (growth scenario), switch to OpenAI embeddings $0.02/1M tokens — tiny cost.

**Evidence:** `docs/research/embedding-strategy.md`.

### 3.3 Anthropic Batch API for enrichment

**Why:** user said "no immediate enrichment requirement; daily batch is fine." 50% cost discount. Batch API has 24h SLA but Brain doesn't care.

**Bet:** manual "Enrich now" button is enough escape valve. If users want near-realtime enrichment on many items, Batch + polling loop + daily cron won't scale well — but current usage baseline is 2 items lifetime, so this is well over-spec.

**Evidence:** `docs/research/enrichment-flow.md` + `docs/research/ai-provider-matrix.md`.

### 3.4 Client-side gpg before Backblaze B2

**Why:** strongest privacy posture. B2 sees only ciphertext regardless of their security.

**Bet:** user can manage a gpg private key without losing it. If the key is lost, all B2 backups are permanently undecryptable. Mitigation: gpg key backed up to local Mac + a secondary offline location (user's decision).

**Evidence:** `docs/research/privacy-threat-delta.md`.

### 3.5 Dual-lane split for v0.6.0

**Why:** user requested parallel agent workflow; the migration has gaps where Lane L can ship codebase work.

**Bet:** coordination overhead stays low (goal: <1 merge conflict per week). If it exceeds that, kill switch kicks in — Lane L pauses, Lane C finishes v0.6.0, Lane L resumes.

**Evidence:** `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md`.

## 4. What surprised me

1. **Brain's usage baseline is effectively zero.** 2 items in 2 months; 14 LLM calls lifetime. I'd built a mental model of "we need to optimize for moderate usage" — in reality, any sensible architecture at $5–15/mo covers projected growth for years.
2. **Hetzner Singapore doesn't sell CX-line servers.** Only CPX (premium line) starting at $10. Research agent hallucinated the CX $5.35 figure by extrapolating EU pricing.
3. **Hetzner's SSH-key selection is not enforced.** Server can be created with no key. Yellow-warning is the only signal.
4. **Gemini free tier is generous enough to be effectively unlimited for Brain** (1M tokens/day vs 90k tokens/month projected).
5. **Anthropic Batch saves 50% but cosmetically.** At current volume, the batch discount saves ~$0.04/month. The op reason to use it (no rate-limit pressure, decoupled enrichment) matters more than the money.

## 5. What I'd do differently

1. **Cross-check every pricing claim from subagents against the provider's actual pricing page before presenting.** The Singapore $5.35 hallucination cost 10 minutes of user time and a dent in trust. Codified in M8 §5 as a blocker.
2. **Insist on SSH-key selection before clicking "Create & Buy."** Today I said "pick it in that section" and the user said OK and clicked through. The yellow warning needed a harder stop.
3. **Right-size the dual-lane plan.** I wrote a 13-section governance document for a single-user project. The user is non-technical and prefers operational clarity over academic rigor. A 2-paragraph README + "use branches" would have been enough for week one.
4. **Dry-run the running-log skill patch before shipping it.** I added Lane + Session ID fields and a new Cross-lane-notes section, then immediately used them for real. No regression testing. First use exposed no bugs, but future updates to the skill should include a "write a test entry to a scratch file" validation step.
5. **Not spawn 4 parallel research subagents at once.** S-3, S-5, S-7, S-8 all ran in parallel. S-5 flipped S-6's conclusion (Ollama → Gemini), but S-3 and S-8 had already been written assuming Ollama-on-VM. They weren't wrong but needed a light re-read. Sequential chain would have avoided the rework.

## 6. Risks carried forward

| Risk | Likelihood | Impact | Plan |
|---|---|---|---|
| Hetzner SSH key issue eats more time than expected | low | low | two 30-sec fallbacks in M7 §2 |
| Migration script corrupts DB on copy | very low | catastrophic | hash verification + keep Mac server running until cutover validated |
| Gemini free tier T&C changes between now and cutover | low | low | contingency = switch to OpenAI $0.02/1M tokens (~$0.02/mo at volume) |
| Anthropic Batch API deprecated / renamed | very low | medium | realtime Haiku fallback already in plan |
| gpg key lost → backups unrestorable | medium if ignored | catastrophic | document key backup location in M8 |
| Lane L and Lane C merge conflict on shared file | medium | low | OWNERSHIP BLOCK + rebase-before-work rule |
| User changes mind about cloud migration mid-flight | low | high | rollback runbook in S-7 keeps Mac as fallback; < 60 min to restore |

## 7. Technical debt acknowledged

- **Ollama code stays in tree** as fallback path. Not dead code; feature-flagged via `EMBED_PROVIDER` and `BRAIN_ENRICH_BATCH_MODE`. Worth 20 lines of code to keep an escape valve.
- **migration 008 schema adds `batch_id`, `batch_submitted_at`.** Once batch-mode is the only mode (year from now?), those columns could be pruned. Minor.
- **Running-log has two eras:** pre-2026-05-12 single-author entries, post-2026-05-12 lane-tagged entries. Readers of the log must know the dividing line.
- **FEATURE_INVENTORY.md has 47 features; only ~7 shipped.** Most are deferred. The inventory is a roadmap, not a promise.

## 8. What's working well

1. **4-stage planning discipline (research → plan → Stage 4 review → self-critique)** keeps producing solid plan docs. v0.5.1's plan went through the full cycle and shipped without major rework.
2. **Auto-memory** is genuinely reducing session-start friction. Every new session inherits project context without re-explaining.
3. **Running log as append-only narrative** is working. Reading top-to-bottom reconstructs the project journey; the recent-entries-first flow is tractable even at 30 entries.
4. **Spike-based research** produces concrete, actionable outputs rather than hedged essays. 9 out of 9 spikes this session wrote numbers, not ranges.
5. **Cloudflare tunnel** has been a lifesaver. v0.5.0's pivot away from LAN-binding was correct; the tunnel "just works" across APK, extension, browser, any network.

## 9. Open philosophical questions (deferred)

1. **How long do we stay "pre-v1.0.0 no-hosting" culture?** v0.6.0 is the first step away from local-first. At what point do we admit this is a cloud-hosted app and restructure the README accordingly?
2. **Multi-user / sharing: never, or eventually?** Current stance is "never — this is a personal brain." If sharing is ever reconsidered, the whole auth model (single bearer) gets re-thought.
3. **LLM provider lock-in.** We're standardizing on Anthropic. Portability to Gemini/OpenAI/local is one adapter file. If Anthropic prices 10× or has an outage, how fast can we switch? Day or a week?

## 10. Confidence level on v0.6.0 shipping within 1 week

**Medium-high.** The plan is decided, the server is provisioned, the research is done, the runbook is written. Blockers are mechanical (SSH key, actual code changes for Gemini/Anthropic clients, cutover timing).

Things that could push past 1 week:
- User pauses for decision on Lane L backlog priority
- Anthropic Batch API setup has unknown auth quirks
- gpg key setup for B2 is unfamiliar and slow
- Rebase conflicts between Lane C and Lane L (low likelihood given current state)

Things that could come in early:
- Everything in Phase A is trivial mechanically; 1 hour real time
- Everything in Phase C is code Lane C can write in 1 sitting
- Cutover is 10 minutes wall-clock
