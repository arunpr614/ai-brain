#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SHA_PATTERN = /^[a-f0-9]{40}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const HOST_PATTERN = /^[A-Za-z0-9.-]+$/;

function reject(message) {
  throw new Error(message);
}

export function parseApiJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    reject(`${label} response is not valid JSON`);
  }
}

export function validateBranchResponse(branch, expectedSha) {
  if (!SHA_PATTERN.test(expectedSha)) reject("expected SHA is invalid");
  if (!branch || typeof branch !== "object" || Array.isArray(branch)) reject("branch response is invalid");
  if (branch.protected !== true) reject("main is not protected");
  if (branch.commit?.sha !== expectedSha) reject("candidate is not the current main head");
}

function hasNoPullRequestBypass(value) {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.some((key) => !["users", "teams", "apps"].includes(key))) return false;
  return keys.every((key) => Array.isArray(value[key]) && value[key].length === 0);
}

export function validateProtectionResponse(protection, expectedAppId) {
  if (!Number.isSafeInteger(expectedAppId) || expectedAppId <= 0) reject("expected app ID is invalid");
  if (!protection || typeof protection !== "object" || Array.isArray(protection)) {
    reject("protection response is invalid");
  }
  const checks = protection.required_status_checks?.checks;
  const hasRequiredVerify = Array.isArray(checks) && checks.some(
    (check) => check?.context === "verify" && check.app_id === expectedAppId,
  );
  const reviews = protection.required_pull_request_reviews;
  if (protection.required_status_checks?.strict !== true || !hasRequiredVerify) {
    reject("strict app-pinned verify check is not required");
  }
  if (protection.enforce_admins?.enabled !== true) reject("branch protection does not include admins");
  if (!reviews || reviews.required_approving_review_count !== 0 || reviews.dismiss_stale_reviews !== true) {
    reject("pull-request protection is missing or incompatible with the reviewed solo-owner policy");
  }
  if (!hasNoPullRequestBypass(reviews.bypass_pull_request_allowances)) {
    reject("pull-request bypass allowances are not permitted");
  }
  if (protection.required_conversation_resolution?.enabled !== true) {
    reject("conversation resolution is not required");
  }
  if (protection.allow_force_pushes?.enabled !== false) reject("force pushes are not disabled");
  if (protection.allow_deletions?.enabled !== false) reject("branch deletion is not disabled");
}

export function validateRulesetsResponse(rulesets) {
  if (!Array.isArray(rulesets)) reject("rulesets response is invalid");
  if (rulesets.length !== 0) reject("unreviewed repository rulesets or bypass actors are not permitted");
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1]) reject(`missing ${name}`);
  return argv[index + 1];
}

function requestJson(hostname, endpoint) {
  const result = spawnSync("gh", ["api", "--hostname", hostname, endpoint], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 15_000,
  });
  if (result.error || result.status !== 0 || result.signal || !result.stdout) {
    reject("GitHub policy API request failed");
  }
  return parseApiJson(result.stdout, endpoint);
}

export function verifyProtectedMain({ repository, hostname, expectedSha, expectedAppId }) {
  if (!REPOSITORY_PATTERN.test(repository)) reject("repository is invalid");
  if (!HOST_PATTERN.test(hostname)) reject("hostname is invalid");
  const branch = requestJson(hostname, `repos/${repository}/branches/main`);
  const protection = requestJson(hostname, `repos/${repository}/branches/main/protection`);
  const rulesets = requestJson(hostname, `repos/${repository}/rulesets`);
  validateBranchResponse(branch, expectedSha);
  validateProtectionResponse(protection, expectedAppId);
  validateRulesetsResponse(rulesets);
}

function main() {
  try {
    const repository = readOption(process.argv.slice(2), "--repository");
    const hostname = readOption(process.argv.slice(2), "--hostname");
    const expectedSha = readOption(process.argv.slice(2), "--expected-sha");
    const appIdRaw = readOption(process.argv.slice(2), "--app-id");
    if (!/^[1-9][0-9]*$/.test(appIdRaw)) reject("app ID is invalid");
    verifyProtectedMain({ repository, hostname, expectedSha, expectedAppId: Number(appIdRaw) });
  } catch {
    console.error("[verify-protected-main] current protected-main policy verification failed");
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
