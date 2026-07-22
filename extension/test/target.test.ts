import assert from "node:assert/strict";
import test from "node:test";
import {
  parseNotebookTarget,
  providerTitle,
  sourceAlias,
  targetFingerprint,
  titleHasMarker,
} from "../src/notebooklm/target.ts";
import {
  DEFAULT_SOURCE_LIMIT,
  DEFAULT_SOURCE_RESERVE,
} from "../src/notebooklm/types.ts";

const NOTEBOOK_ID = "f66923f0-1df4-4ffe-9822-3ed63c558b1c";
const MARKER = "brain_req_1234567890";

test("V1 capacity policy stays fixed at the lowest documented consumer tier", () => {
  assert.equal(DEFAULT_SOURCE_LIMIT, 50);
  assert.equal(DEFAULT_SOURCE_RESERVE, 5);
});

test("target parser accepts only the exact NotebookLM app notebook URL", () => {
  assert.deepEqual(parseNotebookTarget(`https://notebooklm.google.com/notebook/${NOTEBOOK_ID}/`), {
    notebookId: NOTEBOOK_ID,
    authUser: null,
    canonicalUrl: `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}`,
  });
  assert.deepEqual(parseNotebookTarget(`https://notebooklm.google.com/notebook/${NOTEBOOK_ID}?authuser=2`), {
    notebookId: NOTEBOOK_ID,
    authUser: 2,
    canonicalUrl: `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}?authuser=2`,
  });
  for (const invalid of [
    `http://notebooklm.google.com/notebook/${NOTEBOOK_ID}`,
    `https://notebooklm.google/notebook/${NOTEBOOK_ID}`,
    `https://evil.example/notebook/${NOTEBOOK_ID}`,
    `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}?authuser=owner@example.com`,
    `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}?authuser=11`,
    `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}?hl=en`,
    `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}#secret`,
    "https://notebooklm.google.com/",
  ]) {
    assert.throws(() => parseNotebookTarget(invalid));
  }
});

test("target and source identifiers are one-way local aliases", async () => {
  const target = await targetFingerprint(NOTEBOOK_ID);
  const secondaryTarget = await targetFingerprint(NOTEBOOK_ID, 2);
  const alias = await sourceAlias("467b7f67-1b66-45fb-8cc7-6c04723f152d");
  assert.match(target, /^[a-f0-9]{64}$/);
  assert.match(alias, /^[a-f0-9]{64}$/);
  assert.ok(!target.includes(NOTEBOOK_ID));
  assert.notEqual(target, alias);
  assert.notEqual(target, secondaryTarget);
});

test("provider title carries an exact bounded reconciliation marker", () => {
  const title = providerTitle("A useful Brain item", MARKER);
  assert.equal(title, `A useful Brain item · ${MARKER}`);
  assert.equal(titleHasMarker(title, MARKER), true);
  assert.equal(titleHasMarker(`${title} extra`, MARKER), false);
  assert.ok(providerTitle("x".repeat(500), MARKER).length <= 180);
  const premarked = providerTitle(`${"x".repeat(500)} · ${MARKER}`, MARKER);
  assert.ok(premarked.length <= 180);
  assert.equal(titleHasMarker(premarked, MARKER), true);
  assert.equal((premarked.match(new RegExp(MARKER, "g")) ?? []).length, 1);
});
