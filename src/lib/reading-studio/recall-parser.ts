/**
 * Engine for parsing imported Recall.it memories from item.body and item.summary into
 * structured takeaways, chapter sections, timestamps, and virtual transcript segments.
 */

export interface RecallParsedTakeaway {
  id: string;
  text: string;
  timestampSeconds: number | null;
  timestampMs: number | null;
  timestampLabel: string | null;
}

export interface RecallParsedSection {
  id: string;
  title: string;
  timestampSeconds: number | null;
  timestampMs: number | null;
  timestampLabel: string | null;
  takeaways: RecallParsedTakeaway[];
  content: string;
}

export interface RecallVirtualSegment {
  id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  speaker: string | null;
}

export interface RecallParsedMemory {
  isRecall: boolean;
  cardId: string | null;
  createdAt: string | null;
  sourceUrl: string | null;
  fidelity: string | null;
  importedAt: string | null;
  sections: RecallParsedSection[];
  takeaways: RecallParsedTakeaway[];
  virtualSegments: RecallVirtualSegment[];
  rawSummary: string | null;
}

/**
 * Parses timestamp string like "(00:01:35)", "(01:35)", "00:01:35", "01:35", "1:35" into seconds.
 */
export function parseTimestampToSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/(?:(?:\((\d{1,2}):(\d{2}):(\d{2})\))|(?:\((\d{1,2}):(\d{2})\))|(?:(\d{1,2}):(\d{2}):(\d{2}))|(?:(\d{1,2}):(\d{2})))/);
  if (!match) return null;

  // Group 1,2,3 -> (HH:MM:SS)
  if (match[1] !== undefined && match[2] !== undefined && match[3] !== undefined) {
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
  }
  // Group 4,5 -> (MM:SS)
  if (match[4] !== undefined && match[5] !== undefined) {
    return parseInt(match[4], 10) * 60 + parseInt(match[5], 10);
  }
  // Group 6,7,8 -> HH:MM:SS
  if (match[6] !== undefined && match[7] !== undefined && match[8] !== undefined) {
    return parseInt(match[6], 10) * 3600 + parseInt(match[7], 10) * 60 + parseInt(match[8], 10);
  }
  // Group 9,10 -> MM:SS
  if (match[9] !== undefined && match[10] !== undefined) {
    return parseInt(match[9], 10) * 60 + parseInt(match[10], 10);
  }

  return null;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS string.
 */
export function formatSecondsToTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Parses markdown body from a Recall item into structured takeaways, sections, and virtual segments.
 */
