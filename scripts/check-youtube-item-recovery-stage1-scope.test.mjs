import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "check-youtube-item-recovery-stage1-scope.mjs",
);
const tempRepos = [];

afterEach(() => {
  while (tempRepos.length > 0) {
    rmSync(tempRepos.pop(), { recursive: true, force: true });
  }
});

describe("D-014 Stage 1 changed-file scope assertion", () => {
  it("accepts allowlisted tracked and untracked containment changes", () => {
    const repo = createRepo({
      "src/lib/enrich/pipeline.ts": "export const baseline = true;\n",
    });
    write(
      repo,
      "src/lib/enrich/pipeline.ts",
      "export const baseline = false;\n",
    );
    write(
      repo,
      "src/lib/runtime/deployment.ts",
      'export const deploymentClass = "development";\n',
    );

    const result = runCheck(repo, "--base", "HEAD");

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: true,
      code: "youtube_item_recovery_stage1_scope_ok",
      base: "HEAD",
      target: "worktree",
      checked: 2,
      violations: [],
    });
  });

  it("fails closed on an unknown path", () => {
    const repo = createRepo();
    write(
      repo,
      "src/lib/unreviewed-helper.ts",
      "export const unreviewed = true;\n",
    );

    const result = runCheck(repo, "--base", "HEAD");
    assertViolation(
      result,
      "src/lib/unreviewed-helper.ts",
      "path_not_allowlisted",
    );
  });

  it("rejects migration SQL, extension changes, and mobile changes before allowlisting", async (t) => {
    const cases = [
      ["src/db/migrations/027_youtube_browser.sql", "migration_sql_prohibited"],
      ["extension/src/background.ts", "extension_or_mobile_change_prohibited"],
      [
        "android/app/src/main/example.kt",
        "extension_or_mobile_change_prohibited",
      ],
      ["ios/App/AppDelegate.swift", "extension_or_mobile_change_prohibited"],
    ];

    for (const [path, code] of cases) {
      await t.test(path, () => {
        const repo = createRepo();
        write(repo, path, "prohibited fixture\n");
        const result = runCheck(repo, "--base", "HEAD");
        assertViolation(result, path, code);
      });
    }
  });

  it("rejects newly added route, action, status, and component surfaces", async (t) => {
    const paths = [
      "src/app/api/items/[id]/recover/route.ts",
      "src/app/items/[id]/recover-actions.ts",
      "src/app/items/[id]/recovery-status.tsx",
      "src/components/recovery-panel.tsx",
    ];

    for (const path of paths) {
      await t.test(path, () => {
        const repo = createRepo();
        write(repo, path, "export const surface = true;\n");
        const result = runCheck(repo, "--base", "HEAD");
        assertViolation(result, path, "new_public_surface_prohibited");
      });
    }
  });

  it("rejects prohibited implementation content even inside allowlisted files", async (t) => {
    const cases = [
      {
        path: "src/app/api/capture/url/route.ts",
        base: "export const existingCaptureRoute = true;\n",
        content:
          "export const existingCaptureRoute = true;\nexport function createBrowserCaptureIntent() { return {}; }\n",
        code: "intent_grant_commit_implementation",
      },
      {
        path: "src/lib/capture/transcripts/user-provided.ts",
        base: "export const existingAttachment = true;\n",
        content:
          'export const existingAttachment = true;\nattachBrowserTranscriptToItem({ itemId: "fixture" });\n',
        code: "transcript_attachment_implementation",
      },
      {
        path: "src/lib/queue/transcript-worker.ts",
        base: "export const existingWorker = true;\n",
        content:
          'export const existingWorker = true;\ndb.prepare("DELETE FROM content_processing_holds WHERE item_id = ?");\n',
        code: "hold_release_implementation",
      },
      {
        path: ".env.example",
        base: "BRAIN_DEPLOYMENT_ENV=development\n",
        content:
          "BRAIN_DEPLOYMENT_ENV=development\nBRAIN_YOUTUBE_BROWSER_TRANSCRIPT_ENABLED=1\n",
        code: "feature_enablement",
      },
      {
        path: "src/db/items.ts",
        base: "export const existingItemsRepository = true;\n",
        content:
          'export const existingItemsRepository = true;\ndb.prepare("INSERT INTO content_processing_holds(item_id) VALUES (?)");\n',
        code: "new_feature_write_prohibited",
      },
    ];

    for (const fixture of cases) {
      await t.test(fixture.code, () => {
        const repo = createRepo({ [fixture.path]: fixture.base });
        write(repo, fixture.path, fixture.content);
        const result = runCheck(repo, "--base", "HEAD");
        assertViolation(result, fixture.path, fixture.code);
      });
    }
  });

  it("rejects new public surfaces added inside existing allowlisted files", async (t) => {
    const cases = [
      {
        path: "src/app/api/capture/url/route.ts",
        base: "export async function POST() { return Response.json({ ok: true }); }\n",
        content:
          "export async function POST() { return Response.json({ ok: true }); }\nexport async function PATCH() { return Response.json({ ok: true }); }\n",
        code: "new_route_surface_prohibited",
      },
      {
        path: "src/app/api/capture/url/route.ts",
        base: "export async function POST() { return Response.json({ ok: true }); }\n",
        content:
          "export async function POST() { return Response.json({ ok: true }); }\nexport const PATCH = async () => Response.json({ ok: true });\n",
        code: "new_route_surface_prohibited",
      },
      {
        path: "src/app/api/capture/url/route.ts",
        base: "export async function POST() { return Response.json({ ok: true }); }\n",
        content:
          "export async function POST() { return Response.json({ ok: true }); }\nexport let HEAD = async () => Response.json({ ok: true });\n",
        code: "new_route_surface_prohibited",
      },
      {
        path: "src/app/api/capture/url/route.ts",
        base: "export async function POST() { return Response.json({ ok: true }); }\n",
        content:
          "export async function POST() { return Response.json({ ok: true }); }\nexport var OPTIONS = async () => Response.json({ ok: true });\n",
        code: "new_route_surface_prohibited",
      },
      {
        path: "src/app/api/capture/url/route.ts",
        base: "export async function POST() { return Response.json({ ok: true }); }\n",
        content:
          "export async function POST() { return Response.json({ ok: true }); }\nconst remove = async () => Response.json({ ok: true });\nexport { remove as DELETE };\n",
        code: "new_route_surface_prohibited",
      },
      {
        path: "src/app/items/[id]/upgrade-actions.ts",
        base: "export async function upgradeExistingItem() { return {}; }\n",
        content:
          "export async function upgradeExistingItem() { return {}; }\nexport async function recoverBrowserTranscript() { return {}; }\n",
        code: "new_action_surface_prohibited",
      },
      {
        path: "src/app/items/[id]/upgrade-actions.ts",
        base: "export async function upgradeExistingItem() { return {}; }\n",
        content:
          "export async function upgradeExistingItem() { return {}; }\nexport const recoverBrowserTranscript = async () => ({});\n",
        code: "new_action_surface_prohibited",
      },
      {
        path: "src/app/items/[id]/upgrade-actions.ts",
        base: "export async function upgradeExistingItem() { return {}; }\n",
        content:
          "export async function upgradeExistingItem() { return {}; }\nexport let recoverBrowserTranscript = async () => ({});\n",
        code: "new_action_surface_prohibited",
      },
      {
        path: "src/app/items/[id]/upgrade-actions.ts",
        base: "export async function upgradeExistingItem() { return {}; }\n",
        content:
          "export async function upgradeExistingItem() { return {}; }\nexport var recoverBrowserTranscript = async () => ({});\n",
        code: "new_action_surface_prohibited",
      },
      {
        path: "src/app/items/[id]/upgrade-actions.ts",
        base: "export async function upgradeExistingItem() { return {}; }\n",
        content:
          "export async function upgradeExistingItem() { return {}; }\nconst recoverBrowserTranscript = async () => ({});\nexport { recoverBrowserTranscript };\n",
        code: "new_action_surface_prohibited",
      },
      {
        path: "src/app/api/items/[id]/enrichment-status/route.ts",
        base: 'export async function GET() { return Response.json({ state: "done" }); }\n',
        content:
          'export async function GET() { return Response.json({ state: "done", recovery_status: "held" }); }\n',
        code: "new_status_surface_prohibited",
      },
      {
        path: "src/app/api/items/[id]/enrichment-status/route.ts",
        base: 'export async function GET() { return Response.json({ state: "done" }); }\n',
        content:
          'export async function GET() { return Response.json({ state: "done", workflow_phase: "held" }); }\n',
        code: "new_status_surface_prohibited",
      },
    ];

    for (const fixture of cases) {
      await t.test(fixture.code, () => {
        const repo = createRepo({ [fixture.path]: fixture.base });
        write(repo, fixture.path, fixture.content);
        const result = runCheck(repo, "--base", "HEAD");
        assertViolation(result, fixture.path, fixture.code);
      });
    }
  });

  it("rejects reviewed UI file changes whose complete worktree content is not pinned", () => {
    const path = "src/components/enriching-pill.tsx";
    const repo = createRepo({
      [path]: "export function EnrichingPill() { return null; }\n",
    });
    write(
      repo,
      path,
      "export function EnrichingPill() { return <span>changed</span>; }\n",
    );

    const result = runCheck(repo, "--base", "HEAD");

    assertViolation(result, path, "reviewed_file_hash_mismatch");
  });

  it("rejects reviewed UI file changes whose complete target-commit content is not pinned", () => {
    const path = "src/components/enriching-pill.tsx";
    const repo = createRepo({
      [path]: "export function EnrichingPill() { return null; }\n",
    });
    const base = revParse(repo, "HEAD");
    write(
      repo,
      path,
      "export function EnrichingPill() { return <span>target</span>; }\n",
    );
    git(repo, "add", "--", path);
    git(repo, "commit", "-q", "-m", "reviewed UI target fixture");
    const target = revParse(repo, "HEAD");

    const result = runCheck(repo, "--base", base, "--target", target);

    assertViolation(result, path, "reviewed_file_hash_mismatch");
  });

  it("checks only the requested commit range when an explicit target is supplied", () => {
    const repo = createRepo({
      "src/lib/enrich/pipeline.ts": "export const baseline = true;\n",
    });
    const base = revParse(repo, "HEAD");
    write(
      repo,
      "src/lib/enrich/pipeline.ts",
      "export const baseline = false;\n",
    );
    git(repo, "add", "--", "src/lib/enrich/pipeline.ts");
    git(repo, "commit", "-q", "-m", "allowed containment target");
    const target = revParse(repo, "HEAD");
    write(
      repo,
      "src/lib/unreviewed-dirty-file.ts",
      "export const dirty = true;\n",
    );

    const targeted = runCheck(repo, "--base", base, "--target", target);
    assert.equal(targeted.status, 0, targeted.stderr);
    assert.equal(JSON.parse(targeted.stdout).target, target);

    const worktree = runCheck(repo, "--base", base);
    assertViolation(
      worktree,
      "src/lib/unreviewed-dirty-file.ts",
      "path_not_allowlisted",
    );
  });

  it("passes refs as argv without shell evaluation", () => {
    const repo = createRepo();
    const marker = join(repo, "shell-injection-marker");

    const result = runCheck(
      repo,
      "--base",
      "HEAD",
      "--target",
      `HEAD;touch ${marker}`,
    );

    assert.equal(result.status, 1);
    assert.equal(existsSync(marker), false);
    assert.equal(JSON.parse(result.stderr).code, "git_reference_invalid");
  });

  it("rejects deletion of an allowlisted containment file", () => {
    const repo = createRepo({
      "src/lib/enrich/pipeline.ts": "export const baseline = true;\n",
    });
    rmSync(join(repo, "src/lib/enrich/pipeline.ts"));

    const result = runCheck(repo, "--base", "HEAD");
    assertViolation(
      result,
      "src/lib/enrich/pipeline.ts",
      "change_status_not_allowlisted",
    );
  });
});

function createRepo(files = {}) {
  const repo = mkdtempSync(join(tmpdir(), "ai-brain-stage1-scope-"));
  tempRepos.push(repo);
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "scope-check@example.invalid");
  git(repo, "config", "user.name", "Scope Check Fixture");
  write(repo, "fixture-baseline.txt", "baseline\n");
  for (const [path, content] of Object.entries(files))
    write(repo, path, content);
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "fixture base");
  return repo;
}

function write(repo, path, content) {
  const destination = join(repo, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function git(repo, ...args) {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function revParse(repo, ref) {
  return git(repo, "rev-parse", ref);
}

function runCheck(repo, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: repo,
    encoding: "utf8",
    shell: false,
  });
}

function assertViolation(result, path, code) {
  assert.equal(result.status, 1, result.stdout);
  const output = JSON.parse(result.stderr);
  assert.equal(output.ok, false);
  assert.equal(output.code, "stage1_scope_violation");
  assert.deepEqual(
    output.violations.find((entry) => entry.path === path),
    {
      path,
      status: output.violations.find((entry) => entry.path === path).status,
      code,
    },
  );
}
