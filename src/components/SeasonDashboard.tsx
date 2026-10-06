"use client";

import Link from "next/link";
import { Card } from "./Cards";
import { BallIcon, TrophyIcon, ArrowUpRightIcon } from "./Icons";
import { useStore } from "@/store/useStore";
import { formatAppDateTime } from "@/lib/dateTime";
import type { ClientPlatformView } from "@/lib/platformClient";

export function ClubBadge({ name, image }: { name: string; image?: string | null }) {
  return <span className="club-badge" aria-hidden="true">{image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <span>{name.split(/\s+/).map(word => word[0]).join("").slice(0, 3).toUpperCase()}</span>}</span>;
}

export function SeasonDashboard({ view }: { view: ClientPlatformView }) {
  const { t } = useStore();
  const week = view.currentGameweek;
  const total = view.progress.total;
  const complete = view.progress.complete;
  const percentage = total ? Math.round(complete * 100 / total) : 0;
  const banker = view.matches.find(match => match.isBanker);
  const live = view.matches.filter(match => ["LIVE", "PAUSED"].includes(match.status));
  const upcoming = view.matches.filter(match => match.status === "SCHEDULED").slice(0, 3);
  const results = view.matches.filter(match => match.status === "FINISHED").slice(0, 3);
  const fixtures = [...live, ...upcoming, ...results].slice(0, 5);
  return <div className="season-dashboard">
    <section className="matchday-hero">
      <div className="pitch-art" aria-hidden="true"><span /></div>
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2"><span className="season-chip"><BallIcon className="h-3.5 w-3.5" />{t("ui.matchday")}</span><span className="text-xs font-semibold text-white/65">{view.season.displayName}</span></div>
        <p className="mt-6 text-sm font-semibold text-white/70">{view.season.competition.name}</p>
        <h2 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{week ? `${t("platform.gameweek")} ${week.number}` : view.season.displayName}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">{t("ui.weeklyChallenge")}</p>
        <div className="mt-7 flex items-center gap-4"><div className="completion-ring" style={{ "--completion": `${percentage}%` } as React.CSSProperties}><span>{complete}<small>/{total}</small></span></div><div><p className="text-sm font-bold">{t("platform.predictions")}</p><p className="mt-1 text-xs text-white/65">{total === 0 ? t("platform.noFixtures") : complete === total ? t("ui.readyForKickoff") : `${Math.max(0, total - complete)} ${t("ui.leftToPredict")}`}</p></div></div>
        <Link href="/predict" className="matchday-cta mt-6">{t("platform.continue")}<ArrowUpRightIcon className="h-5 w-5" /></Link>
        <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-xs text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /><span>{t("platform.nextDeadline")}</span><strong className="ml-auto text-white">{view.nextDeadline ? formatAppDateTime(view.nextDeadline) : "—"}</strong></div>
      </div>
    </section>
    <Card className="fixture-feed"><div className="mb-4 flex items-center justify-between"><div><p className="section-kicker">{t("ui.onThePitch")}</p><h2 className="mt-1 text-lg font-black">{t("ui.matchCentre")}</h2></div>{live.length > 0 && <span className="live-pill"><span />{live.length} {t("platform.live")}</span>}</div>
      {fixtures.length ? fixtures.map(match => <Link key={match.id} href="/predict" className="fixture-row"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>{["LIVE", "PAUSED"].includes(match.status) ? <span className="text-rose-600">● {t("platform.live")}</span> : match.status === "FINISHED" ? t("platform.final") : formatAppDateTime(match.kickoffTime)}</span>{match.isBanker && <span className="text-amber-700">{t("platform.banker")}</span>}</div><div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className="flex min-w-0 items-center gap-2"><ClubBadge name={match.homeTeam} image={match.homeFlagImageUrl} /><span className="text-xs font-bold">{match.homeTeam}</span></div><span className="score-chip">{match.status === "SCHEDULED" ? "vs" : `${match.homeScore ?? "—"} : ${match.awayScore ?? "—"}`}</span><div className="flex min-w-0 items-center justify-end gap-2 text-right"><span className="text-xs font-bold">{match.awayTeam}</span><ClubBadge name={match.awayTeam} image={match.awayFlagImageUrl} /></div></div></Link>) : <div className="season-empty"><BallIcon className="h-9 w-9 text-emerald-700" /><h3>{t("ui.fixturesComing")}</h3><p>{t("platform.noFixtures")}</p></div>}
      {fixtures.length > 0 && <Link href="/predict" className="mt-4 flex items-center justify-between text-xs font-bold text-emerald-800">{t("ui.allFixtures")}<span aria-hidden="true">→</span></Link>}
    </Card>
    <Card className="banker-panel"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-xl font-black text-amber-800">×2</span><div><p className="section-kicker text-amber-700">{t("ui.yourEdge")}</p><h2 className="mt-1 font-black">{t("platform.banker")}</h2></div></div><p className="mt-4 text-sm font-bold">{banker ? `${banker.homeTeam} · ${banker.awayTeam}` : t("ui.bankerMissing")}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{t("platform.bankerHelp")}</p><Link href="/predict" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-amber-800">{banker ? t("platform.predictions") : t("platform.chooseBanker")}<span aria-hidden="true">→</span></Link></Card>
    <Link href="/season-picks" className="season-picks-teaser"><TrophyIcon className="h-8 w-8 shrink-0" /><div><p className="font-black">{t("platform.picks")}</p><p className="mt-1 text-xs opacity-75">{t("ui.longGame")}</p></div><ArrowUpRightIcon className="ml-auto h-5 w-5" /></Link>
  </div>;
}
