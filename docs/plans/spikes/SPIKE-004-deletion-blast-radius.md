# SPIKE-004 — Who depends on the LAN-era modules (mDNS, bonjour, getLanIpv4) that T-CF-2 will delete?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-004 |
| **Date** | 2026-05-10 20:12 |
| **Author** | AI agent (Claude) |
| **Time box** | 10 min |
| **Triggered by** | Plan v2.0 T-CF-2 proposes deleting `src/lib/lan/mdns.ts` + `bonjour-service` dep. Need to know the exact blast radius before the plan task commits to the scope. |
| **Blocks** | T-CF-2 (delete mDNS code) |
| **Verdict** | **CLEAR** — deletion blast radius is well-scoped. `mdns.ts` has only internal dependents; `getLanIpv4()` has 3 callers (all already in pivot scope); `bonjour-service` is used only by the deleted file. No accidental fan-out. |

## Question

Plan v2.0 T-CF-2 wants to delete `src/lib/lan/mdns.ts`, the
`bonjour-service` npm dep, and mDNS wiring in `src/instrumentation.ts`.
What else depends on these, explicitly or transitively? Would the
deletion surface unexpected breakage?

## Method

```bash
# Direct imports of mdns.ts
grep -rln "from.*lan/mdns\|from.*mdns" src/

# Direct uses of bonjour-service
grep -rln "bonjour-service\|bonjour" src/ | grep -v "\\.test\\."

# Callers of getLanIpv4 + buildSetupUri (from lib/lan/info.ts)
grep -rln "getLanIpv4\\|buildSetupUri" src/ | grep -v "\\.test\\.\\|lan/info"

# Inspect instrumentation.ts
head -30 src/instrumentation.ts
```

## Evidence

### `src/lib/lan/mdns.ts` dependents

```
src/lib/lan/mdns.test.ts
```

Only the colocated test file. No production code imports `mdns.ts`
except via `src/instrumentation.ts` dynamic import (see below).

### `bonjour-service` dependents

```
src/lib/lan/mdns.ts
```

Single file. Dep can be safely removed from `package.json` +
`package-lock.json` when `mdns.ts` is deleted.

### `src/instrumentation.ts` dynamic import

Found at roughly line 30:

```typescript
const { publishMdns, registerMdnsShutdownHandlers } =
  await import("@/lib/lan/mdns");
```

This is the only production caller. Deletion requires editing this
import to remove both symbols. Adjacent code (getDb, startBackupScheduler,
startEnrichmentWorker, ensureLanToken) stays.

### `getLanIpv4()` + `buildSetupUri()` callers (from `src/lib/lan/info.ts`)

```
src/app/settings/lan-info/page.tsx
src/app/api/settings/lan-info/route.ts
src/lib/lan/setup-uri.ts
```

Three files, all already in pivot scope:
- `src/app/settings/lan-info/page.tsx` — owned by T-CF-9 (pairing page
  rewrite)
- `src/app/api/settings/lan-info/route.ts` — owned by T-CF-9 (same
  task; API backing the pairing page)
- `src/lib/lan/setup-uri.ts` — owned by T-CF-4 (QR schema change)

No other callers.

## Findings

**Scope is contained.** The LAN-era deletion graph is:

```
 src/instrumentation.ts  ─┐
                          └─> src/lib/lan/mdns.ts ─> bonjour-service
 src/lib/lan/mdns.test.ts ┘                            (npm dep)

 src/lib/lan/info.ts (getLanIpv4, buildSetupUri)
  ├─> src/app/settings/lan-info/page.tsx
  ├─> src/app/api/settings/lan-info/route.ts
  └─> src/lib/lan/setup-uri.ts
```

**What T-CF-2 must do (refined scope):**

1. Delete `src/lib/lan/mdns.ts`
2. Delete `src/lib/lan/mdns.test.ts`
3. Edit `src/instrumentation.ts` — remove the `publishMdns` +
   `registerMdnsShutdownHandlers` dynamic import and calls. Other
   imports stay.
4. Remove `bonjour-service` from `package.json` + regenerate
   `package-lock.json`.
5. (Optional, low-priority) Remove the `F-035` / mDNS-related comments
   from `src/instrumentation.ts` file-level docstring.

**What T-CF-2 must NOT do:**

- Touch `src/lib/lan/info.ts` (keeps `rotateLanToken()` which is still
  used by the bearer flow; `getLanIpv4()` + `buildSetupUri()` are used
  by pairing page, deletion of those is T-CF-9 / T-CF-4 scope).
- Touch `src/lib/auth/bearer.ts` `ensureLanToken()` (this is
  transport-agnostic, survives the pivot).

**Rename decision needed for plan v2.0:**

Post-T-CF-2 deletion, `src/lib/lan/` will contain only `info.ts` and
`setup-uri.ts`, both of which still have relevant functionality
(`rotateLanToken`, `parseSetupUri`, `buildSetupUri` in new shape).
"lan" is a misnomer when the transport is a public tunnel. Two options:

- **Option A:** rename `src/lib/lan/` → `src/lib/pairing/` in a T-CF-12
  cleanup commit. Lots of import rewrites; easy grep-and-replace.
- **Option B:** keep `src/lib/lan/` as the module name (acts as
  historical marker of the feature area). Rewrite docstrings to clarify
  it's not about LAN anymore.

Plan v2.0 should pick one. Lean toward **Option B** — the churn of
Option A is real (all 3 callers need import path changes) and the name
isn't visible to end users.

## Implementation recommendation

**T-CF-2 task shape (for plan v2.0):**

```markdown
| T-CF-2 | Delete mDNS code | Files:
  - DELETE src/lib/lan/mdns.ts
  - DELETE src/lib/lan/mdns.test.ts
  - EDIT src/instrumentation.ts — remove publishMdns/registerMdnsShutdownHandlers
  - EDIT package.json — remove bonjour-service dep
  - EDIT package-lock.json (auto via npm uninstall)
  Acceptance:
  - npm run lint + npm test + npm run build all green
  - grep "bonjour\\|publishMdns" src/ returns no results
  - npm ls bonjour-service errors with "not found"
| ... |
```

**Pair with an explicit "Option B" decision:** keep `src/lib/lan/` as
the directory name; drive a future consolidation only if it becomes
confusing.

## Risks / gaps surfaced

1. **Dynamic imports** can hide dependents. I grep'd for
   `from.*mdns` and `from.*lan/mdns` — a `require("@/lib/lan/mdns")`
   would not be caught by these patterns. Plausibly zero such callers
   exist in a TypeScript codebase using ESM, but worth a `grep -rn mdns`
   at T-CF-2 execution.

2. **`npm ls bonjour-service`** may show transitive dependents if any
   other npm package in the tree depends on it. Unlikely (bonjour-service
   is not a common transitive dep) but verify at T-CF-2 via
   `npm ls bonjour-service` pre-delete.

3. **The `lan.mdns.zombie-advert-cleanup` type** that `mdns.ts` emits
   to `logError` will no longer be produced. Grep shows no consumer of
   that specific type; fine.
