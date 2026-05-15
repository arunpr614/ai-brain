# M9 — Next Actions Per Lane

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/09_Next_Actions_Per_Lane.md` (replaces status doc)
**Baseline:** full
**Scope:** the actual "do this next" list, split by lane
**Applies to:** both lanes — but each lane reads ITS OWN section first
**Status:** COMPLETE (documentation)

> **For the next agent:** this is the "what do I do first" file. Read ONLY the section for your lane. Other-lane sections are informational — they tell you what the other agent is doing so you don't step on them. **Lane L's first action is NOT writing new code — it's pushing the 16 unpushed commits and verifying the 0.5.5 APK on the device.** Lane C's first action is unchanged from v4 baseline (resolve K-1 SSH).

---

## 1. Table of contents

- §2 — Lane C next actions (cloud migration; carries forward from v4 baseline)
- §3 — Lane L next actions (offline-mode device verification + GRAPH-1 pickup)
- §4 — Cross-lane synchronization points
- §5 — User-driven gates (things only the user can do)
- §6 — Blast-radius ordering
- §7 — TL;DR per lane

---

## 2. Lane C next actions (cloud migration)

### 2.1 Status snapshot

**Unchanged from v4 baseline.** Lane C did not advance this session. Hetzner SSH still blocked at K-1. v0.6.0 plan still un-drafted. Recap of where Lane C is:

| Phase | Status | Blocker |
|---|---|---|
| Phase A — Hetzner SSH unblock | BLOCKED | K-1 |
| Phase B — Server hardening | not started | depends on A |
| Phase C — Cloud env setup | not started | depends on B |
| Phase D — Migration script + cutover | not started | depends on C |
| Phase E — Post-cutover verification | not started | depends on D |

### 2.2 Exact next command

```bash
git branch --show-current
# Must print: lane-c/v0.6.0-cloud

git fetch origin
git rebase origin/main   # likely no-op; Lane L hasn't merged yet

