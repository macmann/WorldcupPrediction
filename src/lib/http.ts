import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
  }
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ error: message }, { status });
}
