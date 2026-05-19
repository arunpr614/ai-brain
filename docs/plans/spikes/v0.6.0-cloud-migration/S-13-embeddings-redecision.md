# S-13 — Embeddings model re-decision (text-embedding-004 retired)

**Triggered:** 2026-05-19, during D-11 Hetzner wire smoke.
**Outcome:** **gemini-embedding-001 @ outputDimensionality=768** selected. Smallest delta from the v0.6.0 plan §1 #6 lock (which named the retired text-embedding-004). chunks_vec schema unchanged.
**Status:** ✅ closed. Code change shipped at commit `e68314c`. Migration via `scripts/backfill-embeddings.mjs --reset` (run on Hetzner after cutover D-12).

---

## What surfaced the gap

D-11's planned smoke flow included an embedding wire test from Hetzner. The first GET against `models/text-embedding-004:embedContent` returned:

```
HTTP 404 — "models/text-embedding-004 is not found for API version v1beta,
or is not supported for embedContent."
```

Listing available embedding models on the same key surfaced:

- `models/gemini-embedding-001`
- `models/gemini-embedding-2-preview`
- `models/gemini-embedding-2`

text-embedding-004 was the locked choice in v0.6.0 plan §1 #6 (locked 2026-05-12). It was retired by Google between the lock date and 2026-05-19. The plan's `embedding-strategy.md` research (S-5) is now historically accurate but operationally stale.

## Decision space considered

| Option | Provider × Dim | Schema impact | Vendor count | Notes |
|---|---|---|---|---|
| **A** ✅ chosen | gemini-embedding-001 @ 768 (MRL truncation) | None (matches chunks_vec) | Unchanged (Gemini) | Smallest delta from plan |
| B | gemini-embedding-001 @ 3072 | ALTER chunks_vec dim 768→3072 | Unchanged | Better fidelity, schema migration risk |
| C | gemini-embedding-2 @ 768 (MRL) | None | Unchanged | Newer model; no benchmarks reviewed |
| D | voyage-3 (Anthropic) @ 1024 | ALTER chunks_vec | Drop Gemini, consolidate to Anthropic | Vendor consolidation; paid only ($0.06/MTok); ~$0.0018/mo at projected volume |

Options C and D were not deeply evaluated. They are reasonable Phase F (post-v0.6.0) re-evaluation candidates if A has quality issues.

## Why A was selected

1. **Wire-verified at 768.** Live API call from Hetzner with `outputDimensionality=768` returns 768-dim float vectors with HTTP 200 in ~360 ms.
2. **MRL semantic preservation.** Truncated 768 vectors discriminate meaning correctly: cosine(cat-on-mat, feline-on-rug) = 0.7508 vs cosine(cat-on-mat, quantum-chromodynamics) = 0.4766. Clean separation, no degeneracy.
3. **Schema-zero.** `chunks_vec float[768]` already exists and is wired into search. Switching dim would have been a B+1 commit migration touching sqlite-vec virtual table recreation.
4. **Free tier preserved.** gemini-embedding-001 is in the same free-tier bucket as the retired text-embedding-004. v0.6.0 cost model unchanged.
5. **One vendor swap, not two.** Holding embeddings on Gemini avoids opening a new vendor relationship (voyage-3 via Anthropic) under cutover-window time pressure.

## What this invalidates in prior research

- `docs/research/embedding-strategy.md` (S-5): the "Use Gemini text-embedding-004" recommendation is replaced by "Use Gemini gemini-embedding-001 with outputDimensionality=768." The cost analysis, dim-768 decision, and vector-space hygiene reasoning all carry over unchanged.
- `docs/research/v0.6.0-cost-summary.md`: line item names text-embedding-004; cost remains $0.00 (free tier still applies to gemini-embedding-001).
- `docs/plans/v0.6.0-cloud-migration.md` §1 #6: text-embedding-004 → gemini-embedding-001@768. No other locked decisions affected.

## Empirical sanity test (preserved here for reproducibility)

Run from any host with `GEMINI_API_KEY` in env:

```python
import json, math, urllib.request, os
key = os.environ["GEMINI_API_KEY"]
texts = {
    "A": "the cat sat on the mat",
    "B": "a feline rested on the rug",
    "C": "quantum chromodynamics is hard",
}
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={key}"
embs = {}
for k, t in texts.items():
    req = urllib.request.Request(
        url,
        data=json.dumps({"content": {"parts": [{"text": t}]}, "outputDimensionality": 768}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        embs[k] = json.loads(r.read())["embedding"]["values"]

def cos(a, b):
    n = math.sqrt(sum(x*x for x in a)) * math.sqrt(sum(x*x for x in b))
    return sum(x*y for x,y in zip(a,b)) / n
print(f"cos(A,B)={cos(embs['A'],embs['B']):.4f}  cos(A,C)={cos(embs['A'],embs['C']):.4f}")
```

Expected: `cos(A,B) ≈ 0.75`, `cos(A,C) ≈ 0.48`. If the gap collapses (similar cosine across both), MRL truncation is no longer working and the decision needs revisiting.

## Migration checklist (consumed by D-12)

After cutover, on Hetzner, with `EMBED_PROVIDER=gemini` set in `/etc/brain/.env`:

```
EMBED_PROVIDER=gemini GEMINI_API_KEY=<key> \
  node --import tsx scripts/backfill-embeddings.mjs --reset
```

This wipes existing nomic-embed (Mac) chunks + chunks_vec rows for enriched items and re-embeds via gemini-embedding-001@768. At v0.6.0 ship volume (8 captures), runs in seconds. Idempotent if interrupted (re-run completes the remaining items).

## Open follow-ups (Phase F, not blocking v0.6.0)

1. Compare gemini-embedding-001 vs gemini-embedding-2 quality on the Brain corpus once it grows past ~50 items.
2. Re-evaluate voyage-3 (Anthropic) for vendor consolidation when an Anthropic billing decision is up for review.
3. Add an automated dim-mismatch guard at the embed factory boundary that fails fast if `EMBED_OUTPUT_DIM` and provider native/configured dim disagree.
