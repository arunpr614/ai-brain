/**
 * Header / footer stripping for multi-page text extraction (F-103).
 *
 * Substack PDFs include boilerplate like "From Lenny's Newsletter · Issue 247"
 * on every page. If that lands in the stored body it pollutes chunks, embeddings,
 * and RAG citations. We detect lines that appear on >= HEADER_FOOTER_THRESHOLD
 * fraction of pages (after normalization) and remove them from the first/last
 * few lines of each page.
 *
 * Self-critique P-4.
 */

const HEADER_FOOTER_THRESHOLD = 0.5; // line must appear on 50%+ of pages
const SCAN_LINES_PER_PAGE = 5; // only consider the first/last N lines
const MIN_PAGES_TO_STRIP = 3; // don't bother with short docs

/** Normalize whitespace, drop page numbers (e.g. "3", "Page 3 of 12"). */
function normalizeLine(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  // Collapse bare page-number tokens so "3 / 12" and "Page 3 of 12" both
  // match "Page X of Y" style.
  return collapsed
    .replace(/^\d+$/g, "#N")
    .replace(/\bpage\s+\d+\s+of\s+\d+\b/i, "page #N of #N")
    .replace(/\b\d+\s*\/\s*\d+\b/g, "#N/#N")
    .toLowerCase();
}

/**
 * Detect and strip repeating header/footer lines across pages. Pure function.
 *
 * Inputs: array of page strings (already decoded). Returns array of page
 * strings with boilerplate removed. Non-destructive — doesn't touch body text
 * in the middle of a page.
 */
export function stripRepeatingHeadersFooters(pages: string[]): string[] {
  if (pages.length < MIN_PAGES_TO_STRIP) return pages;

  const headerCounts = new Map<string, number>();
  const footerCounts = new Map<string, number>();

  for (const page of pages) {
    const lines = page.split(/\r?\n/);
    for (const line of lines.slice(0, SCAN_LINES_PER_PAGE)) {
      const n = normalizeLine(line);
      if (n.length === 0) continue;
      headerCounts.set(n, (headerCounts.get(n) ?? 0) + 1);
    }
    for (const line of lines.slice(-SCAN_LINES_PER_PAGE)) {
      const n = normalizeLine(line);
      if (n.length === 0) continue;
      footerCounts.set(n, (footerCounts.get(n) ?? 0) + 1);
    }
  }

  const threshold = Math.max(
    MIN_PAGES_TO_STRIP,
    Math.floor(pages.length * HEADER_FOOTER_THRESHOLD),
  );

  const headerBoilerplate = new Set<string>();
  for (const [line, count] of headerCounts) {
    if (count >= threshold) headerBoilerplate.add(line);
  }
  const footerBoilerplate = new Set<string>();
  for (const [line, count] of footerCounts) {
    if (count >= threshold) footerBoilerplate.add(line);
  }

  if (headerBoilerplate.size === 0 && footerBoilerplate.size === 0) {
    return pages;
  }

  return pages.map((page) => {
    const lines = page.split(/\r?\n/);

    // Strip from the top: keep removing as long as the first scan line matches.
    let topStart = 0;
    for (let i = 0; i < Math.min(SCAN_LINES_PER_PAGE, lines.length); i++) {
      const n = normalizeLine(lines[i]);
      if (n.length === 0) {
        topStart = i + 1;
        continue;
      }
      if (headerBoilerplate.has(n)) {
        topStart = i + 1;
      } else {
        break;
      }
    }

    // Strip from the bottom.
    let bottomEnd = lines.length;
    for (let i = 0; i < Math.min(SCAN_LINES_PER_PAGE, lines.length); i++) {
      const idx = lines.length - 1 - i;
      if (idx < topStart) break;
      const n = normalizeLine(lines[idx]);
      if (n.length === 0) {
        bottomEnd = idx;
        continue;
      }
      if (footerBoilerplate.has(n)) {
        bottomEnd = idx;
      } else {
        break;
      }
    }

    return lines.slice(topStart, bottomEnd).join("\n");
  });
}

/**
 * Convenience: pages[] → one merged body string with stripping applied.
 */
export function pagesToBody(pages: string[]): string {
  return stripRepeatingHeadersFooters(pages).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
