import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { DailyShareActions } from "@/components/DailyShareActions";
import { TeamName, teamNameWithFlag } from "@/components/TeamName";
import { getDailyWinnerSummary } from "@/lib/daily";

function formatDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function resultText(match: { homeScore: number | null; awayScore: number | null }) {
  if (match.homeScore === null || match.awayScore === null) return "–";
  return `${match.homeScore}-${match.awayScore}`;
}

function pointsClass(points: number | null | undefined) {
  if ((points ?? 0) >= 3) return "bg-emerald-100 text-emerald-800";
  if (points === 1) return "bg-indigo-100 text-indigo-800";
  if (points === 0) return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-800";
}

function outcomeText(outcome: "HOME" | "DRAW" | "AWAY" | null | undefined, homeTeam: string, awayTeam: string, homeFlagEmoji?: string | null, awayFlagEmoji?: string | null) {
  if (outcome === "HOME") return `${teamNameWithFlag(homeTeam, homeFlagEmoji)} win`;
  if (outcome === "AWAY") return `${teamNameWithFlag(awayTeam, awayFlagEmoji)} win`;
  if (outcome === "DRAW") return "Draw";
  return "–";
}

function scorePickText(prediction: { predictedHomeScore: number | null; predictedAwayScore: number | null } | null) {
  if (!prediction || prediction.predictedHomeScore === null || prediction.predictedAwayScore === null) return "–";
  return `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
}

export default async function DailyWinnerPage({ searchParams }: { searchParams: { date?: string } }) {
  const summary = await getDailyWinnerSummary(searchParams.date);

  if (summary === "UNAUTHENTICATED") {
    return (
      <AppShell title="Daily Winner" eyebrow="Daily crown">
        <Card>
          <SectionTitle eyebrow="Sign in" title="Track daily winners" />
          <p className="mt-2 text-sm font-semibold text-slate-500">You need to sign in before viewing daily scores and leaderboards.</p>
        </Card>
      </AppShell>
    );
  }

  if (!summary) {
    return (
      <AppShell title="Daily Winner" eyebrow="Daily crown">
        <Card>
          <SectionTitle eyebrow="Fixtures" title="Waiting for match data" />
          <p className="mt-2 text-sm font-semibold text-slate-500">Daily scoreboards will appear once World Cup fixtures are synced.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Daily Winner" eyebrow="Daily crown">
      <Card className="overflow-hidden bg-gradient-to-br from-navy via-indigo-950 to-emerald-900 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">{formatDate(summary.selectedDate)}</p>
            <h2 className="mt-2 text-4xl font-black">{summary.userRank ? `#${summary.userRank}` : "Play today"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">{summary.userPoints} points • {summary.userAccuracy}% accuracy from {summary.finishedMatchCount} available matches</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-right ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Matches</p>
            <p className="text-3xl font-black">{summary.finishedMatchCount}/{summary.matchCount}</p>
          </div>
        </div>
        {summary.winner && (
          <div className="mt-5 rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Current daily winner</p>
            <p className="mt-1 text-xl font-black">{summary.winner.displayName}</p>
            <p className="text-sm font-semibold text-slate-300">{summary.winner.points} pts • {summary.winner.accuracy}% accuracy • {summary.winner.exactScores} exact</p>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle eyebrow="Share" title="Post your daily accuracy" />
        <p className="mt-2 text-sm font-semibold text-slate-500">Share your rank, score, and accuracy percentage to your social channels.</p>
        <div className="mt-4"><DailyShareActions text={summary.shareText} date={summary.selectedDate} /></div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Dates" title="Daily scoreboards" />
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {summary.availableDates.map((date) => (
            <Link key={date} href={`/daily?date=${date}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${date === summary.selectedDate ? "bg-navy text-white" : "bg-slate-100 text-slate-700"}`}>
              {formatDate(date)}
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Your day" title="Daily scores" />
        <div className="mt-4 space-y-3">
          {summary.matches.map((match) => (
            <div key={match.id} className="rounded-2xl border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex flex-wrap items-center gap-2 font-black"><TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} /><span className="text-slate-400">vs</span><TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} /></h3>
                  <p className="text-xs font-semibold text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${pointsClass(match.prediction?.pointsAwarded)}`}>+{match.prediction?.pointsAwarded ?? 0}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">W/D/W</p><p className="font-black">{outcomeText(match.prediction?.predictedOutcome, match.homeTeam, match.awayTeam, match.homeFlagEmoji, match.awayFlagEmoji)}</p></div>
                <div className="rounded-2xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Score</p><p className="font-black">{scorePickText(match.prediction)}</p></div>
                <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Actual</p><p className="font-black text-emerald-800">{resultText(match)}</p></div>
                <div className="rounded-2xl bg-indigo-50 p-3"><p className="text-xs text-indigo-700">Accuracy</p><p className="font-black text-indigo-800">{match.prediction?.isCorrectOutcome ? "100%" : match.homeScore !== null ? "0%" : "–"}</p></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow="Leaderboard" title="Daily ranking" />
        <p className="mt-2 text-sm font-semibold text-slate-500">Sorted by daily points, exact scores, correct outcomes, then earliest registration.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">#</th><th>Player</th><th>Pts</th><th>Acc</th></tr>
            </thead>
            <tbody>
              {summary.leaderboard.length ? summary.leaderboard.map((row) => (
                <tr key={row.userId} className={`border-t border-slate-100 ${row.isCurrentUser ? "bg-emerald-50" : ""}`}>
                  <td className="p-3 font-black">{row.rank}</td>
                  <td className="font-bold">{row.displayName}<span className="block text-xs font-semibold text-slate-500">{row.exactScores} exact • {row.correctOutcomes}/{summary.finishedMatchCount} correct</span></td>
                  <td className="font-black">{row.points}</td>
                  <td className="pr-3 font-black text-emerald-700">{row.accuracy}%</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-4 text-center text-sm font-semibold text-slate-500">No scored predictions for this date yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
