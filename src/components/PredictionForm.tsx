"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LockIcon } from "@/components/Icons";
import { useStore } from "@/store/useStore";
import type { Match } from "@/lib/frontendData";

function lockedByServerTime(match: Match, serverTime: Date) {
  return match.isLocked || serverTime >= new Date(match.kickoffTime) || match.status !== "SCHEDULED";
}

export function PredictionForm({ match, serverNowIso }: { match: Match; serverNowIso: string }) {
  const { predictions, setOptimisticPrediction, markPredictionStatus } = useStore();
  const [isPending, startTransition] = useTransition();
  const optimistic = predictions[match.id];
  const currentHome = optimistic?.predictedHomeScore ?? match.prediction?.predictedHomeScore;
  const currentAway = optimistic?.predictedAwayScore ?? match.prediction?.predictedAwayScore;
  const [home, setHome] = useState(currentHome?.toString() ?? "");
  const [away, setAway] = useState(currentAway?.toString() ?? "");
  const locked = useMemo(() => lockedByServerTime(match, new Date(serverNowIso)), [match, serverNowIso]);

  useEffect(() => {
    setHome(currentHome?.toString() ?? "");
    setAway(currentAway?.toString() ?? "");
  }, [currentAway, currentHome]);

  async function savePrediction() {
    const predictedHomeScore = Number(home);
    const predictedAwayScore = Number(away);
    if (Number.isNaN(predictedHomeScore) || Number.isNaN(predictedAwayScore)) return;

    setOptimisticPrediction({ matchId: match.id, predictedHomeScore, predictedAwayScore, status: "saving" });
    startTransition(async () => {
      try {
        const response = await fetch("/api/predictions/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match_id: match.id, predicted_home_score: predictedHomeScore, predicted_away_score: predictedAwayScore })
        });
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not save prediction");
        markPredictionStatus(match.id, "saved");
      } catch (error) {
        markPredictionStatus(match.id, "error", error instanceof Error ? error.message : "Could not save prediction");
      }
    });
  }

  const inputClass = `w-full rounded-2xl border border-slate-200 bg-white p-4 text-center text-2xl font-black transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${locked ? "opacity-60" : ""}`;

  return (
    <div className={`mt-4 ${locked ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <input aria-label={`${match.homeTeam} score`} type="number" min="0" inputMode="numeric" disabled={locked} value={home} onChange={(event) => setHome(event.target.value)} className={inputClass} />
        <span className="font-black text-slate-400">–</span>
        <input aria-label={`${match.awayTeam} score`} type="number" min="0" inputMode="numeric" disabled={locked} value={away} onChange={(event) => setAway(event.target.value)} className={inputClass} />
      </div>
      {locked ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-600"><LockIcon className="h-4 w-4" /> Locked at kickoff</div>
      ) : (
        <button type="button" onClick={savePrediction} disabled={isPending || home === "" || away === ""} className={`mt-3 w-full rounded-2xl py-3 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none ${optimistic?.status === "saved" ? "bg-emerald-700" : "bg-emerald-600"}`}>
          {optimistic?.status === "saved" ? "Saved ✓" : optimistic?.status === "saving" ? "Saving…" : "Save prediction"}
        </button>
      )}
      {optimistic?.status === "error" && <p className="mt-2 text-center text-xs font-bold text-red-600">{optimistic.error}</p>}
    </div>
  );
}
