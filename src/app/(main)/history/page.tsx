import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { fetchMatches } from "@/lib/serverMatches";
import type { MatchOutcome } from "@/lib/frontendData";

function pointsClass(points: number | null | undefined) {
  if ((points ?? 0) >= 3) return "bg-emerald-100 text-emerald-800";
  if (points === 1) return "bg-indigo-100 text-indigo-800";
  return "bg-slate-100 text-slate-600";
}

function outcomeText(outcome: MatchOutcome | null | undefined, homeTeam: string, awayTeam: string) {
  if (outcome === "HOME") return `${homeTeam} win`;
  if (outcome === "AWAY") return `${awayTeam} win`;
  if (outcome === "DRAW") return "Draw";
  return "–";
}

function scorePickText(prediction: { predictedHomeScore?: number | null; predictedAwayScore?: number | null } | null | undefined) {
  if (!prediction || prediction.predictedHomeScore === null || prediction.predictedHomeScore === undefined || prediction.predictedAwayScore === null || prediction.predictedAwayScore === undefined) return "–";
  return `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
}

export default async function History() {
  const matches = await fetchMatches();
  const past = matches.filter((match) => match.status === "FINISHED" || (match.homeScore !== null && match.homeScore !== undefined)).sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime());
  return (
    <AppShell title="Prediction History" eyebrow="Ledger">
      <SectionTitle eyebrow="Finished" title="Points timeline" />
      <div className="space-y-3">
        {past.length ? past.map((match) => {
          const points = match.prediction?.pointsAwarded ?? 0;
          return (
            <Card key={match.id}>
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="flex flex-wrap items-center gap-2 font-black"><span>{match.homeFlagEmoji} {match.homeTeam}</span><span className="text-slate-400">vs</span><span>{match.awayFlagEmoji} {match.awayTeam}</span></h3><p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${pointsClass(points)}`}>+{points} PTS</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">W/D/W Pick</p><p className="text-sm font-black">{outcomeText(match.prediction?.predictedOutcome, match.homeTeam, match.awayTeam)}</p></div>
                <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Score Pick</p><p className="text-xl font-black">{scorePickText(match.prediction)}</p></div>
                <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Actual Score</p><p className="text-xl font-black text-emerald-800">{match.homeScore ?? "–"}-{match.awayScore ?? "–"}</p></div>
              </div>
            </Card>
          );
        }) : (
          <Card><p className="text-sm font-semibold text-slate-500">Finished matches will appear here once scoring starts.</p></Card>
        )}
      </div>
    </AppShell>
  );
}
