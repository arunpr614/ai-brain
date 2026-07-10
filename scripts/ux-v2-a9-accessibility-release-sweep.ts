import fs from "node:fs/promises";
import path from "node:path";

type JsonObject = Record<string, unknown>;

interface CdpClient {
  DOM: {
    enable: () => Promise<void>;
  };
  Emulation: {
    setDeviceMetricsOverride: (params: JsonObject) => Promise<void>;
    setTouchEmulationEnabled: (params: JsonObject) => Promise<void>;
  };
  Input: {
    dispatchKeyEvent: (params: JsonObject) => Promise<void>;
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

const baseUrl = process.env.A9_BASE_URL ?? "http://127.0.0.1:3049";
const cdpUrl = new URL(process.env.A9_CDP_URL ?? "http://127.0.0.1:9349");
const cdpPort = Number(cdpUrl.port || "9349");
const outDir =
  process.env.A9_OUT_DIR ??
  path.join(
    process.cwd(),
    "UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/a11y/a9-final-sweep",
  );

const libraryManifestPath = process.env.A9_LIBRARY_MANIFEST;
const itemAskManifestPath = process.env.A9_ITEM_ASK_MANIFEST;
const captureManifestPath = process.env.A9_CAPTURE_MANIFEST;
const a5ManifestPath = process.env.A9_A5_MANIFEST;

interface RouteSpec {
  label: string;
  route: string;
  auth: boolean;
  expectedText?: string;
  keyboardRequired?: boolean;
  touchRequired?: boolean;
  reflowRequired?: boolean;
}

interface SeedManifest {
  routes?: Record<string, string>;
  itemIds?: Record<string, string>;
}

interface A5Manifest {
  auth?: {
    sessionCookieName?: string;
    sessionToken?: string;
  };
}

const report: {
  createdAt: string;
  baseUrl: string;
  viewportPlan: Record<string, JsonObject>;
  routes: JsonObject[];
  observations: string[];
  issues: string[];
  issueCount?: number;
} = {
  createdAt: new Date().toISOString(),
  baseUrl,
  viewportPlan: {
    mobileTouch: { width: 390, height: 844, mobile: true },
    desktopKeyboard: { width: 1280, height: 900, mobile: false },
    zoomProxy: { width: 720, height: 900, mobile: false },
  },
  routes: [],
  observations: [],
  issues: [],
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson<T>(file: string | undefined, label: string): T {
  if (!file) throw new Error(`Set ${label}.`);
  return JSON.parse(require("node:fs").readFileSync(file, "utf8")) as T;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

function redact(value: string): string {
  return value
    .replace(/\b[A-Z2-9]{4}-[A-Z2-9]{4}\b/g, "[pairing-code]")
    .replace(/\b\d{13}\.[a-f0-9]{64}\b/g, "[session-token]")
    .replace(/\b[a-f0-9]{64,}\b/g, "[hex-secret]")
    .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/g, "Bearer [redacted]");
}

function redactObject<T>(value: T): T {
  return JSON.parse(redact(JSON.stringify(value))) as T;
}

async function evaluate<T>(
  client: CdpClient,
  pageFunction: (...args: unknown[]) => T,
  ...args: unknown[]
) {
  const expression = `(() => { return (${pageFunction.toString()})(...${JSON.stringify(args)}); })()`;
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

async function setViewport(
  client: CdpClient,
  width: number,
  height: number,
  mobile: boolean,
) {
  await client.Emulation.setDeviceMetricsOverride({
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
  });
  await client.Emulation.setTouchEmulationEnabled({ enabled: mobile });
}

async function navigate(client: CdpClient, route: string) {
  await client.Page.navigate({ url: baseUrl + route });
  await wait(1_000);
}

async function installSession(client: CdpClient, manifest: A5Manifest) {
  const sessionCookieName = manifest.auth?.sessionCookieName ?? "brain-session";
  const sessionToken = requireString(manifest.auth?.sessionToken, "auth.sessionToken");
  await client.Network.setCookie({
    name: sessionCookieName,
    value: sessionToken,
    url: baseUrl,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
}

async function saveScreenshot(client: CdpClient, name: string) {
  const screenshotPath = path.join(outDir, `${name}.png`);
  const png = await client.Page.captureScreenshot({
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await fs.writeFile(screenshotPath, Buffer.from(png.data, "base64"));
  return screenshotPath;
}

async function dispatchTab(client: CdpClient) {
  const params = {
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  };
  await client.Input.dispatchKeyEvent({ type: "keyDown", ...params });
  await client.Input.dispatchKeyEvent({ type: "keyUp", ...params });
  await wait(120);
}

async function keyboardSweep(client: CdpClient, spec: RouteSpec) {
  await setViewport(client, 1280, 900, false);
  await navigate(client, spec.route);
  await evaluate(client, () => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
  });

  const entries: JsonObject[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 12; i += 1) {
    await dispatchTab(client);
    const entry = await evaluate<JsonObject>(client, () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return { tag: "none", label: "", isBody: false };
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        (el as HTMLInputElement).placeholder ||
        el.innerText ||
        el.textContent ||
        "";
      const outlineWidth = Number.parseFloat(style.outlineWidth || "0");
      const borderWidth = Number.parseFloat(style.borderWidth || "0");
      const matchesFocusVisible = el.matches(":focus-visible");
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        type: el.getAttribute("type"),
        href: el.getAttribute("href"),
        label: label.replace(/\s+/g, " ").trim().slice(0, 100),
        isBody: el === document.body,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        outlineStyle: style.outlineStyle,
        outlineWidth,
        boxShadow: style.boxShadow,
        borderStyle: style.borderStyle,
        borderWidth,
        matchesFocusVisible,
        focusVisible:
          (matchesFocusVisible && outlineWidth > 0) ||
          (style.outlineStyle !== "none" && outlineWidth > 0) ||
          style.boxShadow !== "none" ||
          (style.borderStyle !== "none" && borderWidth > 0),
      };
    });
    const key = JSON.stringify([entry.tag, entry.role, entry.type, entry.href, entry.label]);
    if (!seen.has(key)) {
      seen.add(key);
      entries.push(redactObject(entry));
    }
  }

  const meaningful = entries.filter((entry) => entry.isBody !== true);
  if (spec.keyboardRequired !== false && meaningful.length === 0) {
    report.issues.push(`${spec.label}: keyboard focus stayed on BODY/no meaningful control`);
  }

  for (const entry of meaningful) {
    const label = String(entry.label ?? "");
    const tag = String(entry.tag ?? "");
    const semanticInput = ["input", "textarea", "select"].includes(tag);
    if (!label && !semanticInput) {
      report.issues.push(`${spec.label}: focused ${tag} has no accessible label/text`);
    }
    if (entry.focusVisible !== true) {
      report.issues.push(`${spec.label}: focused ${tag} "${label}" has no visible focus style`);
    }
  }

  return entries;
}

async function touchSweep(client: CdpClient, spec: RouteSpec) {
  await setViewport(client, 390, 844, true);
  await navigate(client, spec.route);
  const screenshotPath = await saveScreenshot(client, `${spec.label}-mobile-touch`);
  const result = await evaluate<JsonObject>(client, () => {
    const controls = Array.from(
      document.querySelectorAll("a,button,input,textarea,select,[role='button'],[role='tab']"),
    ).map((el) => {
      const node = el as HTMLElement;
      const tag = node.tagName.toLowerCase();
      const inputType =
        node instanceof HTMLInputElement ? node.type.toLowerCase() : "";
      const labelTarget =
        tag === "input" && ["checkbox", "radio"].includes(inputType)
          ? node.closest("label")
          : null;
      const hitTarget = (labelTarget as HTMLElement | null) ?? node;
      const rect = hitTarget.getBoundingClientRect();
      const style = window.getComputedStyle(hitTarget);
      const nav = Boolean(node.closest("nav"));
      const role = node.getAttribute("role");
      const label =
        node.getAttribute("aria-label") ||
        labelTarget?.textContent ||
        node.getAttribute("title") ||
        (node as HTMLInputElement).placeholder ||
        node.innerText ||
        node.textContent ||
        "";
      const className = node.getAttribute("class") || "";
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth;
      const inlineLink =
        tag === "a" &&
        style.display === "inline" &&
        !nav &&
        role !== "button" &&
        !node.getAttribute("aria-label");
      const primary =
        tag !== "a" ||
        nav ||
        role === "button" ||
        role === "tab" ||
        node.getAttribute("aria-label") ||
        /(^|\s)(inline-flex|flex|block|grid)(\s|$)/.test(className);
      return {
        tag,
        role,
        label: label.replace(/\s+/g, " ").trim().slice(0, 100),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        visible,
        nav,
        inlineLink,
        primary,
      };
    });
    return {
      url: location.pathname + location.search,
      controls: controls.filter((entry) => entry.visible),
    };
  });

  const controls = (result.controls as JsonObject[]) ?? [];
  const failures = controls.filter(
    (entry) =>
      entry.primary === true &&
      entry.inlineLink !== true &&
      (Number(entry.width) < 44 || Number(entry.height) < 44),
  );
  const inlineObservations = controls.filter(
    (entry) =>
      entry.inlineLink === true &&
      (Number(entry.width) < 44 || Number(entry.height) < 44),
  );

  for (const failure of failures) {
    report.issues.push(
      `${spec.label}: touch target "${String(failure.label)}" ${failure.width}x${failure.height} below 44px`,
    );
  }
  if (inlineObservations.length > 0) {
    report.observations.push(
      `${spec.label}: inline links below 44px observed but not release blockers: ${JSON.stringify(
        redactObject(inlineObservations.slice(0, 6)),
      )}`,
    );
  }

  return {
    screenshotPath,
    controls: redactObject(controls),
    failures: redactObject(failures),
  };
}

async function reflowSweep(client: CdpClient, spec: RouteSpec) {
  await setViewport(client, 720, 900, false);
  await navigate(client, spec.route);
  const screenshotPath = await saveScreenshot(client, `${spec.label}-zoom-proxy`);
  const result = await evaluate<JsonObject>(client, () => {
    const doc = document.documentElement;
    const controls = Array.from(
      document.querySelectorAll("a,button,input,textarea,select,[role='button'],[role='tab']"),
    )
      .map((el) => {
        const node = el as HTMLElement;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const label =
          node.getAttribute("aria-label") ||
          node.getAttribute("title") ||
          (node as HTMLInputElement).placeholder ||
          node.innerText ||
          node.textContent ||
          "";
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth;
        const fixedNav = node.closest("nav");
        const fixedNavStyle = fixedNav ? window.getComputedStyle(fixedNav) : null;
        return {
          tag: node.tagName.toLowerCase(),
          role: node.getAttribute("role"),
          label: label.replace(/\s+/g, " ").trim().slice(0, 100),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          visible,
          inFixedNav: fixedNavStyle?.position === "fixed",
        };
      })
      .filter((entry) => entry.visible);
    const clipped = controls.filter(
      (entry) =>
        !entry.inFixedNav &&
        (entry.right > window.innerWidth + 1 ||
          entry.left < -1),
    );
    return {
      url: location.pathname + location.search,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      clippedControls: clipped,
      bodyTextSample: (document.body.innerText || "").slice(0, 800),
    };
  });

  if (result.horizontalOverflow === true) {
    report.issues.push(
      `${spec.label}: zoom proxy horizontal overflow ${result.scrollWidth}/${result.clientWidth}`,
    );
  }
  const clipped = (result.clippedControls as JsonObject[]) ?? [];
  if (clipped.length > 0) {
    report.issues.push(`${spec.label}: zoom proxy clipped controls ${JSON.stringify(clipped)}`);
  }

  return {
    screenshotPath,
    metrics: redactObject(result),
  };
}

function buildRoutes(
  libraryManifest: SeedManifest,
  itemAskManifest: SeedManifest,
  captureManifest: SeedManifest,
): RouteSpec[] {
  const libraryRoutes = libraryManifest.routes ?? {};
  const itemRoutes = itemAskManifest.routes ?? {};
  const captureRoutes = captureManifest.routes ?? {};
  return [
    {
      label: "unlock",
      route: "/unlock?next=/library",
      auth: false,
      expectedText: "Unlock AI Memory",
    },
    {
      label: "setup-apk",
      route: "/setup-apk",
      auth: false,
      expectedText: "Pair AI Memory",
    },
    {
      label: "offline",
      route: "/offline.html",
      auth: false,
      keyboardRequired: false,
      touchRequired: false,
      reflowRequired: true,
      expectedText: "AI Memory",
    },
    {
      label: "library",
      route: requireString(libraryRoutes.library, "library route"),
      auth: true,
    },
    {
      label: "ask",
      route: requireString(itemRoutes.askLibrary, "ask route"),
      auth: true,
    },
    {
      label: "capture",
      route: requireString(captureRoutes.captureNote, "capture route"),
      auth: true,
    },
    {
      label: "settings",
      route: requireString(captureRoutes.settings, "settings route"),
      auth: true,
    },
    {
      label: "device-pairing",
      route: requireString(captureRoutes.devicePairing, "device pairing route"),
      auth: true,
    },
    {
      label: "item-detail",
      route: requireString(itemRoutes.fullItem, "item detail route"),
      auth: true,
    },
    {
      label: "item-repair",
      route: requireString(itemRoutes.repairTarget, "item repair route"),
      auth: true,
    },
    {
      label: "needs-upgrade",
      route: requireString(captureRoutes.needsUpgrade, "needs upgrade route"),
      auth: true,
    },
  ];
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const libraryManifest = readJson<SeedManifest>(libraryManifestPath, "A9_LIBRARY_MANIFEST");
  const itemAskManifest = readJson<SeedManifest>(itemAskManifestPath, "A9_ITEM_ASK_MANIFEST");
  const captureManifest = readJson<SeedManifest>(captureManifestPath, "A9_CAPTURE_MANIFEST");
  const a5Manifest = readJson<A5Manifest>(a5ManifestPath, "A9_A5_MANIFEST");
  const routes = buildRoutes(libraryManifest, itemAskManifest, captureManifest);

  const client = await CDP({ port: cdpPort });
  try {
    await client.DOM.enable();
    await client.Network.enable();
    await client.Page.enable();
    await client.Runtime.enable();
    await client.Network.clearBrowserCookies();

    for (const spec of routes) {
      if (spec.auth) {
        await installSession(client, a5Manifest);
      } else {
        await client.Network.clearBrowserCookies();
      }

      const routeEvidence: JsonObject = {
        label: spec.label,
        route: spec.route,
        auth: spec.auth,
      };

      const keyboard = await keyboardSweep(client, spec);
      routeEvidence.keyboard = keyboard;

      if (spec.touchRequired !== false) {
        routeEvidence.touch = await touchSweep(client, spec);
      }

      if (spec.reflowRequired !== false) {
        routeEvidence.reflow = await reflowSweep(client, spec);
      }

      report.routes.push(routeEvidence);
    }

    report.issueCount = report.issues.length;
    const reportPath = path.join(outDir, "a9-accessibility-release-sweep-report.json");
    await fs.writeFile(reportPath, `${JSON.stringify(redactObject(report), null, 2)}\n`);
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
