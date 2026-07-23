import crypto from "node:crypto";
import { isIP } from "node:net";
import type { ItemRow } from "@/db/client";
import {
  NOTEBOOKLM_PAYLOAD_MAX_BYTES,
  NOTEBOOKLM_PAYLOAD_MAX_WORDS,
} from "./contracts";

export type NotebookLmMappingFailure =
  | "empty_body"
  | "limited_confirmation_required"
  | "unsupported_capture"
  | "unsafe_source_url"
  | "payload_too_large";

export type NotebookLmMappingResult =
  | {
      ok: true;
      sourceKind: "url" | "copied_text";
      title: string;
      text: string;
      contentHash: string;
      bytes: number;
      words: number;
      limitedCapture: boolean;
      safeSourceUrl: string | null;
      warnings: string[];
    }
  | {
      ok: false;
      reason: NotebookLmMappingFailure;
      bytes?: number;
      words?: number;
      limitedCapture?: boolean;
    };

const WEAK_QUALITY = new Set(["metadata_only", "paywall_preview", "failed"]);
const WEAK_WARNINGS = new Set([
  "youtube_antibot_metadata_only",
  "youtube_transcript_fetch_metadata_only",
  "no_transcript",
]);
const SCHEMA_ONLY_TYPES = new Set(["podcast", "epub", "docx"]);
const PROVIDER_TITLE_LIMIT = 180;
const METRICS_MARKER = `AI-MEM-${"0".repeat(22)}`;

