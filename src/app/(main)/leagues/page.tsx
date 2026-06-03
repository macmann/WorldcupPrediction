import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LeagueActions } from "@/components/LeagueActions";
import { getUserLeagues } from "@/lib/leagues";
import { getServerTranslator } from "@/lib/serverI18n";

export default async function LeaguesHub() {
  const t = await getServerTranslator();
  const leagues = await getUserLeagues();
  const privateLeagues = leagues.filter((league) => league.type === "PRIVATE");
  const globalLeague = leagues.find((league) => league.type === "GLOBAL");

  return (
    <AppShell title={t("leagues.title")} eyebrow={t("leagues.eyebrow")}>
      <SectionTitle eyebrow={t("leagues.joined")} title={t("leagues.liveTitle")} />
      <LeagueActions />

      {globalLeague && (
        <Link href={`/leagues/${globalLeague.id}`} className="block">
          <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white transition active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">{t("dashboard.globalStandings")}</p>
                <h3 className="mt-1 text-xl font-black">{globalLeague.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{globalLeague.members} {t("leagues.globalDescription")}</p>
              </div>
              <p className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white">#{globalLeague.rank}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">{t("common.points")}</p><p className="text-lg font-black">{globalLeague.points}</p></div>
              <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">{t("leagues.exact")}</p><p className="text-lg font-black">{globalLeague.exactScoresCount}</p></div>
              <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">{t("common.leader")}</p><p className="truncate text-lg font-black">{globalLeague.leader?.displayName ?? "—"}</p></div>
            </div>
          </Card>
        </Link>
      )}

      <div className="space-y-3">
        <SectionTitle eyebrow={t("leagues.miniEyebrow")} title={t("leagues.miniTitle")} />
        {privateLeagues.length > 0 ? privateLeagues.map((league) => (
          <Link key={league.id} href={`/leagues/${league.id}`} className="block">
            <Card className="transition active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-black">{league.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{league.members} {t("common.members")} • {t("leagues.joinCode")} {league.joinCode}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{t("common.leader")}: {league.leader ? `${league.leader.displayName} (${league.leader.points} ${t("common.pointsShort")})` : t("common.noScoresYet")}</p>
                </div>
                <div className="text-right">
                  <p className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-black text-indigo-700">{t("leagues.rank")} #{league.rank}</p>
                  {league.isOwner && <p className="mt-2 text-xs font-black uppercase tracking-widest text-amber-600">{t("common.owner")}</p>}
                </div>
              </div>
            </Card>
          </Link>
        )) : (
          <Card className="border border-dashed border-slate-300 bg-white/70 text-center">
            <p className="font-black">{t("leagues.noPrivateTitle")}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{t("leagues.noPrivateBody")}</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
