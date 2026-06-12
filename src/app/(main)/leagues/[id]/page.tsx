import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { DailyShareActions } from "@/components/DailyShareActions";
import { getLeagueDetail } from "@/lib/leagues";
import { getServerTranslator } from "@/lib/serverI18n";

type T = Awaited<ReturnType<typeof getServerTranslator>>;

function movementLabel(movement: { direction: "up" | "down" | "same" | "new"; places: number; previousRank: number | null }, t: T) {
  if (movement.direction === "up") return `▲ ${t("league.movementUp")} ${movement.places} from #${movement.previousRank}`;
  if (movement.direction === "down") return `▼ ${t("league.movementDown")} ${movement.places} from #${movement.previousRank}`;
  if (movement.direction === "same") return `${t("league.movementHolding")} #${movement.previousRank}`;
  return t("league.movementNew");
}

export default async function LeagueDetail({ params }: { params: { id: string } }) {
  const t = await getServerTranslator();
  const league = await getLeagueDetail(params.id);
  if (league === "UNAUTHENTICATED") {
    return (
      <AppShell title={t("league.title")} eyebrow={t("league.table")}>
        <Card>
          <SectionTitle eyebrow={t("league.loading")} title={t("league.checkingSession")} />
          <p className="mt-2 text-sm font-semibold text-slate-500">{t("league.signInRequired")}</p>
        </Card>
      </AppShell>
    );
  }
  if (!league) notFound();

  return (
    <AppShell title={league.name} eyebrow={league.type === "GLOBAL" ? t("league.globalTable") : t("league.table")}>
      <Card className="bg-gradient-to-br from-navy to-indigo-950 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">{t("league.position")}</p>
            <h2 className="mt-2 text-4xl font-black">#{league.userRank}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">{league.userPoints} {t("league.pointsFromPredictions")}</p>
            <p className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-200 ring-1 ring-white/10">{movementLabel(league.rankMovement, t)}</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-right ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">{t("common.members")}</p>
            <p className="text-3xl font-black">{league.memberCount}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">{t("leagues.joinCode")}</p>
            <p className="mt-1 font-black tracking-[0.2em] text-emerald-200">{league.joinCode}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">{t("league.role")}</p>
            <p className="mt-1 font-black">{league.isOwner ? t("common.owner") : t("common.member")}</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow={t("league.shareEyebrow")} title={t("league.shareTitle")} />
        <p className="mt-2 text-sm font-semibold text-slate-500">{t("league.shareBody")}</p>
        <div className="mt-4"><DailyShareActions text={league.shareText} path={`/leagues/${league.id}`} title={`${league.name} standings`} buttonLabel={t("league.shareButton")} copiedLabel={t("league.shareCopied")} /></div>
      </Card>

      <Card>
        <SectionTitle eyebrow={t("league.tieBreakers")} title={t("league.standingsTitle")} />
        <p className="mt-2 text-sm font-semibold text-slate-500">{t("league.standingsBody")}</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">#</th><th>{t("league.player")}</th><th>{t("common.totalMarks")}</th><th>{t("league.joinedAt")}</th></tr>
            </thead>
            <tbody>
              {league.leaderboard.map((row) => (
                <tr key={row.user.id} className="border-t border-slate-100">
                  <td className="p-3 font-black">{row.rank}</td>
                  <td className="font-bold"><Link href={`/people/${row.user.id}`} className="text-navy underline-offset-4 hover:underline">{row.user.displayName}</Link></td>
                  <td>{row.user.globalPoints}</td>
                  <td className="pr-3 text-xs font-semibold text-slate-500">{new Date(row.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