export function mapItemToNotebookLm(
  item: ItemRow,
  options: { confirmLimitedCapture?: boolean } = {},
): NotebookLmMappingResult {
  const title = normalizeTitle(item.title);
  const safeSourceUrl = exportableSourceUrl(item.source_url);
  if (item.source_url?.trim() && !safeSourceUrl) {
    return { ok: false, reason: "unsafe_source_url" };
  }
  if (safeSourceUrl) {
    const bytes = Buffer.byteLength(safeSourceUrl, "utf8");
    const words = countWords(safeSourceUrl);
    return {
      ok: true,
      sourceKind: "url",
      title,
      text: safeSourceUrl,
      contentHash: crypto
        .createHash("sha256")
        .update(`url\u0000${safeSourceUrl}`, "utf8")
        .digest("hex"),
      bytes,
      words,
      limitedCapture: false,
      safeSourceUrl,
      warnings: [],
    };
  }

  const normalizedBody = normalizeText(item.body);
  const body =
    item.capture_source === "recall"
      ? normalizeText(stripRecallProvenance(normalizedBody))
      : normalizedBody;
  if (!body) return { ok: false, reason: "empty_body" };

  const limitedCapture =
    WEAK_QUALITY.has(item.capture_quality ?? "") ||
    WEAK_WARNINGS.has(item.extraction_warning ?? "");
  if (limitedCapture && !options.confirmLimitedCapture) {
    return { ok: false, reason: "limited_confirmation_required", limitedCapture: true };
  }

  if (
    SCHEMA_ONLY_TYPES.has(item.source_type) &&
    !["full_text", "user_provided_full_text", "client_dom", "email_body", "transcript", "metadata_plus_transcript"].includes(
      item.capture_quality ?? "",
    )
  ) {
    return { ok: false, reason: "unsupported_capture", limitedCapture };
  }

  const warnings: string[] = [];
  const metadata: string[] = [];
  if (item.author?.trim()) metadata.push(`Author: ${normalizeInline(item.author)}`);
  if (item.published_at) {
    const published = new Date(item.published_at);
    if (Number.isFinite(published.getTime())) metadata.push(`Published: ${published.toISOString()}`);
    else warnings.push("published_date_omitted");
  }
  const text = [
    `# ${title}`,
    metadata.length ? metadata.join("\n") : null,
    body,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
  const displayTitle = providerTitle(title, METRICS_MARKER);
  if (!displayTitle.startsWith(`${title} · `)) warnings.push("provider_title_shortened");
  const bytes = Buffer.byteLength(`${displayTitle}\n${text}`, "utf8");
  const words = countWords(`${displayTitle}\n${text}`);
  if (bytes > NOTEBOOKLM_PAYLOAD_MAX_BYTES || words > NOTEBOOKLM_PAYLOAD_MAX_WORDS) {
    return { ok: false, reason: "payload_too_large", bytes, words, limitedCapture };
  }

  return {
    ok: true,
    sourceKind: "copied_text",
    title,
    text,
    contentHash: crypto.createHash("sha256").update(`${title}\n\u0000${text}`, "utf8").digest("hex"),
    bytes,
    words,
    limitedCapture,
    safeSourceUrl,
    warnings,
  };
}

export function exportableSourceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (
      url.username ||
      url.password ||
      url.hash ||
      url.href.length > 4_096 ||
      [...url.searchParams.keys()].some((key) =>
        /^(?:access_?token|api_?key|auth|code|credential|key|password|secret|sig|signature|token)$/i.test(
          key,
        ),
      )
    ) {
      return null;
    }
    const hostname = url.hostname.toLowerCase();
    if (hostname.endsWith(".")) return null;
    const unbracketedHostname = hostname.replace(/^\[|\]$/g, "");
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".example") ||
      hostname.endsWith(".onion") ||
      hostname.endsWith(".i2p") ||
      (!hostname.includes(".") && isIP(unbracketedHostname) === 0) ||
      isNonPublicIp(hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function stripRecallProvenance(value: string): string {
  if (!value.startsWith("Imported from Recall\n")) return value;
  const boundary = value.indexOf("\n\n---\n\n");
  if (boundary < 0) return "";
  const header = value.slice(0, boundary).split("\n");
  const expectedPrefixes = [
    "Imported from Recall",
    "Recall card id: ",
    "Recall created_at: ",
    "Original source: ",
    "Content fidelity: ",
    "Imported at: ",
  ];
  if (
    header.length !== expectedPrefixes.length ||
    header.some((line, index) =>
      index === 0 ? line !== expectedPrefixes[index] : !line.startsWith(expectedPrefixes[index]),
    )
  ) {
    return "";
  }
  return value.slice(boundary + "\n\n---\n\n".length);
}

export function providerTitle(title: string, marker: string): string {
  const suffix = ` · ${marker}`;
  const available = Math.max(1, PROVIDER_TITLE_LIMIT - suffix.length);
  return `${truncateUtf16Safe(title, available).trimEnd()}${suffix}`;
}

export function publicQuerylessUrl(
  raw: string | null | undefined,
  verifiedPublic = false,
): string | null {
  if (!raw || !verifiedPublic) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    const hostname = url.hostname.toLowerCase();
    if (hostname.endsWith(".")) return null;
    const unbracketedHostname = hostname.replace(/^\[|\]$/g, "");
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".example") ||
      hostname.endsWith(".onion") ||
      hostname.endsWith(".i2p") ||
      (!hostname.includes(".") && isIP(unbracketedHostname) === 0) ||
      isNonPublicIp(hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTitle(value: string): string {
  return normalizeInline(value) || "Untitled AI Memory item";
}

function truncateUtf16Safe(value: string, maxCodeUnits: number): string {
  let result = "";
  for (const character of value) {
    if (result.length + character.length > maxCodeUnits) break;
    result += character;
  }
  return result;
}

function normalizeInline(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""))
    .join("\n")
    .trim();
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function isNonPublicIp(hostname: string): boolean {
  const unbracketed = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(unbracketed) === 6) {
    const words = ipv6Words(unbracketed);
    if (!words) return true;
    const allZero = words.every((word) => word === 0);
    const loopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
    const ipv4Compatible = words.slice(0, 6).every((word) => word === 0);
    const ipv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
    const ipv4Translated =
      words.slice(0, 4).every((word) => word === 0) &&
      words[4] === 0xffff &&
      words[5] === 0;
    const nat64WellKnown =
      words[0] === 0x0064 && words[1] === 0xff9b && words.slice(2, 6).every((word) => word === 0);
    const nat64LocalUse = words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 1;
    const uniqueLocal = (words[0] & 0xfe00) === 0xfc00;
    const linkLocal = (words[0] & 0xffc0) === 0xfe80;
    const deprecatedSiteLocal = (words[0] & 0xffc0) === 0xfec0;
    const multicast = (words[0] & 0xff00) === 0xff00;
    const documentation = words[0] === 0x2001 && words[1] === 0x0db8;
    const special2001 =
      words[0] === 0x2001 &&
      (words[1] === 0 || (words[1] & 0xfff0) === 0x0010 || (words[1] & 0xfff0) === 0x0020);
    if (
      allZero ||
      loopback ||
      ipv4Compatible ||
      ipv4Mapped ||
      ipv4Translated ||
      nat64WellKnown ||
      nat64LocalUse ||
      uniqueLocal ||
      linkLocal ||
      deprecatedSiteLocal ||
      multicast ||
      documentation ||
      special2001
    ) {
      return true;
    }
    if (words[0] === 0x2002) {
      return isNonPublicIpv4(
        `${words[1] >> 8}.${words[1] & 0xff}.${words[2] >> 8}.${words[2] & 0xff}`,
      );
    }
    return false;
  }
  if (isIP(unbracketed) !== 4) return false;
  return isNonPublicIpv4(unbracketed);
}

function ipv6Words(value: string): number[] | null {
  const pieces = value.split("::");
  if (pieces.length > 2) return null;
  const left = pieces[0] ? pieces[0].split(":") : [];
  const right = pieces.length === 2 && pieces[1] ? pieces[1].split(":") : [];
  const parse = (entries: string[]): number[] | null => {
    const result: number[] = [];
    for (const entry of entries) {
      if (!/^[a-f0-9]{1,4}$/.test(entry)) return null;
      result.push(Number.parseInt(entry, 16));
    }
    return result;
  };
  const leftWords = parse(left);
  const rightWords = parse(right);
  if (!leftWords || !rightWords) return null;
  const missing = 8 - leftWords.length - rightWords.length;
  if (missing < 0 || (pieces.length === 1 && missing !== 0) || (pieces.length === 2 && missing < 1)) {
    return null;
  }
  return [...leftWords, ...Array.from({ length: missing }, () => 0), ...rightWords];
}

function isNonPublicIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
    (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
    (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
    parts[0] >= 224
  );
}
