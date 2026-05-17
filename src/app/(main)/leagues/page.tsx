import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LeagueActions } from "@/components/LeagueActions";
import { getUserLeagues } from "@/lib/leagues";

export default async function LeaguesHub() {
  const leagues = await getUserLeagues();
  const privateLeagues = leagues.filter((league) => league.type === "PRIVATE");
  const globalLeague = leagues.find((league) => league.type === "GLOBAL");

  return (
    <AppShell title="Leagues Hub" eyebrow="Private pools">
      <SectionTitle eyebrow="Joined" title="Your live leagues" />
      <LeagueActions />

      {globalLeague && (
        <Link href={`/leagues/${globalLeague.id}`} className="block">
          <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white transition active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">Global standings</p>
                <h3 className="mt-1 text-xl font-black">{globalLeague.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{globalLeague.members} predictors competing across every World Cup fixture.</p>
              </div>
              <p className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white">#{globalLeague.rank}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">Points</p><p className="text-lg font-black">{globalLeague.points}</p></div>
              <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">Exact</p><p className="text-lg font-black">{globalLeague.exactScoresCount}</p></div>
              <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">Leader</p><p className="truncate text-lg font-black">{globalLeague.leader?.displayName ?? "—"}</p></div>
            </div>
          </Card>
        </Link>
      )}

      <div className="space-y-3">
        <SectionTitle eyebrow="Mini leagues" title="Friends, work, and family pools" />
        {privateLeagues.length > 0 ? privateLeagues.map((league) => (
          <Link key={league.id} href={`/leagues/${league.id}`} className="block">
            <Card className="transition active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-black">{league.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{league.members} members • Join code {league.joinCode}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Leader: {league.leader ? `${league.leader.displayName} (${league.leader.points} pts)` : "No scores yet"}</p>
                </div>
                <div className="text-right">
                  <p className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-black text-indigo-700">Rank #{league.rank}</p>
                  {league.isOwner && <p className="mt-2 text-xs font-black uppercase tracking-widest text-amber-600">Owner</p>}
                </div>
              </div>
            </Card>
          </Link>
        )) : (
          <Card className="border border-dashed border-slate-300 bg-white/70 text-center">
            <p className="font-black">No private leagues yet</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Create a league for your group or join one with an 8-character code. Standings update from real member predictions, not sample data.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
