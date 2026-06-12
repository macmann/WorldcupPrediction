import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { DailyShareActions } from "@/components/DailyShareActions";
import { TeamName, teamNameWithFlag } from "@/components/TeamName";
import { getDailyWinnerSummary } from "@/lib/daily";
import { fetchMatches } from "@/lib/serverMatches";
import type { Match, MatchOutcome } from "@/lib/frontendData";
import { formatAppDate, formatAppDateTime } from "@/lib/dateTime";
import { getServerTranslator } from "@/lib/serverI18n";

type T = Awaited<ReturnType<typeof getServerTranslator>>;

type HistorySearchParams = {
  section?: string;
  tab?: string;
  date?: string;
};

function formatDate(date: string) {
  return formatAppDate(`${date}T00:00:00.000Z`, { month: "short", day: "numeric" });
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

function outcomeText(outcome: MatchOutcome | null | undefined, homeTeam: string, awayTeam: string, t: T, homeFlagEmoji?: string | null, awayFlagEmoji?: string | null) {
  if (outcome === "HOME") return `${teamNameWithFlag(homeTeam, homeFlagEmoji)} ${t("prediction.win")}`;
  if (outcome === "AWAY") return `${teamNameWithFlag(awayTeam, awayFlagEmoji)} ${t("prediction.win")}`;
  if (outcome === "DRAW") return t("prediction.draw");
  return "–";
}

function scorePickText(prediction: { predictedHomeScore?: number | null; predictedAwayScore?: number | null } | null | undefined) {
  if (!prediction || prediction.predictedHomeScore === null || prediction.predictedHomeScore === undefined || prediction.predictedAwayScore === null || prediction.predictedAwayScore === undefined) return "–";
  return `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
}

function HistorySectionTabs({ activeSection, t }: { activeSection: "daily" | "history"; t: T }) {
  const tabs = [
    { section: "daily", label: t("history.dailyTab"), active: activeSection === "daily" },
    { section: "history", label: t("history.historyTab"), active: activeSection === "history" }
  ] as const;

  return (
    <div className="rounded-[1.4rem] bg-white/80 p-1.5 shadow-[0_10px_28px_rgba(6,20,46,0.08)] ring-1 ring-slate-200/70 backdrop-blur">
      <div className="grid grid-cols-2 gap-1">
        {tabs.map((tab) => (
          <Link key={tab.section} href={{ pathname: "/history", query: { section: tab.section } }} className={`rounded-[1.1rem] px-4 py-2.5 text-center text-sm font-black transition active:scale-[0.98] ${tab.active ? "bg-navy text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function HistoryMatchCard({ match, missed, t }: { match: Match; missed?: boolean; t: T }) {
  const points = match.prediction?.pointsAwarded ?? 0;
  return (
    <Card key={match.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-black leading-snug text-slate-950"><TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} flagImageUrl={match.homeFlagImageUrl} /><span className="text-slate-400">{t("common.vs")}</span><TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} /></h3>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{formatAppDateTime(match.kickoffTime)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${pointsClass(points)}`}>+{points} {t("common.pointsShort")}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[1.25rem] bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-[11px] font-medium text-slate-400">{t("prediction.winDrawWin")}</p><p className="mt-1 text-sm font-black text-slate-900">{missed ? t("history.missed") : outcomeText(match.prediction?.predictedOutcome, match.homeTeam, match.awayTeam, t, match.homeFlagEmoji, match.awayFlagEmoji)}</p></div>
        <div className="rounded-[1.25rem] bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-[11px] font-medium text-slate-400">{t("history.score")}</p><p className={`${missed ? "text-sm" : "text-xl"} mt-1 font-black text-slate-900`}>{missed ? t("history.missed") : scorePickText(match.prediction)}</p></div>
        <div className="rounded-[1.25rem] bg-emerald-50 p-3 ring-1 ring-emerald-100"><p className="text-[11px] font-medium text-emerald-700">{t("history.actual")}</p><p className="mt-1 text-xl font-black text-emerald-800">{match.homeScore ?? "–"}-{match.awayScore ?? "–"}</p></div>
      </div>
    </Card>
  );
}

async function DailyHistorySection({ date, t }: { date?: string; t: T }) {
  const summary = await getDailyWinnerSummary(date);

  if (summary === "UNAUTHENTICATED") {
    return (
      <Card>
        <SectionTitle eyebrow={t("history.signIn")} title={t("history.trackDaily")} />
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{t("league.signInRequired")}</p>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <SectionTitle eyebrow={t("predict.fixtures")} title={t("history.dailyTitle")} />
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{t("history.noDaily")}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden bg-gradient-to-br from-navy via-[#111f49] to-emerald-900 text-white shadow-[0_18px_44px_rgba(6,20,46,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">{formatDate(summary.selectedDate)}</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight">{summary.userRank ? `#${summary.userRank}` : t("predict.today")}</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-300">{summary.userPoints} {t("history.points")} • {summary.userAccuracy}% {t("common.accuracy")} • {summary.finishedMatchCount} {t("common.members")}</p>
          </div>
          <div className="rounded-[1.35rem] bg-white/10 p-4 text-right ring-1 ring-white/10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{t("dashboard.matchesScored")}</p>
            <p className="text-3xl font-black">{summary.finishedMatchCount}/{summary.matchCount}</p>
          </div>
        </div>
        {summary.winner && (
          <div className="mt-5 rounded-[1.35rem] bg-white/10 p-4 ring-1 ring-white/10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">{t("dashboard.dailyLeader")}</p>
            <p className="mt-1 text-xl font-black">{summary.winner.displayName}</p>
            <p className="text-sm font-medium leading-6 text-slate-300">{summary.winner.points} {t("common.pointsShort")} • {summary.winner.accuracy}% {t("common.accuracy")} • {summary.winner.exactScores} {t("history.exactScores")}</p>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle eyebrow={t("league.shareEyebrow")} title={t("history.shareDaily")} />
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{t("history.pickDate")}</p>
        <div className="mt-4"><DailyShareActions text={summary.shareText} date={summary.selectedDate} path={`/history?section=daily&date=${summary.selectedDate}`} buttonLabel={t("history.dailyShareButton")} copiedLabel={t("history.dailyShareCopied")} /></div>
      </Card>

      <Card>
        <SectionTitle eyebrow={t("predict.byDate")} title={t("dashboard.dailyScoreboard")} />
        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {summary.availableDates.map((availableDate) => (
            <Link key={availableDate} href={{ pathname: "/history", query: { section: "daily", date: availableDate } }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${availableDate === summary.selectedDate ? "bg-navy text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {formatDate(availableDate)}
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow={t("history.yourDailyCard")} title={t("dashboard.dailyScoreboard")} />
        <div className="mt-4 space-y-3">
          {summary.matches.map((match) => (
            <div key={match.id} className="rounded-[1.25rem] border border-slate-100 bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-2 text-base font-black leading-snug text-slate-950"><TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} flagImageUrl={match.homeFlagImageUrl} /><span className="text-slate-400">{t("common.vs")}</span><TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} /></h3>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{formatAppDateTime(match.kickoffTime)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${pointsClass(match.prediction?.pointsAwarded)}`}>+{match.prediction?.pointsAwarded ?? 0}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                <div className="rounded-[1.15rem] bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-[11px] font-medium text-slate-400">{t("prediction.winDrawWin")}</p><p className="mt-1 font-black text-slate-900">{outcomeText(match.prediction?.predictedOutcome, match.homeTeam, match.awayTeam, t, match.homeFlagEmoji, match.awayFlagEmoji)}</p></div>
                <div className="rounded-[1.15rem] bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-[11px] font-medium text-slate-400">{t("history.score")}</p><p className="mt-1 font-black text-slate-900">{scorePickText(match.prediction)}</p></div>
                <div className="rounded-[1.15rem] bg-emerald-50 p-3 ring-1 ring-emerald-100"><p className="text-[11px] font-medium text-emerald-700">{t("history.actual")}</p><p className="mt-1 font-black text-emerald-800">{resultText(match)}</p></div>
                <div className="rounded-[1.15rem] bg-indigo-50 p-3 ring-1 ring-indigo-100"><p className="text-[11px] font-medium text-indigo-700">{t("common.accuracy")}</p><p className="mt-1 font-black text-indigo-800">{match.prediction?.isCorrectOutcome ? "100%" : match.homeScore !== null ? "0%" : "–"}</p></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow={t("history.leaderboard")} title={t("history.dailyRanking")} />
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{t("history.leaderboardHelp")}</p>
        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr><th className="p-3">#</th><th>{t("history.player")}</th><th>{t("common.pointsShort")}</th><th>{t("common.accuracy")}</th></tr>
            </thead>
            <tbody>
              {summary.leaderboard.length ? summary.leaderboard.map((row) => (
                <tr key={row.userId} className={`border-t border-slate-100 ${row.isCurrentUser ? "bg-emerald-50" : ""}`}>
                  <td className="p-3 font-black">{row.rank}</td>
                  <td className="font-bold"><Link href={`/people/${row.userId}`} className="text-navy underline-offset-4 hover:underline">{row.displayName}</Link><span className="block text-xs font-medium text-slate-500">{row.exactScores} {t("history.exactScores")} • {row.correctOutcomes}/{summary.finishedMatchCount} {t("history.correctOutcomes")}</span></td>
                  <td className="font-black">{row.points}</td>
                  <td className="pr-3 font-black text-emerald-700">{row.accuracy}%</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-4 text-center text-sm font-medium text-slate-500">{t("history.noScoredPredictions")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

async function PredictionHistorySection({ activeTab, t }: { activeTab: "predicted" | "missed"; t: T }) {
  const matches = await fetchMatches();
  const past = matches
    .filter((match) => match.status === "FINISHED" || (match.homeScore !== null && match.homeScore !== undefined))
    .sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime());
  const predicted = past.filter((match) => Boolean(match.prediction));
  const missed = past.filter((match) => !match.prediction);
  const renderMatches = activeTab === "missed" ? missed : predicted;

  return (
    <>
      <SectionTitle eyebrow={t("history.finished")} title={t("history.pointsTimeline")} />
      <div className="flex gap-2 rounded-[1.25rem] bg-white p-1.5 shadow-[0_10px_28px_rgba(6,20,46,0.06)] ring-1 ring-slate-100">
        <Link href={{ pathname: "/history", query: { section: "history", tab: "predicted" } }} className={`flex-1 rounded-[1rem] px-4 py-2 text-center text-xs font-black transition active:scale-[0.98] ${activeTab === "predicted" ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-100"}`}>
          {t("history.predicted")} ({predicted.length})
        </Link>
        <Link href={{ pathname: "/history", query: { section: "history", tab: "missed" } }} className={`flex-1 rounded-[1rem] px-4 py-2 text-center text-xs font-black transition active:scale-[0.98] ${activeTab === "missed" ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-100"}`}>
          {t("history.missed")} ({missed.length})
        </Link>
      </div>
      <div className="space-y-3">
        {renderMatches.length ? renderMatches.map((match) => <HistoryMatchCard key={match.id} match={match} missed={activeTab === "missed"} t={t} />) : (
          <Card><p className="text-sm font-medium leading-6 text-slate-500">{t("history.noFinishedPrefix")} {activeTab === "missed" ? t("history.missed") : t("history.predicted")} {t("history.noFinishedSuffix")}</p></Card>
        )}
      </div>
    </>
  );
}

export default async function History({ searchParams }: { searchParams?: HistorySearchParams | Promise<HistorySearchParams> }) {
  const t = await getServerTranslator();
  const params = await searchParams;
  const activeSection = params?.section === "history" ? "history" : "daily";
  const activeTab = params?.tab === "missed" ? "missed" : "predicted";

  return (
    <AppShell title={t("history.title")} eyebrow={t("history.eyebrow")}>
      <HistorySectionTabs activeSection={activeSection} t={t} />
      {activeSection === "daily" ? <DailyHistorySection date={params?.date} t={t} /> : <PredictionHistorySection activeTab={activeTab} t={t} />}
    </AppShell>
  );
}
