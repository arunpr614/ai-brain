# Agent Command Safety Registry

This registry classifies every package script at the documentation baseline. Command names are not safety evidence. `Unknown` and W2-W4 commands are not safe first commands.

| Command | Classification | Network | Writes | Production | Approval | Evidence |
|---|---|---|---|---|---|---|
| `audit:vectors` | W2 local persistent write | No | Optional owner-only audit report | Possible | Explicit database review | Content-free vector and queue integrity audit; target database determines scope |
| `backfill:embeddings` | W2 local persistent write | Provider dependent | Local database | No | Explicit local data approval | Writes embedding/chunk state |
| `backfill:embeddings:prod` | W4 production write | Yes | Production database | Yes | Explicit private approval | Production embedding backfill |
| `backfill:youtube-transcripts` | W2 local persistent write | Provider dependent | Local database and artifacts | No | Explicit local data approval | Transcript recovery can call configured providers and persist results |
| `backfill:youtube-transcripts:prod` | W4 production write | Yes | Production database and artifacts | Yes | Exact private approval | Guarded production transcript recovery |
| `bench:ask` | W2 local persistent write | Provider dependent | Benchmark output/local reads | No | Explicit local data approval | Uses library/provider data and writes results |
| `build` | W2 local persistent write | Dependency dependent | Generated artifacts | No | No | Build output written locally |
| `build:apk` | W2 local persistent write | Dependency dependent | Generated artifacts | No | No | Build output written locally |
| `build:recall-cli` | W2 local persistent write | Dependency dependent | Generated artifacts | No | No | Build output written locally |
| `build:vector-tools` | W2 local persistent write | Dependency dependent | Generated artifacts | No | No | Bundles vector audit and repair tools for deployment |
| `check:agent-doc-coverage` | R0 read-only local | No | No | No | No | Local source/config inspection |
| `check:agent-docs` | R0 read-only local | No | No | No | No | Local source/config inspection |
| `check:agent-wiki-privacy` | R0 read-only local | No | No | No | No | Local source/config inspection |
| `check:agent-wiki-structure` | R0 read-only local | No | No | No | No | Local source/config inspection |
| `check:ai-providers` | R1 network read | Yes | No application state | No | Intentional network use | Provider reachability/status probe |
| `check:build-artifacts` | R0 read-only local | No | No | No | No | Local source/config inspection |
| `check:env` | R0 read-only local | No | No | No | No | Local source/config inspection |
| `check:feature-council-wiki` | R0 read-only local | No | No | No | No | Deterministic source/manifest/generated-page comparison |
| `check:recall-apply-report` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-approval-packet` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-controlled-samples` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-dry-run-report` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-first-apply-readiness` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-goal-completion-audit` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-key-rotation-evidence` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-live-diagnostic-report` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-live-spike-reports` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-node-env-file-separators` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-prelive` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-prelive:live-confirmed-status` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-private-ignore` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-production-deploy-evidence` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-public-docs-privacy` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-public-manifest-privacy` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-public-privacy` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-scheduler` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-scheduler-enable-evidence` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `check:recall-second-manual-local-gate-resolution` | R0 read-only local | No | No | No | No | Static or local-evidence checker; live variants remain prohibited by project gate |
| `dev` | W2 local persistent write | Local listener | Application/local database possible | No | Intentional app start | Running app can mutate local state through use |
| `lint` | R0 read-only local | No | No | No | No | Local source/config inspection |
| `recall:controlled-samples:guide` | R0 read-only local | No | No | No | Private context required | Command/status renderer; do not publish rendered sensitive output |
| `recall:controlled-samples:init` | W2 local persistent write | Possible | Private local files | No | Explicit private operation | Creates or changes private operational state |
| `recall:current-gate` | R0 read-only local | No | No | No | Private context required | Reads local/private evidence metadata |
| `recall:daily-sync:completion-status` | R0 read-only local | No | No | No | Private context required | Reads local/private evidence metadata |
| `recall:env:init` | W2 local persistent write | Possible | Private local files | No | Explicit private operation | Creates or changes private operational state |
| `recall:first-apply:live-diagnostic` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:live-diagnostic:prompt` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:preflight` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:prepare-after-rotation` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:prepare-plan` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:proof-refresh` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:ready-or-refresh` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:refresh-if-needed` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:first-apply:status` | R0 read-only local | No | No | No | Private context required | Reads local/private evidence metadata |
| `recall:first-capped-apply` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:key-rotation-evidence:record` | W2 local persistent write | Possible | Private local files | No | Explicit private operation | Creates or changes private operational state |
| `recall:key-rotation:handoff` | R0 read-only local | No | No | No | Private context required | Command/status renderer; do not publish rendered sensitive output |
| `recall:key-rotation:write-env` | W2 local persistent write | Possible | Private local files | No | Explicit private operation | Creates or changes private operational state |
| `recall:live-auth-probe` | R1 network read | Yes | Private report possible | No direct apply | Explicit live authorization | Live Recall read path; forbidden in documentation execution |
| `recall:live-gate:require-ready` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:live-gate:status` | R0 read-only local | No | No | No | Private context required | Reads local/private evidence metadata |
| `recall:live-spikes` | R1 network read | Yes | Private report possible | No direct apply | Explicit live authorization | Live Recall read path; forbidden in documentation execution |
| `recall:manual-verification-apply` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:production-env-key:install` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:production-key-evidence:command` | R0 read-only local | No | No | No | Private context required | Command/status renderer; do not publish rendered sensitive output |
| `recall:production-key-evidence:repair` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:scheduler-enable-evidence:record` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:scheduler-enable:command` | R0 read-only local | No | No | No | Private context required | Command/status renderer; do not publish rendered sensitive output |
| `recall:scheduler-evidence:command` | R0 read-only local | No | No | No | Private context required | Command/status renderer; do not publish rendered sensitive output |
| `recall:second-manual:command` | R0 read-only local | No | No | No | Private context required | Command/status renderer; do not publish rendered sensitive output |
| `recall:second-manual:production-apply` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:second-manual:production-command` | R0 read-only local | No | No | No | Private context required | Command/status renderer; do not publish rendered sensitive output |
| `recall:second-manual:readiness` | R0 read-only local | No | No | No | Private context required | Reads local/private evidence metadata |
| `recall:second-manual:remote-runtime-preflight` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `recall:second-manual:runtime-preflight` | W4 production write | Yes | Possible production/private state | Yes | Exact private approval | Guarded Recall operational path; never public executable guidance |
| `repair:vectors` | W4 production write | No | SQLite vector and queue state | Possible | Exact audit ID plus verified-backup approval | Guarded repair refuses stale audits and records a content-free post-audit |
| `smoke` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:0.3.1` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:0.4.0` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:0.5.0` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:0.5.1` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:agent-doc-coverage` | W1 local ephemeral write | No | Temporary files | No | No | Synthetic temporary fixtures |
| `smoke:agent-docs` | W1 local ephemeral write | No | Temporary files | No | No | Synthetic temporary fixtures |
| `smoke:agent-wiki-privacy` | W1 local ephemeral write | No | Temporary files | No | No | Synthetic temporary fixtures |
| `smoke:agent-wiki-structure` | W1 local ephemeral write | No | Temporary files | No | No | Synthetic temporary fixtures |
| `smoke:batch` | W2 local persistent write | Provider dependent | Local database | No | Explicit local data approval | Batch pipeline smoke may mutate local state |
| `smoke:capture-quality` | W2 local persistent write | Yes | Evaluation output | No | Explicit evaluation approval | Capture evaluation may call providers and write reports |
| `smoke:recall-apply-report` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-cli:bundle` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-completion-evidence` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-controlled-samples-guide` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-controlled-samples-init` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-current-gate` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-daily-sync-completion-status` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-dry-run-report` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-env-init` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-apply-live-diagnostic` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-apply-live-diagnostic-prompt-guard` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-apply-prepare-after-rotation` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-apply-proof-refresh` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-apply-readiness` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-apply-ready-or-refresh` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-apply-status` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-first-capped-apply` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-goal-completion-audit` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-key-rotation-env-writer` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-key-rotation-evidence` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-key-rotation-evidence-record` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-key-rotation-handoff` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-latest-spike-reports` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-live-auth-probe` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-live-diagnostic-report` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-live-diagnostic-report-check` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-live-gate-status` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-live-spike-reports` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-live-spikes` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-manual-verification-apply` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-prelive-output` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-production-env-key-install` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-production-key-evidence-repair` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-public-docs-privacy` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-public-manifest-privacy` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-public-privacy` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-scheduler-enable-command` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-scheduler-enable-evidence-record` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-scheduler-evidence-command` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-scheduler-wrapper` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-second-manual-command` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-second-manual-local-gate-resolution` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-second-manual-production-apply` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-second-manual-production-command` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-second-manual-readiness` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-second-manual-remote-runtime-preflight` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-second-manual-runtime-preflight` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:recall-sync-env-file-export` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:telegram` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `smoke:youtube` | R1 network read | Yes | No application state | No | Intentional network use | Extractor-only network smoke |
| `smoke:youtube:prod` | R1 network read | Yes | No application state | No | Intentional network use | Extractor-only network smoke |
| `smoke:youtube:quality` | R1 network read | Yes | No application state | No | Intentional network use | Extractor-only network smoke |
| `start` | W2 local persistent write | Local listener | Application/local database possible | No | Intentional app start | Running app can mutate local state through use |
| `test` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `test:coverage` | W1 local ephemeral write | No | Temporary/fixture state | No | No | Test or rehearsal source inspected; keep isolated |
| `typecheck` | R0 read-only local | No | No | No | No | Local source/config inspection |
