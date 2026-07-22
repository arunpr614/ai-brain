import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("pairing-code step links directly to Brain NotebookLM export settings", async () => {
  const html = await readFile(new URL("../src/options.html", import.meta.url), "utf8");
  const labelIndex = html.indexOf("2. One-time connector pairing code");
  const linkIndex = html.indexOf("https://brain.arunp.in/settings/notebooklm-export", labelIndex);
  const inputIndex = html.indexOf('id="pairing-code"', labelIndex);

  assert.ok(labelIndex >= 0, "pairing-code label should be present");
  assert.ok(linkIndex > labelIndex, "Brain settings link should appear below the label");
  assert.ok(inputIndex > linkIndex, "Brain settings link should appear before the code input");
  assert.match(
    html.slice(labelIndex, inputIndex),
    /target="_blank" rel="noopener noreferrer"/,
  );
});
