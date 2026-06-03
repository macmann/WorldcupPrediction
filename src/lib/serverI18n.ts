import { cookies } from "next/headers";
import { normalizeLocale, translate } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

export async function getServerTranslator() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("worldcup_locale")?.value);

  return (key: TranslationKey) => translate(locale, key);
}
