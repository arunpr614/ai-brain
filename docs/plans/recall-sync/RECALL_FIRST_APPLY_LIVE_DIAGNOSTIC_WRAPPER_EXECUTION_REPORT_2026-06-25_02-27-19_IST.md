# Recall First-Apply Live Diagnostic Wrapper Execution Report

Status: Done for offline scope; real first-write remains blocked by key-rotation evidence
Date: 2026-06-25 02:27 IST
Owner: AI agent (Codex)

## Problem

The project already had a standalone read-only live auth probe, and `npm run recall:first-apply:status` separated optional live-read diagnostics from first-write safety. The remaining operator problem was discoverability and sequencing: a user checking first-apply status could still see the primary state as `blocked_key_rotation_evidence` and miss the safe way to run only a live connectivity diagnostic without proof refresh or apply.

Follow-up root cause found during hardening: Node 22 has a built-in `--env-file` option. When package scripts or child spawns passed the AI Brain script-level `--env-file` flag without Node's `--` script separator, Node could consume that flag before the Recall wrapper code ran. If the file was missing, Node stopped immediately; if it existed, Node could preload it before the wrapper's own env-file safety or env-file-disabled probe logic executed.

## Change

| Area | Files | Behavior |
|---|---|---|
| Status-preserving wrapper | `scripts/run-recall-first-apply-live-diagnostic.mjs`, `package.json` | Adds `npm run recall:first-apply:live-diagnostic -- --confirm-live-api`, which first runs the no-write status helper, verifies the live-read diagnostic is available, then runs exactly one read-only `/cards` auth probe. |
| Ephemeral probe credential mode | `scripts/run-recall-first-apply-live-diagnostic.mjs`, `scripts/smoke-recall-first-apply-live-diagnostic.mjs` | Adds `--probe-no-env-file --probe-api-key-env <env-name>` so the actual read-only probe can ignore stale env files and use a terminal-only process variable while the status helper still preserves first-write blockers. |
| Prompt wrapper | `scripts/run-recall-first-apply-live-diagnostic-prompt.mjs`, `package.json` | Adds `npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api`, which runs an internal no-live preflight before any key prompt or stdin read, prompts locally for the key, forces env-file-disabled probing, passes the key only as a child-process environment variable, rejects caller-supplied probe credential flags before prompting, and can write sanitized output with `--output-file` only under `data/private/recall-live-spikes/`. |
| Node argument separation | `package.json`, `scripts/check-recall-node-env-file-separators.mjs`, `scripts/run-recall-first-apply-live-diagnostic.mjs`, `scripts/run-recall-first-apply-live-diagnostic-prompt.mjs`, `scripts/check-recall-first-apply-status.mjs`, `scripts/check-recall-first-apply-readiness.mjs`, `scripts/check-recall-live-gate-status.mjs`, `scripts/run-recall-live-spikes.mjs`, `scripts/record-recall-key-rotation-evidence.mjs`, `scripts/prepare-recall-first-apply-after-rotation.mjs`, `scripts/recall-first-apply-ready-or-refresh.sh`, `scripts/recall-first-apply-proof-refresh.sh`, `scripts/recall-first-capped-apply.sh`, `scripts/recall-scheduled-apply.sh` | Uses Node's `--` separator for operator-facing live/readiness package scripts, child spawns, proof-refresh wrappers, first capped apply, and scheduled apply, so AI Brain's `--env-file` remains a script argument instead of Node preloading or failing before wrapper logic. For TypeScript spike and sync commands, the separator is placed after Node options such as `--import tsx`. `npm run check:recall-node-env-file-separators` now makes this invariant executable by checking package env-file scripts, shell wrappers, child spawns, and TSX command ordering. |
| Smoke coverage | `scripts/smoke-recall-first-apply-live-diagnostic.mjs`, `scripts/smoke-recall-first-apply-live-diagnostic-prompt-guard.mjs`, `package.json` | Proves the wrapper refuses without explicit live confirmation, preserves `blocked_key_rotation_evidence`, makes exactly one read-only `/cards` request, supports env-file-disabled ephemeral probe credentials, proves the env-file wrapper rejects non-private output paths before probing, proves the env-file wrapper writes sanitized owner-only private output with `diagnosticOutputFile` metadata, proves the prompt wrapper can read a key from stdin for the probe, proves the prompt wrapper still probes when the local env file is missing and env-file loading is disabled, proves successful prompt output includes `promptWrapper.preKeyGuarded`, `promptWrapper.envFileDisabledForProbe`, and `promptWrapper.controlledProbeArgsRejectedBeforeKeyEntry`, proves prompt `--output-file` rejects non-private paths before reading a key, proves private output is owner-only mode `0600`, proves the prompt guard self-test validates the internal no-live preflight before key entry, proves the standalone prompt guard rejects controlled probe flags before reading stdin, prints only status/count metadata, and does not unlock proof refresh or apply. |
| Status discoverability | `scripts/check-recall-first-apply-status.mjs`, `scripts/smoke-recall-first-apply-status.mjs` | Adds `diagnostics.liveReadConnectivity.optionalNoWritePromptCommand`, exposes it even when the local live gate is not ready, marks that state with `promptDiagnosticAvailableWithoutLocalLiveGate`, `promptDiagnosticBypassesLocalLiveGate`, and `promptDiagnosticPreKeyGuarded`, keeps `optionalNoWriteWrapperCommand` only when the local live gate is ready, now includes `--output-file data/private/recall-live-spikes/live-diagnostic-report.json` on that env-file wrapper command, exposes `optionalNoWriteWrapperOutputFile`, exposes `promptGuardSelfTestCommand` as the direct `--prompt-guard-self-test` wrapper command, exposes `promptGuardSmokeCommand` as the regression smoke, and emits a top-level `optionalDiagnosticCommands` list that puts `first_apply_live_diagnostic_prompt_guard` first as `offline_self_test` before the preferred real `first_apply_live_diagnostic_prompt` command with `credentialMode: local_prompt_env_file_disabled`, `preKeyGuarded: true`, `guardedBy` pointing to the direct self-test command, `outputFile: data/private/recall-live-spikes/live-diagnostic-report.json`, and `outputFileMode: 0600`; `optionalDiagnosticCommands[2]` now carries the env-file wrapper with `outputFile: data/private/recall-live-spikes/live-diagnostic-report.json` and `outputFileMode: 0600`; `readOnlyDiagnosticNextAction` names the private-output prompt command, the built-in internal no-live guard before key entry, direct no-live guard, and regression smoke for one-line status consumers. |
| Readiness finding preservation | `scripts/check-recall-first-apply-readiness.mjs`, `scripts/smoke-recall-first-apply-readiness.mjs` | Keeps child key-rotation evidence findings in the parent readiness details, so `env_file_not_rotated_after_checkpoint` remains visible when the first-write gate fails. |

