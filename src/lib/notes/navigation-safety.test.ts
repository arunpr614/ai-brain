import assert from "node:assert/strict";
import { test } from "node:test";
import { isUnsafeNoteNavigation } from "./navigation-safety";

test("navigation is unsafe only when a failed journal leaves content ahead of the server", () => {
  assert.equal(
    isUnsafeNoteNavigation({
      journalWriteFailed: true,
      contentMarkdown: "latest in-memory draft",
      acknowledgedMarkdown: "older saved draft",
    }),
    true,
  );
  assert.equal(
    isUnsafeNoteNavigation({
      journalWriteFailed: false,
      contentMarkdown: "latest in-memory draft",
      acknowledgedMarkdown: "older saved draft",
    }),
    false,
  );
  assert.equal(
    isUnsafeNoteNavigation({
      journalWriteFailed: true,
      contentMarkdown: "saved draft",
      acknowledgedMarkdown: "saved draft",
    }),
    false,
  );
});
