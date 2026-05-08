/**
 * Citation marker parser — v0.4.0 T-12.
 *
 * Splits assistant text into a flat list of segments:
 *   - { type: "text", text }
 *   - { type: "citation", chunk_id }
 *
 * Complements server-side filterCitations() (src/lib/ask/generator.ts),
 * which already dropped orphan IDs before they reached the client. This
 * parser trusts every [CITE:id] it sees to be valid; it exists to break
 * the stream into renderable segments.
 *
 * Partial markers that arrive mid-stream (e.g. "foo [CITE:a" without the
 * closing `]`) are emitted as text so the UI renders them verbatim until
 * the closing bracket arrives. The ChatMessage component re-runs the
 * parser on every token update, so a complete marker will replace the
 * partial one on the next render tick.
 */

export type CitationSegment =
  | { type: "text"; text: string }
  | { type: "citation"; chunk_id: string };

const MARKER_RE = /\[CITE:([^\]]+)\]/g;

export function parseCitations(text: string): CitationSegment[] {
  if (!text) return [];
  const out: CitationSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", text: text.slice(last, m.index) });
    }
    out.push({ type: "citation", chunk_id: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ type: "text", text: text.slice(last) });
  }
  return out;
}
