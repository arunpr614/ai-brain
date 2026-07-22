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
  assert.match(html.slice(labelIndex, inputIndex), /expire after 5 minutes/);
  assert.match(html.slice(labelIndex, inputIndex), /Do not share or screenshot this code/);
  assert.match(html.slice(inputIndex), /id="pairing-code" type="password"/);
});

test("setup feedback and prerequisites are adjacent and fail closed initially", async () => {
  const html = await readFile(new URL("../src/options.html", import.meta.url), "utf8");
  const pairButton = html.indexOf('id="pair-connector"');
  const pairStatus = html.indexOf('id="pairing-status"');
  const targetInput = html.indexOf('id="target-url"');
  const targetStatus = html.indexOf('id="target-status"');

  assert.ok(pairButton >= 0 && pairStatus > pairButton && pairStatus < targetInput);
  assert.match(html.slice(pairStatus, targetInput), /aria-live="polite"/);
  assert.match(html.slice(targetInput, targetInput + 220), /disabled/);
  assert.ok(targetStatus > targetInput);
  assert.match(html, /id="run-connector" class="secondary" disabled/);
  assert.match(html, /id="forget-connector" class="secondary danger" hidden/);
});
