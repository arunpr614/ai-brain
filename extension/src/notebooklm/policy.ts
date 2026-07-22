export const V1_PAYLOAD_MAX_BYTES = 200_000;
export const V1_PAYLOAD_MAX_WORDS = 50_000;

export function payloadFitsV1(text: string): boolean {
  if (!text.trim()) return false;
  if (new TextEncoder().encode(text).byteLength > V1_PAYLOAD_MAX_BYTES) return false;
  return text.trim().split(/\s+/u).length <= V1_PAYLOAD_MAX_WORDS;
}
