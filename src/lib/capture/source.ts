import type { CaptureSource } from "@/db/items";

export function captureSourceFromTrustedHeader(value: string | null): CaptureSource {
  if (value === "android" || value === "extension") return value;
  return "unknown";
}
