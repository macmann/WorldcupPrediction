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
