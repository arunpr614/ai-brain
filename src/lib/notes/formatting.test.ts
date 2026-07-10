import assert from "node:assert/strict";
import test from "node:test";
import { applyNoteFormat } from "./formatting";

test("inline formatting wraps and reselects exact content", () => {
  assert.deepEqual(applyNoteFormat("read this now", 5, 9, "bold"), {
    value: "read **this** now",
    selectionStart: 7,
    selectionEnd: 11,
  });
});

test("multiline list formatting prefixes every selected line", () => {
  assert.deepEqual(applyNoteFormat("alpha\nbeta\ngamma", 0, 10, "ordered"), {
    value: "1. alpha\n2. beta\ngamma",
    selectionStart: 0,
    selectionEnd: 16,
  });
});

test("empty link formatting selects only the destination placeholder", () => {
  const edit = applyNoteFormat("", 0, 0, "link");
  assert.equal(edit.value, "[link text](https://)");
  assert.equal(edit.value.slice(edit.selectionStart, edit.selectionEnd), "https://");
});
