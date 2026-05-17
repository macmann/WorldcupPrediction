import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { leaderboard, leagues } from "@/lib/demoData";

export default function LeaguesHub() {
  return (
    <AppShell>
      <SectionTitle eyebrow="Private pools" title="Leagues Hub" />
      <div className="space-y-3">
        {leagues.map((league) => (
          <Card key={league.id}>
            <div className="flex items-center justify-between">
              <div><h3 className="font-black">{league.name}</h3><p className="text-sm text-slate-500">{league.members} members</p></div>
              <p className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">Rank #{league.rank}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <SectionTitle eyebrow="Tie-breakers" title="Friday Night Football" />
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">#</th><th>Player</th><th>Pts</th><th>Exact</th></tr></thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.rank} className="border-t border-slate-100">
                  <td className="p-3 font-black">{row.rank}</td><td className="font-bold">{row.displayName}</td><td>{row.globalPoints}</td><td>{row.exactScoresCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">Sorted by points, exact scores, then earliest registration timestamp.</p>
      </Card>
    </AppShell>
  );
}
