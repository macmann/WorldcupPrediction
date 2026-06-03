import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { normalizeLocale } from "@/lib/i18n";
import { ensureUserPreferredLocaleColumn, prisma } from "@/lib/prisma";

const schema = z.object({
  preferredLocale: z.enum(["en", "my"])
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    await ensureUserPreferredLocaleColumn();
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { preferredLocale: input.preferredLocale }
    });

    return NextResponse.json({ preferredLocale: normalizeLocale(updatedUser.preferredLocale) });
  } catch (error) {
    return jsonError(error);
  }
}
