-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'PAUSED', 'POSTPONED', 'CANCELLED', 'FINISHED');

-- CreateEnum
CREATE TYPE "MatchOutcome" AS ENUM ('HOME', 'DRAW', 'AWAY');

-- CreateEnum
CREATE TYPE "LeagueType" AS ENUM ('GLOBAL', 'PRIVATE');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AdminMessageAudienceType" AS ENUM ('ALL', 'USER', 'LEAGUE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "registration_timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "global_points" INTEGER NOT NULL DEFAULT 0,
    "exact_scores_count" INTEGER NOT NULL DEFAULT 0,
    "correct_outcomes_count" INTEGER NOT NULL DEFAULT 0,
    "matches_played_count" INTEGER NOT NULL DEFAULT 0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "banned_at" TIMESTAMPTZ(6),
    "onboarding_completed_at" TIMESTAMPTZ(6),
    "preferred_locale" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_accounts" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "two_factor_enabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "external_id" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "sync_from_at" TIMESTAMPTZ(6),
    "host_countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "flag_emoji" TEXT,
    "group_name" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "team_id" UUID,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "sequence_number" INTEGER,
    "position" TEXT,
    "is_goalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'API',

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" INTEGER NOT NULL,
    "tournament_id" UUID,
    "external_id" TEXT,
    "matchday" INTEGER,
    "stage" "StageType" NOT NULL DEFAULT 'GROUP',
    "group_name" TEXT,
    "home_team" TEXT NOT NULL,
    "away_team" TEXT NOT NULL,
    "home_team_id" UUID,
    "away_team_id" UUID,
    "venue" TEXT,
    "kickoff_time" TIMESTAMPTZ(6) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "home_score_90" INTEGER,
    "away_score_90" INTEGER,
    "actual_penalty_shootout" BOOLEAN,
    "highlight_url" TEXT,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "match_id" INTEGER NOT NULL,
    "predicted_outcome" "MatchOutcome",
    "predicted_home_score" INTEGER,
    "predicted_away_score" INTEGER,
    "predicted_penalty_shootout" BOOLEAN,
    "points_awarded" INTEGER,
    "is_exact_score" BOOLEAN NOT NULL DEFAULT false,
    "is_correct_outcome" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "scored_at" TIMESTAMPTZ(6),

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outrights" (
    "user_id" UUID NOT NULL,
    "tournament_id" UUID,
    "champion_team_id" UUID NOT NULL,
    "second_runner_up_team_id" UUID NOT NULL,
    "third_place_team_id" UUID,
    "fair_play_team_id" UUID NOT NULL,
    "best_player_id" UUID NOT NULL,
    "best_gk_id" UUID NOT NULL,
    "golden_boot_player_id" UUID NOT NULL,
    "young_player_id" UUID NOT NULL,
    "points_awarded" INTEGER,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outrights_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "join_code" VARCHAR(8) NOT NULL,
    "type" "LeagueType" NOT NULL DEFAULT 'PRIVATE',
    "owner_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_members" (
    "league_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_members_pkey" PRIMARY KEY ("league_id","user_id")
);

