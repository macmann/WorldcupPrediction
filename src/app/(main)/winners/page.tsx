import { AppShell } from "@/components/AppShell";
import { OutrightPicksCard } from "@/components/OutrightPicksCard";
import { TournamentGroupsTable } from "@/components/TournamentGroupsTable";
import { getServerTranslator } from "@/lib/serverI18n";

export default async function WinnersPage() {
  const t = await getServerTranslator();

  return (
    <AppShell title={t("winners.title")} eyebrow={t("winners.eyebrow")}>
      <TournamentGroupsTable />
      <OutrightPicksCard canEdit />
    </AppShell>
  );
}
