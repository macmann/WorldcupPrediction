export const PLAYER_POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"] as const;

export type PlayerPosition = typeof PLAYER_POSITIONS[number];
export type AwardPlayerType = "goldenGlove" | "goldenBall" | "youngPlayer" | "goldenBoot";

export function isGoalkeeperPosition(position?: string | null) {
  if (!position) return false;
  const normalized = position.trim().toUpperCase();
  return normalized === "GK" || normalized === "G" || normalized.includes("GOALKEEPER") || normalized.includes("KEEPER");
}

export function isEligibleForAward(award: AwardPlayerType, player: { position?: string | null; isGoalkeeper?: boolean }) {
  const isGoalkeeper = player.isGoalkeeper || isGoalkeeperPosition(player.position);
  if (award === "goldenGlove") return Boolean(isGoalkeeper);
  if (award === "goldenBoot") return !isGoalkeeper;
  return true;
}
