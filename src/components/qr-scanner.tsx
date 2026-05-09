"use client";

/**
 * QR scanner component (v0.5.0 T-16 / F-037).
 *
 * Live-camera QR decoder using getUserMedia + jsqr. No Capacitor plugin
 * bridge needed — the browser/WebView provides getUserMedia once the
 * CAMERA permission is granted (runtime prompt on first call on Android).
 *
 * Flow:
 *   1. `navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}})`
 *   2. Pipe into a hidden `<video>` element, auto-play muted.
 *   3. requestAnimationFrame loop: copy current video frame onto a
 *      hidden `<canvas>`, pull imageData, feed to jsqr.
 *   4. On first non-null decode, stop the stream + cancel the RAF loop
 *      and call `onDecode(text)`. Parent owns the parse-and-store path.
 *
 * Error paths surfaced to parent via `onError(reason)`:
 *   - "permission-denied" — user denied camera access
 *   - "no-camera"         — device has no camera / constraint unsat
 *   - "getusermedia-unavailable" — running in a context without the API
 *     (e.g., test runner, SSR — this component is client-only so SSR
 *     should never hit this, but defense-in-depth)
 *
 * The component does NOT import `@/lib/lan/setup-uri` — it emits the
 * raw decoded string and lets the parent decide what constitutes a
 * valid QR. That keeps the scanner reusable (e.g., future wave could
 * scan other QR payloads) and makes this component easy to stub in
 * tests by supplying `onDecode` directly.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export type QrScannerError =
  | "permission-denied"
  | "no-camera"
  | "getusermedia-unavailable"
  | "unknown";

interface Props {
  onDecode: (text: string) => void;
  onError?: (reason: QrScannerError, detail?: string) => void;
  /** When `paused` is true, the scanner stops pulling frames (useful between retries). */
  paused?: boolean;
}

export function QrScanner({ onDecode, onError, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const decodedRef = useRef(false);
  const [state, setState] = useState<"starting" | "scanning" | "error">("starting");

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Scan loop — recreated on every mount.
  useEffect(() => {
    if (paused) return;
    let cancelled = false;

    const start = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setState("error");
        onError?.("getusermedia-unavailable");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        const msg = err instanceof Error ? err.message : String(err);
        const reason: QrScannerError =
          name === "NotAllowedError" || name === "SecurityError"
            ? "permission-denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "no-camera"
              : "unknown";
        setState("error");
        onError?.(reason, msg);
        return;
      }
      if (cancelled) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      video.srcObject = stream;
      // iOS / older Android need both attributes.
      video.setAttribute("playsinline", "true");
      video.muted = true;
      try {
        await video.play();
      } catch {
        // Autoplay policies can block — user interaction restarts via button.
      }
      setState("scanning");

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const tick = () => {
        if (cancelled || decodedRef.current || paused) return;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const { videoWidth, videoHeight } = video;
        if (videoWidth === 0 || videoHeight === 0) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          decodedRef.current = true;
          onDecode(code.data);
          stop();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    decodedRef.current = false;
    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [paused, onDecode, onError, stop]);

  return (
    <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      {state === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
          Starting camera…
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
          Camera unavailable. Grant permission and retry.
        </div>
      )}
    </div>
  );
}
