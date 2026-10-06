import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma";

const requiredColumns: Record<string, string[]> = {
  users: ["is_system", "notification_settings"],
  matches: ["competition_id", "season_id", "gameweek_id", "scoring_gameweek_id", "prediction_lock_at"],
  predictions: ["base_points", "points_multiplier", "upset_points"],
  competitions: ["id"], seasons: ["id"], gameweeks: ["id"],
  season_standings: ["season_id"], gameweek_standings: ["gameweek_id"], gameweek_bankers: ["match_id"],
  season_pick_rules: ["id"], season_picks: ["id"], season_rivals: ["rival_id"],
  achievement_definitions: ["id"], user_achievements: ["id"], league_seasons: ["id"],
  league_season_participants: ["league_season_id"], h2h_fixtures: ["id"], bonus_questions: ["id"],
  bonus_answers: ["answer"], consensus_snapshots: ["match_id"], ai_generations: ["id"], platform_notifications: ["id"]
};

export async function platformSchemaReadiness(db: Pick<PrismaClient, "$queryRaw"> = prisma) {
  const columns = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()
  `;
  const existing = new Set(columns.map(column => `${column.table_name}.${column.column_name}`));
  const missing = Object.entries(requiredColumns).flatMap(([table, names]) => names.map(name => `${table}.${name}`)).filter(name => !existing.has(name));
  return { ready: missing.length === 0, missing };
}

export async function requirePlatformSchema() {
  const result = await platformSchemaReadiness();
  if (!result.ready) throw new Error(`Database schema is behind the application (${result.missing.join(", ")}). Back up the database, then run npm run platform:migrate before starting the new release. See docs/platform-migration.md for historical migration issues.`);
}
