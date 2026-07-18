# Gate 6 — Cost, reliability, security, policy, and product fit

**Decision:** **Complete with material gaps — production safety/readiness not passed**<br>
**Execution date:** 2026-07-19<br>
**Incremental spend / subscriptions:** USD 0 / 0<br>
**External requests / provider calls / inference:** 0 / 0 / 0

## Executed evidence

- The frozen publication-safe safety evaluator ran under an external macOS `deny network*` sandbox and completed all 33 rows: **18 narrow passes, 8 known gaps, and 7 not applicable**.
- The exact unavailable/retry-state suite passed **5/5**.
- The exact isolated A1 CLI integration suite passed **11/11**, including inert instruction/tool/exfiltration-looking text, truthful unknown-completeness rejection, supported-class rejection, locked-option/hash checks, disable flags, and parser-transformation detection.
- Gate 1 completed all nine fixed claims: eligible **3/5**, rejection controls **4/4**, and two immutable eligible-cell oracle failures. The exact reliability threshold was 5/5.
- Gates 3–5 were not run, so no repeat reliability, enrichment quality, model latency/memory, structured-output, citation, visual-coverage, or cross-hardware evidence exists.

## Known security and product gaps

The eight executable/declarative known gaps are:

1. playlist URLs can fall through generic capture instead of an explicit unsupported state;
2. canonicalized IPv4-mapped IPv6 can evade the current private-address helper;
3. redirect hops are not revalidated;
4. DNS is not pinned or revalidated at connection/redirect time;
5. an overlong YouTube identifier prefix can be accepted;
6. no shared scheduled-premiere state contract exists;
7. live-caption retries have no hard lifetime budget; and
8. transcript output sanitization is not proven end to end across render/export sinks.

Additional production P0 boundaries remain: the shipping route does not collect/enforce the sealed rights and retention attestation, its parser is not the benchmark's fail-closed boundary, legacy recovery is coupled to ordinary YouTube item handling, and the complete normalized contract is not persisted. The disclosed OAuth credential remains excluded from all artifacts and calls but must still be revoked/rotated by its owner.

## Supported-input classification

| Input/workflow class | Evidence-bound state |
|---|---|
| Exact source-published, rights-screened VTT class in the isolated A1 boundary | **Not reliable enough:** 3/5 eligible first attempts passed; successful rows preserved tokens/anchors exactly, but two immutable oracle failures prevent a supported-class claim |
| Strict malformed/empty-cue VTT | **Truthfully rejected in this boundary:** 3/3 controls |
| Above-7,200-cue/unknown-completeness VTT | **Truthfully rejected in this boundary:** 1/1 control |
| Current shipping YouTube capture/upload route | **Not ready:** missing attestation, parser, lifecycle, recovery-isolation, and normalized-persistence controls |
| Official YouTube captions API | **Blocked / Not run:** no eligible consent/editor-video/token lifecycle; zero API calls |
| Owned-media STT, arbitrary public captions, SRT production class, live/scheduled/private/deleted videos | **Not evaluated / unsupported by this evidence** |
| Local text enrichment and visual enrichment | **Blocked / Not run** |

## Cost, policy, lifecycle, and residual risk

Zero spend is verified, but it is not a production cost estimate. Model resource/latency behavior and operational capacity are unmeasured. The five-item eligible sample is under-powered and screening-affected; successful rows cannot be generalized to arbitrary YouTube videos, SRT, long-form content, auto-captions, other hardware, or market coverage.

All source/rights classifications remain provisional private-research judgments requiring product/legal-policy review. No technical result grants caption-download rights, API consent, production storage, external model transfer, or training permission. Complete transcripts, normalized outputs, databases, options, and raw logs remain private and must be deleted no later than `2026-10-14`; no such material may enter Git, the Wiki, or the pull request.

Gate 6 does not support production Go or Limited-go. It supports preserving the narrow rejection behavior and synthetic control package as research evidence while deferring any implementation until the acquisition reliability failure and listed P0/security/lifecycle gaps are addressed in a fresh prospective plan.
