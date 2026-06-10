#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const forbidden = resolve(".next/standalone/data");

if (existsSync(forbidden)) {
  console.error(`[check:build-artifacts] forbidden runtime data found: ${forbidden}`);
  console.error("[check:build-artifacts] build/deploy must not package local Brain runtime data");
  process.exit(1);
}

console.log("[check:build-artifacts] ok: no .next/standalone/data directory");

