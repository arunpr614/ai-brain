/**
 * Unit tests for src/lib/outbox/pdf-storage.ts (OFFLINE-9 / plan v3 §5.1).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OUTBOX_PDF_DIR,
  __internals,
  deletePdf,
  readPdfBytes,
  savePdf,
  type FilesystemApi,
} from "./pdf-storage";

interface FakeFile {
  data: string; // base64
  size: number;
}

function makeFakeFs() {
  const files = new Map<string, FakeFile>();
  const mkdirCalls: string[] = [];
  const writeCalls: string[] = [];
  const deleteCalls: string[] = [];
  const fs: FilesystemApi = {
    async writeFile(opts) {
      writeCalls.push(opts.path);
      const decoded = atob(opts.data);
      files.set(opts.path, { data: opts.data, size: decoded.length });
      return { uri: `mock://DATA/${opts.path}` };
    },
    async readFile(opts) {
      const file = files.get(opts.path);
      if (!file) throw new Error("ENOENT");
      return { data: file.data };
    },
    async deleteFile(opts) {
      deleteCalls.push(opts.path);
      files.delete(opts.path);
    },
    async mkdir(opts) {
      mkdirCalls.push(opts.path);
    },
  };
  return { fs, files, mkdirCalls, writeCalls, deleteCalls };
}

function pdfBlob(content: string): Blob {
  return new Blob([new TextEncoder().encode(content)], { type: "application/pdf" });
}

describe("savePdf", () => {
  it("writes the bytes under outbox-pdfs/ prefixed by the row id", async () => {
    const harness = makeFakeFs();
    const blob = pdfBlob("hello pdf");
    const saved = await savePdf(blob, "doc.pdf", "row-abc", { fs: harness.fs });
    assert.equal(saved.filePath, `${OUTBOX_PDF_DIR}/row-abc__doc.pdf`);
    assert.equal(saved.fileSize, "hello pdf".length);
    // SHA256 of "hello pdf"
    assert.match(saved.sha256, /^[0-9a-f]{64}$/);
    assert.equal(harness.writeCalls.length, 1);
    assert.equal(harness.writeCalls[0], saved.filePath);
  });

  it("creates the directory before writing (mkdir is idempotent)", async () => {
    const harness = makeFakeFs();
    await savePdf(pdfBlob("x"), "a.pdf", "row1", { fs: harness.fs });
    assert.deepEqual(harness.mkdirCalls, [OUTBOX_PDF_DIR]);
  });

  it("sanitizes unsafe characters in the file name", async () => {
    const harness = makeFakeFs();
    const saved = await savePdf(
      pdfBlob("x"),
      "weird/name with spaces & symbols!.pdf",
      "row2",
      { fs: harness.fs },
    );
    assert.match(saved.filePath, /row2__weird_name_with_spaces___symbols_\.pdf$/);
  });

  it("rejects with filesystem-unavailable when no fs is provided and Capacitor is absent", async () => {
    // In a Node test there's no @capacitor/filesystem; loadFilesystem returns null.
    await assert.rejects(() => savePdf(pdfBlob("x"), "a.pdf", "row3"), {
      message: "filesystem-unavailable",
    });
  });
});

describe("readPdfBytes", () => {
  it("round-trips the bytes through base64", async () => {
    const harness = makeFakeFs();
    const original = "PDF content with binary-ish chars: \x01\x02\xff";
    const saved = await savePdf(pdfBlob(original), "x.pdf", "rid", { fs: harness.fs });
    const bytes = await readPdfBytes(saved.filePath, { fs: harness.fs });
    const text = new TextDecoder().decode(new Uint8Array(bytes));
    assert.equal(text, original);
  });

  it("rejects when filesystem is missing", async () => {
    await assert.rejects(() => readPdfBytes("nope"), {
      message: "filesystem-unavailable",
    });
  });
});

describe("deletePdf", () => {
  it("calls deleteFile on the path", async () => {
    const harness = makeFakeFs();
    await savePdf(pdfBlob("x"), "x.pdf", "rid", { fs: harness.fs });
    const path = `${OUTBOX_PDF_DIR}/rid__x.pdf`;
    await deletePdf(path, { fs: harness.fs });
    assert.deepEqual(harness.deleteCalls, [path]);
    assert.equal(harness.files.has(path), false);
  });

  it("swallows errors (best-effort delete)", async () => {
    const harness = {
      fs: {
        ...makeFakeFs().fs,
        deleteFile: async () => {
          throw new Error("ENOENT");
        },
      },
    };
    // Should NOT throw.
    await deletePdf("nonexistent", { fs: harness.fs as FilesystemApi });
  });

  it("is a no-op when filesystem is unavailable (no throw)", async () => {
    await deletePdf("anything"); // no fs arg, no Capacitor in Node
    assert.ok(true);
  });
});

describe("base64 round-trip", () => {
  it("arrayBufferToBase64 ↔ base64ToArrayBuffer is identity", () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 200, 255]);
    const b64 = __internals.arrayBufferToBase64(original.buffer);
    const round = new Uint8Array(__internals.base64ToArrayBuffer(b64));
    assert.deepEqual(Array.from(round), Array.from(original));
  });

  it("handles a 100KB random buffer without overflow", () => {
    const big = new Uint8Array(100 * 1024);
    for (let i = 0; i < big.length; i++) big[i] = (i * 7 + 13) & 0xff;
    const b64 = __internals.arrayBufferToBase64(big.buffer);
    const round = new Uint8Array(__internals.base64ToArrayBuffer(b64));
    assert.deepEqual(Array.from(round), Array.from(big));
  });
});
