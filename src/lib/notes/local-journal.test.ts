import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import {
  deleteJournal,
  destroyNoteJournalDbForTests,
  listRecoverableJournals,
  putLatestJournal,
  type LocalEditorJournal,
} from "./local-journal";

Object.assign(globalThis, { indexedDB, IDBKeyRange });

beforeEach(() => destroyNoteJournalDbForTests());
afterEach(() => destroyNoteJournalDbForTests());

function journal(
  editorInstanceId: string,
  localSequence: number,
  contentMarkdown: string,
): LocalEditorJournal {
  return {
    itemId: "item-1",
    editorInstanceId,
    localSequence,
    epoch: 1,
    baseGeneration: 2,
    contentMarkdown,
    contentHash: `hash-${localSequence}`,
    mutationId: `mutation-${editorInstanceId}-${localSequence}`,
    state: "dirty",
    updatedAt: localSequence,
  };
}

test("two editor instances retain independent dirty drafts", async () => {
  await putLatestJournal(journal("tab-a", 1, "Draft A"));
  await putLatestJournal(journal("tab-b", 1, "Draft B"));
  const rows = await listRecoverableJournals("item-1");
  assert.equal(rows.length, 2);
  assert.deepEqual(
    new Set(rows.map((row) => row.contentMarkdown)),
    new Set(["Draft A", "Draft B"]),
  );
});

test("a delayed older sequence cannot overwrite a newer durable draft", async () => {
  await putLatestJournal(journal("tab-a", 3, "Newest"));
  const accepted = await putLatestJournal(journal("tab-a", 2, "Delayed old"));
  assert.equal(accepted.localSequence, 3);
  assert.equal((await listRecoverableJournals("item-1"))[0]?.contentMarkdown, "Newest");
});

test("discard removes only the chosen editor instance", async () => {
  await putLatestJournal(journal("tab-a", 1, "Draft A"));
  await putLatestJournal(journal("tab-b", 1, "Draft B"));
  await deleteJournal("item-1", "tab-a");
  const rows = await listRecoverableJournals("item-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.editorInstanceId, "tab-b");
});

