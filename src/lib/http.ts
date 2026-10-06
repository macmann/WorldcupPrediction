import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const fields = Array.isArray(error.meta?.target) ? error.meta.target : [];
    const message = fields.includes("email")
      ? "An account already exists with that email. Please sign in instead."
      : "That record already exists.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) {
    console.error("Database schema is behind the application. Apply the deployment migration before serving this release.");
    return NextResponse.json({ error: "The service is being updated. Please try again shortly.", code: "DATABASE_SCHEMA_OUTDATED" }, { status: 503 });
  }

  const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ error: message }, { status });
}
