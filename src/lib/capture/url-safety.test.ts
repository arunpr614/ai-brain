import test from "node:test";
import assert from "node:assert/strict";
import { assertPublicHttpUrl, isPrivateAddress, UrlSafetyError } from "./url-safety";

test("isPrivateAddress catches local and private IPv4 ranges", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("93.184.216.34"), false);
});

test("isPrivateAddress catches local and private IPv6 ranges", () => {
  for (const address of ["::1", "fe80::1", "fc00::1", "fd12::1"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("2606:2800:220:1:248:1893:25c8:1946"), false);
});

test("assertPublicHttpUrl rejects obvious private hosts", async () => {
  await assert.rejects(() => assertPublicHttpUrl("http://localhost"), UrlSafetyError);
  await assert.rejects(() => assertPublicHttpUrl("http://127.0.0.1"), UrlSafetyError);
  await assert.rejects(() => assertPublicHttpUrl("http://10.0.0.1"), UrlSafetyError);
  await assert.rejects(() => assertPublicHttpUrl("http://[::1]"), UrlSafetyError);
});
