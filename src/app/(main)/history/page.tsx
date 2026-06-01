import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { TeamName, teamNameWithFlag } from "@/components/TeamName";
import { fetchMatches } from "@/lib/serverMatches";
import type { Match, MatchOutcome } from "@/lib/frontendData";

function pointsClass(points: number | null | undefined) {
  if ((points ?? 0) >= 3) return "bg-emerald-100 text-emerald-800";
  if (points === 1) return "bg-indigo-100 text-indigo-800";
  return "bg-slate-100 text-slate-600";
}

function outcomeText(outcome: MatchOutcome | null | undefined, homeTeam: string, awayTeam: string, homeFlagEmoji?: string | null, awayFlagEmoji?: string | null) {
  if (outcome === "HOME") return `${teamNameWithFlag(homeTeam, homeFlagEmoji)} win`;
  if (outcome === "AWAY") return `${teamNameWithFlag(awayTeam, awayFlagEmoji)} win`;
  if (outcome === "DRAW") return "Draw";
  return "–";
}

function scorePickText(prediction: { predictedHomeScore?: number | null; predictedAwayScore?: number | null } | null | undefined) {
  if (!prediction || prediction.predictedHomeScore === null || prediction.predictedHomeScore === undefined || prediction.predictedAwayScore === null || prediction.predictedAwayScore === undefined) return "–";
  return `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
}

function HistoryMatchCard({ match, missed }: { match: Match; missed?: boolean }) {
  const points = match.prediction?.pointsAwarded ?? 0;
  return (
    <Card key={match.id}>
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="flex flex-wrap items-center gap-2 font-black"><TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} flagImageUrl={match.homeFlagImageUrl} /><span className="text-slate-400">vs</span><TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} /></h3><p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${pointsClass(points)}`}>+{points} PTS</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">W/D/W Pick</p><p className="text-sm font-black">{missed ? "Missed" : outcomeText(match.prediction?.predictedOutcome, match.homeTeam, match.awayTeam, match.homeFlagEmoji, match.awayFlagEmoji)}</p></div>
        <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Score Pick</p><p className={`${missed ? "text-sm" : "text-xl"} font-black`}>{missed ? "Missed" : scorePickText(match.prediction)}</p></div>
        <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Actual Score</p><p className="text-xl font-black text-emerald-800">{match.homeScore ?? "–"}-{match.awayScore ?? "–"}</p></div>
      </div>
    </Card>
  );
}

export default async function History({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const activeTab = params?.tab === "missed" ? "missed" : "predicted";
  const matches = await fetchMatches();
  const past = matches
    .filter((match) => match.status === "FINISHED" || (match.homeScore !== null && match.homeScore !== undefined))
    .sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime());
  const predicted = past.filter((match) => Boolean(match.prediction));
  const missed = past.filter((match) => !match.prediction);

  const renderMatches = activeTab === "missed" ? missed : predicted;
  return (
    <AppShell title="Prediction History" eyebrow="Ledger">
      <SectionTitle eyebrow="Finished" title="Points timeline" />
      <div className="mb-4 flex gap-2">
        <Link href="/history?tab=predicted" className={`rounded-full px-4 py-2 text-xs font-black ${activeTab === "predicted" ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>
          Predicted ({predicted.length})
        </Link>
        <Link href="/history?tab=missed" className={`rounded-full px-4 py-2 text-xs font-black ${activeTab === "missed" ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>
          Missed ({missed.length})
        </Link>
      </div>
      <div className="space-y-3">
        {renderMatches.length ? renderMatches.map((match) => <HistoryMatchCard key={match.id} match={match} missed={activeTab === "missed"} />) : (
          <Card><p className="text-sm font-semibold text-slate-500">No {activeTab} finished matches yet.</p></Card>
        )}
      </div>
    </AppShell>
  );
}
