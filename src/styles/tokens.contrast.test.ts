import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

type TokenMap = Record<string, string>;

const TOKENS_CSS = readFileSync(
  join(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);

function extractBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = TOKENS_CSS.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[1] ?? "";
}

function parseTokens(block: string): TokenMap {
  const tokens: TokenMap = {};
  const declarationPattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match: RegExpExecArray | null;
  while ((match = declarationPattern.exec(block))) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const lightTokens = parseTokens(extractBlock(":root"));
const darkTokens = {
  ...lightTokens,
  ...parseTokens(extractBlock(':root[data-theme="dark"]')),
};

function resolveToken(tokens: TokenMap, tokenName: string, seen = new Set<string>()): string {
  assert.ok(tokens[tokenName], `Missing token ${tokenName}`);
  assert.ok(!seen.has(tokenName), `Circular token reference for ${tokenName}`);
  seen.add(tokenName);

  const value = tokens[tokenName];
  const varMatch = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (varMatch) return resolveToken(tokens, varMatch[1], seen);

  assert.match(value, /^#[0-9a-f]{6}$/i, `${tokenName} must resolve to a hex color`);
  return value;
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => {
      const channel = Number.parseInt(value, 16) / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });

  assert.equal(channels?.length, 3, `Invalid hex color ${hex}`);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const fg = luminance(foreground);
  const bg = luminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function assertContrast(tokens: TokenMap, foreground: string, background: string) {
  const fg = resolveToken(tokens, foreground);
  const bg = resolveToken(tokens, background);
  assert.ok(
    contrastRatio(fg, bg) >= 4.5,
    `${foreground} ${fg} on ${background} ${bg} must be at least 4.5:1`,
  );
}

test("primary action tokens meet contrast requirements", () => {
  assertContrast(lightTokens, "--action-primary-fg", "--action-primary-bg");
  assertContrast(lightTokens, "--action-primary-fg", "--action-primary-bg-hover");
  assertContrast(darkTokens, "--action-primary-fg", "--action-primary-bg");
  assertContrast(darkTokens, "--action-primary-fg", "--action-primary-bg-hover");
});

test("selected-control tokens meet contrast requirements", () => {
  assertContrast(lightTokens, "--control-selected-fg", "--control-selected-bg");
  assertContrast(darkTokens, "--control-selected-fg", "--control-selected-bg");
});

test("the previous dark-mode white-on-near-white pair fails contrast", () => {
  assert.ok(
    contrastRatio("#ffffff", "#F4F7FB") < 4.5,
    "the historical #ffffff on #F4F7FB regression should fail this guard",
  );
});
