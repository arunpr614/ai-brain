# Note Focus Mode — Release and Rollback

## Release sequence

1. Merge the reviewed feature branch after every repository/docs gate passes.
2. Deploy the merged artifact with `NOTE_FOCUS_MODE_ENABLED=0`.
3. Verify backup, migrations, authenticated health, strict providers, scheduler/service state, normal desktop/mobile Notes, Digest, Save, Preview, and the global AI/connections default setting.
4. Set `NOTE_FOCUS_MODE_ENABLED=1` through the normal production environment path and restart.
5. Smoke Focus entry, content-free URL, Back, Forward, direct refresh, Exit, one editor, Save, narrow layout, and normal-mode return with synthetic content only.
6. Inspect logs/client errors and confirm no unexpected note GET/PUT on presentation-only transitions.

The deploy preflight refuses a first enabled deployment unless `BRAIN_NOTE_FOCUS_ALLOW_ENABLED_FLAG=1` is explicitly supplied. This makes the initial enablement visible and auditable.

## Executed production release

- PR #15 merged the feature and documentation package to `main` at `e2b44a2294e5aab6291e4e87e6f374ce8c4bb554` after the required documentation check passed.
- The first production deploy ran with Focus disabled, created a verified SQLite backup, repeated the full 813-test gate, built/synced the standalone artifact, restarted cleanly, and passed authenticated health and strict provider checks.
- The signed-out flag-off smoke found that the auth proxy placed item query parameters beside `/unlock` instead of inside `next`. Focus remained disabled.
- PR #16 added the missing query-preservation regression and merged at `6858529ef179a51442d319c6c58e5ace79757619`. Its final gate passed 814 tests.
- The corrected artifact was deployed with Focus still disabled. The exact deep link then redirected to `/unlock?next=<complete item path and focus query>`, preserving the request for post-unlock validation/canonicalization.
- `NOTE_FOCUS_MODE_ENABLED=1` was installed through a restricted environment-file rewrite with a same-host backup, followed by a service restart.
- Final read-only production smoke passed ordinary Notes, Focus control/route, missing-tab canonicalization, source-reading precedence, the global AI/connections default setting, authenticated health, strict Anthropic/Gemini providers, webhook rejection, active service, and enabled/active Recall timer.
- No note text, note policy, global preference, provider consent, or item row was created or changed by the production smoke.

One post-restart provider-check SSH connection was transiently refused after authenticated health had already passed. SSH immediately recovered; the strict provider and remaining post-deploy checks were rerun separately and passed. This was an operator-channel transient, not an application-health failure.

Production closeout documentation merged through PR #17 at `47968ec03be1e887e027fb875d317d4d1f274df1`. The canonical 63-page GitHub Wiki was then published from remote base `7347060` to `3d578c3f66e61de3f124a855253e713758f6a49b` with a pre-push remote-SHA concurrency check. A fresh clone passed privacy, structure/reachability, and byte-for-byte comparison with `docs/wiki/`.

## Rollback

### Focus presentation/history defect

1. Set `NOTE_FOCUS_MODE_ENABLED=0`.
2. Restart through the normal guarded deployment path.
3. Verify the Focus control is absent, stale markers canonicalize away, and ordinary Notes/health pass.

### Shared responsive host defect

1. Deploy the previous known-good artifact/commit; the Focus flag is insufficient because host consolidation is structural.
2. Verify normal desktop/mobile Notes, Digest, Preview, Save, AI/connections preference, and health.
3. Accept that emergency rollback temporarily restores the documented pre-feature duplicate responsive controllers until a corrected host ships.

No schema or data rollback is needed. Note APIs and storage are unchanged.

## Immediate rollback triggers

- Any lost/overwritten content or false Saved state.
- More than one active editor/controller after the new artifact ships.
- Exit/Back cannot recover normal UI.
- Background focus remains reachable or the app remains inert after exit.
- Save/Copy/status becomes unreachable at a supported width.
- Presentation transitions trigger unexpected note mutation or reload.
