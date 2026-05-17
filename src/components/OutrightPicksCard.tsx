"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, SectionTitle } from "@/components/Cards";
import { Countdown } from "@/components/Countdown";
import type { OutrightOptionsPayload } from "@/lib/frontendData";
import { useStore } from "@/store/useStore";

type PickSummary = {
  champion: string;
  bestPlayer: string;
  bestGk: string;
};

function getName(options: { id: string; name: string }[], id: string) {
  return options.find((option) => option.id === id)?.name ?? "—";
}

function hasCompleteOptions(data: OutrightOptionsPayload | null) {
  return Boolean(data?.options.teams.length && data.options.players.length && data.options.goalkeepers.length);
}

export function OutrightPicksCard({ canEdit }: { canEdit: boolean }) {
  const { setOnboardingCompleted } = useStore();
  const [data, setData] = useState<OutrightOptionsPayload | null>(null);
  const [championTeamId, setChampionTeamId] = useState("");
  const [bestPlayerId, setBestPlayerId] = useState("");
  const [bestGkId, setBestGkId] = useState("");
  const [savedPicks, setSavedPicks] = useState<PickSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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
        if (payload.outright) {
          setSavedPicks({ champion: payload.outright.champion, bestPlayer: payload.outright.bestPlayer, bestGk: payload.outright.bestGk });
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
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
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not save outright picks");
        const nextSummary = {
          champion: getName(data?.options.teams ?? [], championTeamId),
          bestPlayer: getName(data?.options.players ?? [], bestPlayerId),
          bestGk: getName(data?.options.goalkeepers ?? [], bestGkId)
        };
        setSavedPicks(nextSummary);
        setIsEditing(false);
        setOnboardingCompleted(true);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save outright picks");
      }
    });
  }

  const summary = savedPicks;
  const completed = Boolean(summary);
  const liveCanEdit = Boolean(data?.canEdit ?? canEdit);
  const canSubmit = liveCanEdit && hasCompleteOptions(data) && !isPending;
  const isLocked = data?.canEdit === false || (!isLoading && !liveCanEdit);
  const lockTarget = data?.tournament.outrightLockAt;
  const lockLabel = lockTarget
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(lockTarget))
    : "the Round of 16";
  const statusMessage = useMemo(() => {
    if (isLoading) return "Loading live tournament options…";
    if (isLocked) return "Tournament winner, Golden Ball, and Golden Glove picks are locked because the Round of 16 has started.";
    if (data?.message) return data.message;
    if (data?.source === "live-provider") return "Options are synced from the configured live football provider.";
    return "Options are loaded from your tournament database.";
  }, [data, isLoading, isLocked]);

  return (
    <Card>
      <SectionTitle eyebrow={completed ? "Saved picks" : "Tournament picks"} title="Choose tournament winners" />
      <p className="mt-2 text-sm font-semibold text-slate-500">Choose your Tournament Winner, Golden Ball, and Golden Glove picks from live tournament data after signing in.</p>
      <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{statusMessage}</p>

      <div className="mt-4 rounded-3xl bg-gradient-to-br from-navy to-emerald-800 p-4 text-white">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-200">Selection deadline</p>
            <p className="mt-1 text-sm font-bold">Closes when the Round of 16 starts</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-emerald-50">{lockLabel} UTC</span>
        </div>
        {lockTarget ? <Countdown target={lockTarget} /> : <p className="text-sm font-bold text-emerald-50">Deadline syncing…</p>}
      </div>

      {completed && summary && !isEditing ? (
        <div className="mt-4 space-y-4">
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Tournament Winner</dt><dd className="font-bold">{summary.champion}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Golden Ball</dt><dd className="font-bold">{summary.bestPlayer}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Golden Glove</dt><dd className="font-bold">{summary.bestGk}</dd></div>
          </dl>
          {liveCanEdit && <button type="button" onClick={() => setIsEditing(true)} className="w-full rounded-2xl bg-slate-950 py-3 font-black text-white transition active:scale-[0.98]">Edit picks before Round of 16</button>}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-black">Tournament Winner
            <select value={championTeamId} onChange={(event) => setChampionTeamId(event.target.value)} disabled={!liveCanEdit || !data?.options.teams.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black">Golden Ball
            <select value={bestPlayerId} onChange={(event) => setBestPlayerId(event.target.value)} disabled={!liveCanEdit || !data?.options.players.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.players ?? []).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black">Golden Glove
            <select value={bestGkId} onChange={(event) => setBestGkId(event.target.value)} disabled={!liveCanEdit || !data?.options.goalkeepers.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.goalkeepers ?? []).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {(!completed || isEditing) && <button type="button" onClick={submit} disabled={!canSubmit} className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Saving picks…" : liveCanEdit ? "Save tournament picks" : "Picks are locked"}</button>}
    </Card>
  );
}
