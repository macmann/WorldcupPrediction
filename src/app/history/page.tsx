import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { matches } from "@/lib/demoData";

export default function History() {
  const past = matches.filter((match) => match.status !== "SCHEDULED").reverse();
  return (
    <AppShell>
      <SectionTitle eyebrow="Ledger" title="Prediction History" />
      <div className="space-y-3">
        {past.map((match) => (
          <Card key={match.id}>
            <div className="flex items-center justify-between">
              <div><h3 className="font-black">{match.homeTeam} vs {match.awayTeam}</h3><p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p></div>
              <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">{match.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Prediction</p><p className="text-xl font-black">{match.prediction?.predictedHomeScore ?? "–"}-{match.prediction?.predictedAwayScore ?? "–"}</p></div>
              <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Actual</p><p className="text-xl font-black">{match.homeScore ?? "–"}-{match.awayScore ?? "–"}</p></div>
              <div className="rounded-2xl bg-emerald-100 p-3"><p className="text-xs text-emerald-700">Points</p><p className="text-xl font-black text-emerald-800">{match.prediction?.pointsAwarded ?? "–"}</p></div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
