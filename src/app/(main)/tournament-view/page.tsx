"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PlatformLogo } from "@/components/Icons";

const stages = ["GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"] as const;
const bracketStages = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"] as const;

type TeamRow = { id: string; rank: number; name: string; flagEmoji?: string | null; played: number; won: number; drawn: number; lost: number; goalDifference: number; points: number };
type Group = { name: string; teams: TeamRow[] };
type Fixture = { id: number; stage: string; kickoffTime: string; venue?: string | null; status: string; homeTeam: string; awayTeam: string; homeScore?: number | null; awayScore?: number | null; homeFlagEmoji?: string | null; awayFlagEmoji?: string | null };
type TournamentViewPayload = { tournament?: { name: string } | null; currentStage: string; groups: Group[]; knockoutFixtures: Fixture[] };

function FlagBadge({ children }: { children?: React.ReactNode }) {
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 bg-white/12 text-sm shadow-inner shadow-white/10">{children ?? <span className="h-3 w-3 rounded-full bg-cyan-200/60" />}</span>;
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = { GROUP: "Group stage", ROUND_OF_32: "Round of 32", ROUND_OF_16: "Round of 16", QUARTER_FINAL: "Quarter-finals", SEMI_FINAL: "Semi-finals", THIRD_PLACE: "Third place", FINAL: "Final" };
  return labels[stage] ?? stage.replaceAll("_", " ");
}

function TeamSlot({ name, flag, score }: { name: string; flag?: string | null; score?: number | null }) {
  return <div className="flex items-center gap-2 rounded-2xl bg-white/9 px-3 py-2.5 ring-1 ring-white/8"><FlagBadge>{flag}</FlagBadge><span className="min-w-0 flex-1 truncate font-black text-slate-50">{name}</span>{score !== null && score !== undefined ? <span className="font-black text-white">{score}</span> : null}</div>;
}

export default function TournamentViewPage() {
  const [data, setData] = useState<TournamentViewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/tournaments/view", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to load tournament data");
        return response.json() as Promise<TournamentViewPayload>;
      })
      .then((payload) => { if (isMounted) setData(payload); })
      .catch((loadError) => { if (isMounted) setError(loadError instanceof Error ? loadError.message : "Unable to load tournament data"); })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const showBracket = data?.currentStage !== "GROUP";
  const fixturesByStage = useMemo(() => {
    const grouped = new Map<string, Fixture[]>();
    for (const fixture of data?.knockoutFixtures ?? []) grouped.set(fixture.stage, [...(grouped.get(fixture.stage) ?? []), fixture]);
    return grouped;
  }, [data?.knockoutFixtures]);

  const groupContent = !isLoading && !error && !showBracket ? (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(data?.groups ?? []).map((group) => (
        <article key={group.name} className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#12356d]/62 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
          <div className="grid grid-cols-[1fr_2.25rem_2.25rem_2.25rem_2.25rem] gap-2 border-b border-white/10 bg-white/10 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
            <h2 className="text-sm normal-case tracking-normal text-white">{group.name}</h2>
            <span>P</span><span>GD</span><span>PTS</span><span />
          </div>
          <div className="divide-y divide-white/8">
            {group.teams.map((team) => (
              <div key={team.id} className="grid grid-cols-[1.15rem_1.75rem_minmax(0,1fr)_2.25rem_2.25rem_2.25rem] items-center gap-2 px-3 py-3 text-sm">
                <span className="text-xs font-black text-cyan-100/70">{team.rank}</span><FlagBadge>{team.flagEmoji}</FlagBadge><span className="truncate font-bold text-slate-50">{team.name}</span><span className="text-center font-bold text-cyan-50/80">{team.played}</span><span className="text-center font-bold text-cyan-50/80">{team.goalDifference}</span><span className="text-right font-black text-white">{team.points}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  ) : null;

  const bracketContent = !isLoading && !error && showBracket ? (
    <div className="flex gap-3 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {bracketStages.map((stage) => {
        const stageFixtures = fixturesByStage.get(stage) ?? [];
        return (
          <section key={stage} className="min-w-[18rem] flex-1 space-y-3">
            <h2 className={`sticky top-0 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] ${data?.currentStage === stage ? "bg-cyan-200 text-slate-950" : "bg-white/10 text-cyan-100 ring-1 ring-white/10"}`}>{stageLabel(stage)}</h2>
            {stageFixtures.map((fixture) => (
              <article key={fixture.id} className="overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#0d2a5d]/72 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur">
                <div className="border-b border-white/10 bg-cyan-200/10 px-3 py-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">Match {fixture.id}</p>
                  {fixture.venue ? <p className="mt-1 truncate text-[10px] font-bold text-cyan-50/70">{fixture.venue}</p> : null}
                </div>
                <div className="space-y-2 p-3"><TeamSlot name={fixture.homeTeam} flag={fixture.homeFlagEmoji} score={fixture.homeScore} /><TeamSlot name={fixture.awayTeam} flag={fixture.awayFlagEmoji} score={fixture.awayScore} /></div>
              </article>
            ))}
            {stageFixtures.length === 0 ? <div className="rounded-[1.35rem] border border-dashed border-white/15 bg-white/5 p-4 text-sm font-bold text-cyan-50/70">Bracket will appear when teams are confirmed.</div> : null}
          </section>
        );
      })}
    </div>
  ) : null;

  return (
    <AuthGate>
      <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.35),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(20,184,166,0.18),transparent_30%),linear-gradient(180deg,#03112b_0%,#061a3c_48%,#020a1d_100%)] text-white">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06183a]/85 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
            <Link href="/dashboard" aria-label="Close tournament view" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition active:scale-95"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></Link>
            <div className="flex flex-col items-center gap-2 text-center"><span className="grid h-14 w-14 place-items-center rounded-[1.25rem] border border-cyan-200/20 bg-white/10 shadow-[0_14px_38px_rgba(34,211,238,0.16)]"><PlatformLogo className="h-12 w-12" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/80">Tournament</p><h1 className="text-lg font-black tracking-tight">{data?.tournament?.name ?? "FIFA World Cup 2026"}</h1></div></div>
            <span aria-hidden="true" />
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Tournament stages">{stages.map((stage) => <span key={stage} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${data?.currentStage === stage ? "bg-cyan-200 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.35)]" : "bg-white/10 text-cyan-100 ring-1 ring-white/10"}`}>{stageLabel(stage)}</span>)}</nav>
        </header>
        <section className="mx-auto h-[calc(100dvh-9.75rem)] max-w-6xl overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:h-[calc(100dvh-10.5rem)] sm:px-5">
          {error ? <div className="rounded-[1.35rem] border border-red-300/30 bg-red-500/15 p-4 text-sm font-bold text-red-50">{error}</div> : null}
          {isLoading ? <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-4 text-sm font-bold text-cyan-50">Loading live tournament data…</div> : null}
          {groupContent}{bracketContent}
        </section>
      </main>
    </AuthGate>
  );
}
