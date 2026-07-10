import crypto from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

type JsonObject = Record<string, unknown>;

interface CdpClient {
  Browser?: {
    close: () => Promise<void>;
  };
  DOM: {
    enable: () => Promise<void>;
  };
  Emulation: {
    setDeviceMetricsOverride: (params: JsonObject) => Promise<void>;
  };
  Input: {
    dispatchMouseEvent: (params: JsonObject) => Promise<void>;
  };
  Network: {
    enable: () => Promise<void>;
    setCookie: (params: JsonObject) => Promise<{ success?: boolean }>;
  };
  Page: {
    enable: () => Promise<void>;
    navigate: (params: JsonObject) => Promise<void>;
    loadEventFired: (callback: () => void) => void;
    captureScreenshot: (params: JsonObject) => Promise<{ data: string }>;
  };
  Runtime: {
    enable: () => Promise<void>;
    evaluate: (params: JsonObject) => Promise<{
      result?: { value?: unknown };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    }>;
  };
  close: () => Promise<void>;
}

type CdpFactory = (options: { port: number }) => Promise<CdpClient>;

const CDP = require("chrome-remote-interface") as CdpFactory;

const projectRoot =
  process.env.M1B_SMOKE_PROJECT_ROOT ??
  path.resolve(process.cwd(), "../recall_exploration");
const executionTimestamp = timestampName();
const outDir =
  process.env.M1B_SMOKE_OUT_DIR ??
  path.join(projectRoot, `m1b_browser_smoke_${executionTimestamp}`);
const tmpDir =
  process.env.M1B_SMOKE_TMP_DIR ??
  mkdtempSync(path.join(os.tmpdir(), "brain-m1b-browser-smoke-"));
const dbPath = process.env.BRAIN_DB_PATH ?? path.join(tmpDir, "brain.sqlite");
const chromeProfileDir = path.join(tmpDir, "chrome-profile");
const serverLogPath = path.join(outDir, "server.log");
const reportPath = path.join(outDir, "browser-smoke-report.json");
const dbVerificationPath = path.join(outDir, "db-verification.json");
const fixturePath = path.join(outDir, "fixture-transcript.vtt");
const envPath = path.join(process.cwd(), ".env");
const backupDir = path.join(process.cwd(), "data/backups");
const throwawayBearerToken = "f".repeat(64);
const expectedTexts = [
  "TRANSCRIPT",
  "Timestamped transcript",
  "Uploaded file",
  "Timestamped",
  "2 segments",
  "0:01",
  "M1B browser smoke cue proves the repair upload path",
];

interface EnvSnapshot {
  exists: boolean;
  size: number | null;
  mtimeMs: number | null;
  sha256: string | null;
}

interface SmokeReport {
  executionTimestamp: string;
  baseUrl?: string;
  appPort?: number;
  cdpPort?: number;
  dbPath: string;
  tmpDir: string;
  chromeProfileDir: string;
  itemId?: string;
  screenshots: string[];
  expectedTexts: string[];
  missingTexts: string[];
  currentUrl?: string;
  bodyTextSample?: string;
  envUnchanged?: boolean;
  backupFilesAdded?: string[];
  childProcessesStopped?: boolean;
  dbVerification?: JsonObject;
  issueCount?: number;
  issues: string[];
  cleanup: JsonObject;
}

const report: SmokeReport = {
  executionTimestamp,
  dbPath,
  tmpDir,
  chromeProfileDir,
  screenshots: [],
  expectedTexts,
  missingTexts: [],
  issues: [],
  cleanup: {},
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestampName(now = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}_IST`;
}

function snapshotEnv(): EnvSnapshot {
  if (!existsSync(envPath)) {
    return { exists: false, size: null, mtimeMs: null, sha256: null };
  }
  const stat = statSync(envPath);
  const body = readFileSync(envPath);
  return {
    exists: true,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  };
}

function listBackupFiles(): string[] {
  if (!existsSync(backupDir)) return [];
  return readdirSync(backupDir).filter((file) => file.endsWith(".sqlite")).sort();
}

function sameEnvSnapshot(a: EnvSnapshot, b: EnvSnapshot): boolean {
  return (
    a.exists === b.exists &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.sha256 === b.sha256
  );
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a free port.")));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHttp(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function waitForChrome(port: number, timeoutMs = 15_000): Promise<void> {
  await waitForHttp(`http://127.0.0.1:${port}/json/version`, timeoutMs);
}

