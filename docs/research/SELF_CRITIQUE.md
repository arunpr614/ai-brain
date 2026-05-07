# Research Spikes — Self-Critique Report

**Document version:** v0.1.0-critique
**Date:** 2026-05-07
**Author:** AI agent (Claude), reviewing own earlier output
**Scope:** R-LLM, R-CAP, R-PDF, R-AUTH (the four P0 research spikes that inform `BUILD_PLAN.md` §15)
**Purpose:** Adversarial review of our own research before committing to implementation. Goal is to surface unverified claims, missing angles, cross-spike inconsistencies, and overconfident recommendations so they can be fixed, tested, or explicitly accepted as risk.

---

## 0. How this critique was done

- Each spike was re-read in full after a context break.
- I looked for three classes of defects: **(a) unverified claims**, **(b) missing angles the spike should have covered**, and **(c) contradictions or coverage gaps across the four spikes**.
- No code was run. Each finding is labelled with a severity: 🟥 **Blocker** (must fix before implementation), 🟧 **Major** (fix during or before the blocking phase), 🟨 **Minor** (track but not gating).
- Every finding is followed by a concrete remediation action with an owner.

This is a living document. Findings flip to `RESOLVED` with a date when addressed. New findings may be appended at any time.

---

## 1. Summary scorecard

