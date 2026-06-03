import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw Object.assign(new Error("Authentication required"), { status: 401 });
    return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName, onboardingCompleted: Boolean((user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt), preferredLocale: (user as { preferredLocale?: string | null }).preferredLocale ?? "en" } });
  } catch (error) {
    return jsonError(error);
  }
}
