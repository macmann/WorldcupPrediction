import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LockIcon } from "@/components/Icons";
import { PredictionForm } from "@/components/PredictionForm";
import { fetchMatches, matchLabel } from "@/lib/frontendData";

export default async function MatchCenter() {
  const matches = await fetchMatches();
  const now = new Date();
  const stages = Array.from(new Set(matches.map((match) => matchLabel(match))));

  return (
    <AppShell title="Match Center" eyebrow="Predictor">
      <SectionTitle eyebrow="Fixtures" title="Make your picks" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {stages.map((stage, index) => <button key={stage} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${index === 0 ? "bg-navy text-white" : "bg-white text-slate-700"}`}>{stage}</button>)}
      </div>
      <div className="space-y-3">
        {matches.map((match) => {
          const locked = match.isLocked || now >= new Date(match.kickoffTime) || match.status !== "SCHEDULED";
          return (
            <Card key={match.id} className={locked ? "opacity-80" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{matchLabel(match)}</p>
                  <h3 className="text-lg font-black">{match.homeTeam} vs {match.awayTeam}</h3>
                  <p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p>
                </div>
                {locked && <span className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold"><LockIcon className="h-3 w-3" /> Locked</span>}
              </div>
              <PredictionForm match={match} serverNowIso={now.toISOString()} />
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
