import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { getDemoLeaderboard } from "@/lib/frontendData";

async function getLeaderboard(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return getDemoLeaderboard();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/leagues/${id}/leaderboard`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load leaderboard");
    const data = await response.json();
    return data.leaderboard ?? getDemoLeaderboard();
  } catch {
    return getDemoLeaderboard();
  }
}

export default async function LeagueDetail({ params }: { params: { id: string } }) {
  const rows = await getLeaderboard(params.id);
  const sortedRows = [...rows].sort((a, b) => a.rank - b.rank);

  return (
    <AppShell title="Leaderboard" eyebrow="League table">
      <Card>
        <SectionTitle eyebrow="Tie-breakers" title="Sorted standings" />
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">#</th><th>Player</th><th>Pts</th><th>Exact</th></tr></thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={`${row.rank}-${row.user.id ?? row.user.displayName}`} className="border-t border-slate-100">
                  <td className="p-3 font-black">{row.rank}</td>
                  <td className="font-bold">{row.user.displayName}</td>
                  <td>{row.user.globalPoints}</td>
                  <td>{row.user.exactScoresCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">API order is respected, and the client additionally guards by rank ascending.</p>
      </Card>
    </AppShell>
  );
}
