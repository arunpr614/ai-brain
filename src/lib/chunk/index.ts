/**
 * Semantic chunker — v0.4.0 F-011.
 *
 * Splits a document body into retrieval-sized chunks with markdown awareness.
 *
 * Heuristics:
 * - Target 400–800 "tokens" per chunk (≈ 1600–3200 chars). Token counting is
 *   approximated as `ceil(chars / 4)` — good enough for chunk-size gating.
 *   If accurate counting becomes critical (context-window math at generation
 *   time), swap in gpt-tokenizer as a targeted change.
 * - Prefer paragraph boundaries (`\n\n`) for splits.
 * - Never split inside a fenced code block (``` ... ```).
 * - Never split mid-heading line.
 * - When a chunk exceeds the soft cap, push the current buffer and carry
 *   the last paragraph forward as 10 % overlap.
 * - Very long paragraphs (> MAX_TOKENS on their own) are sentence-split
 *   as a fallback.
 *
 * Contract:
 *   chunkBody("") -> []
 *   chunkBody(short body, within MAX) -> single chunk
 *   chunkBody(long body) -> multiple chunks where each is ≤ MAX_TOKENS
 *     and ≥ MIN_TOKENS (except the last, which may be smaller)
 */

const CHARS_PER_TOKEN = 4;
const MIN_TOKENS = 400;
const MAX_TOKENS = 800;
const OVERLAP_FRACTION = 0.1;

export interface Chunk {
  idx: number;
  body: string;
  token_count: number;
}

export interface ChunkOptions {
  /** Override defaults for testing. */
  minTokens?: number;
  maxTokens?: number;
}

export function approxTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Split `body` into chunks. Empty body returns []. Body ≤ max returns one chunk.
 */
export function chunkBody(body: string, opts: ChunkOptions = {}): Chunk[] {
  const min = opts.minTokens ?? MIN_TOKENS;
  const max = opts.maxTokens ?? MAX_TOKENS;

  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (approxTokenCount(normalized) <= max) {
    return [
      {
        idx: 0,
        body: normalized,
        token_count: approxTokenCount(normalized),
      },
    ];
  }

  const blocks = splitIntoBlocks(normalized);
  const chunks: Chunk[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;

  const flush = (overlapFromPrev: string | null) => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n\n").trim();
    if (!text) return;
    chunks.push({
      idx: chunks.length,
      body: text,
      token_count: approxTokenCount(text),
    });
    if (overlapFromPrev) {
      buffer = [overlapFromPrev];
      bufferTokens = approxTokenCount(overlapFromPrev);
    } else {
      buffer = [];
      bufferTokens = 0;
    }
  };

  for (const block of blocks) {
    const blockTokens = approxTokenCount(block);

    // A single block bigger than MAX — split by sentence as fallback.
    if (blockTokens > max) {
      if (buffer.length > 0) flush(null);
      for (const slice of splitOverlongBlock(block, max)) {
        chunks.push({
          idx: chunks.length,
          body: slice,
          token_count: approxTokenCount(slice),
        });
      }
      continue;
    }

    // Adding this block would overflow — flush first with overlap.
    if (bufferTokens + blockTokens > max && bufferTokens >= min) {
      const last = buffer[buffer.length - 1];
      const overlapChars = Math.floor(
        (OVERLAP_FRACTION * bufferTokens * CHARS_PER_TOKEN),
      );
      const overlapText =
        last && last.length >= overlapChars
          ? last.slice(-overlapChars)
          : last ?? null;
      flush(overlapText);
    }

    buffer.push(block);
    bufferTokens = approxTokenCount(buffer.join("\n\n"));
  }

  if (buffer.length > 0) flush(null);

  return chunks;
}

/**
 * Split into atomic blocks that we never break across chunk boundaries:
 * paragraphs, headings, and fenced code blocks (treated as one block).
 */
function splitIntoBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split("\n");
  let current: string[] = [];
  let inFence = false;

  const flushParagraph = () => {
    const joined = current.join("\n").trim();
    if (joined) blocks.push(joined);
    current = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inFence) {
        current.push(line);
        blocks.push(current.join("\n").trim());
        current = [];
        inFence = false;
      } else {
        flushParagraph();
        current.push(line);
        inFence = true;
      }
      continue;
    }

    if (inFence) {
      current.push(line);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    current.push(line);
  }

  flushParagraph();
  return blocks;
}

/**
 * Fallback for paragraphs that exceed MAX_TOKENS on their own.
 * Split on sentence boundaries; if still too big, hard-split by char count.
 */
function splitOverlongBlock(block: string, maxTokens: number): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const sentences = block.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (approxTokenCount(s) > maxTokens) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      for (let i = 0; i < s.length; i += maxChars) {
        out.push(s.slice(i, i + maxChars));
      }
      continue;
    }
    if (approxTokenCount(buf + " " + s) > maxTokens) {
      if (buf) out.push(buf);
      buf = s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  if (buf) out.push(buf);
  return out;
}
