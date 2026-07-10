export const ANDROID_CAPTURE_SOURCE_HEADER = "x-brain-capture-source";

export function androidCaptureSourceHeaders(): Record<string, string> {
  return {
    [ANDROID_CAPTURE_SOURCE_HEADER]: "android",
  };
}

export function androidJsonCaptureHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    ...androidCaptureSourceHeaders(),
  };
}

export function androidPdfCaptureHeaders(
  token: string,
  expectedSha256: string,
): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "x-expected-sha256": expectedSha256,
    ...androidCaptureSourceHeaders(),
  };
}
