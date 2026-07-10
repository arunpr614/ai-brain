# Private Agent Documentation Locator

AI Brain's public documentation intentionally excludes executable production-write instructions, credentials, private Recall evidence, and dangerous approval text.

The owner-local runbook directory is resolved as:

```text
AI_BRAIN_PRIVATE_DOCS_DIR, when explicitly set
otherwise ~/.config/ai-brain/agent-docs
```

Expected logical documents:

- `production-ops.md`
- `recall-sync-ops.md`
- `private-evidence-and-keys.md`
- `manifest.json`

The directory must be owner-only (`0700`) and files must be owner-readable/writable only (`0600`). These files are deliberately not distributed with a clone or worktree. Their initial availability model is one machine and one owner.

If the directory or a required document is absent, report `private runbook unavailable on this machine` and stop any sensitive operation. Do not reconstruct commands, approvals, paths, or credentials from old public plans.

Private docs may point to existing ignored evidence, but they must never contain API key values, bearer tokens, cookies, session values, or copied private payloads. Cross-machine distribution requires a separate encrypted, access-controlled design and explicit owner approval.
