import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LeagueActions } from "@/components/LeagueActions";
import { getDemoLeagues } from "@/lib/frontendData";

export default function LeaguesHub() {
  const leagues = getDemoLeagues();
  return (
    <AppShell title="Leagues Hub" eyebrow="Private pools">
      <SectionTitle eyebrow="Joined" title="Your leagues" />
      <LeagueActions />
      <div className="space-y-3">
        {leagues.map((league) => (
          <Link key={league.id} href={`/leagues/${league.id}`}>
            <Card className="transition active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <div><h3 className="font-black">{league.name}</h3><p className="text-sm text-slate-500">{league.members} members</p></div>
                <p className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">Rank #{league.rank}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
