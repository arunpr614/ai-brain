# Command Safety

Purpose: Classify command side effects and define the public safe-command allowlist.
Audience: AI agents and engineers running repository commands.
Verified against: `8c1341100b174fe4ca518e6a745c30b9078df21c` package scripts.
Runtime evidence through: Not applicable; command classification is source-based.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

## Classes

| Class | Meaning | Public default |
|---|---|---|
| R0 read-only local | Reads source/config without changing state | Allowed |
| R1 network read | Calls an external read path | Intentional use only |
| W1 local ephemeral write | Creates isolated disposable fixtures | Allowed when isolation is understood |
| W2 local persistent write | Changes local database, config, or artifacts | Not a safe first command |
| W3 external/public write | Pushes Git or another public/external system | Requires task authorization and final preflight |
| W4 production write | Deploys, restores, migrates, backfills, applies, rotates, schedules, or changes production | Private runbook and exact current authorization only |
| Unknown | Side effects have not been proven | Do not run |

## Safe First Commands

```bash
git status --short --branch
npm run typecheck
npm run lint
npm test
```

The first three application-repository commands are R0. Tests are W1 because they create isolated fixture state. Inspect failures before broadening the test scope.

## Documentation Validation

```bash
npm run check:agent-docs
npm run smoke:agent-docs
```

Documentation checks are R0; documentation smokes are W1 synthetic fixtures.

## Restricted Categories

Builds, APK packaging, benchmarks, local backfills, and app servers are W2. Git pushes and wiki publication are W3. Production backfills, deploys, restores, migrations, Recall applies, scheduler changes, credential operations, and checkpoint movement are W4.

The complete script-by-script registry is versioned in `docs/agent-docs/command-safety-registry.md`. A command name containing `check`, `smoke`, `status`, or `test` does not prove safety. When the registry says Unknown, inspect the implementation and update the registry before execution.

## Stop Conditions

Stop when the command is unclassified, uses private environment state, contacts production, writes a persistent database, changes Git/GitHub state outside the task, or could print private content. Request current private context rather than inferring permission.
