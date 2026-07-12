import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import {
  deleteCaptureArtifactRowsForItem,
  insertCaptureArtifact,
  listCaptureArtifactsForItem,
} from "@/db/capture-artifacts";
import { newId, type CaptureArtifactRow } from "@/db/client";
import { brainDataPath } from "@/lib/data-root";
import type { CaptureArtifactCandidate } from "./types";

const KIND_CAPS: Record<string, number> = {
  youtube_oembed_json: 64 * 1024,
  youtube_data_api_json: 256 * 1024,
  youtube_timedtext_xml: 2 * 1024 * 1024,
  html_snapshot: 512 * 1024,
  metadata_json: 128 * 1024,
  rss_entry_json: 512 * 1024,
  user_text: 256 * 1024,
  user_provided_text: 256 * 1024,
  pre_upgrade_item_json: 256 * 1024,
};

const DEFAULT_CAP = 256 * 1024;

export interface SaveCaptureArtifactResult {
  kind: string;
  status: "saved" | "failed";
  artifact_id: string;
  relative_path: string | null;
  truncated: boolean;
  size_bytes: number | null;
  error_message: string | null;
}

export async function saveCaptureArtifacts(
  itemId: string,
  artifacts: CaptureArtifactCandidate[] | null | undefined,
): Promise<SaveCaptureArtifactResult[]> {
  if (!artifacts || artifacts.length === 0) return [];
  const results: SaveCaptureArtifactResult[] = [];

  for (const artifact of artifacts) {
    results.push(await saveOneCaptureArtifact(itemId, artifact));
  }

  return results;
}

export function captureArtifactRoot(): string {
  return process.env.BRAIN_CAPTURE_ARTIFACT_ROOT?.trim() || brainDataPath("artifacts", "captures");
}

export function resolveCaptureArtifactPath(row: CaptureArtifactRow): string | null {
  if (row.relative_path) return resolve(captureArtifactRoot(), row.relative_path);
  return row.path;
}

export function deleteArtifactsForItem(itemId: string): void {
  const rows = listCaptureArtifactsForItem(itemId);
  for (const row of rows) {
    const path = resolveCaptureArtifactPath(row);
    if (!path) continue;
    try {
      rmSync(path, { force: true });
    } catch {
      // Best-effort cleanup; DB deletion should still proceed.
    }
  }
  try {
    rmSync(resolve(captureArtifactRoot(), itemId), { recursive: true, force: true });
  } catch {}
  deleteCaptureArtifactRowsForItem(itemId);
}

async function saveOneCaptureArtifact(
  itemId: string,
  artifact: CaptureArtifactCandidate,
): Promise<SaveCaptureArtifactResult> {
  const artifactId = newId();
  const cap = KIND_CAPS[artifact.kind] ?? DEFAULT_CAP;
  const bytes = toBytes(sanitizeArtifactBody(artifact));
  const truncated = bytes.byteLength > cap;
  const stored = truncated ? bytes.slice(0, cap) : bytes;
  const relativePath = join(itemId, artifactFilename(artifactId, artifact));
  const absolutePath = resolve(captureArtifactRoot(), relativePath);

  try {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, stored);
    insertCaptureArtifact({
      id: artifactId,
      item_id: itemId,
      kind: artifact.kind,
      path: null,
      relative_path: relativePath,
      content_type: artifact.content_type,
      sha256: crypto.createHash("sha256").update(stored).digest("hex"),
      size_bytes: stored.byteLength,
      truncated,
      write_status: "ok",
    });
    return {
      kind: artifact.kind,
      status: "saved",
      artifact_id: artifactId,
      relative_path: relativePath,
      truncated,
      size_bytes: stored.byteLength,
      error_message: null,
    };
  } catch (err) {
    const message = (err as Error).message;
    try {
      insertCaptureArtifact({
        id: artifactId,
        item_id: itemId,
        kind: artifact.kind,
        path: null,
        relative_path: relativePath,
        content_type: artifact.content_type,
        sha256: null,
        size_bytes: null,
        truncated,
        write_status: "failed",
        error_message: message,
      });
    } catch {
      // Avoid masking the original write failure.
    }
    return {
      kind: artifact.kind,
      status: "failed",
      artifact_id: artifactId,
      relative_path: relativePath,
      truncated,
      size_bytes: null,
      error_message: message,
    };
  }
}

function sanitizeArtifactBody(artifact: CaptureArtifactCandidate): string | Uint8Array {
  if (!(typeof artifact.body === "string")) return artifact.body;
  if (!artifact.content_type.includes("html")) return artifact.body;
  return artifact.body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\b(access_token|bearer|cookie)=([^"&\s]+)/gi, "$1=[redacted]");
}

function toBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

function artifactFilename(artifactId: string, artifact: CaptureArtifactCandidate): string {
  const ext = safeExtension(artifact.suggested_filename, artifact.content_type);
  return `${artifactId}.${safeKind(artifact.kind)}${ext}`;
}

function safeKind(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "artifact";
}

function safeExtension(filename: string, contentType: string): string {
  const ext = extname(filename).replace(/[^a-zA-Z0-9.]+/g, "");
  if (ext && ext.length <= 12) return ext;
  if (contentType.includes("json")) return ".json";
  if (contentType.includes("html")) return ".html";
  if (contentType.includes("xml")) return ".xml";
  if (contentType.includes("text")) return ".txt";
  return ".bin";
}
