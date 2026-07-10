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
  Network: {
    clearBrowserCookies: () => Promise<void>;
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

const scenario = process.env.A5_BROWSER_SCENARIO ?? "paired";
const baseUrl = process.env.A5_BASE_URL ?? "http://127.0.0.1:3027";
const cdpUrl = new URL(process.env.A5_CDP_URL ?? "http://127.0.0.1:9333");
const cdpPort = Number(cdpUrl.port || "9333");
const outDir =
  process.env.A5_BROWSER_OUT_DIR ??
  path.join(
    process.cwd(),
    "UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/android-a5-login-pairing",
  );
const manifestPath = process.env.A5_SEED_MANIFEST;

if (!["empty", "paired"].includes(scenario)) {
  throw new Error("A5_BROWSER_SCENARIO must be empty or paired.");
}

interface SeedManifest {
  auth?: {
    sessionCookieName?: string;
    sessionToken?: string;
  };
  pairingCodes?: {
    expired?: { code?: string };
    used?: { code?: string };
    valid?: { code?: string };
  };
}

const forbiddenCopy = [
  /AI Brain/,
  /Your Brain/,
  /scan QR/i,
  /QR pairing/i,
  /QR code/i,
  /biometric/i,
  /fingerprint/i,
  /Face ID/i,
  /offline sync/i,
  /available offline/i,
  /read offline/i,
  /package migration/i,
  /telemetry/i,
  /E2EE/i,
  /SSH into/i,
  /\/opt\/brain/i,
  /brain\.service/i,
  /brain\.sqlite/i,
];

const report: {
  scenario: string;
  baseUrl: string;
  viewport: { width: number; height: number; isMobile: true };
  states: JsonObject[];
  fetchEvents: JsonObject[];
  observations: string[];
  issues: string[];
  sessionCookieInjected?: boolean;
  issueCount?: number;
} = {
  scenario,
  baseUrl,
  viewport: { width: 390, height: 844, isMobile: true },
  states: [],
  fetchEvents: [],
  observations: [],
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

async function clickButtonByText(client: CdpClient, text: string) {
  await evaluate(
    client,
    (buttonText) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const element = buttons.find((button) =>
        (button.innerText || "").includes(String(buttonText)),
      );
      if (!element) throw new Error(`Could not find button text: ${buttonText}`);
      element.scrollIntoView({ block: "center", inline: "center" });
      element.click();
    },
    text,
  );
  await wait(700);
}

interface PrimaryControlCheck {
  selector: string;
  label: string;
  minHeight?: number;
  minWidth?: number;
  inputMode?: string;
  autoComplete?: string;
  disabled?: boolean;
}

async function captureState(
  client: CdpClient,
  name: string,
  expectedTexts: string[],
  controls: PrimaryControlCheck[] = [],
) {
  const screenshot = path.join(outDir, `${scenario}-${name}.png`);
  const png = await client.Page.captureScreenshot({
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await fs.writeFile(screenshot, Buffer.from(png.data, "base64"));

  const metrics = await evaluate(
    client,
    (forbiddenSources, expected, controlChecks) => {
      const forbidden = (forbiddenSources as { source: string; flags: string }[]).map(
        (source) => new RegExp(source.source, source.flags),
      );
      const expectedList = expected as string[];
      const checks = controlChecks as PrimaryControlCheck[];
      const text = document.body.innerText || "";
      const doc = document.documentElement;
      const controlResults = checks.map((check) => {
        const element = document.querySelector(check.selector) as HTMLElement | null;
        if (!element) return { ...check, found: false };
        const rect = element.getBoundingClientRect();
        const input = element instanceof HTMLInputElement ? element : null;
        const button = element instanceof HTMLButtonElement ? element : null;
        return {
          selector: check.selector,
          label: check.label,
          minHeight: check.minHeight,
          minWidth: check.minWidth,
          expectedInputMode: check.inputMode,
          expectedAutoComplete: check.autoComplete,
          expectedDisabled: check.disabled,
          found: true,
          height: Math.round(rect.height),
          width: Math.round(rect.width),
          disabled: button?.disabled ?? input?.disabled ?? false,
          inputMode: input?.inputMode ?? null,
          autoComplete: input?.autocomplete ?? null,
          ariaInvalid: element.getAttribute("aria-invalid"),
        };
      });
      const visibleControls = Array.from(
        document.querySelectorAll("a,button,input,textarea,[role='button']"),
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
      const smallControls = visibleControls
        .filter(
          (entry) =>
            !entry.inFixedNav &&
            (entry.width < 32 || entry.height < 32) &&
            entry.text.length > 0,
        )
        .map(({ inFixedNav: _inFixedNav, visible: _visible, ...entry }) => entry);

      return {
        title: document.title,
        url: location.pathname + location.search,
        bodyTextSample: text.slice(0, 1600),
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
        smallControls,
        controlResults,
      };
    },
    forbiddenCopy.map((pattern) => ({
      source: pattern.source,
      flags: pattern.flags,
    })),
    expectedTexts,
    controls,
  );

  const redactedMetrics = redactMetrics(metrics);
  report.states.push({ name, screenshot, metrics: redactedMetrics });

  if (redactedMetrics.horizontalOverflow) {
    report.issues.push(
      `${name}: horizontal overflow ${redactedMetrics.scrollWidth}/${redactedMetrics.clientWidth}`,
    );
  }
  if (
    Array.isArray(redactedMetrics.forbiddenMatches) &&
    redactedMetrics.forbiddenMatches.length > 0
  ) {
    report.issues.push(
      `${name}: forbidden copy ${JSON.stringify(redactedMetrics.forbiddenMatches)}`,
    );
  }
  if (
    Array.isArray(redactedMetrics.expectedMissing) &&
    redactedMetrics.expectedMissing.length > 0
  ) {
    report.issues.push(
      `${name}: missing expected text ${redactedMetrics.expectedMissing.join(", ")}`,
    );
  }
  if (
    Array.isArray(redactedMetrics.clippedControls) &&
    redactedMetrics.clippedControls.length > 0
  ) {
    report.issues.push(
      `${name}: clipped controls ${JSON.stringify(redactedMetrics.clippedControls)}`,
    );
  }

  const controlResults = redactedMetrics.controlResults as JsonObject[];
  for (const result of controlResults) {
    const label = String(result.label);
    if (!result.found) {
      report.issues.push(`${name}: missing primary control ${label}`);
      continue;
    }
    if (typeof result.minHeight === "number" && Number(result.height) < result.minHeight) {
      report.issues.push(`${name}: ${label} height ${result.height} < ${result.minHeight}`);
    }
    if (typeof result.minWidth === "number" && Number(result.width) < result.minWidth) {
      report.issues.push(`${name}: ${label} width ${result.width} < ${result.minWidth}`);
    }
    if (
      typeof result.inputMode === "string" &&
      typeof result.expectedInputMode === "string" &&
      result.inputMode !== result.expectedInputMode
    ) {
      report.issues.push(
        `${name}: ${label} inputMode ${result.inputMode} != ${result.expectedInputMode}`,
      );
    }
    if (
      typeof result.autoComplete === "string" &&
      typeof result.expectedAutoComplete === "string" &&
      result.autoComplete !== result.expectedAutoComplete
    ) {
      report.issues.push(
        `${name}: ${label} autocomplete ${result.autoComplete} != ${result.expectedAutoComplete}`,
      );
    }
    if (
      typeof result.expectedDisabled === "boolean" &&
      result.disabled !== result.expectedDisabled
    ) {
      report.issues.push(
        `${name}: ${label} disabled ${result.disabled} != ${result.expectedDisabled}`,
      );
    }
  }

  if (
    Array.isArray(redactedMetrics.smallControls) &&
    redactedMetrics.smallControls.length > 0
  ) {
    report.observations.push(
      `${name}: non-primary sub-32px controls ${JSON.stringify(redactedMetrics.smallControls)}`,
    );
  }
}

function redactMetrics(metrics: JsonObject): JsonObject {
  const copy = JSON.parse(JSON.stringify(metrics)) as JsonObject;
  if (typeof copy.bodyTextSample === "string") {
    copy.bodyTextSample = redact(copy.bodyTextSample);
  }
  if (Array.isArray(copy.forbiddenMatches)) {
    copy.forbiddenMatches = copy.forbiddenMatches.map((match) =>
      typeof match === "object" && match !== null
        ? JSON.parse(redact(JSON.stringify(match)))
        : match,
    );
  }
  return JSON.parse(redact(JSON.stringify(copy))) as JsonObject;
}

function redact(value: string): string {
  return value
    .replace(/\b[A-Z2-9]{4}-[A-Z2-9]{4}\b/g, "[pairing-code]")
    .replace(/\b\d{13}\.[a-f0-9]{64}\b/g, "[session-token]")
    .replace(/\b[a-f0-9]{64,}\b/g, "[hex-secret]");
}

function readManifest(): SeedManifest {
  if (!manifestPath) throw new Error("Set A5_SEED_MANIFEST for paired scenario.");
  return JSON.parse(require("node:fs").readFileSync(manifestPath, "utf8")) as SeedManifest;
}

function requireManifestValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${label} in A5 seed manifest.`);
  }
  return value;
}

async function installReachabilityFailure(client: CdpClient) {
  client.Fetch.requestPaused((params: JsonObject) => {
    const request = params.request as { url?: string } | undefined;
    const requestId = String(params.requestId);
    const url = request?.url ?? "";
    if (url === "https://brain.arunp.in/api/health") {
      report.fetchEvents.push({ label: "reachability_health_probe", status: 401 });
      void client.Fetch.fulfillRequest({
        requestId,
        responseCode: 401,
        responseHeaders: [
          { name: "content-type", value: "application/json" },
          { name: "access-control-allow-origin", value: "*" },
        ],
        body: Buffer.from(JSON.stringify({ ok: false })).toString("base64"),
      });
      return;
    }
    void client.Fetch.continueRequest({ requestId });
  });
  await client.Fetch.enable({
    patterns: [{ urlPattern: "*", requestStage: "Request" }],
  });
}

async function runEmptyScenario(client: CdpClient) {
  await client.Network.clearBrowserCookies();
  await navigate(client, "/setup?next=/library");
  await captureState(
    client,
    "setup-first-run",
    ["Welcome to AI Memory", "Choose PIN", "Confirm PIN", "Create PIN"],
    [
      {
        selector: "#setup-pin",
        label: "setup PIN field",
        minHeight: 44,
        minWidth: 44,
        inputMode: "numeric",
        autoComplete: "new-password",
      },
      {
        selector: "#setup-confirm",
        label: "setup confirm field",
        minHeight: 44,
        minWidth: 44,
        inputMode: "numeric",
        autoComplete: "new-password",
      },
      {
        selector: "form button[type='submit']",
        label: "create PIN button",
        minHeight: 44,
        minWidth: 44,
      },
    ],
  );
  await fillField(client, "#setup-pin", "2468");
  await fillField(client, "#setup-confirm", "1357");
  await clickBySelector(client, "form button[type='submit']");
  await waitForText(client, "PINs don't match");
  await captureState(client, "setup-mismatch-error", ["PINs don't match"], [
    {
      selector: "#setup-pin",
      label: "setup PIN field after error",
      minHeight: 44,
      minWidth: 44,
      inputMode: "numeric",
      autoComplete: "new-password",
    },
    {
      selector: "#setup-confirm",
      label: "setup confirm field after error",
      minHeight: 44,
      minWidth: 44,
      inputMode: "numeric",
      autoComplete: "new-password",
    },
    {
      selector: "form button[type='submit']",
      label: "create PIN button after error",
      minHeight: 44,
      minWidth: 44,
    },
  ]);
}

async function runPairedScenario(client: CdpClient) {
  const manifest = readManifest();
  const sessionCookieName = manifest.auth?.sessionCookieName ?? "brain-session";
  const sessionToken = requireManifestValue(manifest.auth?.sessionToken, "auth.sessionToken");
  const expiredCode = requireManifestValue(
    manifest.pairingCodes?.expired?.code,
    "pairingCodes.expired.code",
  );
  const usedCode = requireManifestValue(
    manifest.pairingCodes?.used?.code,
    "pairingCodes.used.code",
  );
  await client.Network.clearBrowserCookies();
  await navigate(client, "/settings/device-pairing");
  await waitForText(client, "Unlock AI Memory");
  const redirectPath = await evaluate<string>(
    client,
    () => location.pathname + location.search,
  );
  const redirectUrl = new URL(redirectPath, baseUrl);
  if (
    redirectUrl.pathname !== "/unlock" ||
    redirectUrl.searchParams.get("next") !== "/settings/device-pairing"
  ) {
    report.issues.push(`unauthenticated redirect landed on ${redirectPath}`);
  }
  await captureState(client, "device-pairing-unauthenticated-redirect", [
    "Unlock AI Memory",
    "Enter your PIN to continue.",
  ]);

  await client.Network.setCookie({
    name: sessionCookieName,
    value: sessionToken,
    url: baseUrl,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
  report.sessionCookieInjected = true;

  await navigate(client, "/unlock?next=/library");
  await captureState(
    client,
    "unlock-normal",
    ["Unlock AI Memory", "PIN", "Unlock"],
    [
      {
        selector: "#unlock-pin",
        label: "unlock PIN field",
        minHeight: 44,
        minWidth: 44,
        inputMode: "numeric",
        autoComplete: "current-password",
      },
      {
        selector: "form button[type='submit']",
        label: "unlock button",
        minHeight: 44,
        minWidth: 44,
      },
    ],
  );

  await fillField(client, "#unlock-pin", "0000");
  await clickBySelector(client, "form button[type='submit']");
  await waitForText(client, "Incorrect PIN");
  await captureState(client, "unlock-wrong-pin", ["Incorrect PIN"], [
    {
      selector: "#unlock-pin",
      label: "unlock PIN field after error",
      minHeight: 44,
      minWidth: 44,
      inputMode: "numeric",
      autoComplete: "current-password",
    },
  ]);

  await navigate(client, "/unlock?next=/library&reason=session-expired");
  await captureState(client, "unlock-session-expired", [
    "Unlock AI Memory",
    "Session expired",
    "Unlock this device again to return to the page you requested.",
  ]);

  await navigate(client, "/settings/device-pairing");
  await captureState(client, "device-pairing-authenticated", [
    "Device pairing",
    "Add Android device",
    "Show advanced token setup",
  ]);
  await clickButtonByText(client, "Add Android device");
  await waitForText(client, "Pairing code");
  const generatedCode = await evaluate<string>(client, () => {
    const text = document.body.innerText || "";
    const match = text.match(/\b[A-Z2-9]{4}-[A-Z2-9]{4}\b/);
    if (!match) throw new Error("Generated pairing code was not visible.");
    return match[0];
  });
  await captureState(client, "device-pairing-generated-code", [
    "Pairing code",
    "The code works once.",
  ]);

  await navigate(client, "/setup-apk");
  await captureState(
    client,
    "setup-apk-entry",
    ["Pair AI Memory", "Pairing code", "Pair device"],
    [
      {
        selector: "#pairing-code",
        label: "pairing code field",
        minHeight: 44,
        minWidth: 44,
        autoComplete: "one-time-code",
      },
      {
        selector: "form button[type='submit']",
        label: "pair device disabled button",
        minHeight: 44,
        minWidth: 44,
        disabled: true,
      },
    ],
  );

  await submitPairingCode(client, "BAD-CODE", "invalid-code", [
    "That code was not recognized. Check it and try again.",
  ]);
  await submitPairingCode(client, expiredCode, "expired-code", [
    "That code expired. Generate a fresh Android code from Device pairing in the web app.",
  ]);
  await submitPairingCode(client, usedCode, "used-code", [
    "That code was already used. Generate a fresh code.",
  ]);

  await installReachabilityFailure(client);
  await submitPairingCode(client, generatedCode, "accepted-unreachable", [
    "Paired, but server is not reachable",
    "The token is saved on this device.",
  ]);
  await client.Fetch.disable();
}

async function submitPairingCode(
  client: CdpClient,
  code: string,
  stateName: string,
  expectedTexts: string[],
) {
  await navigate(client, "/setup-apk");
  await fillField(client, "#pairing-code", code);
  await captureState(client, `${stateName}-ready`, ["Pair device"], [
    {
      selector: "#pairing-code",
      label: `${stateName} pairing code field`,
      minHeight: 44,
      minWidth: 44,
      autoComplete: "one-time-code",
    },
    {
      selector: "form button[type='submit']",
      label: `${stateName} pair button`,
      minHeight: 44,
      minWidth: 44,
      disabled: false,
    },
  ]);
  await clickBySelector(client, "form button[type='submit']");
  await waitForText(client, expectedTexts[0]);
  await captureState(client, stateName, expectedTexts);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const client = await CDP({ port: cdpPort });
  try {
    await client.DOM.enable();
    await client.Network.enable();
    await client.Page.enable();
    await client.Runtime.enable();
    await client.Emulation.setDeviceMetricsOverride({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await client.Emulation.setTouchEmulationEnabled({ enabled: true });

    if (scenario === "empty") {
      await runEmptyScenario(client);
    } else {
      await runPairedScenario(client);
    }

    report.issueCount = report.issues.length;
    const reportPath = path.join(outDir, `android-a5-login-pairing-${scenario}-browser-report.json`);
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ reportPath, issueCount: report.issueCount }, null, 2));
    if (report.issueCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