export function parseRecallMemory(
  body: string | null | undefined,
  summary?: string | null | undefined,
): RecallParsedMemory {
  const result: RecallParsedMemory = {
    isRecall: false,
    cardId: null,
    createdAt: null,
    sourceUrl: null,
    fidelity: null,
    importedAt: null,
    sections: [],
    takeaways: [],
    virtualSegments: [],
    rawSummary: summary?.trim() || null,
  };

  if (!body) return result;

  // Detect Recall provenance
  const isRecallHeader = body.includes("Imported from Recall") || body.includes("Recall card id:");
  if (isRecallHeader) {
    result.isRecall = true;

    const cardIdMatch = body.match(/Recall card id:\s*([^\r\n]+)/i);
    if (cardIdMatch) result.cardId = cardIdMatch[1].trim();

    const createdAtMatch = body.match(/Recall created_at:\s*([^\r\n]+)/i);
    if (createdAtMatch) result.createdAt = createdAtMatch[1].trim();

    const sourceUrlMatch = body.match(/Original source:\s*([^\r\n]+)/i);
    if (sourceUrlMatch) result.sourceUrl = sourceUrlMatch[1].trim();

    const fidelityMatch = body.match(/Content fidelity:\s*([^\r\n]+)/i);
    if (fidelityMatch) result.fidelity = fidelityMatch[1].trim();

    const importedAtMatch = body.match(/Imported at:\s*([^\r\n]+)/i);
    if (importedAtMatch) result.importedAt = importedAtMatch[1].trim();
  }

  // Split out the header block (before first '---' or before body content)
  let cleanBody = body;
  const headerSplit = body.split(/\n---\s*\n/);
  if (headerSplit.length > 1 && isRecallHeader) {
    cleanBody = headerSplit.slice(1).join("\n---\n");
  } else if (isRecallHeader) {
    // Strip leading metadata lines
    cleanBody = body.replace(/^(?:Imported from Recall|Recall card id:[^\n]*|Recall created_at:[^\n]*|Original source:[^\n]*|Content fidelity:[^\n]*|Imported at:[^\n]*)\s*\n?/gim, "");
  }

  // Parse lines into sections and takeaways
  const lines = cleanBody.split(/\r?\n/);
  let currentSection: RecallParsedSection = {
    id: "section-intro",
    title: "Key Takeaways & Highlights",
    timestampSeconds: null,
    timestampMs: null,
    timestampLabel: null,
    takeaways: [],
    content: "",
  };

  const allSections: RecallParsedSection[] = [];
  const allTakeaways: RecallParsedTakeaway[] = [];
  const contentBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for Section Heading: ## Title (MM:SS) or ## Title
    const headerMatch = trimmed.match(/^##\s+(.+)$/);
    if (headerMatch) {
      if (currentSection.takeaways.length > 0 || currentSection.content.trim().length > 0) {
        currentSection.content = contentBuffer.join("\n").trim();
        allSections.push(currentSection);
        contentBuffer.length = 0;
      }

      const fullHeader = headerMatch[1].trim();
      const tsMatch = fullHeader.match(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/);
      const tsSeconds = tsMatch ? parseTimestampToSeconds(tsMatch[1]) : null;
      const tsLabel = tsSeconds !== null ? formatSecondsToTimestamp(tsSeconds) : null;
      const title = fullHeader.replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\)\s*$/, "").trim();

      currentSection = {
        id: `section-${allSections.length + 1}`,
        title: title || fullHeader,
        timestampSeconds: tsSeconds,
        timestampMs: tsSeconds !== null ? tsSeconds * 1000 : null,
        timestampLabel: tsLabel,
        takeaways: [],
        content: "",
      };
      continue;
    }

    // Check for Bullet point: - Text (MM:SS) or * Text (MM:SS)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const rawText = bulletMatch[1].trim();
      const tsMatch = rawText.match(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/);
      const tsSeconds = tsMatch ? parseTimestampToSeconds(tsMatch[1]) : null;
      const tsLabel = tsSeconds !== null ? formatSecondsToTimestamp(tsSeconds) : null;
      const cleanText = rawText.replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\)\s*$/, "").trim();

      const takeaway: RecallParsedTakeaway = {
        id: `takeaway-${allTakeaways.length + 1}`,
        text: cleanText || rawText,
        timestampSeconds: tsSeconds,
        timestampMs: tsSeconds !== null ? tsSeconds * 1000 : null,
        timestampLabel: tsLabel,
      };

      currentSection.takeaways.push(takeaway);
      allTakeaways.push(takeaway);
    } else {
      if (trimmed.length > 0) {
        contentBuffer.push(line);
      }
    }
  }

  if (currentSection.takeaways.length > 0 || currentSection.content.trim().length > 0 || contentBuffer.length > 0) {
    currentSection.content = contentBuffer.join("\n").trim();
    allSections.push(currentSection);
  }

  result.sections = allSections;
  result.takeaways = allTakeaways;

  // Extract Virtual Transcript Segments from inline dialogue timestamps
  // Pattern: (00:06:10) text chunk (00:06:14) next text chunk ...
  const timestampRegex = /\((\d{1,2}:\d{2}(?::\d{2})?)\)/g;
  let match: RegExpExecArray | null;
  const timestampMatches: Array<{ index: number; seconds: number; raw: string }> = [];

  while ((match = timestampRegex.exec(cleanBody)) !== null) {
    const seconds = parseTimestampToSeconds(match[1]);
    if (seconds !== null) {
      timestampMatches.push({
        index: match.index,
        seconds,
        raw: match[0],
      });
    }
  }

  if (timestampMatches.length > 0) {
    const virtualSegments: RecallVirtualSegment[] = [];

    // Sort by timestamp
    timestampMatches.sort((a, b) => a.seconds - b.seconds);

    for (let i = 0; i < timestampMatches.length; i++) {
      const current = timestampMatches[i];
      const next = timestampMatches[i + 1];
      const startMs = current.seconds * 1000;
      const endMs = next ? next.seconds * 1000 : startMs + 10000; // Default 10s if last

      // Extract text snippet following this timestamp up to the next timestamp
      const textStart = current.index + current.raw.length;
      const textEnd = next ? next.index : Math.min(textStart + 300, cleanBody.length);
      const rawChunk = cleanBody.slice(textStart, textEnd).trim();
      const cleanChunk = rawChunk
        .replace(/^[-*#\s]+/, "")
        .replace(/---/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanChunk.length > 0) {
        virtualSegments.push({
          id: `recall-seg-${i + 1}`,
          start_ms: startMs,
          end_ms: Math.max(endMs, startMs + 1000),
          text: cleanChunk,
          speaker: null,
        });
      }
    }

    result.virtualSegments = virtualSegments;
  }

  return result;
}
