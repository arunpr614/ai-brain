import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("manifest keeps NotebookLM access narrow and optional", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
  ) as {
    version: string;
    permissions: string[];
    host_permissions: string[];
    optional_host_permissions: string[];
  };
  assert.equal(manifest.version, "0.7.3");
  assert.ok(manifest.permissions.includes("alarms"));
  assert.deepEqual(manifest.host_permissions, ["https://brain.arunp.in/*"]);
  assert.deepEqual(manifest.optional_host_permissions, ["https://notebooklm.google.com/*"]);
  for (const forbidden of ["cookies", "debugger", "scripting", "webRequest", "webRequestBlocking", "<all_urls>"]) {
    assert.ok(!manifest.permissions.includes(forbidden), `${forbidden} must not be requested`);
    assert.ok(!manifest.host_permissions.includes(forbidden), `${forbidden} must not be a host permission`);
  }
});

test("package and manifest versions stay aligned", async () => {
  const [manifest, packageJson] = await Promise.all([
    readFile(new URL("../manifest.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  assert.equal(manifest.version, packageJson.version);
});

test("popup and options show the installed manifest version", async () => {
  const [popupHtml, popupTs, optionsHtml, optionsTs] = await Promise.all([
    readFile(new URL("../src/popup.html", import.meta.url), "utf8"),
    readFile(new URL("../src/popup.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/options.html", import.meta.url), "utf8"),
    readFile(new URL("../src/options.ts", import.meta.url), "utf8"),
  ]);

  for (const html of [popupHtml, optionsHtml]) {
    assert.match(html, /id="extension-version"/);
    assert.match(html, /aria-label="Installed extension version"/);
  }
  for (const source of [popupTs, optionsTs]) {
    assert.match(source, /chrome\.runtime\.getManifest\(\)\.version/);
    assert.match(source, /Extension v/);
  }
});
