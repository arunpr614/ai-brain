# Lane L Bootstrap — READ ME FIRST

**You are Lane L.** This project is temporarily split across two parallel AI agents:
- **Lane C** — cloud migration (v0.6.0) on branch `lane-c/v0.6.0-cloud`
- **Lane L — YOU** — local feature development on branch `lane-l/feature-work`

See `docs/plans/DUAL-AGENT-HANDOFF-PLAN.md` for the full contract. This file is the fast-path onboarding.

---

## 1. Your mandatory first 3 actions

Do these BEFORE writing any code, every session:

```bash
# a. Make sure you're on your branch and synced
git fetch origin
git checkout lane-l/feature-work
git rebase origin/main

# b. See what Lane C has done since you last worked
git log --oneline origin/main ^HEAD | head -20

# c. Read the most recent 3 running-log entries (focus on any tagged [Lane C])
```

Then read the "Things that have changed" and "Things Lane C needs from you" sections below.

If any of those surface a decision that needs the user (e.g., "Lane C deprecated `src/lib/embed/ollama.ts`"), **stop and ask the user** before writing code.

---

## 2. Ground rules (non-negotiable)

1. **Never touch files in Lane C's owned list.** See `DUAL-AGENT-HANDOFF-PLAN.md §1`. In short, DO NOT edit:
   - `docs/plans/v0.6.0-*` (any file)
   - `src/db/migrations/008_*` (use 009 or higher)
   - `src/lib/enrich/batch.ts`, any new `batch*` files in enrich dir
   - `src/lib/embeddings/gemini.ts`
   - `scripts/migrate-to-cloud.sh`, `scripts/backup-to-b2.sh`
2. **Never bump `package.json` version** until Lane C releases v0.6.0. Your commits land on `main` but don't tag.
3. **Never edit `README.md`** until Lane C's v0.6.0 paragraph lands (Lane C will update this bootstrap when that's done).
4. **Before editing any shared file** (see ownership block at top of `RUNNING_LOG.md`), grep for its current lock owner. If Lane C holds it, ask user.
5. **Append a running-log entry** tagged `[Lane L]` at the end of every session. Use the patched `running-log-updater` skill — it now takes a Lane field.
6. **If you see a commit on `main` with `BREAKING:` in the message**, stop writing code and read that commit's changes before continuing.

---

## 3. Your current backlog (Lane L priority order)

**Recommendation (starting point — user can re-rank):**

### P1 — Chrome extension polish (1–2 sessions)

The extension works (T-CF-15..21 shipped in v0.5.0) but has rough edges:
- **Error surface:** when capture fails (tunnel down, 401, 500), the popup shows a generic toast. Add specific messages: "Server unreachable — check your tunnel," "Auth expired — re-pair this device," etc.
- **Options page:** allow clearing the bearer token + re-pairing without reinstalling the extension.
- **Right-click menu:** currently only "Save link to Brain." Add "Save page as article to Brain" for long-form posts where link-save doesn't capture the body.

Files you'd touch: `extension/popup.ts`, `extension/options.ts`, `extension/background.ts`, `extension/capture.ts`.

### P2 — APK bugs from real use (as reported)

User is actively using the Android APK daily. When user files a bug, investigate + fix. Typical surface: `android/`, `src/lib/capture/`, `src/app/api/capture/*`.

### P3 — Next feature from FEATURE_INVENTORY.md

Open `FEATURE_INVENTORY.md` and pick the next unshipped feature from the Recall+Knowly catalog that:
- Doesn't depend on cloud infrastructure
- Doesn't touch Lane C's owned files
- Is a tight single-session scope

Strong candidates (subject to user confirmation):
- **Tags** — per-item tags, tag-based filtering in library list. Schema: migration 009. UI: `src/components/library-list.tsx`, new `src/components/tag-picker.tsx`.
- **Collections** — user-defined groupings (different from PARA which is type-based). Schema: migration 010.
- **Export** — dump a single item or whole library as Markdown. No schema changes.

Ask the user before starting P3.

---

## 4. Your current branch

```bash
git checkout lane-l/feature-work
```

Not created yet? Run:
```bash
git checkout main
git pull origin main
git checkout -b lane-l/feature-work
git push -u origin lane-l/feature-work
```

---

## 5. Things that have changed in the repo since Lane L last worked

<!-- Lane C updates this section after each cloud-move milestone. -->
<!-- Format: "<date> — <milestone> — files you should know changed: <list>" -->

- **2026-05-12 — Split initiated.** Lane C is actively mid-Hetzner setup. No code has been merged to main yet beyond the dual-lane plan docs. Nothing Lane L needs to re-learn.

---

## 6. Things Lane C needs from you

<!-- Lane C writes requests here; Lane L resolves them at start of next session. -->

- _(none yet)_

---

## 7. Things you need from Lane C before proceeding

<!-- Lane L writes blockers here; Lane C sees them when running its catch-up. -->

- _(none yet)_

---

## 8. How to talk to the user

The user runs BOTH agents. They see messages from both in different terminal windows. To make it unambiguous:

- **Prefix user-facing questions with `[Lane L question]`.** Example: "[Lane L question] Extension polish or tag feature first?"
- **Prefix blocking concerns with `[Lane L blocked]`.** Example: "[Lane L blocked] I need Lane C to confirm whether migration 008 is safe to rebase on top of before I create 009."
- **Never bump version, commit to main, or run release commands on your own** — Lane C owns release tags.

---

## 9. How to hand off cleanly at end of session

Before you sign off:

1. `git status` — confirm nothing uncommitted
2. `git push origin lane-l/feature-work`
3. Run the `running-log-updater` skill — use Lane = `L` when it asks
4. In the log entry, fill in the "Cross-lane notes" section with anything Lane C needs to know (or "none" if truly empty)
5. If you touched any shared file, update the SHARED-LOCKS block in `RUNNING_LOG.md` head

---

## 10. Emergency stop conditions

Stop writing code immediately and ping user if:
- You see a commit on main with `BREAKING:` in the message
- `git rebase origin/main` produces >3 conflicts
- You're about to touch a file you're not sure you own — ask first
- User files a production bug on the **Mac server** (Lane C's problem during migration window)

---

## 11. TL;DR for future-you waking up cold

1. You are Lane L. Local features only. Never touch cloud migration.
2. Branch: `lane-l/feature-work`. Rebase on `origin/main` every session start.
3. Never bump version or touch files listed in §2.
4. Tag all running-log entries `[Lane L]`.
5. Prefix user questions with `[Lane L question]`.
6. Backlog: extension polish → APK bugs → next feature.