## Safety Properties

- The wrapper does not create or refresh proof files.
- The wrapper does not read or write the AI Brain database.
- The wrapper does not run apply, deploy, scheduler enablement, or checkpoint advancement.
- The wrapper does not satisfy key-rotation evidence, proof freshness, approval, apply, deploy, scheduler, or checkpoint gates.
- The wrapper prints no Recall API key, bearer token, env contents, private Recall card IDs, private titles, private source URLs, chunks, raw response bodies, dry-run payloads, apply payloads, backup payloads, or database rows.
- When `--probe-no-env-file` is used, the lower-level live probe is forced to ignore Recall env files and use only the named process environment variable; this is intended for a private terminal after key rotation when the persisted env file is stale or intentionally not trusted for a read-only diagnostic.
- The prompt wrapper uses the internal child variable `RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY`, never writes it to disk, and forces `--probe-no-env-file`.
- The prompt wrapper runs an internal no-live prompt guard preflight before any key prompt or stdin read; if the guard ever stops recognizing controlled probe credential or env-file flags, it fails closed with `prompt_guard_preflight_failed`.
- The prompt wrapper rejects caller-supplied probe credential flags before prompting, including equals-form overrides, so a contradictory `--probe-api-key-env=...` cannot make the child fail only after a key was entered.
- Successful prompt-wrapper diagnostic output now includes a `promptWrapper` block with `preKeyGuarded: true`, `keyEntryMode`, `credentialMode: local_prompt_env_file_disabled`, `childApiKeyEnv: RECALL_PROMPT_LIVE_DIAGNOSTIC_API_KEY`, `envFileDisabledForProbe: true`, `controlledProbeArgsRejectedBeforeKeyEntry: true`, and the internal preflight counts, so the live-read artifact itself proves it came through the guarded prompt path.
- `--output-file` is optional and private-path-only. The prompt wrapper refuses paths outside `data/private/recall-live-spikes/` with `output_file_not_private` before reading a key. The env-file wrapper refuses paths outside the same private root before probing. Both write only already-sanitized diagnostic JSON and set owner-only mode `0600`.
- `npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test` gives a direct no-live self-test with no Recall API key prompt, no env-file load, and no network call.
- `npm run smoke:recall-first-apply-live-diagnostic-prompt-guard` gives a no-live, no-server self-test that the prompt guard self-test proves `internal no-live preflight runs before any key prompt or stdin read`, rejects controlled probe flags before reading stdin, and prints no secret-shaped values.
- `npm run recall:first-apply:status` now exposes the direct no-live check as `diagnostics.liveReadConnectivity.promptGuardSelfTestCommand: npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test`, keeps the deeper regression smoke as `diagnostics.liveReadConnectivity.promptGuardSmokeCommand: npm run smoke:recall-first-apply-live-diagnostic-prompt-guard`, and lists `optionalDiagnosticCommands[0].id: first_apply_live_diagnostic_prompt_guard` with `mode: offline_self_test`, so operators see the pre-key self-test before the real prompt command.
- `npm run recall:first-apply:status` now exposes `diagnostics.liveReadConnectivity.optionalNoWritePromptCommand` even when the local live gate is not ready; it includes `--output-file data/private/recall-live-spikes/live-diagnostic-report.json`, reports `optionalNoWritePromptOutputFile`, and marks `promptDiagnosticAvailableWithoutLocalLiveGate: true`, `promptDiagnosticBypassesLocalLiveGate: true`, and `promptDiagnosticPreKeyGuarded: true`, while the env-file wrapper and lower-level auth probe remain hidden until local env-file live-gate evidence is ready. When the local live gate is ready, `optionalNoWriteWrapperCommand` also includes `--output-file data/private/recall-live-spikes/live-diagnostic-report.json`, and status reports `optionalNoWriteWrapperOutputFile` plus `optionalDiagnosticCommands[2].outputFileMode: 0600`.
- The wrapper now emits `localPrivateGateHandling`, including `bypassedLocalLiveGateForReadOnlyProbe`, so a terminal-only read diagnostic can prove it continued past missing local env-file readiness only for the read-only env-file-disabled probe.
- Operator-facing Recall live/readiness package scripts, nested child spawns, proof-refresh wrappers, first capped apply, and scheduled apply now use `node -- ...` where AI Brain may pass `--env-file`, so Node 22 does not consume AI Brain's flag before the wrappers can validate or ignore it.
- `npm run check:recall-node-env-file-separators` verifies `package env-file scripts use node separator`, `shell wrappers use node separator for env-file gates`, `child spawns use node separator for env-file gates`, and `tsx commands place separator after node options`, making the local-gate fix durable instead of relying on a manual package-script scan.
- Parent readiness output preserves child key-rotation rules such as `env_file_not_rotated_after_checkpoint`, making the local private gate failure actionable without printing env contents.
- The real first-write path remains blocked until key rotation evidence, fresh proof, exact approval, and exact acknowledgement pass.

