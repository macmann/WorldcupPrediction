import type { MatchOutcome } from "@/lib/frontendData";

export function outcomeFromScore(homeScore: number, awayScore: number): MatchOutcome {
  if (homeScore > awayScore) return "HOME";
  if (awayScore > homeScore) return "AWAY";
  return "DRAW";
}

export function scoreMatchesOutcome(outcome: MatchOutcome, homeScore: number, awayScore: number) {
  return outcomeFromScore(homeScore, awayScore) === outcome;
}
