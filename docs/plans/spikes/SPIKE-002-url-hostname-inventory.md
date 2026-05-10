# SPIKE-002 — Inventory every hardcoded URL / hostname / origin for the Cloudflare pivot

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-002 |
| **Date** | 2026-05-10 20:08 |
| **Author** | AI agent (Claude) |
| **Time box** | 15 min |
| **Triggered by** | R-CFT critique B-5 (`ALLOWED_ORIGINS` needed updating). Critique-absorption commit `279ec9c` fixed `bearer.ts`; this spike confirms whether other hardcoded hosts remain. |
| **Blocks** | T-CF-2 (delete mDNS), T-CF-3 (delete NSC), T-CF-9 (pairing page), T-CF-10 (README), T-CF-12 (cleanup) |
| **Verdict** | **PROCEED-WITH-CHANGES** — 9 remaining non-test references to `brain.local` across 7 files; all owned by already-planned T-CF-* tasks. No surprise deletions needed. |

## Question

Post-pivot, which files in the repo still contain hardcoded references
to the LAN-era addressing (`brain.local`, `http://`, etc.) that need
updating or deleting before the named-tunnel pivot is complete?

## Method

```bash
for pattern in "brain\\.local" "localhost:3000" "127\\.0\\.0\\.1:3000" \
               "brain-session" "domaincontrol" "scutil"; do
  grep -rn "$pattern" src/ android/ scripts/ capacitor.config.ts README.md 2>/dev/null \
    | grep -v "archive/\\|\\.planning/\\|test\\.ts\\|node_modules"
done
```

Test files excluded because most of those are rightly LAN-era (tests for
`src/lib/lan/mdns.ts`, etc.) and will be deleted alongside the code.

## Evidence

### `brain.local` references (10 outside tests; 2 inside tests)

| File | Line | Context | Action owner |
|------|------|---------|-------------|
| `src/app/setup-apk/page.tsx` | 12 | Docstring mentioning D-v0.5.0-3 decision tree | **T-CF-6** (reachability rewrite) |
| `src/components/share-handler.tsx` | 62 | `getBrainUrl()` default `http://brain.local:3000` | **T-CF-2** + plan v2.0 decision (see SPIKE-005) |
| `src/components/share-handler.tsx` | 64 | Same default in catch branch | Same as above |
| `src/lib/auth/bearer.ts` | 240 | Docstring referencing LAN-era → tunnel | Already CLEAR (reference comment only, not executable) |
| `src/lib/lan/mdns.ts` | 6 | Module comment | **T-CF-2** (delete whole file) |
| `src/lib/client/reachability-decision.ts` | 9 | Docstring describing D-v0.5.0-3 | **T-CF-6** (simplify to single probe) |
| `src/lib/client/reachability-decision.ts` | 39 | `const MDNS_BASE = "http://brain.local:3000"` | **T-CF-6** (delete constant) |
| `android/.../network_security_config.xml` | 25 | `<domain>brain.local</domain>` | **T-CF-3** (delete NSC entirely) |
| `android/.../capacitor.config.json` | 6 | Auto-regenerated from capacitor.config.ts | Already fixed by R-4 commit `279ec9c` |
| `README.md` | 35 | Stack table "mDNS `brain.local`" | **T-CF-10** (README rewrite) |
| `README.md` | 57 | "…server on your Mac (`http://brain.local:3000`…)" | **T-CF-10** |
| `src/app/api/errors/client/route.ts` | 14 | Docstring (already updated by critique commit) | Already CLEAR |

### `localhost:3000` / `127.0.0.1:3000` references

Non-test references outside `bearer.ts` ALLOWED_ORIGINS:

- `scripts/rotate-token.sh:19,23` — BRAIN_BASE_URL default. KEEP (script
  runs on the Mac itself; localhost is correct).
- `scripts/restore-from-backup.sh:4,39` — loopback port check. KEEP
  (prevents running against a live server; loopback is correct).
- `README.md:12` — "open http://localhost:3000 — set a PIN". KEEP
  (Mac-side web UI instruction; user does this on the Mac, not phone).

**Conclusion:** localhost/loopback references are all correct for
Mac-side usage; no changes needed.

### `brain-session` references

Session cookie name. Unaffected by pivot — stays `brain-session`.

### `domaincontrol` references

None in source code. Good — means no code assumes GoDaddy nameservers.

### `scutil` references

Only `src/lib/lan/mdns.ts:7` (file slated for deletion by T-CF-2).

## Findings

**No surprise deletions needed.** Every `brain.local` reference is
owned by an already-scheduled T-CF-* task:

- **T-CF-2** (delete mDNS code): `src/lib/lan/mdns.ts`, related test,
  instrumentation.ts wiring, bonjour-service dep, `share-handler.tsx`
  `getBrainUrl()` default
- **T-CF-3** (delete NSC): `network_security_config.xml`,
  AndroidManifest.xml attribute
- **T-CF-6** (simplify reachability decision): `reachability-decision.ts`
- **T-CF-9** (pairing page update): May not touch `brain.local` directly;
  verify when task runs
- **T-CF-10** (README rewrite): lines 35 + 57
- **Already landed (critique absorption `279ec9c`):** `bearer.ts`,
  `capacitor.config.ts`, `route.ts` (errors/client), test files

**One surprise:** `src/components/share-handler.tsx` has `getBrainUrl()`
that reads from `@capacitor/preferences` and falls back to
`http://brain.local:3000`. Post-pivot this default needs updating to
`https://brain.arunp.in`. But deeper question: **is Preferences still
needed for URL?** SPIKE-005 addresses this.

**localhost/loopback preservation:**

- Mac-side web UI is still `http://localhost:3000` (user opens Brain in
  Chrome on the Mac) — correct, keep.
- Internal scripts (`rotate-token.sh`, `restore-from-backup.sh`)
  correctly use loopback.
- `bearer.ts` ALLOWED_ORIGINS still permits `localhost:3000` +
  `127.0.0.1:3000` — correct, keep.

## Implementation recommendation

**No additional inventory needed.** The 10 non-test references align
1:1 with tasks already in the plan v2.0 backlog. When each T-CF-* task
runs, cross-reference this inventory to confirm no `brain.local` strings
survive in its scope.

**Suggested check at plan v2.0 acceptance criteria:** add a release-gate
grep to `scripts/smoke-v0.5.0.mjs` (when that exists):

```bash
# Release gate: no LAN-era strings outside archive/test
REMAINING=$(grep -rn "brain\\.local" src/ android/app/src/main/ scripts/ \
              capacitor.config.ts README.md 2>/dev/null \
              | grep -v "archive/\\|test\\.ts\\|\\.d\\.ts")
if [ -n "$REMAINING" ]; then
  echo "FAIL: brain.local references remain:"; echo "$REMAINING"; exit 1
fi
```

This catches regressions at release time.

## Risks / gaps surfaced

1. **AndroidManifest.xml** was not grep'd with LAN-specific patterns
   beyond the NSC attribute. If any intent-filter / permission explicitly
   references a host, it would not be caught by this inventory.
   Mitigation: T-CF-3 owns AndroidManifest cleanup and will see it.

2. **Documentation outside README.md** (e.g., `.planning/` files,
   `docs/` non-archived) was not grep'd. These are planning artifacts
   and not shipped in code; low risk.

3. **Tests that reference `brain.local`** (e.g., `mdns.test.ts`) were
   excluded. They ride along with the file deletion in T-CF-2; verify
   when that task runs.
