"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PlatformLogo } from "@/components/Icons";

const stages = ["GS", "R32", "R16", "QF", "SF", "F"];

type TeamRow = { id: string; rank: number; name: string; flagEmoji?: string | null; played: number; goalDifference: number; points: number };
type Group = { name: string; teams: TeamRow[] };
type Fixture = { id: number; stage: string; groupName?: string | null; kickoffTime: string; venue?: string | null; status: string; homeTeam: string; awayTeam: string; homeScore?: number | null; awayScore?: number | null; homeFlagEmoji?: string | null; awayFlagEmoji?: string | null };
type TournamentViewPayload = { tournament?: { name: string } | null; groups: Group[]; fixtures: Fixture[] };

function FlagBadge({ children }: { children?: React.ReactNode }) {
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 bg-white/12 text-sm shadow-inner shadow-white/10">{children ?? <span className="h-3 w-3 rounded-full bg-cyan-200/60" />}</span>;
}

function formatFixtureDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function stageLabel(stage: string, groupName?: string | null) {
  if (stage === "GROUP" && groupName) return `Group ${groupName}`;
  return stage.replaceAll("_", " ");
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

  const visibleFixtures = useMemo(() => (data?.fixtures ?? []).slice(0, 18), [data?.fixtures]);

  return (
    <AuthGate>
      <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.35),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(20,184,166,0.18),transparent_30%),linear-gradient(180deg,#03112b_0%,#061a3c_48%,#020a1d_100%)] text-white">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06183a]/85 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
            <Link href="/dashboard" aria-label="Close tournament view" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition active:scale-95"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></Link>
            <div className="flex flex-col items-center gap-2 text-center"><span className="grid h-14 w-14 place-items-center rounded-[1.25rem] border border-cyan-200/20 bg-white/10 shadow-[0_14px_38px_rgba(34,211,238,0.16)]"><PlatformLogo className="h-12 w-12" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/80">Tournament</p><h1 className="text-lg font-black tracking-tight">{data?.tournament?.name ?? "FIFA World Cup 2026"}</h1></div></div>
            <span aria-hidden="true" />
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Tournament stages">{stages.map((stage, index) => <button key={stage} type="button" className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${index === 0 ? "bg-cyan-200 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.35)]" : "bg-white/10 text-cyan-100 ring-1 ring-white/10"}`}>{stage}</button>)}</nav>
        </header>

        <section className="mx-auto flex h-[calc(100dvh-9.75rem)] max-w-5xl gap-3 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:h-[calc(100dvh-10.5rem)] sm:px-5">
          {error ? <div className="w-full rounded-[1.35rem] border border-red-300/30 bg-red-500/15 p-4 text-sm font-bold text-red-50">{error}</div> : null}
          {isLoading ? <div className="w-full rounded-[1.35rem] border border-white/10 bg-white/10 p-4 text-sm font-bold text-cyan-50">Loading live tournament data…</div> : null}
          {!isLoading && !error ? <>
            <div className="min-w-[11.5rem] flex-1 space-y-3 sm:min-w-[20rem]">
              {(data?.groups ?? []).map((group) => <article key={group.name} className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#12356d]/62 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur"><div className="flex items-center justify-between border-b border-white/10 bg-white/10 px-3 py-2.5"><h2 className="text-sm font-black">{group.name}</h2><p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">PTS</p></div><div className="divide-y divide-white/8">{group.teams.map((team) => <div key={team.id} className="grid grid-cols-[1.15rem_1.75rem_minmax(0,1fr)_2rem] items-center gap-2 px-3 py-3 text-sm"><span className="text-xs font-black text-cyan-100/70">{team.rank}</span><FlagBadge>{team.flagEmoji}</FlagBadge><span className="truncate font-bold text-slate-50">{team.name}</span><span className="text-right font-black text-white">{team.points}</span></div>)}</div></article>)}
            </div>
            <div className="min-w-[11.75rem] flex-1 space-y-3 sm:min-w-[22rem]">
              {visibleFixtures.map((fixture) => <article key={fixture.id} className="overflow-hidden rounded-[1.35rem] border border-cyan-200/10 bg-[#0d2a5d]/72 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur"><div className="border-b border-white/10 bg-cyan-200/10 px-3 py-2"><p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">{formatFixtureDate(fixture.kickoffTime)} · {stageLabel(fixture.stage, fixture.groupName)}</p>{fixture.venue ? <p className="mt-1 truncate text-[10px] font-bold text-cyan-50/70">{fixture.venue}</p> : null}</div><div className="space-y-2 p-3">{[{ name: fixture.homeTeam, flag: fixture.homeFlagEmoji, score: fixture.homeScore }, { name: fixture.awayTeam, flag: fixture.awayFlagEmoji, score: fixture.awayScore }].map((slot) => <div key={`${fixture.id}-${slot.name}`} className="flex items-center gap-2 rounded-2xl bg-white/9 px-3 py-2.5 ring-1 ring-white/8"><FlagBadge>{slot.flag}</FlagBadge><span className="min-w-0 flex-1 truncate font-black text-slate-50">{slot.name}</span>{slot.score !== null && slot.score !== undefined ? <span className="font-black text-white">{slot.score}</span> : null}</div>)}</div></article>)}
            </div>
          </> : null}
        </section>
      </main>
    </AuthGate>
  );
}
