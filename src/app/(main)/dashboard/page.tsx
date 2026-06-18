import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle, SkeletonCard } from "@/components/Cards";
import { Countdown } from "@/components/Countdown";
import { TeamName } from "@/components/TeamName";
import { getDailyWinnerSummary } from "@/lib/daily";
import { getUserLeagues } from "@/lib/leagues";
import { fetchMatches } from "@/lib/serverMatches";
import { formatAppDateTime } from "@/lib/dateTime";
import { getServerTranslator } from "@/lib/serverI18n";

export default async function Dashboard() {
  const t = await getServerTranslator();
  const [matches, leagues, dailySummary] = await Promise.all([
    fetchMatches(),
    getUserLeagues(),
    getDailyWinnerSummary()
  ]);
  const now = new Date();
  const nextMatch = matches.find((match) => new Date(match.kickoffTime) > now) ?? matches[0];
  const globalLeague = leagues.find((league) => league.type === "GLOBAL");
  const privateLeagues = leagues.filter((league) => league.type === "PRIVATE").slice(0, 2);
  return (
    <AppShell>
      {nextMatch ? (
        <Card className="bg-gradient-to-br from-emerald-500 to-pitch-900 text-white">
          <p className="text-sm font-semibold text-emerald-100">{t("dashboard.nextMatch")}</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-black"><TeamName name={nextMatch.homeTeam} flagEmoji={nextMatch.homeFlagEmoji} flagImageUrl={nextMatch.homeFlagImageUrl} flagClassName="ring-white/30" /><span className="text-emerald-100">{t("common.vs")}</span><TeamName name={nextMatch.awayTeam} flagEmoji={nextMatch.awayFlagEmoji} flagImageUrl={nextMatch.awayFlagImageUrl} flagClassName="ring-white/30" /></h2>
          <p className="mt-1 text-xs font-semibold text-emerald-100">{formatAppDateTime(nextMatch.kickoffTime)}</p>
          <div className="mt-4"><Countdown target={nextMatch.kickoffTime} /></div>
          <p className="mt-4 text-sm font-semibold text-emerald-50">{t("dashboard.predictAvailable")}</p>
          <Link href="/predict" className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50">
            {t("dashboard.goPredict")}
          </Link>
        </Card>
      ) : <SkeletonCard />}

      <Card>
        <SectionTitle
          eyebrow={t("dashboard.leaguesEyebrow")}
          title={t("dashboard.leaguesTitle")}
          action={<Link href="/leagues" className="text-sm font-black text-emerald-700">{t("dashboard.viewAll")}</Link>}
        />
        {leagues.length > 0 ? (
          <div className="mt-3 space-y-3">
            {globalLeague && (
              <Link href={`/leagues/${globalLeague.id}`} className="block rounded-2xl border border-emerald-100 bg-emerald-50 p-3 transition active:scale-[0.99]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700">{t("dashboard.globalStandings")}</p>
                    <p className="truncate text-base font-black text-slate-950">{globalLeague.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{globalLeague.members} {t("common.members")} • {t("common.leader")} {globalLeague.leader?.displayName ?? "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white">#{globalLeague.rank}</p>
                    <p className="mt-1 text-xs font-black text-emerald-800">{globalLeague.points} {t("common.pointsShort")}</p>
                  </div>
                </div>
              </Link>
            )}
            {privateLeagues.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {privateLeagues.map((league) => (
                  <Link key={league.id} href={`/leagues/${league.id}`} className="block rounded-2xl bg-slate-100 p-3 transition active:scale-[0.99]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{league.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{league.members} {t("common.members")}</p>
                      </div>
                      <p className="shrink-0 rounded-full bg-indigo-100 px-2 py-1 text-xs font-black text-indigo-700">#{league.rank}</p>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-500">{t("common.leader")}: {league.leader ? `${league.leader.displayName} (${league.leader.points} ${t("common.pointsShort")})` : t("common.noScoresYet")}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-500">{t("dashboard.noLeagues")}</p>
        )}
      </Card>

      <Card>
        <SectionTitle eyebrow={t("dashboard.dailyWinner")} title={t("dashboard.dailyScoreboard")} />
        {dailySummary && dailySummary !== "UNAUTHENTICATED" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-navy p-4 text-white">
              <p className="text-sm font-bold">{t("dashboard.dailyRank")}</p>
              <p className="mt-3 text-3xl font-black">{dailySummary.userRank ? `#${dailySummary.userRank}` : "—"}</p>
              <p className="text-xs text-slate-300">{dailySummary.userPoints} {t("common.pointsShort")} • {dailySummary.userAccuracy}% {t("common.accuracy")}</p>
            </div>
            <div className="rounded-2xl bg-indigo-600 p-4 text-white">
              <p className="text-sm font-bold">{t("dashboard.dailyLeader")}</p>
              <p className="mt-3 truncate text-2xl font-black">{dailySummary.winner?.displayName ?? t("common.noScoresYet")}</p>
              <p className="text-xs text-indigo-100">{dailySummary.finishedMatchCount}/{dailySummary.matchCount} {t("dashboard.matchesScored")}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-500">{t("dashboard.unavailable")}</p>
        )}
      </Card>

      <Link
        href="/highlights"
        className="group block overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_12%_20%,rgba(248,113,113,0.32),transparent_30%),linear-gradient(135deg,#111827_0%,#7f1d1d_52%,#dc2626_100%)] p-5 text-white shadow-[0_18px_42px_rgba(127,29,29,0.16)] transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-100/80">Watch daily highlights</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Completed match videos</h2>
            <p className="mt-2 text-sm font-semibold text-red-50/85">Tap a finished score and watch the highlight inside the app.</p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-2xl ring-1 ring-white/20 transition group-hover:translate-x-1">▶</span>
        </div>
      </Link>

      <Link
        href="/tournament-view"
        className="group block overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_12%_20%,rgba(103,232,249,0.34),transparent_28%),linear-gradient(135deg,#06142e_0%,#12356d_56%,#0f766e_100%)] p-5 text-white shadow-[0_18px_42px_rgba(6,20,46,0.18)] transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/80">New bracket hub</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">World Cup 2026 Tournament View</h2>
            <p className="mt-2 text-sm font-semibold text-blue-100/85">Browse groups, points, and knockout fixtures in a mobile-first tournament board.</p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-2xl ring-1 ring-white/20 transition group-hover:translate-x-1">→</span>
        </div>
      </Link>
    </AppShell>
  );
}
