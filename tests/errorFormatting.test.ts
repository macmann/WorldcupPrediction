import assert from "node:assert/strict";
import test from "node:test";
import { formatErrorWithCause } from "../src/lib/errorFormatting";

test("formats nested fetch failure causes with network details", () => {
  const cause = Object.assign(new Error("getaddrinfo ENOTFOUND api.example.test"), {
    code: "ENOTFOUND",
    syscall: "getaddrinfo",
    hostname: "api.example.test"
  });
  const error = new TypeError("fetch failed", { cause });

  assert.equal(
    formatErrorWithCause(error),
    "fetch failed: getaddrinfo ENOTFOUND api.example.test (ENOTFOUND; syscall getaddrinfo; host api.example.test)"
  );
});
