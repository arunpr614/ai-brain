import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeNoteUrl,
  markdownToPlainText,
  normalizeMarkdown,
  NoteMarkdownError,
  NOTE_MAX_BYTES,
} from "./markdown";

test("normalizeMarkdown canonicalizes newlines, Unicode, and control bytes", () => {
  const result = normalizeMarkdown("Cafe\u0301\r\nline\u0000\u0007 two");
  assert.equal(result.markdown, "Café\nline two");
  assert.equal(result.plainText, "Café\nline two");
  assert.equal(result.bytes, 14);
  assert.equal(result.meaningful, true);
  assert.match(result.contentHash, /^[a-f0-9]{64}$/);
});

test("markdownToPlainText keeps labels and code but drops destinations and markup", () => {
  const plain = markdownToPlainText(
    "## Idea\n\n- [x] **Read** [safe label](https://secret.example/path)\n\n`code`\n<script>alert(1)</script>",
  );
  assert.equal(plain, "Idea\nRead safe label\n\ncode\n alert(1)");
  assert.doesNotMatch(plain, /secret\.example/);
});

test("normalizeMarkdown enforces the 100 KiB UTF-8 byte limit", () => {
  assert.equal(normalizeMarkdown("a".repeat(NOTE_MAX_BYTES)).bytes, NOTE_MAX_BYTES);
  assert.throws(
    () => normalizeMarkdown("é".repeat(NOTE_MAX_BYTES / 2 + 1)),
    (error) => error instanceof NoteMarkdownError && error.code === "NOTE_TOO_LARGE",
  );
});

test("safe note URLs allow only http, https, and mailto", () => {
  assert.equal(isSafeNoteUrl("https://example.com/a"), true);
  assert.equal(isSafeNoteUrl("mailto:reader@example.com"), true);
  assert.equal(isSafeNoteUrl("javascript:alert(1)"), false);
  assert.equal(isSafeNoteUrl("data:text/html,bad"), false);
  assert.equal(isSafeNoteUrl("/relative"), false);
});
