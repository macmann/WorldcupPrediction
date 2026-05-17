"use client";

import { useState, useTransition } from "react";
import { Card, SectionTitle } from "@/components/Cards";
import { defaultOutrights, demoOutrightOptions } from "@/lib/frontendData";
import { useStore } from "@/store/useStore";

type PickSummary = {
  champion: string;
  bestPlayer: string;
  bestGk: string;
};

function getName(options: { id: string; name: string }[], id: string) {
  return options.find((option) => option.id === id)?.name ?? "—";
}

export function OutrightPicksCard({ canEdit }: { canEdit: boolean }) {
  const { user, setOnboardingCompleted } = useStore();
  const [championTeamId, setChampionTeamId] = useState(demoOutrightOptions.teams[0].id);
  const [bestPlayerId, setBestPlayerId] = useState(demoOutrightOptions.players[0].id);
  const [bestGkId, setBestGkId] = useState(demoOutrightOptions.goalkeepers[0].id);
  const [savedPicks, setSavedPicks] = useState<PickSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const completed = Boolean(user?.onboardingCompleted || savedPicks);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/predictions/outrights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ championTeamId, bestPlayerId, bestGkId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not save outright picks");
        const nextSummary = {
          champion: getName(demoOutrightOptions.teams, championTeamId),
          bestPlayer: getName(demoOutrightOptions.players, bestPlayerId),
          bestGk: getName(demoOutrightOptions.goalkeepers, bestGkId)
        };
        setSavedPicks(nextSummary);
        setOnboardingCompleted(true);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save outright picks");
      }
    });
  }

  const summary = savedPicks ?? defaultOutrights;

  return (
    <Card>
      <SectionTitle eyebrow={completed ? "Saved picks" : "Dashboard action"} title="Choose tournament winners" />
      <p className="mt-2 text-sm font-semibold text-slate-500">Choose your Champion, Best Player, and Best Goalkeeper for the whole tournament after signing in.</p>

      {completed ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Champion</dt><dd className="font-bold">{summary.champion}</dd></div>
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Best Player</dt><dd className="font-bold">{summary.bestPlayer}</dd></div>
          <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Best Goalkeeper</dt><dd className="font-bold">{summary.bestGk}</dd></div>
        </dl>
      ) : (
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
      )}

      {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {!completed && <button type="button" onClick={submit} disabled={!canEdit || isPending} className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Saving picks…" : canEdit ? "Save tournament picks" : "Picks are locked"}</button>}
    </Card>
  );
}
