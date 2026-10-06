import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { jsonError } from "../src/lib/http";

test("maps duplicate email database errors to a friendly conflict response", async () => {
  const response = jsonError(new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.22.0",
    meta: { target: ["email"] }
  }));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "An account already exists with that email. Please sign in instead." });
});

test("missing migration returns service unavailable without leaking the Prisma query", async () => {
  const response = jsonError(new Prisma.PrismaClientKnownRequestError("Invalid prisma.user.create(): column is_system missing", { code: "P2022", clientVersion: "5.22.0", meta: { column: "is_system" } }));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, "DATABASE_SCHEMA_OUTDATED");
  assert.ok(!body.error.includes("prisma"));
  assert.ok(!body.error.includes("is_system"));
});
