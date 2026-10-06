import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { competitionCatalog } from "@/services/platform/views";
export async function GET() { try { await requireUser(); return NextResponse.json({ competitions: await competitionCatalog() }); } catch (error) { return jsonError(error); } }