async function evaluate<T>(
  client: CdpClient,
  pageFunction: (...args: unknown[]) => T,
  ...args: unknown[]
): Promise<T> {
  const expression = `(() => { const __name = (fn) => fn; return (${pageFunction.toString()})(...${JSON.stringify(args)}); })()`;
  const evaluated = await client.Runtime.evaluate({
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluated.exceptionDetails) {
    throw new Error(
      evaluated.exceptionDetails.exception?.description ??
        evaluated.exceptionDetails.text ??
        "Runtime evaluation failed",
    );
  }
  return evaluated.result?.value as T;
}

async function navigate(client: CdpClient, url: string): Promise<void> {
  const loaded = new Promise<void>((resolve) => {
    client.Page.loadEventFired(resolve);
  });
  await client.Page.navigate({ url });
  await Promise.race([loaded, wait(8_000)]);
  await wait(900);
}

async function waitForText(client: CdpClient, text: string, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await evaluate(
      client,
      (expected) => (document.body.innerText || "").includes(String(expected)),
      text,
    );
    if (found) return;
    await wait(250);
  }
  throw new Error(`Timed out waiting for text: ${text}`);
}

async function waitForPath(client: CdpClient, expectedPath: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const currentPath = await evaluate(client, () => location.pathname);
    if (currentPath === expectedPath) return;
    await wait(250);
  }
  throw new Error(`Timed out waiting for path: ${expectedPath}`);
}

