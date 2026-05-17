import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle, SkeletonCard } from "@/components/Cards";
import { Countdown } from "@/components/Countdown";
import { PredictionForm } from "@/components/PredictionForm";
import { getDailyWinnerSummary } from "@/lib/daily";
import { fetchMatches } from "@/lib/serverMatches";

export default async function Dashboard() {
  const matches = await fetchMatches();
  const now = new Date();
  const nextMatch = matches.find((match) => new Date(match.kickoffTime) > now) ?? matches[0];
  const dailySummary = await getDailyWinnerSummary();
  return (
    <AppShell>
      {nextMatch ? (
        <Card className="bg-gradient-to-br from-emerald-500 to-pitch-900 text-white">
          <p className="text-sm font-semibold text-emerald-100">Next upcoming match</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-black"><span>{nextMatch.homeFlagEmoji} {nextMatch.homeTeam}</span><span className="text-emerald-100">vs</span><span>{nextMatch.awayFlagEmoji} {nextMatch.awayTeam}</span></h2>
          <p className="mt-1 text-xs font-semibold text-emerald-100">{new Date(nextMatch.kickoffTime).toUTCString()}</p>
          <div className="mt-4"><Countdown target={nextMatch.kickoffTime} /></div>
          <div className="mt-4 rounded-3xl bg-white p-3 text-slate-950">
            <PredictionForm match={nextMatch} serverNowIso={now.toISOString()} />
          </div>
        </Card>
      ) : <SkeletonCard />}

      <Card>
        <SectionTitle eyebrow="Daily winner" title="Daily scoreboard" />
        {dailySummary && dailySummary !== "UNAUTHENTICATED" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-navy p-4 text-white">
              <p className="text-sm font-bold">Daily Rank</p>
              <p className="mt-3 text-3xl font-black">{dailySummary.userRank ? `#${dailySummary.userRank}` : "—"}</p>
              <p className="text-xs text-slate-300">{dailySummary.userPoints} pts • {dailySummary.userAccuracy}% accuracy</p>
            </div>
            <div className="rounded-2xl bg-indigo-600 p-4 text-white">
              <p className="text-sm font-bold">Daily Leader</p>
              <p className="mt-3 truncate text-2xl font-black">{dailySummary.winner?.displayName ?? "No scores"}</p>
              <p className="text-xs text-indigo-100">{dailySummary.finishedMatchCount}/{dailySummary.matchCount} matches scored</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-500">Daily rankings will appear once fixtures and scored predictions are available.</p>
        )}
      </Card>
    </AppShell>
  );
}
