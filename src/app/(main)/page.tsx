import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle, SkeletonCard } from "@/components/Cards";
import { Countdown } from "@/components/Countdown";
import { PredictionForm } from "@/components/PredictionForm";
import { defaultOutrights, fetchMatches, getDemoLeagues } from "@/lib/frontendData";

export default async function Dashboard() {
  const matches = await fetchMatches();
  const now = new Date();
  const nextMatch = matches.find((match) => new Date(match.kickoffTime) > now) ?? matches[0];
  const leagues = getDemoLeagues();
  const canEditOutrights = now < new Date(defaultOutrights.tournamentStartsAt);

  return (
    <AppShell>
      <Card>
        <SectionTitle eyebrow="Locked picks" title="Tournament Outrights" action={canEditOutrights ? <Link href="/onboarding" className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Edit</Link> : null} />
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Champion</dt><dd className="font-bold">{defaultOutrights.champion}</dd></div>
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Best Player</dt><dd className="font-bold">{defaultOutrights.bestPlayer}</dd></div>
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Best Goalkeeper</dt><dd className="font-bold">{defaultOutrights.bestGk}</dd></div>
        </dl>
      </Card>

      {nextMatch ? (
        <Card className="bg-gradient-to-br from-emerald-500 to-pitch-900 text-white">
          <p className="text-sm font-semibold text-emerald-100">Next upcoming match</p>
          <h2 className="mt-1 text-2xl font-black">{nextMatch.homeTeam} vs {nextMatch.awayTeam}</h2>
          <p className="mt-1 text-xs font-semibold text-emerald-100">{new Date(nextMatch.kickoffTime).toUTCString()}</p>
          <div className="mt-4"><Countdown target={nextMatch.kickoffTime} /></div>
          <div className="mt-4 rounded-3xl bg-white p-3 text-slate-950">
            <PredictionForm match={nextMatch} serverNowIso={now.toISOString()} />
          </div>
        </Card>
      ) : <SkeletonCard />}

      <Card>
        <SectionTitle eyebrow="Ranks" title="League snapshot" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-navy p-4 text-white">
            <p className="text-sm font-bold">Global Rank</p>
            <p className="mt-3 text-3xl font-black">#{leagues[0]?.rank ?? "—"}</p>
            <p className="text-xs text-slate-300">of {leagues[0]?.members ?? "—"}</p>
          </div>
          <div className="rounded-2xl bg-indigo-600 p-4 text-white">
            <p className="text-sm font-bold">Top Private</p>
            <p className="mt-3 text-3xl font-black">#{leagues[1]?.rank ?? "—"}</p>
            <p className="text-xs text-indigo-100">{leagues[1]?.name ?? "Join a league"}</p>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
