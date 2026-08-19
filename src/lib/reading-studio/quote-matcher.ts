/**
 * Time-Synchronized Quote Navigation & Fuzzy Timestamp Matcher (Phase 8 / Issue #122).
 * Matches extracted LLM quotes & key takeaways against timestamped transcript segments or Recall sections.
 */

export interface TimestampedSegment {
  start_ms?: number | null;
  end_ms?: number | null;
  text: string;
}

export interface MatchedQuoteTimestamp {
  startMs: number;
  endMs: number;
  timestampLabel: string;
  confidence: number;
}

export function formatTimestampLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matches an extracted quote against a list of timestamped transcript segments.
 */
export function matchQuoteToTranscript(
  quote: string,
  segments: TimestampedSegment[],
): MatchedQuoteTimestamp | null {
  if (!quote || !segments || segments.length === 0) return null;

  const cleanQuote = normalize(quote);
  if (cleanQuote.length < 5) return null;

  const quoteWords = cleanQuote.split(" ");

  // 1. Direct segment substring match
  for (const seg of segments) {
    if (typeof seg.start_ms !== "number") continue;
    const cleanSeg = normalize(seg.text);
    if (cleanSeg.includes(cleanQuote) || cleanQuote.includes(cleanSeg)) {
      return {
        startMs: seg.start_ms,
        endMs: typeof seg.end_ms === "number" ? seg.end_ms : seg.start_ms + 5000,
        timestampLabel: formatTimestampLabel(seg.start_ms),
        confidence: 1.0,
      };
    }
  }

  // 2. Sliding window search across adjacent segments (for multi-segment quotes)
  let bestMatch: { startIdx: number; endIdx: number; score: number } | null = null;
  const quoteLead = quoteWords.slice(0, 4).join(" ");

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (typeof seg.start_ms !== "number") continue;
    const cleanSeg = normalize(seg.text);

    // Check if segment contains the start of the quote
    if (cleanSeg.includes(quoteLead)) {
      let combined = cleanSeg;
      let j = i;
      while (j < Math.min(segments.length, i + 8) && combined.length < cleanQuote.length * 1.5) {
        if (combined.includes(cleanQuote)) {
          const matchStart = segments[i].start_ms!;
          const matchEnd = typeof segments[j].end_ms === "number" ? segments[j].end_ms! : matchStart + 10000;
          return {
            startMs: matchStart,
            endMs: matchEnd,
            timestampLabel: formatTimestampLabel(matchStart),
            confidence: 0.95,
          };
        }
        j++;
        if (j < segments.length) combined += " " + normalize(segments[j].text);
      }
    }
  }

  // 3. Jaccard similarity fallback over 3-segment windows
  for (let i = 0; i < segments.length; i++) {
    const windowSegs = segments.slice(i, Math.min(segments.length, i + 3));
    const windowText = normalize(windowSegs.map((s) => s.text).join(" "));
    const windowWords = new Set(windowText.split(" "));

    let matches = 0;
    for (const qw of quoteWords) {
      if (windowWords.has(qw)) matches++;
    }
    const overlap = matches / quoteWords.length;
    if (overlap >= 0.7 && (!bestMatch || overlap > bestMatch.score)) {
      bestMatch = { startIdx: i, endIdx: Math.min(segments.length - 1, i + 2), score: overlap };
    }
  }

  if (bestMatch && segments[bestMatch.startIdx]?.start_ms != null) {
    const startMs = segments[bestMatch.startIdx].start_ms!;
    const endMs = segments[bestMatch.endIdx]?.end_ms ?? startMs + 10000;
    return {
      startMs,
      endMs,
      timestampLabel: formatTimestampLabel(startMs),
      confidence: Math.round(bestMatch.score * 100) / 100,
    };
  }

  return null;
}
