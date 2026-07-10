import fs from "node:fs/promises";
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
    setTouchEmulationEnabled: (params: JsonObject) => Promise<void>;
  };
  Fetch: {
    enable: (params: JsonObject) => Promise<void>;
    disable: () => Promise<void>;
    continueRequest: (params: JsonObject) => Promise<void>;
    fulfillRequest: (params: JsonObject) => Promise<void>;
    requestPaused: (callback: (params: JsonObject) => void) => void;
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

const baseUrl = process.env.A3_BASE_URL ?? "http://127.0.0.1:3027";
const cdpUrl = new URL(process.env.A3_CDP_URL ?? "http://127.0.0.1:9333");
const cdpPort = Number(cdpUrl.port || "9333");
const outDir =
  process.env.A3_BROWSER_OUT_DIR ??
  path.join(
    process.cwd(),
    "UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a3-ask-item-detail",
  );
const dbPath = process.env.BRAIN_DB_PATH ?? "/tmp/ai-memory-android-a3-ask-item-detail.sqlite";

const fullItemId = requiredEnv("A3_FULL_ITEM_ID");
const weakItemId = requiredEnv("A3_WEAK_ITEM_ID");
const noRelatedItemId = requiredEnv("A3_NO_RELATED_ITEM_ID");

const forbiddenCopy = [
  /Paste link/i,
  /Write note/i,
  /Attach file/i,
  /Attachments/i,
  /high-quality-only/i,
  /scope history/i,
  /offline queue/i,
  /available offline/i,
  /offline sync/i,
  /AI Brain/,
  /Your Brain/,
  /scan QR/i,
  /QR pairing/i,
  /biometric/i,
  /package migration/i,
  /telemetry/i,
  /E2EE/i,
  /delete all data/i,
];

const report: {
  baseUrl: string;
  viewport: { width: number; height: number; isMobile: true };
  dbPath: string;
  itemIds: {
    full: string;
    weak: string;
    noRelated: string;
  };
  states: JsonObject[];
  fetchEvents: JsonObject[];
  issues: string[];
  issueCount?: number;
} = {
  baseUrl,
  viewport: { width: 390, height: 844, isMobile: true },
  dbPath,
  itemIds: {
    full: fullItemId,
    weak: weakItemId,
    noRelated: noRelatedItemId,
  },
  states: [],
  fetchEvents: [],
  issues: [],
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} for the A3 browser proof.`);
  return value;
}

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
  await client.Page.navigate({ url: baseUrl + route });
  await wait(900);
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

async function clickBySelector(client: CdpClient, selector: string) {
  await evaluate(
    client,
    (targetSelector) => {
      const element = document.querySelector(String(targetSelector)) as HTMLElement | null;
      if (!element) throw new Error(`Could not find clickable selector: ${targetSelector}`);
      element.scrollIntoView({ block: "center", inline: "center" });
      element.click();
    },
    selector,
  );
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
  await wait(300);
}

async function sendDisabledState(client: CdpClient) {
  return evaluate<{ disabled: boolean; ariaDisabled: string | null; hasText: boolean }>(
    client,
    () => {
      const send = document.querySelector('button[aria-label="Send"]') as HTMLButtonElement | null;
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
      if (!send) throw new Error("Send button not found.");
      return {
        disabled: send.disabled,
        ariaDisabled: send.getAttribute("aria-disabled"),
        hasText: Boolean(textarea?.value.trim()),
      };
    },
  );
}

async function enableAskProviderError(client: CdpClient) {
  client.Fetch.requestPaused((params: JsonObject) => {
    const request = params.request as { url?: string } | undefined;
    const requestId = String(params.requestId);
    report.fetchEvents.push({
      url: request?.url ?? null,
      interceptedAsk: Boolean(request?.url?.includes("/api/ask")),
    });
    if (!request?.url?.includes("/api/ask")) {
      void client.Fetch.continueRequest({ requestId }).catch(() => undefined);
      return;
    }
    const body =
      'data: {"type":"error","code":"LLM_PROVIDER_OFFLINE","message":"The Ask AI provider is not reachable right now. Check AI services in Settings."}\n\n';
    void client.Fetch.fulfillRequest({
      requestId,
      responseCode: 503,
      responseHeaders: [
        { name: "content-type", value: "text/event-stream; charset=utf-8" },
        { name: "cache-control", value: "no-cache, no-transform" },
      ],
      body: Buffer.from(body).toString("base64"),
    }).catch(() => undefined);
  });
  await client.Fetch.enable({
    patterns: [{ urlPattern: "*", requestStage: "Request" }],
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
        bodyTextSample: text.slice(0, 1400),
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

async function assertSendState(
  client: CdpClient,
  name: string,
  expectedDisabled: boolean,
) {
  const state = await sendDisabledState(client);
  report.states.push({
    name: `${name}-send-state`,
    metrics: state,
  });
  if (state.disabled !== expectedDisabled) {
    report.issues.push(
      `${name}: expected Send disabled=${expectedDisabled}, got ${state.disabled}`,
    );
  }
  if (String(state.ariaDisabled) !== String(expectedDisabled)) {
    report.issues.push(
      `${name}: expected aria-disabled=${expectedDisabled}, got ${state.ariaDisabled}`,
    );
  }
}

async function run(client: CdpClient) {
  await captureState(client, "390x844-ask-empty-disabled", "/ask", [
    "ALL SOURCES",
    "Ask a question across all saved sources.",
  ]);
  await assertSendState(client, "390x844-ask-empty-disabled", true);

  await navigate(client, `/ask?scope=selected&ids=${fullItemId}`);
  await fillField(
    client,
    'textarea[placeholder="Ask anything about your library..."]',
    "What does A3 prove?",
  );
  await captureState(client, "390x844-ask-text-enabled", null, [
    "SELECTED",
    "A3 full item with digest and related",
  ]);
  await assertSendState(client, "390x844-ask-text-enabled", false);

  await enableAskProviderError(client);
  await clickBySelector(client, 'button[aria-label="Send"]');
  try {
    await waitForText(client, "AI SERVICES UNAVAILABLE");
  } catch (err) {
    await captureState(client, "390x844-ask-provider-error-timeout", null, []);
    const visibleText = await evaluate(
      client,
      () => (document.body.innerText || "").slice(0, 1600),
    );
    throw new Error(
      `${(err as Error).message}; visibleText=${JSON.stringify(visibleText)}; fetchEvents=${JSON.stringify(report.fetchEvents)}`,
    );
  }
  await captureState(client, "390x844-ask-provider-error", null, [
    "AI SERVICES UNAVAILABLE",
    "Check AI services in Settings",
  ]);
  await client.Fetch.disable();

  await captureState(client, "390x844-item-ask-scoped", `/items/${fullItemId}/ask`, [
    "THIS ITEM",
    "A3 full item with digest and related",
  ]);

  await captureState(client, "390x844-item-original-tab", `/items/${fullItemId}`, [
    "Original",
    "A3 full item with digest and related",
    "Semantic indexing ready",
    "Focus",
    "Ask",
    "Export",
  ]);
  await captureState(client, "390x844-item-digest-tab", `/items/${fullItemId}?tab=digest`, [
    "Digest",
    "SUMMARY",
    "KEY QUOTES",
    "Android users need a compact composer",
  ]);
  await captureState(client, "390x844-item-ask-tab", `/items/${fullItemId}?tab=ask`, [
    "Ask this item",
    "Ask questions using this saved source",
    "Open scoped Ask",
  ]);
  await captureState(client, "390x844-item-related-tab", `/items/${fullItemId}?tab=related`, [
    "Related",
    "A3 related mobile companion source",
  ]);
  await captureState(client, "390x844-item-details-tab", `/items/${fullItemId}?tab=details`, [
    "Details",
    "A3 Mobile QA",
    "a3-mobile-qa",
    "A3 Mobile QA Collection",
  ]);
  await captureState(client, "390x844-item-weak-original-tab", `/items/${weakItemId}`, [
    "Needs transcript",
    "Add text",
  ]);
  await captureState(
    client,
    "390x844-item-related-empty-tab",
    `/items/${noRelatedItemId}?tab=related`,
    ["No related sources yet."],
  );
  await captureState(client, "390x844-item-focus-mode", `/items/${fullItemId}?mode=focus`, [
    "Exit focus",
    "A3 full item with digest and related",
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

    await run(client);
  } finally {
    await client.Browser?.close().catch(() => undefined);
    await client.close().catch(() => undefined);
  }

  report.issueCount = report.issues.length;
  const reportPath = path.join(
    outDir,
    "android-a3-ask-item-detail-browser-report.json",
  );
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        reportPath,
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