## Validation

Passed:

```text
node --check scripts/check-recall-first-apply-status.mjs
node --check scripts/smoke-recall-first-apply-status.mjs
node --check scripts/run-recall-first-apply-live-diagnostic.mjs
node --check scripts/run-recall-first-apply-live-diagnostic-prompt.mjs
node --check scripts/smoke-recall-first-apply-live-diagnostic.mjs
npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test
npm run smoke:recall-key-rotation-evidence
npm run smoke:recall-key-rotation-evidence-record
npm run smoke:recall-first-apply-prepare-after-rotation
npm run smoke:recall-live-auth-probe
npm run smoke:recall-live-gate-status
npm run smoke:recall-live-spikes
npm run smoke:recall-first-apply-readiness
npm run smoke:recall-first-apply-status
npm run smoke:recall-first-apply-live-diagnostic-prompt-guard
npm run smoke:recall-first-apply-live-diagnostic
npm run smoke:recall-first-apply-ready-or-refresh
npm run smoke:recall-first-apply-proof-refresh
npm run smoke:recall-first-capped-apply
npm run smoke:recall-scheduler-wrapper
npm run check:recall-scheduler
npm run check:recall-node-env-file-separators
npm run check:recall-approval-packet
npm run check:recall-public-docs-privacy
npm run smoke:recall-public-docs-privacy
npm run recall:first-apply:status
```