| Spike | Claims made | Empirically verified | Extrapolated | Unverified | Overall grade |
|---|---|---|---|---|---|
| R-LLM | ~35 | 0 (no benchmarks run on this Mac) | ~20 (tok/s figures, RAM usage) | ~15 (quality claims, Qwen 2.5 MMLU) | **C+** — good reasoning, weak evidence |
| R-CAP | ~30 | 0 (no APK built) | ~5 | ~10 (plugin maintenance, Android 15 compat) | **B** — good pattern recognition, untested |
| R-PDF | ~25 | 0 (no extraction run on real PDFs) | ~3 | ~8 (ligature claims, page-count heuristic) | **B−** — comprehensive matrix, no empirical validation |
| R-AUTH | ~20 | 0 (prior-art links verified; no threat-model exercise) | ~0 | ~6 (Arun's café use case, token rotation UX) | **B+** — the most honest spike; still has gaps |

**Aggregate grade: B−.** The research is responsible in tone (honest about extrapolations, cites prior art, flags re-verify triggers) but materially unverified. Every locked-in decision in `BUILD_PLAN.md §15` currently rests on desk research alone. Before v0.3.0 we need a short empirical spike per area to convert extrapolations to measurements.

---

## 2. R-LLM — Detailed findings

### 🟥 L-1 — All tok/s figures are extrapolations from a 2023 LLaMA-2 baseline

The document cites "LLaMA-2 7B Q4_0 = 36 tok/s" (confirmed on M1 Pro, llama.cpp Metal) as the anchor, then applies a bandwidth-scaling formula to derive every other model's tok/s. Real Qwen 2.5 7B Q4_K_M numbers from 2026 M1 Pro benchmarks were **not** cited. The formula `tok/s ∝ bandwidth / model_memory_footprint` is a first-order approximation; attention compute, batch-size effects, and Metal kernel tuning matter at the ±30% level.

**Impact:** Workload-2 RAG chat target is `<2 s first token, 30 tok/s`. Our predicted 35 tok/s is only 17% above target. If the real number is 30% lower (25 tok/s), we miss the UX target.

**Remediation:**
- Before v0.3.0 kickoff, run a 10-minute empirical bench: `ollama pull qwen2.5:7b-instruct-q4_K_M`, run a 4 K-context prompt, measure first-token and generation tok/s. If actual < 30 tok/s generation, investigate `OLLAMA_FLASH_ATTENTION` / KV quantization tuning before writing UX code that assumes the target.

### 🟧 L-2 — Qwen 2.5 MMLU figures are starred as estimates, but the primary model pick depends on them

Footnote: *"Qwen 2.5 MMLU figures are community-reported estimates; official blog cites strong MMLU-Pro results. Treat as directionally correct."* The entire comparative table that ranks Qwen 2.5 7B above Llama 3.2 3B and Gemma 2 9B relies on quality proxies that are not cited with sources.

**Impact:** If Qwen 2.5 7B's real quality on *English-newsletter-summarization* is lower than Gemma 2 9B IT or a future Llama 3.4, our summaries are worse for months before we notice.

**Remediation:**
- At v0.3.0 (Intelligence phase), implement a small LLM eval harness: 10 Substack-style inputs → summary/category/tags. Score with rubric (accuracy, structure, hallucination). Run Qwen 2.5 7B and Gemma 2 9B side-by-side. Lock the winner only after this is measured.

### 🟧 L-3 — Missing: cold-load time for 14B model

GenPage (workload 4) uses Qwen 2.5 14B loaded on-demand with `keep_alive: 0` after use (to free 11 GB). But the research does NOT estimate **load time from cold**. Loading 8.7 GB of weights into memory on M1 Pro takes 5-15 seconds depending on disk cache state. The user clicks "Generate page" → waits 10s before the first token streams. Current UX spec says "outline-first skeleton renders immediately" — if the model is cold, that skeleton is delayed by the load.

**Impact:** UX promise in `DESIGN_SYSTEM.md` §8.5 ("sections stream in one by one") will feel broken on first GenPage of a session.

**Remediation:**
- Add to `BUILD_PLAN.md` §15.1: when the user opens a GenPage input, pre-load the 14B model speculatively.
- Add a "model loading" state in `DESIGN.md` (similar to `enriching-pill`) to honestly convey the wait.

### 🟧 L-4 — Missing: 7B-vs-14B eviction during concurrent chat + generate

`OLLAMA_MAX_LOADED_MODELS=1` evicts the 7B when 14B loads. If the user is mid-chat (7B hot), then clicks "Generate page" in another tab, the chat's next token fails or waits for 7B to reload. The research does not flag this orchestration problem.

**Impact:** Rare but real race condition. Would look like a bug.

**Remediation:**
- In `src/lib/llm/ollama.ts`, introduce a workload-priority queue: RAG chat holds 7B; GenPage requests are deferred with a "queued behind active chat" pill until chat idles for 30s.
- OR increase `OLLAMA_MAX_LOADED_MODELS=2` and accept ~17 GB peak usage (7B + 14B), leaving ~7 GB for OS. Bench this before committing.

### 🟧 L-5 — The "~8 GB reserved for OS/apps" figure is optimistic

Document assumes macOS + Chrome + Node + Notion = 8 GB. After a real workday (Slack, VS Code, Docker, 30 Chrome tabs, Spotify), baseline on an M1 Pro commonly hits 12-16 GB. The 14B model + 7B embed + 2 GB KV cache on top of 16 GB OS usage **exceeds** 32 GB and forces swap.

**Impact:** Real-world performance cliff we haven't predicted. Loading 14B on a busy Mac → thrashing → 1-2 tok/s.

**Remediation:**
- Add a pre-flight check to the Next.js server: query macOS memory_pressure; warn user if <6 GB free before launching a 14B job.
- Document in README: "Close heavy apps before GenPage/Flow" — not ideal, but honest.

### 🟧 L-6 — Qwen 3 was released April 2025 (a year before this research), yet not evaluated

The document dismisses Qwen 3 as "GGUF quantization availability and stability was still settling at time of writing." But the document is dated 2026-05-07 — 13 months after Qwen 3's release. By this date, Qwen 3 has stable Ollama GGUF support. Skipping it is a material coverage gap.

**Impact:** We may be committing to a year-old generation of models when a strictly better option exists.

**Remediation:**
- Spawn a mini re-spike R-LLM-b: verify current Qwen 3 Ollama tags, run the same head-to-head eval harness from L-2.

### 🟨 L-7 — Phi 3.5 "weak multilingual" is flagged but not risk-mitigated

Phi 3.5 is picked for workload 3 (noun-phrase extraction for GenLink). If Arun captures a non-English article, Phi 3.5 will likely fail silently with noisy extractions.

**Remediation:**
- Detect article language in capture pipeline (via Unicode script + first 500 chars heuristic, not a model). Route non-English items to Qwen 2.5 7B for noun-phrase extraction.

### 🟨 L-8 — Embeddings quality on newsletter corpus is unverified but recommendation is definitive

`nomic-embed-text` has MTEB 62.28. But MTEB is measured on a broad suite — not Substack-style newsletters. The research calls this out as an "open question" but still makes the definitive recommendation.

**Remediation:**
- Already captured as R-VEC / open-question in the original spike. No new action.

---

## 3. R-CAP — Detailed findings

### 🟥 C-1 — Plugin version is "6.x" — no specific version verified

Document says "tracks Capacitor major versions; check `npm info` at setup." No specific patch version (`6.0.3` vs `6.2.1`) verified. In the 6-month gap between now and v0.5.0, the plugin could break, publish a security advisory, or require a breaking update.

**Impact:** We could commit the build pipeline around a version that later breaks.

**Remediation:**
- At v0.5.0 kickoff, explicitly pin in `package.json`: `"@capawesome/capacitor-android-share-target": "6.x.y"` with the exact patch. Commit `package-lock.json`.

### 🟧 C-2 — No actual APK was built

The whole spike is desk research. No spike APK was generated; no share intent was tested on an AVD. Every claim about behavior is inherited from the plugin's README.

**Impact:** The cold-start gotcha (§5) and content-URI permission handling (§10) are the two highest-risk behaviors and neither is verified.

**Remediation:**
- Before v0.5.0 main build, run a 1-day spike: scaffold a throwaway Capacitor project, install the plugin, build an APK, test share intent on an AVD. **Must** validate cold-start event delivery and PDF content-URI handling before relying on them.

### 🟧 C-3 — Missing: APK auto-update strategy

The research assumes manual `adb install -r` every time the Next.js API contract changes or bugs are fixed. For a personal tool that's barely tolerable, but the capawesome suite includes `@capawesome/capacitor-live-update` which we already trust — it wasn't evaluated.

**Impact:** Every bug fix forces a terminal session + USB cable + adb. Friction kills iteration speed.

**Remediation:**
- Add R-CAP-b mini-spike for v0.5.0: evaluate capacitor-live-update for this use case. Since Brain's WebView points at the Mac (live Next.js, not static assets), the only thing shipped in the APK is the Capacitor shell + plugins + intent filters. Updates to web UI are automatic (WebView reloads from Mac). Live-update would only matter for native plugin changes. **Probably not needed** — but confirm.

### 🟧 C-4 — `content://` URI permission lifetime not tested

The research acknowledges (§10) that PDF content URIs have scoped permissions tied to the receiving Activity. If the plugin doesn't copy to app-internal storage immediately on receipt, the URI may become unreadable by the time the WebView fetches it.

**Impact:** PDFs fail silently with "file not found" and we can't diagnose easily.

**Remediation:**
- Part of the C-2 spike APK test: specifically share a PDF from Chrome, confirm it uploads to the Mac end-to-end. If not, file a plugin issue or implement `onCreate → copyToInternalStorage` in a custom Activity override.

### 🟧 C-5 — WebView heap limits not addressed

Android WebView defaults to a 256 MB heap. If a user shares a 150 MB book-length PDF, the WebView may OOM before POST completes. Research doesn't mention this.

**Impact:** Largest PDFs silently fail.

**Remediation:**
- In the share handler, stream the file directly from the native side to the Mac's `/api/capture` endpoint via a native HTTP client (Capacitor `Filesystem` + `CapacitorHttp`) rather than loading it into WebView memory. Document as a design constraint in `BUILD_PLAN.md` §15.3.

### 🟨 C-6 — Android back-stack gesture behavior on 15 not actually tested

Document claims "Android 15 back-stack change doesn't affect intent receipt" — asserted, not verified.

**Remediation:** Included in the C-2 spike APK test on API 35 AVD.

### 🟨 C-7 — `10.0.2.2:3000` AVD alias only works for HTTP

Fine for v0.5.0 (plain HTTP) but will break the day we add TLS for v0.10.0. Mark as known limitation.

**Remediation:** Add a line to `BUILD_PLAN.md` §15.3 so future-us remembers.

### 🟨 C-8 — Native-Kotlin fallback plan is underestimated

Document says "~60 lines across 3 files, 30-minute task." Realistic: 60 LOC of Kotlin + Gradle config + AndroidManifest.xml + theme XML + file-provider declaration + backup-rules XML, easily 3-4 hours of AI-assisted work including testing.

**Remediation:** Update BUILD_PLAN time estimate for the fallback path — it's a half-day, not 30 minutes.

---

## 4. R-PDF — Detailed findings

### 🟥 P-1 — No extraction was actually tested on real PDFs

Arun has ~1,116 Lenny PDFs at `../Lenny_Export/lenny_export_2026_04/` plus assorted arxiv papers on disk. The research agent had filesystem access and didn't run `unpdf.extractText()` on a single file. Every ligature / column-order / metadata claim is based on the library's README, not on this corpus.

**Impact:** `unpdf` may produce unusable output on Substack PDFs specifically; we'd only discover this when v0.2.0 users start reporting bad summaries.

**Remediation:**
- Before v0.2.0 code, run a 30-minute extraction sanity test: pick 10 Lenny PDFs covering short / long / paywalled / illustrated, run through `unpdf`, manually compare output to the source post. If ligature garbling or paragraph merging is evident, escalate to `pdftotext` as primary for Substack specifically.

### 🟧 P-2 — The paywall-truncation heuristic (`<500 chars/page`) is hand-tuned to nothing

Threshold set without calibration. Known-good Lenny PDFs have wildly variable chars/page depending on images and formatting.

**Impact:** False-positive truncation warnings on legitimate image-heavy posts; false-negative on short paywalled stubs.

**Remediation:**
- In the P-1 sanity run, tabulate chars/page distribution across 50 known-good Lenny PDFs. Pick the threshold as p5 (fifth percentile). Document the distribution alongside the heuristic.

### 🟧 P-3 — `unpdf` is in pre-2.0 territory; minor versions may break

Version `1.6.2` with `^1.6.2` allows upgrades to `1.x` — unjs has a history of meaningful changes between minor versions. Not locked to a patch.

**Remediation:**
- Use `~1.6.2` (patch-only upgrades) in `package.json`, not `^`. Or lock exact with `"unpdf": "1.6.2"` and bump manually with diff review.

### 🟧 P-4 — Header/footer stripping is not in the pipeline

Substack PDFs have boilerplate ("From Lenny's Newsletter · Issue 247") on every page. If this lands in the chunks, it gets embedded + shows up in RAG retrieval, polluting citations. Not addressed.

**Remediation:**
- Add a post-extraction step: detect repeating top/bottom lines across pages via fuzzy match; strip them before chunking. A 30-line utility.

### 🟧 P-5 — Tesseract.js v7 claim needs verification

Document says "tesseract.js v7 (38.1k stars, Dec 2025)." Current npm state unverified. If actually still v5, the API and WASM bundle differ significantly.

**Remediation:**
- At R-OCR kickoff (post-v0.2.0), re-verify version in `npm info tesseract.js`. Not blocking v0.2.0.

### 🟨 P-6 — "1000-page PDF ≈ 150 MB heap" is uncited

Load-size estimate has no source. May be high or low by 2×.

**Remediation:**
- Part of P-1 sanity run: pick the largest Lenny PDF (or a 1000-page ebook if available) and measure `process.memoryUsage().heapUsed` before/after `extractText()`.

### 🟨 P-7 — `brew install poppler` adds macOS-specific setup friction

Fine for Arun's personal use. Document it prominently in README installation steps; if the app is ever distributed, this breaks non-Mac setup. Flag as v1.0.0-hosting concern.

---

## 5. R-AUTH — Detailed findings

### 🟧 A-1 — No token-rotation story until v0.10.0

v0.5.0 uses a single static bearer token baked into the APK at build. If the token leaks (APK stolen, `.env` committed, Mac compromised), the only remediation is "rebuild APK with new token and reinstall on every device." For 5+ months (v0.5.0 → v0.10.0) there is no graceful rotation.

**Impact:** Realistic because `.env` accidents happen. Medium severity because the token is used only on LAN.

**Remediation:**
- Add a `scripts/rotate-token.sh` script that regenerates the token AND stamps it into a versioned `brain-apk-v{token-id}.apk` filename so Arun knows which APK corresponds to which token.
- Update `BUILD_PLAN.md` §15.4.

### 🟧 A-2 — Rate limiting is not in the design

If a malicious LAN guest brute-forces the bearer token at network speed: 32 bytes of hex is mathematically infeasible to brute force, so the risk is negligible. But **any** brute-force attempt should be rate-limited to avoid drowning the Next.js server in CPU. Not addressed.

**Remediation:**
- Add a 10-line in-memory rate limiter to the auth middleware: 10 failed auth attempts per IP per minute → 429 response. No external dep needed.

### 🟧 A-3 — CSRF is not addressed

If the user is logged into Brain on `localhost:3000` via cookie, and visits a malicious page on the same LAN, could that page make authenticated requests? Depends on `SameSite` defaults (Chrome defaults to `Lax` which helps) and `Origin` header validation (not implemented).

**Impact:** Real on shared-LAN scenarios. Browser defaults protect against most vectors, not all.

**Remediation:**
- Set all session cookies to `SameSite=Strict; HttpOnly; Secure=false (LAN)`.
- Validate `Origin` header on state-changing requests (POST/PUT/DELETE); reject if missing or not in an allow-list.

### 🟧 A-4 — mDNS (`brain.local`) deferred to v0.10.0 but needed earlier

v0.5.0 hardcodes the Mac's LAN IP at APK build time. DHCP reassignment is common (daily router reboot, Wi-Fi reconnect). Every reassignment requires an APK rebuild for a non-technical user, which is punishing.

**Impact:** Possibly the single biggest UX failure mode of v0.5.0.

**Remediation:**
- Upgrade mDNS to v0.5.0 scope. Use `bonjour-service` npm package on the Mac to advertise `brain.local`; configure the APK to prefer `brain.local` and fall back to the baked LAN IP. Adds ~2 hours.

### 🟧 A-5 — TouchID / WebAuthn deferral to v0.10.0 is arbitrary

WebAuthn platform authenticators (TouchID on Mac, fingerprint on Pixel) are supported in Safari/Chrome today. Waiting 5 months to add them means Arun types a token into an unlock page every session.

**Remediation:**
- Move WebAuthn unlock to v0.5.0 stretch OR v0.6.0. Adds ~1 day of work on top of a basic PIN flow.

### 🟧 A-6 — Café mode blocks APK entirely

The v0.5.0 design says: café → `BRAIN_BIND=127.0.0.1` → APK loses access. But "access my knowledge app at a café" is a plausible use case for a personal knowledge tool. The v0.10.0 Tailscale answer is real but 5 months away.

**Remediation:**
- Option 1: Move Tailscale to v0.5.0 scope; it's 30 min of setup per device.
- Option 2: Accept as v0.5.0 limitation, document it, and provide Tailscale setup as a next-day follow-up.
- Recommend Option 2: don't expand v0.5.0 scope, but write a README section explaining the trade-off.

### 🟨 A-7 — `macOS Network Location` + shell alias assumed Arun will use Terminal

Arun identified as non-technical. Terminal-based `brain-cafe` / `brain-home` aliases are acceptable as v0.5.0 default only because the entire app lives in a Terminal-started Next.js dev server anyway. But it's brittle; worth a menu-bar app later.

**Remediation:**
- v0.10.0 nice-to-have: a Hammerspoon / Raycast extension for one-click network toggle. Not blocking.

### 🟨 A-8 — First-run QR code library not chosen

"Display token as QR" mentioned in §5 — no library chosen. `qrcode` npm package + terminal ANSI rendering is the standard. Missing from §15.4.

**Remediation:**
- Add `qrcode` + `qrcode-terminal` to the v0.5.0 dep list in `BUILD_PLAN.md`.

---

## 6. Cross-cutting findings (across all spikes)

### 🟥 X-1 — Zero empirical verification across all four spikes

None of the four research spikes ran an actual command on the target hardware. Every claim is desk research. **This is the single biggest risk.** Extrapolation from public benchmarks / library READMEs works ~80% of the time; the other 20% is where projects die.

**Remediation:**
- **Before v0.1.0 code:** run an "empirical sanity morning" — 3 hours on Arun's Mac.
  - (15 min) `ollama pull qwen2.5:7b-instruct-q4_K_M` + `ollama run` + measure tok/s on a 4K prompt → addresses L-1.
  - (30 min) Extract 10 Lenny PDFs with `unpdf`; diff against source posts → addresses P-1.
  - (60 min) Scaffold throwaway Capacitor project + AVD + test share intent → addresses C-2, C-4, C-6.
  - (15 min) Verify WebAuthn platform auth works in local Chrome → closes A-5 ahead of v0.5.0.
  - Remainder: document findings in a `docs/research/EMPIRICAL_SANITY.md`; promote to `SELF_CRITIQUE.md v0.2.0` with concrete numbers.

### 🟧 X-2 — Dependency versions use `^` everywhere; no lock strategy

`^1.6.2`, `^6.x`, etc. allow silent minor upgrades. For a personal project shipped as markdown today, this is fine; by v0.1.0 when we have `package-lock.json` committed, the lock file becomes the authoritative version. Until then, the plan's cited versions may not match what `npm install` actually fetches.

**Remediation:**
- When v0.1.0 scaffolds `package.json`: commit `package-lock.json`, pin to patch versions for anything in the R-* research decisions, document the upgrade-review process in `BUILD_PLAN.md` §15.7.

### 🟧 X-3 — API fallback ($) is not cost-bounded

R-LLM allows Claude API fallback "when user explicitly requests it" or on quality gate failures. No $/1M-token estimates, no monthly cap. A "regenerate with Claude" button clicked 50 times on a GenPage (Sonnet 4.5) at ~20K tokens each is already double-digit dollars.

**Remediation:**
- Add a monthly spend cap in `settings.llm.api_fallback.monthly_cap_usd` (default $10). Track usage in SQLite; surface a "spent $X this month" indicator in settings.
- Update `BUILD_PLAN.md` §15.1 with the cap default.

### 🟧 X-4 — No data-migration story between versions

Schema changes are inevitable from v0.1.0 → v0.4.0. No migration strategy is documented. Today's plan implies "break the DB at each phase" which loses captured items.

**Remediation:**
- Adopt a migrations pattern: `src/db/migrations/NNN_description.sql` + a migration runner in `src/db/client.ts` that tracks applied migrations in a `_migrations` table.
- Document in `BUILD_PLAN.md` before v0.1.0 scaffolding.

### 🟧 X-5 — No integration-scenario walkthrough

Each spike is isolated. Nobody validated that the chain works end-to-end:
1. User shares URL from Chrome Android (R-CAP) →
2. over LAN with bearer token (R-AUTH) →
3. to Mac's Next.js →
4. which fetches + extracts content (R-PDF if PDF) →
5. summarizes with Qwen 2.5 7B (R-LLM) →
6. streams back.

Any single decision is individually plausible; the composition isn't validated.

**Remediation:**
- Part of X-1's empirical sanity morning: design the smoke test as a complete vertical slice, not four isolated tests. Pass criteria: one URL shared from an AVD ends up in a SQLite row with a summary on the Mac.

### 🟨 X-6 — Accessibility not considered in any spike

`DESIGN_SYSTEM.md` §11 defines a11y non-negotiables. None of the research spikes carry that through: QR code on first-run has no non-visual fallback; share-sheet flow doesn't address screen-reader behavior; no spike names `prefers-reduced-motion` for streaming UI.

**Remediation:**
- When implementing each phase, add one line to the PR checklist: "a11y verified per `DESIGN_SYSTEM.md` §11 + §15." No research change needed today.

### 🟨 X-7 — Model-registry durability not considered

Ollama's model registry is centrally hosted. If Alibaba pulls Qwen 2.5 from HuggingFace or Ollama deprecates a tag, our pinned model disappears from `ollama pull`. Since we plan to ship the actual weights on Arun's disk after first pull, this is mitigated by default — but documented nowhere.

**Remediation:**
- One-line note in `BUILD_PLAN.md` §15.1: "Once pulled, models live in `~/.ollama/models/`. Back up this directory along with `data/` to prevent re-pull dependency."

### 🟨 X-8 — Hardware lock-in

Every decision assumes M1 Pro + 32 GB. If Arun upgrades to M4 Max + 64 GB in 2027, model choices shift substantially (Llama 3.3 70B becomes viable). Not a problem today; worth flagging.

**Remediation:**
- Add a line in `PROJECT_TRACKER.md`: "re-run R-LLM when hardware changes."

---

## 7. What the research did well (fairness)

To balance the critique — this is not all bad:

- **Honesty in extrapolation labelling.** R-LLM clearly stars estimated figures. R-PDF notes `pdf-parse` is abandoned with evidence. R-AUTH's threat-model table is more honest than most security sections.
- **Prior-art citations are concrete.** R-AUTH cites Home Assistant, Syncthing, Immich, Tailscale with URLs — readers can verify. R-CAP links to the specific plugin GitHub repo and identifies the maintainer by name.
- **Re-verify triggers are defined.** Every spike ends with "re-run this research when X happens." That's a meta-skill many research memos lack.
- **Fallback plans are named for the most-likely failure modes.** `pdftotext` for PDF; Kotlin Activity for Capacitor; QR pairing for auth. We know what to do if plan A breaks.
- **Scope discipline is good.** OCR in R-PDF; 70B model in R-LLM; TouchID/WebAuthn in R-AUTH; all explicitly deferred with criteria for inclusion later.

The research reached roughly the right conclusions. What's missing is the empirical step that turns "plausible" into "measured."

---

## 8. Prioritized remediation plan

### Must do before v0.1.0 code

1. 🟥 **X-1** — Run the 3-hour empirical sanity morning on Arun's Mac; produce `docs/research/EMPIRICAL_SANITY.md` with measured numbers.
2. 🟥 **L-1 + P-1 + C-2** — Folded into the sanity morning.
3. 🟥 **C-1** — Lock exact plugin version during v0.5.0 dep install.

### Must do before v0.2.0 (Capture core)

4. 🟧 **P-2** — Calibrate paywall-truncation heuristic on real Lenny PDFs.
5. 🟧 **P-4** — Header/footer stripping utility.
6. 🟧 **X-4** — Migrations pattern in place before any schema is committed.

### Must do before v0.3.0 (Intelligence)

7. 🟧 **L-2** — LLM eval harness; Qwen 2.5 7B vs Qwen 3 7B vs Gemma 2 9B on 10-item set.
8. 🟧 **L-3, L-4, L-5** — Cold-load pre-warming; concurrency queue; memory-pressure pre-flight.
9. 🟧 **L-6** — R-LLM-b mini-spike on Qwen 3.

### Must do before v0.5.0 (APK + extension)

10. 🟧 **A-1** — Token-rotation script.
11. 🟧 **A-2** — Auth rate limiter.
12. 🟧 **A-3** — CSRF / SameSite / Origin checks.
13. 🟧 **A-4** — Promote mDNS (`brain.local`) to v0.5.0 scope.
14. 🟧 **A-5** — WebAuthn at v0.5.0 stretch OR v0.6.0.
15. 🟧 **A-6** — Document café-mode limitation in README.
16. 🟧 **A-8** — Add `qrcode` + `qrcode-terminal` deps.
17. 🟧 **C-3** — R-CAP-b: evaluate capacitor-live-update.
18. 🟧 **C-5** — Native file-stream to Mac API to avoid WebView heap.

### Must do before v1.0.0 gate

19. 🟧 **X-2** — Ratify dep-version policy.
20. 🟧 **X-3** — API fallback cost cap.
21. 🟧 **X-5** — Integration-scenario walkthrough (part of v1.0.0 gate checklist).

### Track but not gating

22. 🟨 L-7, L-8, P-6, P-7, C-6, C-7, C-8, A-7, X-6, X-7, X-8 — added to `PROJECT_TRACKER.md` risks watchlist.

---

## 9. Open questions for Arun

1. **Empirical sanity morning:** OK to set aside 3 hours before v0.1.0 code to run these measurements and commit findings?
2. **mDNS promotion:** OK to expand v0.5.0 scope by ~2 hours to include `brain.local` (A-4)?
3. **WebAuthn promotion:** OK to expand v0.5.0 or v0.6.0 scope by ~1 day to add TouchID unlock (A-5)?
4. **API fallback cost cap:** agree with a default monthly cap of $10? Different number?
5. **Café mode:** accept as v0.5.0 limitation with a README caveat, or aggressively bring Tailscale into v0.5.0?

---

## 10. Revisions & changelog

- **v0.1.0-critique** (2026-05-07) — Initial critique of R-LLM, R-CAP, R-PDF, R-AUTH.

Future revisions append here when any 🟧/🟥 finding is resolved. A finding flips to `RESOLVED` with a date + commit or spike ID when addressed. New findings may be added at any time.

---

**Summary for an AI agent inheriting this project:** the four research spikes are directionally correct but empirically untested. Before writing phase code, run the empirical sanity morning described in §8 item 1. Treat every number in `BUILD_PLAN.md §15` as a hypothesis until confirmed on Arun's actual Mac.
