"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LockIcon } from "@/components/Icons";
import { TeamName, teamNameWithFlag } from "@/components/TeamName";
import { isKnockoutStage, knockoutScoreMatchesAdvancingTeam, scoreMatchesOutcome } from "@/lib/matchPrediction";
import { useStore } from "@/store/useStore";
import type { Match, MatchOutcome } from "@/lib/frontendData";

function lockedByServerTime(match: Match, serverTime: Date) {
  return match.isLocked || serverTime >= new Date(match.kickoffTime) || match.status !== "SCHEDULED";
}

function outcomeLabel(outcome: MatchOutcome, match: Match, t: ReturnType<typeof useStore>["t"]) {
  if (outcome === "HOME") return `${teamNameWithFlag(match.homeTeam, match.homeFlagEmoji)} ${t("prediction.win")}`;
  if (outcome === "AWAY") return `${teamNameWithFlag(match.awayTeam, match.awayFlagEmoji)} ${t("prediction.win")}`;
  return t("prediction.draw");
}

export function PredictionForm({ match, serverNowIso }: { match: Match; serverNowIso: string }) {
  const { predictions, setOptimisticPrediction, markPredictionStatus, t } = useStore();
  const [isPending, startTransition] = useTransition();
  const optimistic = predictions[match.id];
  const currentOutcome = optimistic?.predictedOutcome ?? match.prediction?.predictedOutcome ?? null;
  const currentHome = optimistic?.predictedHomeScore ?? match.prediction?.predictedHomeScore;
  const currentAway = optimistic?.predictedAwayScore ?? match.prediction?.predictedAwayScore;
  const currentPenaltyShootout = optimistic?.predictedPenaltyShootout ?? match.prediction?.predictedPenaltyShootout ?? null;
  const [selectedOutcome, setSelectedOutcome] = useState<MatchOutcome | null>(currentOutcome);
  const [home, setHome] = useState(currentHome?.toString() ?? "");
  const [away, setAway] = useState(currentAway?.toString() ?? "");
  const [penaltyShootout, setPenaltyShootout] = useState<boolean | null>(currentPenaltyShootout);
  const locked = useMemo(() => lockedByServerTime(match, new Date(serverNowIso)), [match, serverNowIso]);
  const knockout = isKnockoutStage(match.stage);

  useEffect(() => {
    setSelectedOutcome(currentOutcome);
    setHome(currentHome?.toString() ?? "");
    setAway(currentAway?.toString() ?? "");
    setPenaltyShootout(currentPenaltyShootout);
  }, [currentAway, currentHome, currentOutcome, currentPenaltyShootout]);

  async function postPrediction(body: Record<string, unknown>) {
    const response = await fetch("/api/predictions/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: match.id, ...body })
    });
    if (!response.ok) throw new Error((await response.json()).error ?? t("prediction.saveError"));
  }

  const hasCompleteScore = home !== "" && away !== "";
  const predictedHomeScore = hasCompleteScore ? Number(home) : null;
  const predictedAwayScore = hasCompleteScore ? Number(away) : null;
  const hasValidScoreNumbers = predictedHomeScore !== null && predictedAwayScore !== null && !Number.isNaN(predictedHomeScore) && !Number.isNaN(predictedAwayScore);
  const scoreOutcomeMismatch = selectedOutcome && hasValidScoreNumbers && !(knockout ? knockoutScoreMatchesAdvancingTeam(selectedOutcome, predictedHomeScore, predictedAwayScore) : scoreMatchesOutcome(selectedOutcome, predictedHomeScore, predictedAwayScore));
  const canSavePrediction = Boolean(selectedOutcome && hasValidScoreNumbers && !scoreOutcomeMismatch && (!knockout || penaltyShootout !== null));
  const selectedOutcomeLabel = selectedOutcome ? outcomeLabel(selectedOutcome, match, t) : t("prediction.selectedResult");

  function savePrediction() {
    if (!selectedOutcome || !hasValidScoreNumbers || scoreOutcomeMismatch || (knockout && penaltyShootout === null)) return;

    setOptimisticPrediction({ matchId: match.id, predictedOutcome: selectedOutcome, predictedHomeScore, predictedAwayScore, predictedPenaltyShootout: knockout ? penaltyShootout : null, status: "saving" });
    startTransition(async () => {
      try {
        await postPrediction({ predicted_outcome: selectedOutcome, predicted_home_score: predictedHomeScore, predicted_away_score: predictedAwayScore, predicted_penalty_shootout: knockout ? penaltyShootout : null });
        markPredictionStatus(match.id, "saved");
      } catch (error) {
        markPredictionStatus(match.id, "error", error instanceof Error ? error.message : t("prediction.saveError"));
      }
    });
  }

  const inputClass = `w-full rounded-2xl border border-slate-200 bg-white p-4 text-center text-2xl font-black transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${locked ? "opacity-60" : ""}`;
  const outcomeOptions: MatchOutcome[] = knockout ? ["HOME", "AWAY"] : ["HOME", "DRAW", "AWAY"];

  return (
    <div className={`mt-4 space-y-4 ${locked ? "opacity-60" : ""}`}>
      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">{knockout ? t("prediction.pickWinner") : t("prediction.winDrawWin")}</p>
            <p className="text-sm font-bold text-slate-600">{t("prediction.correctResultHelp")}</p>
          </div>
          {currentOutcome && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{outcomeLabel(currentOutcome, match, t)}</span>}
        </div>
        <div className={`mt-3 grid gap-2 ${knockout ? "grid-cols-2" : "grid-cols-3"}`}>
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
                <span className="block truncate text-[10px] font-bold opacity-70">{outcomeLabel(outcome, match, t)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">{t("prediction.correctScore")}</p>
        <p className="text-sm font-bold text-slate-600">{t("prediction.exactScoreHelp")}</p>
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
            {knockout ? t("prediction.knockoutScoreMismatch") : `${t("prediction.scoreMismatchPrefix")} ${selectedOutcomeLabel}. ${t("prediction.scoreMismatchSuffix")}`}
          </p>
        )}
      </section>

      {knockout && (
        <section className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">PENALTY SHOOT-OUT</p>
          <p className="text-sm font-bold text-slate-600">Will there be a penalty shoot-out?</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Correct penalty shoot-out prediction scores 1 point. This means the post-extra-time shoot-out used to decide the winner, not a normal penalty kick during the match.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[{ label: "Yes", value: true }, { label: "No", value: false }].map((option) => {
              const active = penaltyShootout === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  disabled={locked || isPending}
                  onClick={() => setPenaltyShootout(option.value)}
                  className={`rounded-2xl px-2 py-3 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${active ? "bg-navy text-white shadow-lg shadow-navy/20" : "bg-white text-slate-700 shadow-sm"}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!locked && (
        <button type="button" onClick={savePrediction} disabled={isPending || !canSavePrediction} className={`w-full rounded-2xl py-3 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none ${optimistic?.status === "saved" ? "bg-emerald-700" : "bg-emerald-600"}`}>
          {optimistic?.status === "saved" ? t("prediction.saved") : optimistic?.status === "saving" ? t("prediction.saving") : t("prediction.save")}
        </button>
      )}

      {locked && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-600"><LockIcon className="h-4 w-4" /> {t("prediction.lockedKickoff")}</div>
      )}
      {optimistic?.status === "error" && <p className="text-center text-xs font-bold text-red-600">{optimistic.error}</p>}
    </div>
  );
}
