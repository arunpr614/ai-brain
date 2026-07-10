import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

type Scenario = "ok" | "unauthorized" | "forbidden" | "timeout" | "network";

interface Issue {
  scenario: string;
  message: string;
}

const html = fs.readFileSync(path.join(process.cwd(), "public/offline.html"), "utf8");
const issues: Issue[] = [];

const scenarios: Record<Scenario, { status?: number; expectedText: string }> = {
  ok: { status: 200, expectedText: "Connected" },
  unauthorized: { status: 401, expectedText: "AI Memory is running but not paired" },
  forbidden: { status: 403, expectedText: "AI Memory rejected the origin" },
  timeout: { expectedText: "did not respond within 2 s" },
  network: { expectedText: "Cannot reach AI Memory" },
};

const origins = [
  "https://brain.arunp.in",
  "https://localhost",
  "http://localhost",
];

function record(condition: boolean, scenario: string, message: string): void {
  if (!condition) issues.push({ scenario, message });
}

function wait(ms = 25): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadOfflinePage(origin: string, scenario: Scenario) {
  const fetchCalls: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    const message = error.message || "";
    if (!message.includes("navigation")) {
      issues.push({ scenario: `${origin}:${scenario}`, message });
    }
  });

  const dom = new JSDOM(html, {
    url: `${origin}/offline.html`,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.fetch = (async (input: string | URL | Request) => {
        fetchCalls.push(String(input));
        if (scenario === "timeout") {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        }
        if (scenario === "network") {
          throw new TypeError("network down");
        }
        return { status: scenarios[scenario].status } as Response;
      }) as typeof fetch;
    },
  });

  await wait();
  return { dom, fetchCalls };
}

async function main(): Promise<void> {
  for (const origin of origins) {
    const { dom, fetchCalls } = await loadOfflinePage(origin, "forbidden");
    const expectedOrigin =
      origin === "https://localhost" || origin === "http://localhost"
        ? "https://brain.arunp.in"
        : origin;
    const libraryHref = dom.window.document.getElementById("library")?.getAttribute("href");
    const pairHref = dom.window.document.getElementById("pair")?.getAttribute("href");
    record(
      libraryHref === `${expectedOrigin}/`,
      `${origin}:links`,
      `Expected Library href ${expectedOrigin}/ but got ${libraryHref}`,
    );
    record(
      pairHref === `${expectedOrigin}/setup-apk`,
      `${origin}:links`,
      `Expected Pair href ${expectedOrigin}/setup-apk but got ${pairHref}`,
    );
    record(
      fetchCalls[0] === `${expectedOrigin}/api/health`,
      `${origin}:fetch`,
      `Expected fetch to ${expectedOrigin}/api/health but got ${fetchCalls[0]}`,
    );
    dom.window.close();
  }

  for (const scenario of Object.keys(scenarios) as Scenario[]) {
    const { dom } = await loadOfflinePage("https://brain.arunp.in", scenario);
    const statusText = dom.window.document.getElementById("status")?.textContent ?? "";
    record(
      statusText.includes(scenarios[scenario].expectedText),
      scenario,
      `Expected status to include "${scenarios[scenario].expectedText}" but got "${statusText.trim()}"`,
    );
    dom.window.close();
  }

  const pageText = html.replace(/\s+/g, " ");
  for (const forbidden of [
    /offline item/i,
    /read offline/i,
    /available offline/i,
    /offline sync/i,
    /offline capture queue/i,
    /your Brain/i,
  ]) {
    record(
      !forbidden.test(pageText),
      "offline-copy",
      `Forbidden offline fallback copy matched ${forbidden}`,
    );
  }

  const report = {
    origins,
    scenarios: Object.keys(scenarios),
    issueCount: issues.length,
    issues,
  };

  console.log(JSON.stringify(report, null, 2));

  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

void main();
