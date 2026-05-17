CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED');
CREATE TYPE "LeagueType" AS ENUM ('GLOBAL', 'PRIVATE');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "registration_timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "global_points" INTEGER NOT NULL DEFAULT 0,
  "exact_scores_count" INTEGER NOT NULL DEFAULT 0,
  "is_admin" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "matches" (
  "id" INTEGER PRIMARY KEY,
  "matchday" INTEGER,
  "home_team" TEXT NOT NULL,
  "away_team" TEXT NOT NULL,
  "kickoff_time" TIMESTAMPTZ NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
  "home_score" INTEGER,
  "away_score" INTEGER
);

CREATE TABLE "predictions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "match_id" INTEGER NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "predicted_home_score" INTEGER NOT NULL,
  "predicted_away_score" INTEGER NOT NULL,
  "points_awarded" INTEGER,
  "is_locked" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "predictions_user_match_unique" UNIQUE ("user_id", "match_id")
);

CREATE TABLE "outrights" (
  "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "champion_team_id" TEXT NOT NULL,
  "best_player_id" TEXT NOT NULL,
  "best_gk_id" TEXT NOT NULL,
  "points_awarded" INTEGER
);

CREATE TABLE "leagues" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "join_code" VARCHAR(8) NOT NULL UNIQUE,
  "type" "LeagueType" NOT NULL DEFAULT 'PRIVATE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "league_members" (
  "league_id" UUID NOT NULL REFERENCES "leagues"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("league_id", "user_id")
);

CREATE INDEX "matches_matchday_kickoff_idx" ON "matches"("matchday", "kickoff_time");
CREATE INDEX "matches_status_kickoff_idx" ON "matches"("status", "kickoff_time");
CREATE INDEX "predictions_match_idx" ON "predictions"("match_id");
CREATE INDEX "league_members_user_idx" ON "league_members"("user_id");
CREATE INDEX "leaderboard_tiebreaker_idx" ON "users"("global_points" DESC, "exact_scores_count" DESC, "registration_timestamp" ASC);