# Then ask the user:
```

> "[Lane C] Ready to resolve Hetzner SSH blocker (K-1). Two paths: (A) Hetzner web console paste, (B) Rebuild server. Recommend (A) — 2 min. Want to proceed?"

### 2.3 Recommended sequence (carries forward)

Read `../Handover_docs_12_05_2026/09_Next_Actions_Per_Lane.md` §2 for the full procedure. Top-level: SSH → harden → install Node/cloudflared/rclone/gpg → smoke test sqlite-vec → write `docs/plans/v0.6.0-cloud-migration.md` v1 → cross-AI review → execute Phase C–E.

### 2.4 Watch for (NEW — Lane L delta)

When Lane L pushes (via §3.1 below), Lane C must:

1. `git fetch origin`
2. `git log origin/lane-l/feature-work --oneline | head -20` — see what shipped
3. Note the new files Lane C must NOT touch during cutover:
   - `src/lib/outbox/**`
   - `src/lib/auth/api-version.ts`
   - `src/lib/capture/youtube-url.ts`
   - `src/components/{share-handler,outbox-badge,sidebar}.tsx`
   - `src/app/inbox/**`
   - `src/app/debug/quota/**`
4. Note that `package.json` and `package-lock.json` changed (3 new deps + version bump). Lane C's `.env.cloud.example` work continues unchanged but the `npm install` on the cloud server will pull these new deps.
5. Note the `X-Brain-Client-Api: 1` header check in `/api/capture/{url,note,pdf}/route.ts`. Cloud cutover MUST preserve this. M2 §4.1 has the full contract.

### 2.5 Lane C open questions (carry forward)

1. Hetzner SSH fix: Path A (web console) or Path B (rebuild)?
2. Backblaze B2 account: when will it be created and the app key shared?
3. gpg key for backup encryption: generate fresh on Hetzner or import an existing key? Which email?
4. Cutover window: user available at 03:00 IST on which date?
5. Does cloud cutover require bumping `EXPECTED_CLIENT_API` from 1 to 2? (If yes, all v0.5.5 APK installs will see queued items go stuck:version_mismatch — by design — and need to update.)

---

## 3. Lane L next actions (local features)

### 3.1 EXACT next command — push the 16 unpushed commits

```bash
git branch --show-current
# Must print: lane-l/feature-work

git status
# Working tree should be clean except for src/db/migrations/009_edges.sql (K-8, carry-over)

git log --oneline origin/main..HEAD | head -20
# Should show 40 commits, ending at 4a6548a (most recent)

git push origin lane-l/feature-work
```

This is the first action because:

1. 16 commits are local-only. If this machine fails, the work is at risk.
2. Lane C cannot rebase forward without seeing these commits on origin.
3. The push is risk-free — `lane-l/feature-work` is an isolated branch; nothing on `main` changes.

### 3.2 Second action — install + verify APK 0.5.5 on Pixel

**Don't start any new feature work until the manual matrix passes the MUST-pass items.**

Per `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md`:

```bash
# Pre-flight P-1: install
adb install -r data/artifacts/brain-debug-0.5.5.apk

# Pre-flight P-2..P-4: server up, pairing intact, ADB logcat watching
npm run dev   # in another terminal
adb logcat | grep -E "Capacitor|Brain|share.outbox|share.intent" --line-buffered

# Pre-flight P-5: OFFLINE-PRE quota probe
# In Brain APK on the Pixel, navigate URL bar to:
#   https://brain.arunp.in/debug/quota
# Tap "Run probe", record the 4 data points
```

Then run **Bucket A** (4 scenarios; ~5 min). MUST-pass: A1 / A2 / A3.

If A1–A3 pass: continue to Buckets B / C / F-1 for the full MUST-pass set (~15 more min).

If anything fails: capture evidence (ADB logcat + WebView IDB state via `chrome://inspect`), file in the matrix's Evidence field, escalate to user. See M8 §4 for outbox failure modes.

### 3.3 Third action — write the OFFLINE-PRE result doc

Once the device probe runs (P-5 above), copy the JSON output into a NEW doc:

```bash
# Create:
docs/research/webview-quota-pixel-2026-05-13.md
```

Content: the 4 data points + the derived plan branch (generous / moderate / conservative). Plan §8.1 of `docs/plans/v0.6.x-offline-mode-apk.md` v3 expects this artifact at feature closeout.

Commit message: `docs(research): WebView quota measurement on Pixel 7 Pro 0.5.5 — OFFLINE-PRE`

### 3.4 Fourth action — update the trackers

Once the manual matrix is filled and signed off:

1. Update `ROADMAP_TRACKER.md` — mark OFFLINE-* IDs done.
2. Update `PROJECT_TRACKER.md` — close any related rows.
3. Update `BUILD_PLAN.md` if v0.6.x offline mode appears there explicitly.
4. Single commit: `chore(trackers): close out v0.6.x offline mode after device verification`

### 3.5 Fifth action — `npm audit` review

Carries forward from prior session's action item #6. Was ignored in the prior session; ignored again this session.

```bash
npm audit
# Capture the output. Decide per-CVE: not relevant / patch / acknowledge.
```

If any CVE is reachable from production code paths (i.e., not just transitive dev tooling), open a fix issue. Most Brain CVEs to date have been transitive dev-tooling — but treating them as noise without checking is wrong.

### 3.6 Sixth action — propose lane-l → main merge

When MUST-pass + nice-to-have matrix items are green AND the user gives explicit OK:

```bash
gh pr create \
  --base main \
  --head lane-l/feature-work \
  --title "v0.5.5 — Offline mode v0.6.x (16 commits)" \
  --body "(See RUNNING_LOG 31st entry + Handover_docs_13_05_2026/ for full context)"
```

Per handover §4.2 Lane L self-merges after a feature lands. The PR is for audit trail rather than a direct merge.

### 3.7 Seventh action — GRAPH-1 kickoff

Once main has v0.5.5 + offline mode merged:

1. Create new branch from updated main: `lane-l/v0.6.x-graph` (or stay on `lane-l/feature-work` per project convention — confirm with user).
2. Re-read `docs/plans/v0.6.x-graph-view.md` v2.1 — locked, zero open questions.
3. **Resolve K-8** — decide whether the working-tree `src/db/migrations/009_edges.sql` (carried 4 sessions) becomes the GRAPH-1 commit or gets restarted from scratch.
4. Execute GRAPH-1: migration + edges repository commit.

### 3.8 Lane L forbidden zones (unchanged)

- `package.json` version field (Lane L can patch-bump; major/minor = Lane C only)
- `src/lib/enrich/**` (Lane C)
- `src/lib/embed/**` (Lane C, pending v0.6.0 swap)
- `src/db/migrations/008_*` (Lane C)
- `scripts/migrate-*`, `scripts/backup-to-b2*` (Lane C)
- `docs/plans/v0.6.0-*` (Lane C)
- `README.md` until Lane C adds v0.6.0 privacy paragraph

### 3.9 Lane L end-of-session checklist

- [ ] `git status` clean
- [ ] `git push origin lane-l/feature-work`
- [ ] Run `running-log-updater` skill with Lane = `L`
- [ ] "Cross-lane notes" section populated (or "none")
- [ ] If touched a shared file: update SHARED-LOCKS block in `RUNNING_LOG.md` head
- [ ] Tell user what Lane C might need to know

### 3.10 Lane L open questions (NEW for this package)

1. Manual matrix MUST-pass results — pass / fail / partial?
2. After successful matrix: lane-l → main merge now (recommended) or hold until Lane C v0.6.0 cutover?
3. Next feature priority: GRAPH-1 (plan locked) or AUG-1..7 (plan locked) or something else?
4. `009_edges.sql` working-tree handling: commit as-is at GRAPH-1 or restart?

---

## 4. Cross-lane synchronization points

### 4.1 When Lane L pushes (imminent — see §3.1)

Trigger: `git push origin lane-l/feature-work` succeeds.

Lane C must:

1. At next session start, `git fetch origin`
2. `git log --oneline origin/lane-l/feature-work | head -20` — see what shipped
3. Read `Handover_docs/Handover_docs_13_05_2026/01_Architecture.md` §3 (outbox layer)
4. Read M2 §4.1 (`X-Brain-Client-Api` contract that cloud cutover must preserve)
5. No immediate code action needed — Lane C continues v0.6.0 prep on its own branch

### 4.2 When Lane L merges to main (likely after §3.2 + §3.6)

Trigger: PR merged.

Lane L:

1. Update OWNERSHIP BLOCK in `RUNNING_LOG.md` — release Lane L's shared-file locks (if any held)
2. Running-log entry with Cross-lane notes summarizing what Lane C should be aware of
3. Update auto-memory `project_ai_brain.md` to reflect post-merge state

Lane C:

1. At next session start, `git rebase origin/main` on `lane-c/v0.6.0-cloud`
2. Verify v0.6.0 work-in-progress still works after rebase
3. If Lane C adds new routes under `src/app/api/`, verify they don't conflict with `/inbox` or `/debug/quota`

### 4.3 When Lane C ships v0.6.0 cutover

Trigger: v0.6.0 git tag pushed (Lane C creates).

Lane L must:

1. `git fetch origin && git checkout lane-l/feature-work && git rebase origin/main`
2. Resolve any conflicts (should be rare given clean file ownership)
3. Run local smoke + manual matrix Bucket A on the cloud-backed APK
4. Push

### 4.4 When user decides on kill-switch

Trigger: `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md` §7 conditions met (carries forward).

1. User tells Lane L: pause; everything on `lane-l/feature-work` stays safe (already pushed via §3.1).
2. User tells Lane C: finish v0.6.0.
3. After v0.6.0: resume Lane L or collapse permanently.

### 4.5 Weekly cadence (if both lanes active)

- Monday start of week: both lanes run catch-up protocol
- Friday EOD: both lanes write running-log entries summarizing the week
- One shared open question: is the dual-lane overhead worth the parallelism?

---

## 5. User-driven gates

| Gate | What's blocked | Who needs |
|---|---|---|
| Sign off this handover package | Both lanes can work but without explicit go-ahead | both |
| Hetzner SSH recovery choice | Lane C Phase A | Lane C |
| **APK install on Pixel + run manual matrix** | **Lane L lane-l → main merge** | **Lane L** |
| **OFFLINE-PRE quota probe + commit `webview-quota-pixel-*.md`** | Confirms PDF MVP scope decision | Lane L |
| Backblaze B2 account creation + app key | Lane C Phase C6 + D, E | Lane C |
| gpg key decision (new vs import) | Lane C Phase C6 | Lane C |
| Cutover window scheduling | Lane C Phase D | Lane C |
| Kill-switch invocation | Only in emergency | either |

---

## 6. Blast-radius ordering for next 30 days

Ranked by "thing that if skipped would hurt the most":

1. **Lane L: push the 16 unpushed commits.** Risk: machine failure loses 7100+ insertions of work.
2. **Lane L: APK install + manual matrix MUST-pass.** Without this the offline mode is unverified end-to-end on the device.
3. **Lane C: Hetzner SSH fix.** Blocks all of v0.6.0.
4. **Lane C: Backup/restore drill post-cutover.** Data loss risk if not tested.
5. **Lane C: Tag v0.6.0 cleanly.** Version integrity for future work.
6. **Both: running-log hygiene.** De-cohering notes produce agent drift.
7. **Lane L: GRAPH-1 execution.** Locked plan; clean win.
8. **Lane L: `npm audit` review.** Carryover; not blocking but unprofessional to keep ignoring.
9. **Both: Monthly B2 restore drill.** After v0.6.0, perennial ops task.
10. **Both: Dual-lane retro.** If active, revisit at day 20.

---

## 7. "If I only had 5 minutes" TL;DR per lane

**Lane C:**
> Resolve Hetzner SSH (K-1 from M8 / v4 baseline). No change since 2026-05-12. When Lane L pushes, fetch + read M1 §3 + M2 §4.1 to understand what cloud cutover must preserve.

**Lane L:**
> `git push origin lane-l/feature-work`. Then `adb install -r data/artifacts/brain-debug-0.5.5.apk`. Then run Bucket A of `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` on the Pixel. Don't start GRAPH-1 until MUST-pass items green.
