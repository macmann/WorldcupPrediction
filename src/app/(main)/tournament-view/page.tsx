"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PlatformLogo } from "@/components/Icons";

const bracketStages = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"] as const;
type ViewTab = "bracket" | "groups";
type TeamFormResult = "W" | "D" | "L";
type TeamRow = { id: string; rank: number; name: string; flagEmoji?: string | null; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form: TeamFormResult[] };
type Group = { name: string; teams: TeamRow[] };
type Fixture = { id: number; stage: string; kickoffTime: string; venue?: string | null; status: string; homeTeam: string; awayTeam: string; homeScore?: number | null; awayScore?: number | null; homeFlagEmoji?: string | null; awayFlagEmoji?: string | null };
type TournamentViewPayload = { tournament?: { name: string } | null; currentStage: string; groups: Group[]; knockoutFixtures: Fixture[] };

function stageLabel(stage: string) {
  const labels: Record<string, string> = { ROUND_OF_32: "Round of 32", ROUND_OF_16: "Round of 16", QUARTER_FINAL: "Quarter-final", SEMI_FINAL: "Semi-final", FINAL: "Final" };
  return labels[stage] ?? stage.replaceAll("_", " ");
}

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function ShieldIcon() {
  return <svg className="h-6 w-6 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 5 4.7v5.7c0 4.4 2.8 8.5 7 10.1 4.2-1.6 7-5.7 7-10.1V4.7L12 2Z" /></svg>;
}

function TeamSlot({ name, flag, score }: { name: string; flag?: string | null; score?: number | null }) {
  const isTbd = /^tbd$/i.test(name);
  return <div className="flex items-center gap-2 text-base font-bold text-slate-800"><span className="grid h-6 w-6 place-items-center text-lg">{flag && !isTbd ? flag : <ShieldIcon />}</span><span className="min-w-0 flex-1 truncate">{name}</span>{score !== null && score !== undefined ? <span className="font-black">{score}</span> : null}</div>;
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  return <article className="relative min-h-[6.6rem] rounded-2xl border border-slate-300 bg-slate-100 p-3 shadow-sm">
    <p className="mb-3 truncate text-sm font-bold text-slate-500">{formatKickoff(fixture.kickoffTime)}</p>
    <div className="space-y-2"><TeamSlot name={fixture.homeTeam} flag={fixture.homeFlagEmoji} score={fixture.homeScore} /><TeamSlot name={fixture.awayTeam} flag={fixture.awayFlagEmoji} score={fixture.awayScore} /></div>
  </article>;
}

function ResultDot({ result }: { result?: TeamFormResult }) {
  const styles = result === "W" ? "border-emerald-600 bg-emerald-500 text-white" : result === "D" ? "border-slate-400 bg-slate-400 text-white" : result === "L" ? "border-red-500 bg-red-500 text-white" : "border-slate-400 bg-white text-transparent";
  return <span className={`grid h-5 w-5 place-items-center rounded-full border-2 text-[10px] font-black ${styles}`}>{result === "W" ? "✓" : result === "L" ? "×" : result === "D" ? "–" : "·"}</span>;
}

export default function TournamentViewPage() {
  const [data, setData] = useState<TournamentViewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>("bracket");

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

  const fixturesByStage = useMemo(() => {
    const grouped = new Map<string, Fixture[]>();
    for (const fixture of data?.knockoutFixtures ?? []) grouped.set(fixture.stage, [...(grouped.get(fixture.stage) ?? []), fixture]);
    return grouped;
  }, [data?.knockoutFixtures]);

  return <AuthGate><main className="min-h-dvh bg-white text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
      <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center px-4 pb-2">
        <Link href="/dashboard" aria-label="Close tournament view" className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></Link>
        <div className="flex items-center justify-center gap-2 text-center"><PlatformLogo className="h-9 w-9" /><h1 className="truncate text-base font-black">{data?.tournament?.name ?? "FIFA World Cup 2026"}</h1></div>
      </div>
      <nav className="grid grid-cols-2 text-sm font-black" aria-label="Tournament view tabs">
        <button onClick={() => setActiveTab("bracket")} className={`border-b-2 px-4 py-3 ${activeTab === "bracket" ? "border-slate-950 text-slate-950" : "border-slate-200 text-slate-500"}`}>Knockout stage</button>
        <button onClick={() => setActiveTab("groups")} className={`border-b-2 px-4 py-3 ${activeTab === "groups" ? "border-slate-950 text-slate-950" : "border-slate-200 text-slate-500"}`}>Group Stage</button>
      </nav>
    </header>
    <section className="h-[calc(100dvh-7.9rem)] overflow-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
      {isLoading ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">Loading live tournament data…</div> : null}
      {!isLoading && !error && activeTab === "bracket" ? <div className="flex min-w-max gap-6 pb-4">
        {bracketStages.map((stage, stageIndex) => <section key={stage} className="w-[13.6rem] shrink-0">
          <h2 className="mb-5 text-center text-sm font-medium text-slate-950">{stageLabel(stage)}</h2>
          <div className="space-y-4" style={{ paddingTop: stageIndex ? `${stageIndex * 60}px` : 0 }}>
            {(fixturesByStage.get(stage) ?? []).map((fixture, fixtureIndex) => <div key={fixture.id} className="relative">
              {stageIndex > 0 ? <span className="absolute right-full top-1/2 h-px w-6 bg-slate-300" aria-hidden="true" /> : null}
              {stageIndex < bracketStages.length - 1 ? <span className="absolute left-full top-1/2 h-px w-6 bg-slate-300" aria-hidden="true" /> : null}
              {stageIndex > 0 && fixtureIndex % 2 === 0 ? <span className="absolute right-[calc(100%+1.5rem)] top-1/2 h-[calc(100%+1rem)] w-px bg-slate-300" aria-hidden="true" /> : null}
              <FixtureCard fixture={fixture} />
            </div>)}
            {(fixturesByStage.get(stage) ?? []).length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">Bracket will appear when fixtures are synced.</div> : null}
          </div>
        </section>)}
      </div> : null}
      {!isLoading && !error && activeTab === "groups" ? <div className="mx-auto max-w-5xl space-y-8">
        {(data?.groups ?? []).map((group) => <section key={group.name}>
          <h2 className="mb-3 text-2xl font-black">{group.name}</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[46rem] border-collapse text-left">
            <thead className="border-b border-slate-300 text-sm font-medium text-slate-500"><tr><th className="py-2 font-medium" colSpan={3}>Team</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th className="font-black text-slate-900">Pts</th><th className="text-center font-medium">Last 5</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{group.teams.map((team) => <tr key={team.id} className={team.rank <= 2 ? "border-l-4 border-blue-500" : "border-l-4 border-transparent"}>
              <td className="w-10 py-3 text-center">{team.rank}</td><td className="w-10 text-xl">{team.flagEmoji}</td><td className="max-w-[12rem] truncate py-3 text-lg">{team.name}</td><td>{team.played}</td><td>{team.won}</td><td>{team.drawn}</td><td>{team.lost}</td><td>{team.goalsFor}</td><td>{team.goalsAgainst}</td><td>{team.goalDifference}</td><td className="font-black">{team.points}</td><td><div className="flex justify-center gap-1">{[...team.form, ...Array<TeamFormResult | undefined>(Math.max(0, 5 - team.form.length)).fill(undefined)].map((result, i) => <ResultDot key={i} result={result} />)}</div></td>
            </tr>)}</tbody>
          </table></div>
        </section>)}
      </div> : null}
    </section>
  </main></AuthGate>;
}
