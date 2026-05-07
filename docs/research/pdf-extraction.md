# R-PDF: PDF Extraction Library Choice

**Research ID:** R-PDF | **Status:** complete | **Date:** 2026-05-07 | **Author:** research agent

---

## 1. TL;DR Recommendation

**Primary:** `unpdf` (v1.6.2) — modern, pure TypeScript, serverless-safe pdfjs wrapper with a clean API for text + metadata extraction. Zero native deps, actively maintained by the unjs ecosystem, and designed for exactly this use case (AI document analysis).

**Accuracy fallback for complex layouts:** `pdftotext` (Poppler CLI via `child_process`) when `unpdf` produces garbled multi-column output. Install once via `brew install poppler`; call only as a secondary path.

**Scanned PDFs (R-OCR, deferred):** `tesseract.js` v7 — pure WASM, no native binary, Node 16+. Treat as a separate capability gate; do not block v0.2.0 on it.

---

## 2. Why This Matters for AI Brain

Every downstream feature — summarization, semantic search, card linking — depends on clean input text. A library that scrambles column order, drops footnotes, or silently truncates a paywalled Substack PDF will produce confidently wrong summaries that are hard to debug. Getting extraction right at ingestion time is a one-time investment that pays off across the entire stack.

The app's PDF sources span a wide quality spectrum: Substack-generated PDFs with non-standard font embedding, arxiv two-column papers, ebooks with running headers and footnotes, and scanned meeting notes. No single JavaScript library handles all of these perfectly — but `unpdf` covers the large majority, and `pdftotext` (Poppler) handles the long tail of complex layouts significantly better than any pure-JS option.

---

## 3. Candidate Matrix

| Library | Maintained? | Pure JS/TS | Text accuracy (simple) | Text accuracy (columns/tables) | Scanned PDFs | Memory / large PDFs | TS types | Metadata (title/author/date) |
|---|---|---|---|---|---|---|---|---|
| **unpdf** (unjs) | Yes — v1.6.2, Apr 2026; 1.1k stars; 1 open issue | Pure TS (84.8% TS codebase) | Excellent — serverless pdfjs build | Moderate — no reflow logic; column text may interleave | No — returns `""` for scanned pages | Parallel `Promise.all` per page; no streaming; loads full PDF into memory | First-class; full types exported | `getMeta()` returns Info dict + XMP: title, author, `CreationDate`, `ModDate` with optional JS Date parsing |
| **pdfjs-dist** (Mozilla) | Yes — v5.7.284, Apr 2026; 53.3k stars; 392 open issues | Pure JS (built for browser + Node) | Excellent — same engine as unpdf | Moderate — same reading-order limits as above | No | No streaming; loads full doc; ~150 MB heap for 1,000-page doc typical | Community-maintained `@types/pdfjs-dist` (patchy) | `getMetadata()` on PDFDocumentProxy — same Info+XMP dict |
| **pdf-parse** | No — last publish ~2021 (npm); GitLab repo; unmaintained | Pure JS, wraps pdfjs v1.x (very old) | Good on simple PDFs | Poor — old pdfjs engine; misses modern PDF features | No | No streaming | `@types/pdf-parse` available but community-only | Returns `info` object with Title, Author, CreationDate |
| **pdf2json** | Yes — v4.0.3, Apr 2026; 2.2k stars; 71 open issues | Pure JS (Java source transpiled; no native dep) | Good for structured/form PDFs | Poor — docs acknowledge word-breaking and extra spaces in complex layouts | No | Streaming flag (`-r`), but heap still loaded per page | Partial TS (1.2% TS in repo) | Extracts full XMP + AcroForm metadata; rich but requires JSON traversal |
| **pdfreader** | Yes — v3.0.8, Nov 2025; 701 stars; 5 open issues | Pure JS (wraps pdf2json) | Good — coordinate-based output | Good for tables — `parseTable()` + `Rule` class; but requires custom rule authoring | No — explicit in docs | Callback-streaming; lower peak memory | Yes — "Now includes TypeScript type definitions" | Returns page/item coords; no top-level metadata object |
| **pdf-lib** | No — v1.17.1, Nov 2021; 8.4k stars; 278 open issues | Pure TS | None — cannot extract body text | None — docs explicitly disclaim text extraction | No | N/A | Full TS (it is a TS library) | Can read/write form fields only |
| **pdftotext** (Poppler CLI) | Yes — C++ project, actively maintained; installed via `brew install poppler` | Native binary (requires Homebrew) | Excellent — best-in-class among open source | Best available in open source; handles columns, footnotes, headers/footers correctly | No — returns nothing for scanned | OS process; no JS heap impact; streams stdout | N/A — invoked via `child_process`; parse metadata with `pdfinfo` companion | `pdfinfo` CLI returns Title, Author, Creator, CreationDate, Pages |

---

## 4. Gotchas with Substack PDFs

Substack's PDF export is browser-print-to-PDF via Chromium's print engine. This produces PDFs with:

- **Font subsetting and glyph encoding quirks** — ligatures (fi, fl) sometimes become private-use Unicode codepoints. Both `unpdf` and `pdf-parse` may emit garbled characters for common ligatures. `pdftotext` handles this better via ToUnicode map processing.
- **Paywall truncation (silent)** — As noted in the Lenny login paywall tier memory note, a lower-tier Substack login produces a shorter PDF with no truncation marker. The PDF's page count and file size are the only signals. The recommended guard is: after extraction, if `totalPages` is unexpectedly low (e.g., a newsletter that should be 8+ pages comes in at 2), flag the card with `extraction_warning: "possible_paywall_truncation"`. `unpdf`'s `totalPages` return value makes this check trivial.
- **CSS-injected whitespace** — Substack's print stylesheet injects large block margins between sections. These appear as blank text items. `unpdf` silently drops empty items, which is the correct behavior here.
- **No scanned pages** — Substack PDFs are always digitally generated; OCR is never needed for this source.