The focused smoke now includes the local-gate regression case: `npm run recall:first-apply:live-diagnostic:prompt` reads the key from stdin, forwards a missing `--env-file` path through Node's `--` separator, keeps the probe in env-file-disabled mode, reports `localPrivateGateHandling.bypassedLocalLiveGateForReadOnlyProbe: true`, and still makes exactly one read-only `/cards` request against the local smoke server. It also proves the env-file wrapper rejects non-private `--output-file` paths before probing, writes sanitized private output as owner-only mode `0600`, and reports `diagnosticOutputFile.written: true` without printing the supplied test key or private Recall values. The prompt path proves the prompt wrapper runs an internal no-live preflight before reading a key, rejects caller-supplied probe credential flags before prompting, including equals-form overrides, enriches successful output with `promptWrapper.preKeyGuarded: true`, `promptWrapper.childApiKeyEnv`, `promptWrapper.envFileDisabledForProbe: true`, and `promptWrapper.controlledProbeArgsRejectedBeforeKeyEntry: true`, refuses `--output-file` outside `data/private/recall-live-spikes/` before key entry, and writes sanitized private output as owner-only mode `0600`, without printing the supplied test key or adding an extra live-read request. The standalone guard smoke reports `prompt guard self-test proves internal no-live preflight before key entry` and `prompt guard rejects controlled probe flags before reading stdin` across exact and equals-form controlled flags.

The broader hardening smoke confirms `npm run check:recall-key-rotation-evidence -- --env-file data/private/recall-live-spikes/does-not-exist.env` now reaches AI Brain code and returns JSON with `missing_env_file` instead of failing as a Node preloader error. The executable separator gate `npm run check:recall-node-env-file-separators` also reports `package env-file scripts use node separator`, and the package-script scan still reports: `no package scripts expose app --env-file without node separator`.

The real status command still returns `blocked_key_rotation_evidence`. It now includes:

```text
diagnostics.liveReadConnectivity.optionalNoWritePromptCommand:
npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```

