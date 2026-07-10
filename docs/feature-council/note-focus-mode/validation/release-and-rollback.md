# Note Focus Mode — Release and Rollback

## Release sequence

1. Merge the reviewed feature branch after every repository/docs gate passes.
2. Deploy the merged artifact with `NOTE_FOCUS_MODE_ENABLED=0`.
3. Verify backup, migrations, authenticated health, strict providers, scheduler/service state, normal desktop/mobile Notes, Digest, Save, Preview, and the global AI/connections default setting.
4. Set `NOTE_FOCUS_MODE_ENABLED=1` through the normal production environment path and restart.
5. Smoke Focus entry, content-free URL, Back, Forward, direct refresh, Exit, one editor, Save, narrow layout, and normal-mode return with synthetic content only.
6. Inspect logs/client errors and confirm no unexpected note GET/PUT on presentation-only transitions.

The deploy preflight refuses a first enabled deployment unless `BRAIN_NOTE_FOCUS_ALLOW_ENABLED_FLAG=1` is explicitly supplied. This makes the initial enablement visible and auditable.

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