---

## 5. OCR Pathway (for Scanned PDFs)

**Verdict: Deferred to a post-v0.2.0 phase (R-OCR).**

The trigger condition for the OCR branch is: extracted text length < 200 characters on a page that should have content. This catches scanned PDFs, pure-image pages, and password-protected PDFs.

**Recommended library when implemented:** `tesseract.js` v7 (38.1k stars, Dec 2025, pure WASM). Works on Node 16+ without native binaries; M1 Mac compatible. Pre-rasterize with a lightweight tool (`pdf2pic` + Ghostscript, or a canvas renderer) then feed images to `tesseract.js`. Note: `tesseract.js` itself does not accept PDFs — it only processes images. That two-step pipeline (PDF page → raster image → OCR) has non-trivial complexity and is the right reason to defer it.

For a pure-native alternative: `brew install tesseract` + `child_process` is simpler and ~3× faster, but adds a native dependency.

---

## 6. Metadata Extraction

| Source field | `unpdf` (`getMeta()`) | `pdftotext` companion (`pdfinfo`) | `pdf2json` |
|---|---|---|---|
| Title | `info.Title` | `Title:` field | `data.Meta.Title` |
| Author | `info.Author` | `Author:` field | `data.Meta.Author` |
| Creation date | `info.CreationDate` → JS `Date` if `parseDates: true` | `CreationDate:` → parse manually | `data.Meta.CreationDate` (string) |
| Page count | `totalPages` from `extractText()` | `Pages:` field | `data.Pages.length` |
| XMP extended | `metadata` object (XMP blob) | Not available | `data.Meta` (partial) |

`unpdf` provides the cleanest metadata path for the primary flow. For the `pdftotext` fallback, invoke `pdfinfo -enc UTF-8 <file>` via `child_process` and parse its line-delimited output to get the same fields.

---

## 7. Recommended Pipeline for v0.2.0

```
PDF file (buffer or path)
  │
  ▼
unpdf.extractText(pdf, { mergePages: false })
  │
  ├─ totalPages → store on card
  ├─ text[] → one string per page → chunking layer
  │
  ├─ if ANY page text.length < 50 chars
  │     AND page appears non-blank (heuristic: file size / totalPages > 3 KB/page)
  │     → [R-OCR deferred] flag card extraction_warning: "possible_scanned_page"
  │
  ├─ if totalPages < expected_min (Substack: < 3)
  │     → flag card extraction_warning: "possible_paywall_truncation"
  │
  ├─ if layout_complexity_hint == "two_column" (set by caller based on source URL pattern)
  │     → re-extract via pdftotext fallback (child_process spawn)
  │
  └─ getMeta(pdf, { parseDates: true })
        → title, author, createdAt → store on card

OCR fallback (R-OCR, future):
  PDF page → raster image (pdf2pic) → tesseract.js → text string
```

---

## 8. Recommended npm Packages to Install

```json
{
  "unpdf": "^1.6.2"
}
```

The `pdftotext` / `pdfinfo` fallback is a macOS system tool (`brew install poppler`), not an npm package. Document in the project's README that `poppler` is a dev/prod dependency on the host.

For the future OCR path (R-OCR phase):
```json
{
  "tesseract.js": "^7.0.0",
  "pdf2pic": "^3.2.0"
}
```

Do not install `pdf-parse` — it pins to pdfjs v1.x and is effectively abandoned. Do not install `pdf-lib` — it cannot extract body text. Do not install `pdfjs-dist` directly — `unpdf` bundles an optimized serverless build and abstracts the worker setup that makes direct `pdfjs-dist` use in Next.js 15 server components painful.

---

## 9. Open Risks

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| `unpdf` column interleaving on arxiv papers | Medium — two-column layout is common in CS papers | Medium — garbled text degrades summaries | Detect two-column PDFs by URL pattern (arxiv.org) and route directly to `pdftotext` |
| Poppler unavailable in CI / serverless | Medium — Vercel serverless functions cannot run native binaries | Medium — fallback unavailable | Gate `pdftotext` path behind `process.platform === 'darwin'` check; log warning and return `unpdf` output as-is in other environments |
| Memory spike on 1,000-page PDFs | Medium — `unpdf` uses `Promise.all` (all pages concurrent) | Medium — may hit Vercel 1.5 GB function limit | Process in page-range batches of 100 pages; `unpdf` returns `text[]` so batching is straightforward |
| Paywall truncation detection false negatives | Low — hard to distinguish short post from truncated post purely by page count | High — misinformation risk in summaries | Cross-reference with source URL and known post word counts where available (Lenny posts are typically 2,000–8,000 words); add a low-char-density check (total chars / totalPages < 500) |
| `tesseract.js` quality on handwritten notes | High | Medium — meeting notes use case | Scoped as deferred (R-OCR); acceptable for v0.2.0 |

---

## References

- `unpdf` repo: https://github.com/unjs/unpdf (unjs ecosystem, MIT)
- `pdf.js` repo: https://github.com/mozilla/pdf.js (Mozilla, Apache 2.0)
- `pdf2json` repo: https://github.com/modesty/pdf2json
- `pdfreader` repo: https://github.com/adrienjoly/npm-pdfreader
- `pdf-lib` repo: https://github.com/Hopding/pdf-lib (editing only — confirmed no text extraction)
- `tesseract.js` repo: https://github.com/naptha/tesseract.js
- Poppler (pdftotext): https://poppler.freedesktop.org/ — install via `brew install poppler`
