"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LockIcon } from "@/components/Icons";
import { TeamName, teamNameWithFlag } from "@/components/TeamName";
import { scoreMatchesOutcome } from "@/lib/matchPrediction";
import { useStore } from "@/store/useStore";
import type { Match, MatchOutcome } from "@/lib/frontendData";

function lockedByServerTime(match: Match, serverTime: Date) {
  return match.isLocked || serverTime >= new Date(match.kickoffTime) || match.status !== "SCHEDULED";
}

function outcomeLabel(outcome: MatchOutcome, match: Match) {
  if (outcome === "HOME") return `${teamNameWithFlag(match.homeTeam, match.homeFlagEmoji)} win`;
  if (outcome === "AWAY") return `${teamNameWithFlag(match.awayTeam, match.awayFlagEmoji)} win`;
  return "Draw";
}

export function PredictionForm({ match, serverNowIso }: { match: Match; serverNowIso: string }) {
  const { predictions, setOptimisticPrediction, markPredictionStatus } = useStore();
  const [isPending, startTransition] = useTransition();
  const optimistic = predictions[match.id];
  const currentOutcome = optimistic?.predictedOutcome ?? match.prediction?.predictedOutcome ?? null;
  const currentHome = optimistic?.predictedHomeScore ?? match.prediction?.predictedHomeScore;
  const currentAway = optimistic?.predictedAwayScore ?? match.prediction?.predictedAwayScore;
  const [selectedOutcome, setSelectedOutcome] = useState<MatchOutcome | null>(currentOutcome);
  const [home, setHome] = useState(currentHome?.toString() ?? "");
  const [away, setAway] = useState(currentAway?.toString() ?? "");
  const locked = useMemo(() => lockedByServerTime(match, new Date(serverNowIso)), [match, serverNowIso]);

  useEffect(() => {
    setSelectedOutcome(currentOutcome);
    setHome(currentHome?.toString() ?? "");
    setAway(currentAway?.toString() ?? "");
  }, [currentAway, currentHome, currentOutcome]);

  async function postPrediction(body: Record<string, unknown>) {
    const response = await fetch("/api/predictions/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: match.id, ...body })
    });
    if (!response.ok) throw new Error((await response.json()).error ?? "Could not save prediction");
  }

  const hasCompleteScore = home !== "" && away !== "";
  const predictedHomeScore = hasCompleteScore ? Number(home) : null;
  const predictedAwayScore = hasCompleteScore ? Number(away) : null;
  const hasValidScoreNumbers = predictedHomeScore !== null && predictedAwayScore !== null && !Number.isNaN(predictedHomeScore) && !Number.isNaN(predictedAwayScore);
  const scoreOutcomeMismatch = selectedOutcome && hasValidScoreNumbers && !scoreMatchesOutcome(selectedOutcome, predictedHomeScore, predictedAwayScore);
  const canSavePrediction = Boolean(selectedOutcome && hasValidScoreNumbers && !scoreOutcomeMismatch);
  const selectedOutcomeLabel = selectedOutcome ? outcomeLabel(selectedOutcome, match) : "the selected Win / Draw / Win result";

  function savePrediction() {
    if (!selectedOutcome || !hasValidScoreNumbers || scoreOutcomeMismatch) return;

    setOptimisticPrediction({ matchId: match.id, predictedOutcome: selectedOutcome, predictedHomeScore, predictedAwayScore, status: "saving" });
    startTransition(async () => {
      try {
        await postPrediction({ predicted_outcome: selectedOutcome, predicted_home_score: predictedHomeScore, predicted_away_score: predictedAwayScore });
        markPredictionStatus(match.id, "saved");
      } catch (error) {
        markPredictionStatus(match.id, "error", error instanceof Error ? error.message : "Could not save prediction");
      }
    });
  }

  const inputClass = `w-full rounded-2xl border border-slate-200 bg-white p-4 text-center text-2xl font-black transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${locked ? "opacity-60" : ""}`;
  const outcomeOptions: MatchOutcome[] = ["HOME", "DRAW", "AWAY"];

  return (
    <div className={`mt-4 space-y-4 ${locked ? "opacity-60" : ""}`}>
      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Win / Draw / Win</p>
            <p className="text-sm font-bold text-slate-600">Correct result prediction scores 1 mark.</p>
          </div>
          {currentOutcome && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{outcomeLabel(currentOutcome, match)}</span>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {outcomeOptions.map((outcome) => {
            const active = selectedOutcome === outcome;
            return (
              <button
                key={outcome}
                type="button"
                disabled={locked || isPending}
                onClick={() => setSelectedOutcome(outcome)}
                className={`rounded-2xl px-2 py-3 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${active ? "bg-navy text-white shadow-lg shadow-navy/20" : "bg-white text-slate-700 shadow-sm"}`}
              >
                {outcome === "HOME" ? "W" : outcome === "DRAW" ? "D" : "W"}
                <span className="block truncate text-[10px] font-bold opacity-70">{outcomeLabel(outcome, match)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Correct score</p>
        <p className="text-sm font-bold text-slate-600">Exact score prediction scores 3 marks.</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <label className="block">
            <span className="mb-2 flex justify-center text-xs font-black text-slate-600"><TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} flagImageUrl={match.homeFlagImageUrl} className="max-w-full" flagClassName="h-7 w-7 text-lg" nameClassName="truncate" /></span>
            <input aria-label={`${match.homeTeam} score`} type="number" min="0" inputMode="numeric" disabled={locked} value={home} onChange={(event) => setHome(event.target.value)} className={inputClass} />
          </label>
          <span className="pb-4 font-black text-slate-400">–</span>
          <label className="block">
            <span className="mb-2 flex justify-center text-xs font-black text-slate-600"><TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} className="max-w-full" flagClassName="h-7 w-7 text-lg" nameClassName="truncate" /></span>
            <input aria-label={`${match.awayTeam} score`} type="number" min="0" inputMode="numeric" disabled={locked} value={away} onChange={(event) => setAway(event.target.value)} className={inputClass} />
          </label>
        </div>
        {scoreOutcomeMismatch && (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-600">
            The score must match {selectedOutcomeLabel}. Update Win / Draw / Win or the score before saving.
          </p>
        )}
      </section>

      {!locked && (
        <button type="button" onClick={savePrediction} disabled={isPending || !canSavePrediction} className={`w-full rounded-2xl py-3 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none ${optimistic?.status === "saved" ? "bg-emerald-700" : "bg-emerald-600"}`}>
          {optimistic?.status === "saved" ? "Saved ✓" : optimistic?.status === "saving" ? "Saving…" : "Save prediction"}
        </button>
      )}

      {locked && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-600"><LockIcon className="h-4 w-4" /> Locked at kickoff</div>
      )}
      {optimistic?.status === "error" && <p className="text-center text-xs font-bold text-red-600">{optimistic.error}</p>}
    </div>
  );
}
