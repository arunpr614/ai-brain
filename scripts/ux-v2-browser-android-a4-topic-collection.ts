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
  Network: {
    enable: () => Promise<void>;
    setCookie: (params: JsonObject) => Promise<void>;
  };
  Page: {
    enable: () => Promise<void>;
    navigate: (params: JsonObject) => Promise<void>;
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

const baseUrl = process.env.A4_BASE_URL ?? "http://127.0.0.1:3027";
const cdpUrl = new URL(process.env.A4_CDP_URL ?? "http://127.0.0.1:9333");
const cdpPort = Number(cdpUrl.port || "9333");
const outDir =
  process.env.A4_BROWSER_OUT_DIR ??
  path.join(
    process.cwd(),
    "UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a4-topic-collection",
  );
const dbPath = process.env.BRAIN_DB_PATH ?? "/tmp/ai-memory-android-a4-topic-collection.sqlite";

const topicSlug = requiredEnv("A4_TOPIC_SLUG");
const emptyTopicSlug = requiredEnv("A4_EMPTY_TOPIC_SLUG");
const collectionId = requiredEnv("A4_COLLECTION_ID");
const emptyCollectionId = requiredEnv("A4_EMPTY_COLLECTION_ID");

const forbiddenCopy = [
  /create tag/i,
  /create collection/i,
  /add items/i,
  /add to collection/i,
  /sheet/i,
  /offline queue/i,
  /available offline/i,
  /offline sync/i,
  /read offline/i,
  /AI Brain/,
  /Your Brain/,
  /scan QR/i,
  /QR pairing/i,
  /biometric/i,
  /package migration/i,
  /telemetry/i,
  /E2EE/i,
  /delete all data/i,
  /embedded player/i,
];

const mutationControl = /\b(add items?|create tag|create collection|new tag|new collection|open sheet)\b/i;

const report: {
  baseUrl: string;
  viewport: { width: number; height: number; isMobile: true };
  dbPath: string;
  routes: Record<string, string>;
  states: JsonObject[];
  issues: string[];
  issueCount?: number;
} = {
  baseUrl,
  viewport: { width: 390, height: 844, isMobile: true },
  dbPath,
  routes: {
    topic: `/topics/${topicSlug}`,
    emptyTopic: `/topics/${emptyTopicSlug}`,
    topicAsk: `/ask?scope=topic&topic=${topicSlug}`,
    collection: `/collections/${collectionId}`,
    emptyCollection: `/collections/${emptyCollectionId}`,
    collectionAsk: `/ask?scope=collection&collection=${collectionId}`,
  },
  states: [],
  issues: [],
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} for the A4 browser proof.`);
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

async function captureState(
  client: CdpClient,
  name: string,
  route: string,
  expectedTexts: string[],
  opts: { checkMutationControls?: boolean } = {},
) {
  await navigate(client, route);

  const screenshot = path.join(outDir, `${name}.png`);
  const png = await client.Page.captureScreenshot({
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await fs.writeFile(screenshot, Buffer.from(png.data, "base64"));

  const metrics = await evaluate(
    client,
    (forbiddenSources, mutationSource, expected, checkMutationControls) => {
      const forbidden = (forbiddenSources as { source: string; flags: string }[]).map(
        (source) => new RegExp(source.source, source.flags),
      );
      const mutationPattern = new RegExp(
        (mutationSource as { source: string; flags: string }).source,
        (mutationSource as { source: string; flags: string }).flags,
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
          const label = (
            (el as HTMLElement).innerText ||
            el.getAttribute("aria-label") ||
            el.getAttribute("placeholder") ||
            ""
          )
            .replace(/\s+/g, " ")
            .trim();
          return {
            tag: el.tagName.toLowerCase(),
            text: label.slice(0, 100),
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

      const clippedControls = visibleControls
        .filter(
          (entry) =>
            !entry.inFixedNav &&
            entry.bottom > window.innerHeight - 4 &&
            entry.top < window.innerHeight,
        )
        .map(({ inFixedNav: _inFixedNav, visible: _visible, ...entry }) => entry);

      const mutationControls = checkMutationControls
        ? visibleControls
            .filter((entry) => mutationPattern.test(entry.text))
            .map(({ inFixedNav: _inFixedNav, visible: _visible, ...entry }) => entry)
        : [];

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
        clippedControls,
        mutationControls,
      };
    },
    forbiddenCopy.map((pattern) => ({
      source: pattern.source,
      flags: pattern.flags,
    })),
    { source: mutationControl.source, flags: mutationControl.flags },
    expectedTexts,
    Boolean(opts.checkMutationControls),
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
  if (Array.isArray(metrics.clippedControls) && metrics.clippedControls.length > 0) {
    report.issues.push(
      `${name}: clipped controls ${JSON.stringify(metrics.clippedControls)}`,
    );
  }
  if (Array.isArray(metrics.mutationControls) && metrics.mutationControls.length > 0) {
    report.issues.push(
      `${name}: unsupported mutation controls ${JSON.stringify(metrics.mutationControls)}`,
    );
  }
}

async function run(client: CdpClient) {
  await captureState(
    client,
    "390x844-topic-populated",
    `/topics/${topicSlug}`,
    [
      "INCLUDED TOPIC",
      "A4 Mobile QA Topic",
      "2 sources matched by AI.",
      "1 readable",
      "1 need upgrade",
      "Ask topic",
      "A4 topic collection full source",
      "A4 weak source in scope",
    ],
    { checkMutationControls: true },
  );
  await captureState(
    client,
    "390x844-topic-empty",
    `/topics/${emptyTopicSlug}`,
    ["A4 Empty Topic", "No sources currently include this topic."],
    { checkMutationControls: true },
  );
  await captureState(
    client,
    "390x844-topic-ask-scope",
    `/ask?scope=topic&topic=${topicSlug}`,
    [
      "TOPIC",
      "the A4 Mobile QA Topic topic",
      "2 sources",
      "A4 topic collection full source",
    ],
  );
  await captureState(
    client,
    "390x844-collection-populated",
    `/collections/${collectionId}`,
    [
      "A4 Mobile QA Collection",
      "2 items",
      "1 readable",
      "1 need upgrade",
      "Ask collection",
      "A4 topic collection full source",
      "A4 weak source in scope",
    ],
    { checkMutationControls: true },
  );
  await captureState(
    client,
    "390x844-collection-empty",
    `/collections/${emptyCollectionId}`,
    ["A4 Empty Collection", "No items in this collection yet."],
    { checkMutationControls: true },
  );
  await captureState(
    client,
    "390x844-collection-ask-scope",
    `/ask?scope=collection&collection=${collectionId}`,
    [
      "COLLECTION",
      "the A4 Mobile QA Collection collection",
      "2 sources",
      "A4 topic collection full source",
    ],
  );
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
    "android-a4-topic-collection-browser-report.json",
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
