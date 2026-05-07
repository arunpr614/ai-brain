"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface UploadResponse {
  id?: string;
  error?: string;
}

export function PdfDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  async function upload(file: File) {
    setFilename(file.name);
    setStatus("uploading");
    setError(null);
    const form = new FormData();
    form.set("pdf", file);
    try {
      const res = await fetch("/api/capture/pdf", {
        method: "POST",
        body: form,
      });
      const data: UploadResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) {
        setStatus("error");
        setError(data.error ?? `Upload failed (${res.status})`);
        return;
      }
      router.push(`/items/${data.id}`);
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      void upload(file);
    } else if (file) {
      setStatus("error");
      setError("Only PDF files are supported.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-12 text-center transition-colors",
          dragging
            ? "border-[var(--accent-9)] bg-[var(--accent-3)]"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]",
        )}
      >
        {status === "uploading" ? (
          <>
            <Loader2
              className="h-8 w-8 animate-spin text-[var(--accent-9)]"
              strokeWidth={1.5}
            />
            <p className="text-sm text-[var(--text-secondary)]">
              Extracting {filename}...
            </p>
          </>
        ) : (
          <>
            <Upload
              className="h-8 w-8 text-[var(--text-muted)]"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Drop a PDF here or click to browse
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Up to 50 MB. Text is extracted via unpdf.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>

      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-md border border-[var(--danger)] bg-[var(--surface)] p-3">
          <FileText
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]"
            strokeWidth={2}
          />
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}
    </div>
  );
}
