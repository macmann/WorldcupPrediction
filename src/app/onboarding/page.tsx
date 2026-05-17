"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, SectionTitle } from "@/components/Cards";
import { Countdown } from "@/components/Countdown";
import { PlatformLogo } from "@/components/Icons";
import type { OutrightOptionsPayload } from "@/lib/frontendData";
import { useStore } from "@/store/useStore";

function hasCompleteOptions(data: OutrightOptionsPayload | null) {
  return Boolean(data?.options.teams.length && data.options.players.length && data.options.goalkeepers.length);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setOnboardingCompleted } = useStore();
  const [data, setData] = useState<OutrightOptionsPayload | null>(null);
  const [championTeamId, setChampionTeamId] = useState("");
  const [bestPlayerId, setBestPlayerId] = useState("");
  const [bestGkId, setBestGkId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    fetch("/api/predictions/outrights", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load live outright options");
        return payload as OutrightOptionsPayload;
      })
      .then((payload) => {
        if (!mounted) return;
        setData(payload);
        setChampionTeamId(payload.outright?.championTeamId ?? payload.options.teams[0]?.id ?? "");
        setBestPlayerId(payload.outright?.bestPlayerId ?? payload.options.players[0]?.id ?? "");
        setBestGkId(payload.outright?.bestGkId ?? payload.options.goalkeepers[0]?.id ?? "");
      })
      .catch((caught) => {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load live outright options");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/predictions/outrights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ championTeamId, bestPlayerId, bestGkId, tournamentId: data?.tournament.id })
        });
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not save outright picks");
        window.localStorage.setItem("worldcup:onboarding-completed", "true");
        setOnboardingCompleted(true);
        router.push("/dashboard");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save outright picks");
      }
    });
  }

  const statusMessage = useMemo(() => {
    if (isLoading) return "Loading live tournament options…";
    if (data?.message) return data.message;
    if (data?.source === "live-provider") return "Options are synced from the configured live football provider.";
    return "Options are loaded from your tournament database.";
  }, [data, isLoading]);
  const canSubmit = Boolean(data?.canEdit && hasCompleteOptions(data) && !isPending);

  return (
    <main className="min-h-dvh bg-gradient-to-b from-navy to-emerald-950 px-4 pb-8 pt-8 text-white">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 shadow-lg shadow-emerald-950/30 ring-1 ring-white/15">
          <PlatformLogo className="h-14 w-14" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">First-time setup</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Lock your tournament outrights</h1>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-emerald-50">Choose your Tournament Winner, Golden Ball, and Golden Glove before entering the app. These picks stay open until the Round of 16 starts.</p>

      <Card className="mt-6 text-slate-950">
        <SectionTitle eyebrow="Required" title="Outright picks" />
        <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{data?.canEdit === false ? "Tournament Winner, Golden Ball, and Golden Glove picks are locked because the Round of 16 has started." : statusMessage}</p>
        <div className="mt-4 rounded-3xl bg-gradient-to-br from-navy to-emerald-800 p-4 text-white">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-200">Selection deadline</p>
          <p className="mt-1 text-sm font-bold">Closes when the Round of 16 starts</p>
          <div className="mt-3">
            {data?.tournament.outrightLockAt ? <Countdown target={data.tournament.outrightLockAt} /> : <p className="text-sm font-bold text-emerald-50">Deadline syncing…</p>}
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-black">Tournament Winner
            <select value={championTeamId} onChange={(event) => setChampionTeamId(event.target.value)} disabled={!data?.canEdit || !data?.options.teams.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black">Golden Ball
            <select value={bestPlayerId} onChange={(event) => setBestPlayerId(event.target.value)} disabled={!data?.canEdit || !data?.options.players.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.players ?? []).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black">Golden Glove
            <select value={bestGkId} onChange={(event) => setBestGkId(event.target.value)} disabled={!data?.canEdit || !data?.options.goalkeepers.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.goalkeepers ?? []).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <button type="button" onClick={submit} disabled={!canSubmit} className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Saving picks…" : data?.canEdit === false ? "Picks are locked" : "Save picks & enter"}</button>
      </Card>
    </main>
  );
}
