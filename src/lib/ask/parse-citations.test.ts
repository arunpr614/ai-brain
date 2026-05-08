import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCitations } from "./parse-citations";

test("empty input returns []", () => {
  assert.deepEqual(parseCitations(""), []);
});

test("plain text with no markers returns single text segment", () => {
  assert.deepEqual(parseCitations("hello world"), [
    { type: "text", text: "hello world" },
  ]);
});

test("single citation in the middle is split into 3 segments", () => {
  assert.deepEqual(parseCitations("Growth loops [CITE:abc] compound."), [
    { type: "text", text: "Growth loops " },
    { type: "citation", chunk_id: "abc" },
    { type: "text", text: " compound." },
  ]);
});

test("citation at the very start", () => {
  assert.deepEqual(parseCitations("[CITE:a] is first."), [
    { type: "citation", chunk_id: "a" },
    { type: "text", text: " is first." },
  ]);
});

test("citation at the very end", () => {
  assert.deepEqual(parseCitations("trailing [CITE:z]"), [
    { type: "text", text: "trailing " },
    { type: "citation", chunk_id: "z" },
  ]);
});

test("multiple citations", () => {
  const segs = parseCitations("[CITE:a][CITE:b] and [CITE:c]");
  assert.equal(segs.length, 4);
  assert.deepEqual(segs[0], { type: "citation", chunk_id: "a" });
  assert.deepEqual(segs[1], { type: "citation", chunk_id: "b" });
  assert.deepEqual(segs[2], { type: "text", text: " and " });
  assert.deepEqual(segs[3], { type: "citation", chunk_id: "c" });
});

test("partial marker (no closing bracket) is kept as text", () => {
  const segs = parseCitations("halfway [CITE:xyz");
  assert.equal(segs.length, 1);
  assert.equal(segs[0].type, "text");
  assert.match((segs[0] as { text: string }).text, /\[CITE:xyz$/);
});

test("chunk_id with alphanumerics and underscores", () => {
  const segs = parseCitations("[CITE:abc_123-DEF]");
  assert.deepEqual(segs, [{ type: "citation", chunk_id: "abc_123-DEF" }]);
});

test("nested-looking brackets don't confuse the parser", () => {
  const segs = parseCitations("see [CITE:abc] then [not a cite] end");
  const citations = segs.filter((s) => s.type === "citation");
  assert.equal(citations.length, 1);
  assert.equal((citations[0] as { chunk_id: string }).chunk_id, "abc");
});