async function captureScreenshot(client: CdpClient, filename: string): Promise<string> {
  const screenshot = path.join(outDir, filename);
  const png = await client.Page.captureScreenshot({
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await fs.writeFile(screenshot, Buffer.from(png.data, "base64"));
  report.screenshots.push(screenshot);
  return screenshot;
}

async function clickButtonByText(client: CdpClient, text: string): Promise<void> {
  const point = await evaluate<{ x: number; y: number }>(
    client,
    (targetText) => {
      const normalize = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim();
      const target = normalize(String(targetText));
      const element = Array.from(document.querySelectorAll("button")).find((el) => {
        const label = normalize((el as HTMLElement).innerText || el.textContent);
        return label === target;
      }) as HTMLElement | undefined;
      if (!element) throw new Error(`Could not find button: ${target}`);
      element.scrollIntoView({ block: "center", inline: "center" });
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    },
    text,
  );
  await client.Input.dispatchMouseEvent({
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
  });
  await client.Input.dispatchMouseEvent({
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await client.Input.dispatchMouseEvent({
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
}

async function attachTranscriptFile(client: CdpClient, vttText: string): Promise<void> {
  await evaluate(
    client,
    (fixtureText) => {
      const input = document.querySelector('input[name="transcript_file"]');
      if (!(input instanceof HTMLInputElement)) {
        throw new Error("Could not find transcript file input.");
      }
      const file = new File([String(fixtureText)], "fixture-transcript.vtt", {
        type: "text/vtt",
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    vttText,
  );
}

async function captureFailureState(client: CdpClient | null): Promise<void> {
  if (!client) return;
  try {
    report.currentUrl = await evaluate(client, () => location.href);
    report.bodyTextSample = await evaluate(
      client,
      () => (document.body.innerText || "").slice(0, 2000),
    );
    await captureScreenshot(client, "failure-page.png");
  } catch (err) {
    report.issues.push(`Failed to capture failure page state: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function chromeExecutable(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean) as string[];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("No safe Chrome executable found. Set CHROME_PATH to a Chrome/Chromium binary.");
  }
  return found;
}

function spawnDevServer(appPort: number): ChildProcess {
  const child = spawn("npm", ["run", "dev", "--", "-p", String(appPort)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRAIN_DB_PATH: dbPath,
      BRAIN_API_TOKEN: throwawayBearerToken,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logStream = require("node:fs").createWriteStream(serverLogPath, { flags: "a" });
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);
  child.once("exit", () => {
    logStream.end();
  });
  return child;
}

function spawnChrome(cdpPort: number): ChildProcess {
  mkdirSync(chromeProfileDir, { recursive: true });
  return spawn(
    chromeExecutable(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${chromeProfileDir}`,
      `--remote-debugging-port=${cdpPort}`,
      "about:blank",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

async function stopChild(child: ChildProcess | null, name: string): Promise<boolean> {
  if (!child) return true;
  if (child.exitCode !== null || child.signalCode !== null) return true;
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    new Promise<boolean>((resolve) => child.once("exit", () => resolve(true))),
    wait(5_000).then(() => false),
  ]);
  if (stopped) return true;
  child.kill("SIGKILL");
  const killed = await Promise.race([
    new Promise<boolean>((resolve) => child.once("exit", () => resolve(true))),
    wait(5_000).then(() => false),
  ]);
  if (!killed) report.issues.push(`Failed to stop ${name} process.`);
  return killed;
}

function fixtureVtt(): string {
  return `WEBVTT

00:00:01.000 --> 00:00:04.000
M1B browser smoke cue proves the repair upload path stores timestamped transcript data for analysis, search, review, validation, and follow up planning.

00:00:05.000 --> 00:00:09.000
Second smoke cue confirms the uploaded file becomes active source segments on the item detail page with enough useful transcript text for the repair pipeline.
`;
}

async function seedDb(): Promise<{ itemId: string; sessionToken: string }> {
  process.env.BRAIN_DB_PATH = dbPath;
  const { getDb } = await import("@/db/client");
  const { setJsonSetting } = await import("@/db/settings");
  const { insertCaptured } = await import("@/db/items");
  const { issueSessionToken, setPin } = await import("@/lib/auth");

  getDb();
  setJsonSetting("backup", {
    enabled: false,
    interval_hours: 6,
    retention_count: 28,
  });
  setPin("1234");
  const sessionToken = issueSessionToken();
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://youtu.be/m1b-browser-smoke",
    title: "M1B Browser Smoke Metadata-only Video",
    body: "Metadata-only placeholder before browser transcript upload.",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
    extraction_method: "youtube_metadata_only",
  });

  return { itemId: item.id, sessionToken };
}

async function verifyDb(itemId: string): Promise<JsonObject> {
  const { getItem } = await import("@/db/items");
  const {
    getActiveTranscriptSourceForItem,
    listTranscriptSegmentsForSource,
  } = await import("@/db/transcripts");

  const item = getItem(itemId);
  const source = getActiveTranscriptSourceForItem(itemId);
  const segments = source ? listTranscriptSegmentsForSource(source.id) : [];
  const checks = {
    itemFound: Boolean(item),
    captureQuality: item?.capture_quality ?? null,
    itemBodyIncludesCue: Boolean(item?.body.includes("M1B browser smoke cue proves")),
    activeSourceFound: Boolean(source),
    sourceKind: source?.source_kind ?? null,
    timestampMode: source?.timestamp_mode ?? null,
    segmentCount: source?.segment_count ?? null,
    listedSegmentCount: segments.length,
    firstSegmentStartMs: segments[0]?.start_ms ?? null,
    firstSegmentTextIncludesCue: Boolean(segments[0]?.text.includes("M1B browser smoke cue proves")),
  };
  const pass =
    checks.itemFound &&
    checks.captureQuality === "user_provided_full_text" &&
    checks.itemBodyIncludesCue &&
    checks.activeSourceFound &&
    checks.sourceKind === "uploaded_file" &&
    checks.timestampMode === "timestamped" &&
    checks.segmentCount === 2 &&
    checks.listedSegmentCount === 2 &&
    checks.firstSegmentStartMs === 1000 &&
    checks.firstSegmentTextIncludesCue;

  const verification = { pass, checks };
  await fs.writeFile(dbVerificationPath, JSON.stringify(verification, null, 2));
  report.dbVerification = verification;
  if (!pass) report.issues.push("DB verification failed.");
  return verification;
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const envBefore = snapshotEnv();
  const backupsBefore = listBackupFiles();
  const vtt = fixtureVtt();
  writeFileSync(fixturePath, vtt);

  let server: ChildProcess | null = null;
  let chrome: ChildProcess | null = null;
  let client: CdpClient | null = null;

  try {
    const appPort = await getFreePort();
    const cdpPort = await getFreePort();
    report.appPort = appPort;
    report.cdpPort = cdpPort;
    report.baseUrl = `http://127.0.0.1:${appPort}`;
    const { itemId, sessionToken } = await seedDb();
    report.itemId = itemId;

    server = spawnDevServer(appPort);
    await waitForHttp(`${report.baseUrl}/unlock`);

    chrome = spawnChrome(cdpPort);
    await waitForChrome(cdpPort);
    client = await CDP({ port: cdpPort });
    await Promise.all([
      client.DOM.enable(),
      client.Network.enable(),
      client.Page.enable(),
      client.Runtime.enable(),
      client.Emulation.setDeviceMetricsOverride({
        width: 1280,
        height: 920,
        deviceScaleFactor: 1,
        mobile: false,
      }),
    ]);
    const cookieResult = await client.Network.setCookie({
      name: "brain-session",
      value: sessionToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    if (cookieResult.success === false) {
      throw new Error("CDP failed to set session cookie.");
    }

    await navigate(client, `${report.baseUrl}/items/${itemId}/repair`);
    await waitForText(client, "Transcript file");
    await waitForText(client, "Save repair");
    await captureScreenshot(client, "repair-page-before-upload.png");
    await attachTranscriptFile(client, vtt);
    await clickButtonByText(client, "Save repair");
    await waitForPath(client, `/items/${itemId}`);
    await waitForText(client, "Timestamped transcript");
    await captureScreenshot(client, "item-detail-after-upload.png");

    const textState = await evaluate<{ currentUrl: string; bodyText: string }>(
      client,
      () => ({
        currentUrl: location.href,
        bodyText: document.body.innerText || "",
      }),
    );
    report.currentUrl = textState.currentUrl;
    report.bodyTextSample = textState.bodyText.slice(0, 2000);
    report.missingTexts = expectedTexts.filter((text) => !textState.bodyText.includes(text));
    if (report.missingTexts.length > 0) {
      report.issues.push(`Missing expected browser text: ${report.missingTexts.join(", ")}`);
    }

    await verifyDb(itemId);
  } catch (err) {
    report.issues.push(err instanceof Error ? err.message : String(err));
    await captureFailureState(client);
  } finally {
    if (client) {
      await client.Browser?.close().catch(() => undefined);
      await client.close().catch(() => undefined);
    }
    const chromeStopped = await stopChild(chrome, "Chrome");
    const serverStopped = await stopChild(server, "dev server");
    report.childProcessesStopped = chromeStopped && serverStopped;
    report.cleanup = {
      chromeStopped,
      serverStopped,
    };

    const envAfter = snapshotEnv();
    report.envUnchanged = sameEnvSnapshot(envBefore, envAfter);
    if (!report.envUnchanged) {
      report.issues.push(".env changed during smoke run.");
    }
    const backupsAfter = listBackupFiles();
    report.backupFilesAdded = backupsAfter.filter((file) => !backupsBefore.includes(file));
    if (report.backupFilesAdded.length > 0) {
      report.issues.push(`Project backup snapshot(s) created during smoke: ${report.backupFilesAdded.join(", ")}`);
    }
    if (!report.childProcessesStopped) {
      report.issues.push("Child process cleanup did not complete.");
    }

    for (const screenshot of report.screenshots) {
      const size = existsSync(screenshot) ? statSync(screenshot).size : 0;
      if (size <= 0) report.issues.push(`Screenshot missing or empty: ${screenshot}`);
    }

    report.issueCount = report.issues.length;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          reportPath,
          dbVerificationPath,
          issueCount: report.issueCount,
          issues: report.issues,
          screenshots: report.screenshots,
        },
        null,
        2,
      ),
    );
    if (report.issueCount > 0) process.exitCode = 1;
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
