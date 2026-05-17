import { AppShell } from "@/components/AppShell";
import { OutrightPicksCard } from "@/components/OutrightPicksCard";

export default function WinnersPage() {
  return (
    <AppShell title="Tournament Winners" eyebrow="Outright picks">
      <OutrightPicksCard canEdit />
    </AppShell>
  );
}
