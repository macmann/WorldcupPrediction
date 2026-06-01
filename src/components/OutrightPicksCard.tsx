"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, SectionTitle } from "@/components/Cards";
import { Countdown } from "@/components/Countdown";
import { formatAppDateTime } from "@/lib/dateTime";
import type { OutrightOptionsPayload } from "@/lib/frontendData";
import { useStore } from "@/store/useStore";

type PickSummary = {
  champion: string;
  secondRunnerUp: string;
  fairPlay: string;
  bestPlayer: string;
  bestGk: string;
  goldenBoot: string;
  youngPlayer: string;
};

function getName(options: { id: string; name: string }[], id: string) {
  return options.find((option) => option.id === id)?.name ?? "—";
}

function hasCompleteOptions(data: OutrightOptionsPayload | null) {
  return Boolean(data?.options.teams.length && data.options.players.length && data.options.goalkeepers.length && data.options.goldenBootPlayers.length);
}

function isGoalkeeper(player: { position?: string | null; isGoalkeeper?: boolean }) {
  const position = player.position?.trim().toUpperCase() ?? "";
  return Boolean(player.isGoalkeeper) || position === "GK" || position === "G" || position.includes("GOALKEEPER") || position.includes("KEEPER");
}

function groupedPlayerOptions(players: OutrightOptionsPayload["options"]["players"]) {
  const grouped = new Map<string, typeof players>();
  for (const player of players) {
    const teamName = player.teamName ?? "Unassigned team";
    grouped.set(teamName, [...(grouped.get(teamName) ?? []), player]);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([teamName, teamPlayers]) => (
    <optgroup key={teamName} label={teamName}>
      {teamPlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
    </optgroup>
  ));
}

export function OutrightPicksCard({ canEdit }: { canEdit: boolean }) {
  const { setOnboardingCompleted } = useStore();
  const [data, setData] = useState<OutrightOptionsPayload | null>(null);
  const [championTeamId, setChampionTeamId] = useState("");
  const [secondRunnerUpTeamId, setSecondRunnerUpTeamId] = useState("");
  const [fairPlayTeamId, setFairPlayTeamId] = useState("");
  const [bestPlayerId, setBestPlayerId] = useState("");
  const [bestGkId, setBestGkId] = useState("");
  const [goldenBootPlayerId, setGoldenBootPlayerId] = useState("");
  const [youngPlayerId, setYoungPlayerId] = useState("");
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
        setSecondRunnerUpTeamId(payload.outright?.secondRunnerUpTeamId ?? payload.options.teams[0]?.id ?? "");
        setFairPlayTeamId(payload.outright?.fairPlayTeamId ?? payload.options.teams[0]?.id ?? "");
        setBestPlayerId(payload.outright?.bestPlayerId ?? payload.options.players[0]?.id ?? "");
        setBestGkId(payload.outright?.bestGkId ?? payload.options.goalkeepers[0]?.id ?? "");
        setGoldenBootPlayerId(payload.outright?.goldenBootPlayerId ?? payload.options.goldenBootPlayers[0]?.id ?? "");
        setYoungPlayerId(payload.outright?.youngPlayerId ?? payload.options.players[0]?.id ?? "");
        if (payload.outright) {
          setSavedPicks({ champion: payload.outright.champion, secondRunnerUp: payload.outright.secondRunnerUp, fairPlay: payload.outright.fairPlay, bestPlayer: payload.outright.bestPlayer, bestGk: payload.outright.bestGk, goldenBoot: payload.outright.goldenBoot, youngPlayer: payload.outright.youngPlayer });
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
          body: JSON.stringify({ championTeamId, secondRunnerUpTeamId, fairPlayTeamId, bestPlayerId, bestGkId, goldenBootPlayerId, youngPlayerId, tournamentId: data?.tournament.id })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not save outright picks");
        const nextSummary = {
          champion: getName(data?.options.teams ?? [], championTeamId),
          secondRunnerUp: getName(data?.options.teams ?? [], secondRunnerUpTeamId),
          fairPlay: getName(data?.options.teams ?? [], fairPlayTeamId),
          bestPlayer: getName(data?.options.players ?? [], bestPlayerId),
          bestGk: getName(data?.options.goalkeepers ?? [], bestGkId),
          goldenBoot: getName(data?.options.goldenBootPlayers ?? [], goldenBootPlayerId),
          youngPlayer: getName(data?.options.players ?? [], youngPlayerId)
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
  const eligibleGoalkeepers = (data?.options.goalkeepers ?? []).filter(isGoalkeeper);
  const eligibleGoldenBootPlayers = (data?.options.goldenBootPlayers ?? []).filter((player) => !isGoalkeeper(player));
  const completed = Boolean(summary);
  const liveCanEdit = Boolean(data?.canEdit ?? canEdit);
  const canSubmit = liveCanEdit && hasCompleteOptions(data) && !isPending;
  const isLocked = data?.canEdit === false || (!isLoading && !liveCanEdit);
  const lockTarget = data?.tournament.outrightLockAt;
  const lockLabel = lockTarget
    ? formatAppDateTime(lockTarget)
    : "the Round of 16";
  const statusMessage = useMemo(() => {
    if (isLoading) return "Loading live tournament options…";
    if (isLocked) return "Outright picks are locked because the Round of 16 has started.";
    if (data?.message) return data.message;
    if (data?.source === "live-provider") return "Options are synced from the configured live football provider.";
    return "Options are loaded from your tournament database.";
  }, [data, isLoading, isLocked]);

  return (
    <Card>
      <SectionTitle eyebrow={completed ? "Saved picks" : "Tournament picks"} title="Choose tournament winners" />
      <p className="mt-2 text-sm font-semibold text-slate-500">Choose all tournament awards from live tournament data after signing in.</p>
      <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{statusMessage}</p>

      <div className="mt-4 rounded-3xl bg-gradient-to-br from-navy to-emerald-800 p-4 text-white">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-200">Selection deadline</p>
            <p className="mt-1 text-sm font-bold">Closes when the Round of 16 starts</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-emerald-50">{lockLabel}</span>
        </div>
        {lockTarget ? <Countdown target={lockTarget} /> : <p className="text-sm font-bold text-emerald-50">Deadline syncing…</p>}
      </div>

      {completed && summary && !isEditing ? (
        <div className="mt-4 space-y-4">
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Tournament Winner</dt><dd className="font-bold">{summary.champion}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>2nd Runner-up</dt><dd className="font-bold">{summary.secondRunnerUp}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Golden Ball</dt><dd className="font-bold">{summary.bestPlayer}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Golden Glove</dt><dd className="font-bold">{summary.bestGk}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>Golden Boot</dt><dd className="font-bold">{summary.goldenBoot}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>FIFA Young Player Award</dt><dd className="font-bold">{summary.youngPlayer}</dd></div>
            <div className="flex justify-between rounded-2xl bg-slate-100 p-3"><dt>FIFA Fair Play Trophy</dt><dd className="font-bold">{summary.fairPlay}</dd></div>
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
          
          <label className="block text-sm font-black">2nd Runner-up
            <select value={secondRunnerUpTeamId} onChange={(event) => setSecondRunnerUpTeamId(event.target.value)} disabled={!liveCanEdit || !data?.options.teams.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black">Golden Ball
            <select value={bestPlayerId} onChange={(event) => setBestPlayerId(event.target.value)} disabled={!liveCanEdit || !data?.options.players.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {groupedPlayerOptions(data?.options.players ?? [])}
            </select>
          </label>
          <label className="block text-sm font-black">Golden Glove
            <select value={bestGkId} onChange={(event) => setBestGkId(event.target.value)} disabled={!liveCanEdit || !data?.options.goalkeepers.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {groupedPlayerOptions(eligibleGoalkeepers)}
            </select>
          </label>
          <label className="block text-sm font-black">Golden Boot
            <select value={goldenBootPlayerId} onChange={(event) => setGoldenBootPlayerId(event.target.value)} disabled={!liveCanEdit || !data?.options.goldenBootPlayers.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {groupedPlayerOptions(eligibleGoldenBootPlayers)}
            </select>
          </label>
          <label className="block text-sm font-black">FIFA Young Player Award
            <select value={youngPlayerId} onChange={(event) => setYoungPlayerId(event.target.value)} disabled={!liveCanEdit || !data?.options.players.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {groupedPlayerOptions(data?.options.players ?? [])}
            </select>
          </label>
          <label className="block text-sm font-black">FIFA Fair Play Trophy
            <select value={fairPlayTeamId} onChange={(event) => setFairPlayTeamId(event.target.value)} disabled={!liveCanEdit || !data?.options.teams.length} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:bg-slate-100">
              {(data?.options.teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {(!completed || isEditing) && <button type="button" onClick={submit} disabled={!canSubmit} className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Saving picks…" : liveCanEdit ? "Save tournament picks" : "Picks are locked"}</button>}
    </Card>
  );
}
