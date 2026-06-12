import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { TeamName, teamNameWithFlag } from "@/components/TeamName";
import { formatAppDate, formatAppDateTime } from "@/lib/dateTime";
import type { MatchOutcome } from "@/lib/frontendData";
import { getPublicUserProfile, type PublicProfilePrediction } from "@/lib/profile";
import { getServerTranslator } from "@/lib/serverI18n";

type T = Awaited<ReturnType<typeof getServerTranslator>>;

type PeopleProfileParams = {
  show?: string;
};

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

function scorePickText(prediction: Pick<PublicProfilePrediction, "predictedHomeScore" | "predictedAwayScore">) {
  if (prediction.predictedHomeScore === null || prediction.predictedAwayScore === null) return "–";
  return `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
}

function resultText(match: PublicProfilePrediction["match"]) {
  if (match.homeScore === null || match.awayScore === null) return "–";
  return `${match.homeScore}-${match.awayScore}`;
}

function PredictionCard({ prediction, t }: { prediction: PublicProfilePrediction; t: T }) {
  const match = prediction.match;

  return (
    <div className="rounded-[1.35rem] bg-white p-4 shadow-[0_14px_34px_rgba(6,20,46,0.07)] ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-black leading-snug text-slate-950"><TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} flagImageUrl={match.homeFlagImageUrl} /><span className="text-slate-400">{t("common.vs")}</span><TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} /></h3>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{formatAppDateTime(match.kickoffTime)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${pointsClass(prediction.pointsAwarded)}`}>+{prediction.pointsAwarded ?? 0} {t("common.pointsShort")}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <div className="rounded-[1.15rem] bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-[11px] font-medium text-slate-400">{t("prediction.winDrawWin")}</p><p className="mt-1 font-black text-slate-900">{outcomeText(prediction.predictedOutcome, match.homeTeam, match.awayTeam, t, match.homeFlagEmoji, match.awayFlagEmoji)}</p></div>
        <div className="rounded-[1.15rem] bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-[11px] font-medium text-slate-400">{t("history.score")}</p><p className="mt-1 font-black text-slate-900">{scorePickText(prediction)}</p></div>
        <div className="rounded-[1.15rem] bg-emerald-50 p-3 ring-1 ring-emerald-100"><p className="text-[11px] font-medium text-emerald-700">{t("history.actual")}</p><p className="mt-1 font-black text-emerald-800">{resultText(match)}</p></div>
        <div className="rounded-[1.15rem] bg-indigo-50 p-3 ring-1 ring-indigo-100"><p className="text-[11px] font-medium text-indigo-700">{t("common.accuracy")}</p><p className="mt-1 font-black text-indigo-800">{prediction.isExactScore ? t("profile.exactScore") : prediction.isCorrectOutcome ? t("profile.correctOutcome") : match.homeScore !== null ? t("profile.missedPick") : t("profile.pendingScore")}</p></div>
      </div>
    </div>
  );
}

export default async function PeopleProfile({ params, searchParams }: { params: { id: string }; searchParams?: PeopleProfileParams | Promise<PeopleProfileParams> }) {
  const t = await getServerTranslator();
  const profile = await getPublicUserProfile(params.id);
  const query = await searchParams;
  const showAll = query?.show === "all";

  if (profile === "UNAUTHENTICATED") {
    return (
      <AppShell title={t("profile.publicTitle")} eyebrow={t("profile.publicEyebrow")}>
        <Card>
          <SectionTitle eyebrow={t("history.signIn")} title={t("profile.signInTitle")} />
          <p className="mt-2 text-sm font-semibold text-slate-500">{t("league.signInRequired")}</p>
        </Card>
      </AppShell>
    );
  }
  if (!profile) notFound();

  const visibleHistory = showAll ? profile.history : profile.history.slice(0, 5);

  return (
    <AppShell title={profile.displayName} eyebrow={t("profile.publicEyebrow")}>
      <Card className="overflow-hidden bg-gradient-to-br from-navy to-indigo-950 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-2xl font-black uppercase ring-1 ring-white/15">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile.displayName.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">{t("profile.publicTitle")}</p>
            <h2 className="mt-2 truncate text-3xl font-black">{profile.displayName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">{t("profile.memberSince")} {formatAppDate(profile.registrationTimestamp, { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs font-bold uppercase tracking-widest text-slate-300">{t("common.totalMarks")}</p><p className="mt-1 text-2xl font-black text-white">{profile.globalPoints}</p></div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs font-bold uppercase tracking-widest text-slate-300">{t("history.exactScores")}</p><p className="mt-1 text-2xl font-black text-white">{profile.exactScoresCount}</p></div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs font-bold uppercase tracking-widest text-slate-300">{t("history.correctOutcomes")}</p><p className="mt-1 text-2xl font-black text-white">{profile.correctOutcomesCount}</p></div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-xs font-bold uppercase tracking-widest text-slate-300">{t("profile.lockedPredictions")}</p><p className="mt-1 text-2xl font-black text-white">{profile.lockedPredictionCount}</p></div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle eyebrow={t("profile.lockedOnlyEyebrow")} title={t("profile.predictionHistory")} />
          {showAll && <Link href={`/people/${profile.id}`} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{t("profile.showLess")}</Link>}
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{t("profile.lockedOnlyHelp")}</p>
        <div className="mt-4 space-y-3">
          {visibleHistory.length ? visibleHistory.map((prediction) => <PredictionCard key={prediction.id} prediction={prediction} t={t} />) : <p className="rounded-[1.25rem] bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">{t("profile.noLockedPredictions")}</p>}
        </div>
        {!showAll && profile.history.length > 5 && (
          <Link href={`/people/${profile.id}?show=all`} className="mt-4 flex w-full items-center justify-center rounded-[1.15rem] bg-navy px-4 py-3 text-sm font-black text-white shadow-lg shadow-navy/20 transition active:scale-[0.98]">
            {t("profile.seeMoreHistory")} ({profile.history.length - 5})
          </Link>
        )}
      </Card>
    </AppShell>
  );
}