It also includes `diagnostics.liveReadConnectivity.optionalNoWritePromptOutputFile: data/private/recall-live-spikes/live-diagnostic-report.json`, `diagnostics.liveReadConnectivity.optionalNoWriteWrapperOutputFile: data/private/recall-live-spikes/live-diagnostic-report.json`, `diagnostics.liveReadConnectivity.promptGuardSelfTestCommand: npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test`, `diagnostics.liveReadConnectivity.promptGuardSmokeCommand: npm run smoke:recall-first-apply-live-diagnostic-prompt-guard`, and `diagnostics.liveReadConnectivity.promptDiagnosticPreKeyGuarded: true`. `optionalDiagnosticCommands[0]` is the no-live guard with `id: first_apply_live_diagnostic_prompt_guard`, `mode: offline_self_test`, `credentialMode: no_real_key_no_live_api`, and `regressionCommand: npm run smoke:recall-first-apply-live-diagnostic-prompt-guard`; `optionalDiagnosticCommands[1]` is the preferred real read-only prompt with `id: first_apply_live_diagnostic_prompt`, `mode: read_only`, `preferred: true`, `credentialMode: local_prompt_env_file_disabled`, `preKeyGuarded: true`, `guardedBy: npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test`, `outputFile: data/private/recall-live-spikes/live-diagnostic-report.json`, `outputFileMode: 0600`, and explicit `doesNotSatisfy` entries for key-rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, and checkpoint gates. When the local live gate is not ready, status sets `promptDiagnosticAvailableWithoutLocalLiveGate: true`, `promptDiagnosticBypassesLocalLiveGate: true`, keeps the prompt command visible, and leaves `optionalNoWriteWrapperCommand`/`optionalNoWriteCommand` null. When the local live gate is ready, `optionalDiagnosticCommands[2]` is the env-file wrapper with `command: npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json`, `outputFile: data/private/recall-live-spikes/live-diagnostic-report.json`, and `outputFileMode: 0600`. For one-line status consumers, `readOnlyDiagnosticNextAction` names the same private-output prompt command, says the prompt command also runs its internal no-live guard before key entry, names the direct no-live guard, and names the regression smoke while repeating that the real prompt does not satisfy key rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates. The env-file wrapper remains available as a non-preferred third optional diagnostic command only when the local live gate is ready.

## Current Real State

No live Recall API call was made in this session. The current local private state still fails first-write gates because `data/private/recall-live-spikes/recall.env` predates the key-rotation checkpoint and `data/private/recall-live-spikes/key-rotation-evidence.json` is absent. Dry-run and backup proof are also stale. This wrapper fixes the local-gate ambiguity for read-only diagnostics; it does not reduce or bypass first-write safety.

If a rotated key is available only in a private terminal and should not be written to `data/private/recall-live-spikes/recall.env` yet, the preferred status-discovered read-only diagnostic can be run without the env file and with durable private output:

```bash
npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```

The shorter prompt command without `--output-file` is still supported for ephemeral checks, but the status helper intentionally recommends the private-output form:

```bash
npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api
```

The preferred private-output command first runs the internal no-live guard before key entry, then prompts locally, hides the key in an interactive terminal, writes only sanitized JSON under the ignored private Recall evidence path, still runs only the read-only `/cards` auth probe, and still leaves `blocked_key_rotation_evidence` as the first-write status until proper private key-rotation evidence is recorded. The shorter command does the same read-only probe without writing the durable private copy.

When the ignored private env file is trusted for the read-only diagnostic and the local live gate is ready, the env-file wrapper can now write the same private diagnostic file:

```bash
npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
```

The lower-level non-prompt equivalent remains `read -rsp "Recall API key: " RECALL_EPHEMERAL_API_KEY; echo`, then `RECALL_EPHEMERAL_API_KEY="$RECALL_EPHEMERAL_API_KEY" npm run recall:first-apply:live-diagnostic -- --probe-no-env-file --probe-api-key-env RECALL_EPHEMERAL_API_KEY --confirm-live-api`, then `unset RECALL_EPHEMERAL_API_KEY`.

## Next Step

After the Recall API key is rotated outside chat and stored only in the ignored private env file, run:

```text
BRAIN_RECALL_KEY_ROTATION_ACK="I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file." BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation
```

Only after status/readiness become green should the guarded first capped apply be considered, and only with exact write approval.
