import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { normalizeLocale } from "@/lib/i18n";
import { ensureUserPreferredLocaleColumn, prisma } from "@/lib/prisma";

const schema = z.object({
  preferredLocale: z.enum(["en", "my"]).optional(),
  displayName: z.string().trim().min(2).max(60).optional(),
}).refine((input) => input.preferredLocale || input.displayName, {
  message: "At least one preference is required",
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    if (input.preferredLocale) {
      await ensureUserPreferredLocaleColumn();
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(input.preferredLocale ? { preferredLocale: input.preferredLocale } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
      },
    });

    return NextResponse.json({
      displayName: updatedUser.displayName,
      preferredLocale: normalizeLocale(updatedUser.preferredLocale),
    });
  } catch (error) {
    return jsonError(error);
  }
}
