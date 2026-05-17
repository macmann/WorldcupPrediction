import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { getLeagueDetail } from "@/lib/leagues";

export default async function LeagueDetail({ params }: { params: { id: string } }) {
  const league = await getLeagueDetail(params.id);
  if (league === "UNAUTHENTICATED") {
    return (
      <AppShell title="League" eyebrow="League table">
        <Card>
          <SectionTitle eyebrow="Loading" title="Checking your session" />
          <p className="mt-2 text-sm font-semibold text-slate-500">You need to sign in before viewing league standings.</p>
        </Card>
      </AppShell>
    );
  }
  if (!league) notFound();

  return (
    <AppShell title={league.name} eyebrow={league.type === "GLOBAL" ? "Global table" : "League table"}>
      <Card className="bg-gradient-to-br from-navy to-indigo-950 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Your position</p>
            <h2 className="mt-2 text-4xl font-black">#{league.userRank}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">{league.userPoints} points from match and outright predictions</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-right ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Members</p>
            <p className="text-3xl font-black">{league.memberCount}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Join code</p>
            <p className="mt-1 font-black tracking-[0.2em] text-emerald-200">{league.joinCode}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Role</p>
            <p className="mt-1 font-black">{league.isOwner ? "Owner" : "Member"}</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Tie-breakers" title="Sorted standings" />
        <p className="mt-2 text-sm font-semibold text-slate-500">Rankings use total points, exact-score count, then earliest registration.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">#</th><th>Player</th><th>Pts</th><th>Exact</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {league.leaderboard.map((row) => (
                <tr key={row.user.id} className="border-t border-slate-100">
                  <td className="p-3 font-black">{row.rank}</td>
                  <td className="font-bold">{row.user.displayName}</td>
                  <td>{row.user.globalPoints}</td>
                  <td>{row.user.exactScoresCount}</td>
                  <td className="pr-3 text-xs font-semibold text-slate-500">{new Date(row.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
