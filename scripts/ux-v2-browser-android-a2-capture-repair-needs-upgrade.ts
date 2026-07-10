import fs from "node:fs/promises";
import path from "node:path";

type BrowserMode = "queue" | "empty";
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
    setTouchEmulationEnabled: (params: JsonObject) => Promise<void>;
  };
  Input: {
    dispatchMouseEvent: (params: JsonObject) => Promise<void>;
  };
  Network: {
    enable: () => Promise<void>;
    setCookie: (params: JsonObject) => Promise<void>;
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

const mode: BrowserMode = process.env.A2_BROWSER_MODE === "empty" ? "empty" : "queue";
const baseUrl = process.env.A2_BASE_URL ?? "http://127.0.0.1:3027";
const cdpUrl = new URL(process.env.A2_CDP_URL ?? "http://127.0.0.1:9333");
const cdpPort = Number(cdpUrl.port || "9333");
const outDir =
  process.env.A2_BROWSER_OUT_DIR ??
  path.join(
    process.cwd(),
    "UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a2-capture-repair-needs-upgrade",
  );
const dbPath = process.env.BRAIN_DB_PATH ?? "/tmp/ai-memory-android-a2-queue.sqlite";
const duplicateUrl = process.env.A2_DUPLICATE_URL ?? "https://example.test/a2-duplicate-url";
const repairItemId = process.env.A2_REPAIR_ITEM_ID;
const repairText = process.env.A2_REPAIR_TEXT;

const forbiddenCopy = [
  /mark good enough/i,
  /\bgood enough\b/i,
  /\bmerge\b/i,
  /\bkeep both\b/i,
  /offline queue/i,
  /available offline/i,
  /offline sync/i,
  /\bPaste Text\b/,
  /AI Brain/,
  /Your Brain/,
  /scan QR/i,
  /QR pairing/i,
  /biometric/i,
  /package migration/i,
  /telemetry/i,
  /delete all data/i,
];

const report: {
  baseUrl: string;
  viewport: { width: number; height: number; isMobile: true };
  mode: BrowserMode;
  dbPath: string;
  states: JsonObject[];
  issues: string[];
  issueCount?: number;
} = {
  baseUrl,
  viewport: { width: 390, height: 844, isMobile: true },
  mode,
  dbPath,
  states: [],
  issues: [],
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evaluate<T>(
  client: CdpClient,
  pageFunction: (...args: unknown[]) => T,
  ...args: unknown[]
) {
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

async function navigate(client: CdpClient, route: string) {
  const loaded = new Promise<void>((resolve) => {
    client.Page.loadEventFired(resolve);
  });
  await client.Page.navigate({ url: baseUrl + route });
  await Promise.race([loaded, wait(5_000)]);
  await wait(700);
}

async function waitForText(client: CdpClient, text: string, timeoutMs = 10_000) {
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

async function waitForUrl(client: CdpClient, pattern: RegExp, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const currentUrl = await evaluate(
      client,
      () => location.pathname + location.search,
    );
    if (typeof currentUrl === "string" && pattern.test(currentUrl)) return;
    await wait(250);
  }
  throw new Error(`Timed out waiting for URL matching: ${pattern}`);
}

async function clickByText(client: CdpClient, text: string) {
  const point = await evaluate<{ x: number; y: number }>(
    client,
    (targetText) => {
      const normalize = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim();
      const target = normalize(String(targetText));
      const element = Array.from(document.querySelectorAll("button,a")).find((el) => {
        const label = normalize((el as HTMLElement).innerText || el.textContent);
        return label === target;
      }) as HTMLElement | undefined;
      if (!element) throw new Error(`Could not find clickable text: ${target}`);
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
  await wait(700);
}

async function fillField(client: CdpClient, selector: string, value: string) {
  await evaluate(
    client,
    (fieldSelector, fieldValue) => {
      const element = document.querySelector(String(fieldSelector));
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        throw new Error(`Could not find field: ${fieldSelector}`);
      }
      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(element, String(fieldValue));
      element.dispatchEvent(new InputEvent("input", { bubbles: true, data: String(fieldValue) }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    selector,
    value,
  );
}

async function triggerInvalidPdf(client: CdpClient) {
  await evaluate(client, () => {
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Could not find PDF file input.");
    }
    const file = new File(["A2 invalid PDF proof file"], "a2-not-a-pdf.txt", {
      type: "text/plain",
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function captureState(
  client: CdpClient,
  name: string,
  route: string | null,
  expectedTexts: string[] = [],
) {
  if (route) {
    await navigate(client, route);
  }

  const screenshot = path.join(outDir, `${name}.png`);
  const png = await client.Page.captureScreenshot({
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await fs.writeFile(screenshot, Buffer.from(png.data, "base64"));

  const metrics = await evaluate(
    client,
    (forbiddenSources, expected) => {
      const forbidden = (forbiddenSources as { source: string; flags: string }[]).map(
        (source) => new RegExp(source.source, source.flags),
      );
      const expectedList = expected as string[];
      const text = document.body.innerText || "";
      const doc = document.documentElement;
      const visibleControls = Array.from(
        document.querySelectorAll(
          'a,button,input,textarea,[role="button"],[role="tab"]',
        ),
      )
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const fixedNav = el.closest("nav");
          const fixedNavStyle = fixedNav ? window.getComputedStyle(fixedNav) : null;
          return {
            tag: el.tagName.toLowerCase(),
            text: (
              (el as HTMLElement).innerText ||
              el.getAttribute("aria-label") ||
              el.getAttribute("placeholder") ||
              ""
            )
              .trim()
              .slice(0, 80),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            visible:
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0,
            inFixedNav: fixedNavStyle?.position === "fixed",
          };
        })
        .filter((entry) => entry.visible);

      return {
        title: document.title,
        url: location.pathname + location.search,
        bodyTextSample: text.slice(0, 1200),
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
        forbiddenMatches: forbidden
          .map((pattern) => {
            const found = text.match(pattern);
            return found ? { pattern: pattern.toString(), match: found[0] } : null;
          })
          .filter(Boolean),
        expectedMissing: expectedList.filter((value) => !text.includes(value)),
        clippedControls: visibleControls
          .filter(
            (entry) =>
              !entry.inFixedNav &&
              entry.bottom > window.innerHeight - 4 &&
              entry.top < window.innerHeight,
          )
          .map(({ inFixedNav: _inFixedNav, visible: _visible, ...entry }) => entry),
      };
    },
    forbiddenCopy.map((pattern) => ({
      source: pattern.source,
      flags: pattern.flags,
    })),
    expectedTexts,
  );

  report.states.push({ name, path: metrics.url, screenshot, metrics });
  if (metrics.horizontalOverflow) {
    report.issues.push(
      `${name}: horizontal overflow ${metrics.scrollWidth}/${metrics.clientWidth}`,
    );
  }
  if (Array.isArray(metrics.forbiddenMatches) && metrics.forbiddenMatches.length > 0) {
    report.issues.push(
      `${name}: forbidden copy ${JSON.stringify(metrics.forbiddenMatches)}`,
    );
  }
  if (Array.isArray(metrics.expectedMissing) && metrics.expectedMissing.length > 0) {
    report.issues.push(
      `${name}: missing expected text ${metrics.expectedMissing.join(", ")}`,
    );
  }
}

async function runQueueMode(client: CdpClient) {
  if (!repairItemId || !repairText) {
    throw new Error("Set A2_REPAIR_ITEM_ID and A2_REPAIR_TEXT for queue mode.");
  }

  await captureState(
    client,
    "390x844-capture-url-duplicate-result",
    `/capture?url=${encodeURIComponent(duplicateUrl)}`,
    [
      "Capture",
      "Save a URL, PDF, or note",
      "already saved this URL",
      "Open existing",
      "Save again anyway",
    ],
  );

  await captureState(client, "390x844-capture-pdf-initial", "/capture?tab=pdf", [
    "Drop a PDF here or click to browse",
  ]);
  await triggerInvalidPdf(client);
  await waitForText(client, "Only PDF files are supported.");
  await captureState(client, "390x844-capture-pdf-invalid-file", null, [
    "Only PDF files are supported.",
  ]);

  await captureState(client, "390x844-capture-note-initial", "/capture?tab=note", [
    "Title",
    "Body",
    "Save note",
  ]);
  await fillField(client, 'input[name="title"]', "A2 mobile note proof");
  await fillField(
    client,
    'textarea[name="body"]',
    "A2 mobile note body saved through the real Capture note form. It proves the mobile note action routes to an item detail page after saving.",
  );
  await clickByText(client, "Save note");
  await waitForUrl(client, /\/items\/[a-f0-9]+/);
  await captureState(client, "390x844-capture-note-saved-item", null, [
    "A2 mobile note proof",
  ]);

  await captureState(client, "390x844-needs-upgrade-queue", "/needs-upgrade", [
    "Needs Upgrade",
    "Needs transcript",
    "Preview only",
    "Extraction failed",
  ]);

  await captureState(client, "390x844-repair-form", `/items/${repairItemId}/repair`, [
    "Repair source text",
    "Save repair",
    "Existing tags and collections stay attached",
  ]);
  await fillField(client, 'textarea[name="text"]', repairText);
  await clickByText(client, "Save repair");
  await waitForUrl(client, new RegExp(`/items/${repairItemId}`));
  await captureState(client, "390x844-repair-saved-item", null, [
    "A2 repair weak fixture",
  ]);

  await captureState(client, "390x844-needs-upgrade-after-repair", "/needs-upgrade", [
    "Needs Upgrade",
    "Preview only",
    "Extraction failed",
  ]);
}

async function runEmptyMode(client: CdpClient) {
  await captureState(client, "390x844-needs-upgrade-empty", "/needs-upgrade", [
    "No captures need attention.",
    "New metadata-only, preview-only, or failed captures will appear here.",
  ]);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const client = await CDP({ port: cdpPort });
  try {
    await Promise.all([
      client.DOM.enable(),
      client.Emulation.setDeviceMetricsOverride({
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      }),
      client.Emulation.setTouchEmulationEnabled({ enabled: true }),
      client.Network.enable(),
      client.Page.enable(),
      client.Runtime.enable(),
    ]);
    await client.Network.setCookie({
      name: "brain-session",
      value: "qa",
      domain: "127.0.0.1",
      path: "/",
    });

    if (mode === "queue") {
      await runQueueMode(client);
    } else {
      await runEmptyMode(client);
    }
  } finally {
    await client.Browser?.close().catch(() => undefined);
    await client.close().catch(() => undefined);
  }

  report.issueCount = report.issues.length;
  const reportPath = path.join(
    outDir,
    `android-a2-capture-repair-needs-upgrade-${mode}-browser-report.json`,
  );
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        reportPath,
        mode,
        stateCount: report.states.length,
        issueCount: report.issueCount,
        issues: report.issues,
      },
      null,
      2,
    ),
  );
  if (report.issueCount > 0) {
    process.exitCode = 1;
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
