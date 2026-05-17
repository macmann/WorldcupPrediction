import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { leagues, matches } from "@/lib/demoData";

export default function Dashboard() {
  const nextMatch = matches[0];
  const upcoming = matches.slice(0, 3);
  return (
    <AppShell>
      <Card className="bg-gradient-to-br from-emerald-500 to-pitch-900 text-white">
        <p className="text-sm font-semibold text-emerald-100">Next kickoff</p>
        <h2 className="mt-1 text-2xl font-black">{nextMatch.homeTeam} vs {nextMatch.awayTeam}</h2>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {["24", "06", "11", "42"].map((value, index) => (
            <div key={index} className="rounded-2xl bg-white/15 p-3 backdrop-blur">
              <p className="text-2xl font-black">{value}</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-100">{["Days", "Hours", "Min", "Sec"][index]}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Locked picks" title="Tournament Outrights" />
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Champion</dt><dd className="font-bold">Argentina</dd></div>
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Best Player</dt><dd className="font-bold">Kylian Mbappé</dd></div>
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Best Goalkeeper</dt><dd className="font-bold">Alisson</dd></div>
        </dl>
      </Card>

      <Card>
        <SectionTitle eyebrow="Coming up" title="Next 3 predictions" />
        <div className="mt-3 space-y-3">
          {upcoming.map((match) => (
            <div key={match.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
              <div><p className="font-bold">{match.homeTeam} vs {match.awayTeam}</p><p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p></div>
              <p className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">{match.prediction ? `${match.prediction.predictedHomeScore}-${match.prediction.predictedAwayScore}` : "Set"}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Ranks" title="Top joined leagues" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {leagues.slice(0, 2).map((league) => (
            <div key={league.id} className="rounded-2xl bg-navy p-4 text-white">
              <p className="text-sm font-bold">{league.name}</p>
              <p className="mt-3 text-3xl font-black">#{league.rank}</p>
              <p className="text-xs text-slate-300">of {league.members}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
