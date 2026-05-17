"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, SectionTitle } from "@/components/Cards";
import { demoOutrightOptions } from "@/lib/frontendData";
import { useStore } from "@/store/useStore";

export default function OnboardingPage() {
  const router = useRouter();
  const { setOnboardingCompleted } = useStore();
  const [championTeamId, setChampionTeamId] = useState(demoOutrightOptions.teams[0].id);
  const [bestPlayerId, setBestPlayerId] = useState(demoOutrightOptions.players[0].id);
  const [bestGkId, setBestGkId] = useState(demoOutrightOptions.goalkeepers[0].id);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/predictions/outrights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ championTeamId, bestPlayerId, bestGkId })
        });
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not save outright picks");
        window.localStorage.setItem("worldcup:onboarding-completed", "true");
        setOnboardingCompleted(true);
        router.push("/");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save outright picks");
      }
    });
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-navy to-emerald-950 px-4 pb-8 pt-8 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">First-time setup</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Lock your tournament outrights</h1>
      <p className="mt-3 text-sm font-medium text-emerald-50">Choose Champion, Best Player, and Best Goalkeeper before entering the app. These picks are required and post to the backend outright predictions API.</p>

      <Card className="mt-6 text-slate-950">
        <SectionTitle eyebrow="Required" title="Outright picks" />
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-black">Champion
            <select value={championTeamId} onChange={(event) => setChampionTeamId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold">
              {demoOutrightOptions.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black">Best Player
            <select value={bestPlayerId} onChange={(event) => setBestPlayerId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold">
              {demoOutrightOptions.players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black">Best Goalkeeper
            <select value={bestGkId} onChange={(event) => setBestGkId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold">
              {demoOutrightOptions.goalkeepers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <button type="button" onClick={submit} disabled={isPending} className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Saving picks…" : "Save picks & enter"}</button>
      </Card>
    </main>
  );
}
