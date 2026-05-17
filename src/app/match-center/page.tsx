import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { matchdays, matches } from "@/lib/demoData";

export default function MatchCenter() {
  const now = new Date("2026-05-17T00:00:00Z");
  return (
    <AppShell>
      <SectionTitle eyebrow="Predictor" title="Match Center" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {matchdays.map((day, index) => <button key={day} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${index === 0 ? "bg-navy text-white" : "bg-white text-slate-700"}`}>{day}</button>)}
      </div>
      <div className="space-y-3">
        {matches.map((match) => {
          const locked = new Date(match.kickoffTime) <= now;
          return (
            <Card key={match.id}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{match.matchday}</p><h3 className="text-lg font-black">{match.homeTeam} vs {match.awayTeam}</h3><p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p></div>
                {locked && <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold">🔒 Locked</span>}
              </div>
              {locked ? (
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Your pick</p><p className="text-2xl font-black">{match.prediction?.predictedHomeScore ?? "–"}-{match.prediction?.predictedAwayScore ?? "–"}</p></div>
                  <div className="rounded-2xl bg-emerald-100 p-3"><p className="text-xs text-emerald-700">Actual</p><p className="text-2xl font-black text-emerald-800">{match.homeScore ?? "–"}-{match.awayScore ?? "–"}</p></div>
                </div>
              ) : (
                <form className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <input aria-label={`${match.homeTeam} score`} type="number" min="0" defaultValue={match.prediction?.predictedHomeScore ?? ""} className="rounded-2xl border border-slate-200 p-4 text-center text-2xl font-black" />
                  <span className="font-black text-slate-400">–</span>
                  <input aria-label={`${match.awayTeam} score`} type="number" min="0" defaultValue={match.prediction?.predictedAwayScore ?? ""} className="rounded-2xl border border-slate-200 p-4 text-center text-2xl font-black" />
                  <button className="col-span-3 rounded-2xl bg-emerald-600 py-3 font-black text-white">Save prediction</button>
                </form>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