-- CreateTable
CREATE TABLE "league_rank_snapshots" (
    "id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_rank_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "match_id" INTEGER,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_messages" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience_type" "AdminMessageAudienceType" NOT NULL,
    "sent_by_admin_id" UUID,
    "sent_by_admin_username" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_message_receipts" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_message_league_targets" (
    "message_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,

    CONSTRAINT "admin_message_league_targets_pkey" PRIMARY KEY ("message_id","league_id")
);

-- CreateTable
CREATE TABLE "share_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "share_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_card_items" (
    "share_card_id" UUID NOT NULL,
    "match_id" INTEGER NOT NULL,
    "predicted_home_score" INTEGER NOT NULL,
    "predicted_away_score" INTEGER NOT NULL,

    CONSTRAINT "share_card_items_pkey" PRIMARY KEY ("share_card_id","match_id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_frequency_hours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_views" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "announcement_text" TEXT,
    "banner_image_url" TEXT,
    "login_background_image_url" TEXT,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "player_catalog_source" TEXT NOT NULL DEFAULT 'API',
    "game_rules_html" TEXT,
    "terms_conditions_html" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_job_statuses" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "last_run_at" TIMESTAMPTZ(6),
    "last_success_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "last_payload" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_job_statuses_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "outright_settlements" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "golden_ball_player_id" UUID NOT NULL,
    "golden_glove_player_id" UUID NOT NULL,
    "settled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outright_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "leaderboard_tiebreaker_idx" ON "users"("global_points" DESC, "matches_played_count" ASC, "registration_timestamp" ASC);

-- CreateIndex
CREATE INDEX "users_is_banned_idx" ON "users"("is_banned");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_username_key" ON "admin_accounts"("username");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_external_id_key" ON "tournaments"("external_id");

-- CreateIndex
CREATE INDEX "tournaments_is_active_starts_at_idx" ON "tournaments"("is_active", "starts_at");

-- CreateIndex
CREATE INDEX "teams_tournament_id_group_name_idx" ON "teams"("tournament_id", "group_name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tournament_id_name_key" ON "teams"("tournament_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tournament_id_external_id_key" ON "teams"("tournament_id", "external_id");

-- CreateIndex
CREATE INDEX "players_tournament_id_is_goalkeeper_idx" ON "players"("tournament_id", "is_goalkeeper");

-- CreateIndex
CREATE INDEX "players_tournament_id_sequence_number_idx" ON "players"("tournament_id", "sequence_number");

-- CreateIndex
CREATE INDEX "players_tournament_id_source_idx" ON "players"("tournament_id", "source");

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_tournament_id_external_id_key" ON "players"("tournament_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_external_id_key" ON "matches"("external_id");

-- CreateIndex
CREATE INDEX "matches_matchday_kickoff_time_idx" ON "matches"("matchday", "kickoff_time");

-- CreateIndex
CREATE INDEX "matches_status_kickoff_time_idx" ON "matches"("status", "kickoff_time");

-- CreateIndex
CREATE INDEX "matches_is_enabled_kickoff_time_idx" ON "matches"("is_enabled", "kickoff_time");

-- CreateIndex
CREATE INDEX "matches_tournament_id_stage_kickoff_time_idx" ON "matches"("tournament_id", "stage", "kickoff_time");

-- CreateIndex
CREATE INDEX "predictions_match_id_idx" ON "predictions"("match_id");

-- CreateIndex
CREATE INDEX "predictions_user_id_submitted_at_idx" ON "predictions"("user_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_user_id_match_id_key" ON "predictions"("user_id", "match_id");

-- CreateIndex
CREATE INDEX "outrights_tournament_id_idx" ON "outrights"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_join_code_key" ON "leagues"("join_code");

-- CreateIndex
CREATE INDEX "leagues_type_idx" ON "leagues"("type");

-- CreateIndex
CREATE INDEX "league_members_user_id_idx" ON "league_members"("user_id");

-- CreateIndex
CREATE INDEX "league_rank_snapshots_league_id_captured_at_idx" ON "league_rank_snapshots"("league_id", "captured_at");

-- CreateIndex
CREATE INDEX "league_rank_snapshots_user_id_captured_at_idx" ON "league_rank_snapshots"("user_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "league_rank_snapshots_league_id_user_id_captured_at_key" ON "league_rank_snapshots"("league_id", "user_id", "captured_at");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_is_enabled_idx" ON "notification_preferences"("user_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_channel_endpoint_key" ON "notification_preferences"("user_id", "channel", "endpoint");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_scheduled_for_idx" ON "notification_deliveries"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "notification_deliveries_user_id_created_at_idx" ON "notification_deliveries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_messages_created_at_idx" ON "admin_messages"("created_at");

-- CreateIndex
CREATE INDEX "admin_messages_audience_type_created_at_idx" ON "admin_messages"("audience_type", "created_at");

-- CreateIndex
CREATE INDEX "admin_message_receipts_user_id_read_at_delivered_at_idx" ON "admin_message_receipts"("user_id", "read_at", "delivered_at");

-- CreateIndex
CREATE INDEX "admin_message_receipts_message_id_idx" ON "admin_message_receipts"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_message_receipts_message_id_user_id_key" ON "admin_message_receipts"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "admin_message_league_targets_league_id_idx" ON "admin_message_league_targets"("league_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_cards_user_id_share_date_key" ON "share_cards"("user_id", "share_date");

-- CreateIndex
CREATE INDEX "share_card_items_match_id_idx" ON "share_card_items"("match_id");

-- CreateIndex
CREATE INDEX "announcements_is_active_created_at_idx" ON "announcements"("is_active", "created_at");

-- CreateIndex
CREATE INDEX "announcement_views_user_id_seen_at_idx" ON "announcement_views"("user_id", "seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_views_announcement_id_user_id_key" ON "announcement_views"("announcement_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "outright_settlements_tournament_id_key" ON "outright_settlements"("tournament_id");

-- CreateIndex
CREATE INDEX "outright_settlements_settled_at_idx" ON "outright_settlements"("settled_at");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_champion_team_id_fkey" FOREIGN KEY ("champion_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_second_runner_up_team_id_fkey" FOREIGN KEY ("second_runner_up_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_third_place_team_id_fkey" FOREIGN KEY ("third_place_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_fair_play_team_id_fkey" FOREIGN KEY ("fair_play_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_best_player_id_fkey" FOREIGN KEY ("best_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_best_gk_id_fkey" FOREIGN KEY ("best_gk_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_golden_boot_player_id_fkey" FOREIGN KEY ("golden_boot_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_young_player_id_fkey" FOREIGN KEY ("young_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_rank_snapshots" ADD CONSTRAINT "league_rank_snapshots_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_rank_snapshots" ADD CONSTRAINT "league_rank_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_message_receipts" ADD CONSTRAINT "admin_message_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "admin_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_message_receipts" ADD CONSTRAINT "admin_message_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_message_league_targets" ADD CONSTRAINT "admin_message_league_targets_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "admin_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_message_league_targets" ADD CONSTRAINT "admin_message_league_targets_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_cards" ADD CONSTRAINT "share_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_card_items" ADD CONSTRAINT "share_card_items_share_card_id_fkey" FOREIGN KEY ("share_card_id") REFERENCES "share_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_card_items" ADD CONSTRAINT "share_card_items_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_views" ADD CONSTRAINT "announcement_views_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_views" ADD CONSTRAINT "announcement_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outright_settlements" ADD CONSTRAINT "outright_settlements_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outright_settlements" ADD CONSTRAINT "outright_settlements_golden_ball_player_id_fkey" FOREIGN KEY ("golden_ball_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outright_settlements" ADD CONSTRAINT "outright_settlements_golden_glove_player_id_fkey" FOREIGN KEY ("golden_glove_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

