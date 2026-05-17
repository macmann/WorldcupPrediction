CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'PAUSED', 'POSTPONED', 'CANCELLED', 'FINISHED');
CREATE TYPE "LeagueType" AS ENUM ('GLOBAL', 'PRIVATE');
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE');
CREATE TYPE "StageType" AS ENUM ('GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT,
  "display_name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "registration_timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "global_points" INTEGER NOT NULL DEFAULT 0,
  "exact_scores_count" INTEGER NOT NULL DEFAULT 0,
  "correct_outcomes_count" INTEGER NOT NULL DEFAULT 0,
  "is_admin" BOOLEAN NOT NULL DEFAULT false,
  "onboarding_completed_at" TIMESTAMPTZ
);

CREATE TABLE "oauth_accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" "AuthProvider" NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "oauth_accounts_provider_account_unique" UNIQUE ("provider", "provider_account_id")
);

CREATE TABLE "user_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "revoked_at" TIMESTAMPTZ
);

CREATE TABLE "tournaments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "external_id" TEXT UNIQUE,
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ,
  "host_countries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "teams" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tournament_id" UUID NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "external_id" TEXT,
  "name" TEXT NOT NULL,
  "short_name" TEXT,
  "flag_emoji" TEXT,
  "group_name" TEXT,
  CONSTRAINT "teams_tournament_name_unique" UNIQUE ("tournament_id", "name"),
  CONSTRAINT "teams_tournament_external_unique" UNIQUE ("tournament_id", "external_id")
);

CREATE TABLE "players" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tournament_id" UUID NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "team_id" UUID REFERENCES "teams"("id") ON DELETE SET NULL,
  "external_id" TEXT,
  "name" TEXT NOT NULL,
  "position" TEXT,
  "is_goalkeeper" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "players_tournament_external_unique" UNIQUE ("tournament_id", "external_id")
);

CREATE TABLE "matches" (
  "id" INTEGER PRIMARY KEY,
  "tournament_id" UUID REFERENCES "tournaments"("id") ON DELETE SET NULL,
  "external_id" TEXT UNIQUE,
  "matchday" INTEGER,
  "stage" "StageType" NOT NULL DEFAULT 'GROUP',
  "group_name" TEXT,
  "home_team" TEXT NOT NULL,
  "away_team" TEXT NOT NULL,
  "home_team_id" UUID REFERENCES "teams"("id") ON DELETE SET NULL,
  "away_team_id" UUID REFERENCES "teams"("id") ON DELETE SET NULL,
  "venue" TEXT,
  "kickoff_time" TIMESTAMPTZ NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
  "home_score" INTEGER,
  "away_score" INTEGER,
  "home_score_90" INTEGER,
  "away_score_90" INTEGER,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "predictions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "match_id" INTEGER NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "predicted_home_score" INTEGER NOT NULL,
  "predicted_away_score" INTEGER NOT NULL,
  "points_awarded" INTEGER,
  "is_exact_score" BOOLEAN NOT NULL DEFAULT false,
  "is_correct_outcome" BOOLEAN NOT NULL DEFAULT false,
  "is_locked" BOOLEAN NOT NULL DEFAULT false,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "scored_at" TIMESTAMPTZ,
  CONSTRAINT "predictions_user_match_unique" UNIQUE ("user_id", "match_id")
);

CREATE TABLE "outrights" (
  "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "tournament_id" UUID REFERENCES "tournaments"("id") ON DELETE SET NULL,
  "champion_team_id" UUID NOT NULL REFERENCES "teams"("id") ON DELETE RESTRICT,
  "best_player_id" UUID NOT NULL REFERENCES "players"("id") ON DELETE RESTRICT,
  "best_gk_id" UUID NOT NULL REFERENCES "players"("id") ON DELETE RESTRICT,
  "points_awarded" INTEGER,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "leagues" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "join_code" VARCHAR(8) NOT NULL UNIQUE,
  "type" "LeagueType" NOT NULL DEFAULT 'PRIVATE',
  "owner_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "league_members" (
  "league_id" UUID NOT NULL REFERENCES "leagues"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("league_id", "user_id")
);

CREATE TABLE "league_rank_snapshots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "league_id" UUID NOT NULL REFERENCES "leagues"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rank" INTEGER NOT NULL,
  "total_points" INTEGER NOT NULL,
  "captured_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "league_rank_snapshots_unique" UNIQUE ("league_id", "user_id", "captured_at")
);

CREATE TABLE "notification_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel" "NotificationChannel" NOT NULL,
  "endpoint" TEXT NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "notification_preferences_user_channel_endpoint_unique" UNIQUE ("user_id", "channel", "endpoint")
);

CREATE TABLE "notification_deliveries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "match_id" INTEGER REFERENCES "matches"("id") ON DELETE CASCADE,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "error" TEXT,
  "scheduled_for" TIMESTAMPTZ NOT NULL,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "share_cards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "share_date" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "share_cards_user_date_unique" UNIQUE ("user_id", "share_date")
);

CREATE TABLE "share_card_items" (
  "share_card_id" UUID NOT NULL REFERENCES "share_cards"("id") ON DELETE CASCADE,
  "match_id" INTEGER NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "predicted_home_score" INTEGER NOT NULL,
  "predicted_away_score" INTEGER NOT NULL,
  PRIMARY KEY ("share_card_id", "match_id")
);

CREATE INDEX "leaderboard_tiebreaker_idx" ON "users"("global_points" DESC, "exact_scores_count" DESC, "registration_timestamp" ASC);
CREATE INDEX "oauth_accounts_user_idx" ON "oauth_accounts"("user_id");
CREATE INDEX "user_sessions_user_expires_idx" ON "user_sessions"("user_id", "expires_at");
CREATE INDEX "teams_tournament_group_idx" ON "teams"("tournament_id", "group_name");
CREATE INDEX "players_tournament_goalkeeper_idx" ON "players"("tournament_id", "is_goalkeeper");
CREATE INDEX "players_team_idx" ON "players"("team_id");
CREATE INDEX "matches_matchday_kickoff_idx" ON "matches"("matchday", "kickoff_time");
CREATE INDEX "matches_status_kickoff_idx" ON "matches"("status", "kickoff_time");
CREATE INDEX "matches_tournament_stage_kickoff_idx" ON "matches"("tournament_id", "stage", "kickoff_time");
CREATE INDEX "predictions_match_idx" ON "predictions"("match_id");
CREATE INDEX "predictions_user_submitted_idx" ON "predictions"("user_id", "submitted_at");
CREATE INDEX "outrights_tournament_idx" ON "outrights"("tournament_id");
CREATE INDEX "leagues_type_idx" ON "leagues"("type");
CREATE INDEX "league_members_user_idx" ON "league_members"("user_id");
CREATE INDEX "league_rank_snapshots_league_captured_idx" ON "league_rank_snapshots"("league_id", "captured_at");
CREATE INDEX "league_rank_snapshots_user_captured_idx" ON "league_rank_snapshots"("user_id", "captured_at");
CREATE INDEX "notification_preferences_user_enabled_idx" ON "notification_preferences"("user_id", "is_enabled");
CREATE INDEX "notification_deliveries_status_scheduled_idx" ON "notification_deliveries"("status", "scheduled_for");
CREATE INDEX "notification_deliveries_user_created_idx" ON "notification_deliveries"("user_id", "created_at");
CREATE INDEX "share_card_items_match_idx" ON "share_card_items"("match_id");
