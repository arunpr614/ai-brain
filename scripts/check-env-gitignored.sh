#!/usr/bin/env bash
# v0.5.0 T-2 — assert .env hygiene.
#
# Fails (exit non-zero) if:
#   - `.env` is tracked by git
#   - `.env` is not matched by `.gitignore`
#   - `.env.example` is missing
#
# Runs in CI-equivalent local gate; wired into `npm test` precedent
# by a sibling assertion in smoke (future T-33).

set -euo pipefail

cd "$(dirname "$0")/.."

fail() {
  echo "[check-env] FAIL: $*" >&2
  exit 1
}

# 1. .env.example must exist (documentation source of truth).
if [[ ! -f .env.example ]]; then
  fail ".env.example missing — should document every BRAIN_* variable"
fi

# 2. .env (if present) must not be tracked by git.
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail ".env is tracked by git — run: git rm --cached .env"
fi

# 3. .env must be matched by .gitignore (ask git itself).
#    `git check-ignore` exits 0 if the path is ignored, 1 if not ignored,
#    128 on error. Create a temp probe file if .env doesn't exist locally —
#    check-ignore works on path strings, not actual files, but a file makes
#    the check symmetric with normal usage.
if ! git check-ignore -q .env 2>/dev/null; then
  # Check with an explicit path probe, in case .env doesn't exist locally.
  if ! git check-ignore -q --no-index .env 2>/dev/null; then
    fail ".env is not gitignored — add it to .gitignore"
  fi
fi

# 4. .env.example must NOT be gitignored (it's meant to be committed).
if git check-ignore -q .env.example 2>/dev/null; then
  fail ".env.example is gitignored but should be committed"
fi

echo "[check-env] ok — .env is gitignored, .env.example is committed-tracked"
