export type DesktopShellTarget =
  | "library"
  | "processing"
  | "needs-upgrade"
  | "ask"
  | "capture"
  | "settings"
  | "pair-device"
  | null;

export type MobileShellTarget = "library" | "capture" | "ask" | "more";

function normalizePathname(pathname: string): string {
  const withoutHash = pathname.split("#", 1)[0] ?? "/";
  const withoutQuery = withoutHash.split("?", 1)[0] ?? "/";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, "")
    : "/";
}

function isPathOrChild(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function getDesktopShellTarget(pathname: string): DesktopShellTarget {
  const path = normalizePathname(pathname);

  if (path === "/" || path === "/library") return "library";
  if (isPathOrChild(path, "/processing")) return "processing";
  if (path.startsWith("/items/") && path.endsWith("/ask")) return "ask";
  if (path.startsWith("/items/")) return "library";
  if (path.startsWith("/topics/")) return "library";
  if (path.startsWith("/collections/")) return "library";
  if (path === "/search") return "library";
  if (isPathOrChild(path, "/needs-upgrade")) return "needs-upgrade";
  if (isPathOrChild(path, "/ask")) return "ask";
  if (isPathOrChild(path, "/capture")) return "capture";
  if (isPathOrChild(path, "/settings/device-pairing")) return "pair-device";
  if (isPathOrChild(path, "/settings")) return "settings";

  return null;
}

export function getMobileShellTarget(pathname: string): MobileShellTarget {
  const path = normalizePathname(pathname);

  if (path.startsWith("/items/") && path.endsWith("/ask")) return "ask";
  if (isPathOrChild(path, "/ask")) return "ask";
  if (isPathOrChild(path, "/capture")) return "capture";
  if (path === "/more" || path.startsWith("/more/")) return "more";
  if (isPathOrChild(path, "/processing")) return "more";
  if (isPathOrChild(path, "/settings")) return "more";

  return "library";
}

export function usesStandardMobileCapture(pathname: string): boolean {
  const target = getMobileShellTarget(pathname);
  return target === "ask" || target === "capture";
}
