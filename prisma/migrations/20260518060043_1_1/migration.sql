-- Align the hand-written baseline migrations with Prisma's generated PostgreSQL
-- DDL so databases that already applied this migration do not need a reset.

-- Drop client-managed defaults that Prisma does not create in PostgreSQL for
-- @default(uuid()) and @updatedAt fields.
ALTER TABLE "admin_accounts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "admin_accounts" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "admin_job_statuses" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "announcement_views" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "announcements" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "app_settings" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "league_rank_snapshots" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "leagues" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "matches" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "notification_deliveries" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "notification_preferences" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "notification_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "oauth_accounts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "outright_settlements" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "outright_settlements" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "outrights" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "players" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "predictions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "predictions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "share_cards" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "teams" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "tournaments" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "tournaments" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "user_sessions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- Recreate foreign keys with Prisma's default ON UPDATE CASCADE action.
ALTER TABLE "league_members" DROP CONSTRAINT "league_members_league_id_fkey";
ALTER TABLE "league_members" DROP CONSTRAINT "league_members_user_id_fkey";
ALTER TABLE "league_rank_snapshots" DROP CONSTRAINT "league_rank_snapshots_league_id_fkey";
ALTER TABLE "league_rank_snapshots" DROP CONSTRAINT "league_rank_snapshots_user_id_fkey";
ALTER TABLE "matches" DROP CONSTRAINT "matches_away_team_id_fkey";
ALTER TABLE "matches" DROP CONSTRAINT "matches_home_team_id_fkey";
ALTER TABLE "matches" DROP CONSTRAINT "matches_tournament_id_fkey";
ALTER TABLE "notification_deliveries" DROP CONSTRAINT "notification_deliveries_match_id_fkey";
ALTER TABLE "notification_deliveries" DROP CONSTRAINT "notification_deliveries_user_id_fkey";
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_user_id_fkey";
ALTER TABLE "oauth_accounts" DROP CONSTRAINT "oauth_accounts_user_id_fkey";
ALTER TABLE "outrights" DROP CONSTRAINT "outrights_best_gk_id_fkey";
ALTER TABLE "outrights" DROP CONSTRAINT "outrights_best_player_id_fkey";
ALTER TABLE "outrights" DROP CONSTRAINT "outrights_champion_team_id_fkey";
ALTER TABLE "outrights" DROP CONSTRAINT "outrights_tournament_id_fkey";
ALTER TABLE "outrights" DROP CONSTRAINT "outrights_user_id_fkey";
ALTER TABLE "players" DROP CONSTRAINT "players_team_id_fkey";
ALTER TABLE "players" DROP CONSTRAINT "players_tournament_id_fkey";
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_match_id_fkey";
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_user_id_fkey";
ALTER TABLE "share_card_items" DROP CONSTRAINT "share_card_items_match_id_fkey";
ALTER TABLE "share_card_items" DROP CONSTRAINT "share_card_items_share_card_id_fkey";
ALTER TABLE "share_cards" DROP CONSTRAINT "share_cards_user_id_fkey";
ALTER TABLE "teams" DROP CONSTRAINT "teams_tournament_id_fkey";
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_user_id_fkey";

ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_rank_snapshots" ADD CONSTRAINT "league_rank_snapshots_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_rank_snapshots" ADD CONSTRAINT "league_rank_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_best_gk_id_fkey" FOREIGN KEY ("best_gk_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_best_player_id_fkey" FOREIGN KEY ("best_player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_champion_team_id_fkey" FOREIGN KEY ("champion_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outrights" ADD CONSTRAINT "outrights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_card_items" ADD CONSTRAINT "share_card_items_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_card_items" ADD CONSTRAINT "share_card_items_share_card_id_fkey" FOREIGN KEY ("share_card_id") REFERENCES "share_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_cards" ADD CONSTRAINT "share_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename legacy hand-authored indexes and unique constraints to Prisma's
-- generated names so migrate diff no longer reports drift.
ALTER INDEX "league_members_user_idx" RENAME TO "league_members_user_id_idx";
ALTER INDEX "league_rank_snapshots_league_captured_idx" RENAME TO "league_rank_snapshots_league_id_captured_at_idx";
ALTER TABLE "league_rank_snapshots" RENAME CONSTRAINT "league_rank_snapshots_unique" TO "league_rank_snapshots_league_id_user_id_captured_at_key";
ALTER INDEX "league_rank_snapshots_user_captured_idx" RENAME TO "league_rank_snapshots_user_id_captured_at_idx";
ALTER INDEX "matches_is_enabled_kickoff_idx" RENAME TO "matches_is_enabled_kickoff_time_idx";
ALTER INDEX "matches_matchday_kickoff_idx" RENAME TO "matches_matchday_kickoff_time_idx";
ALTER INDEX "matches_status_kickoff_idx" RENAME TO "matches_status_kickoff_time_idx";
ALTER INDEX "matches_tournament_stage_kickoff_idx" RENAME TO "matches_tournament_id_stage_kickoff_time_idx";
ALTER INDEX "notification_deliveries_status_scheduled_idx" RENAME TO "notification_deliveries_status_scheduled_for_idx";
ALTER INDEX "notification_deliveries_user_created_idx" RENAME TO "notification_deliveries_user_id_created_at_idx";
ALTER TABLE "notification_preferences" RENAME CONSTRAINT "notification_preferences_user_channel_endpoint_unique" TO "notification_preferences_user_id_channel_endpoint_key";
ALTER INDEX "notification_preferences_user_enabled_idx" RENAME TO "notification_preferences_user_id_is_enabled_idx";
ALTER TABLE "oauth_accounts" RENAME CONSTRAINT "oauth_accounts_provider_account_unique" TO "oauth_accounts_provider_provider_account_id_key";
ALTER INDEX "oauth_accounts_user_idx" RENAME TO "oauth_accounts_user_id_idx";
ALTER INDEX "outrights_tournament_idx" RENAME TO "outrights_tournament_id_idx";
ALTER INDEX "players_team_idx" RENAME TO "players_team_id_idx";
ALTER TABLE "players" RENAME CONSTRAINT "players_tournament_external_unique" TO "players_tournament_id_external_id_key";
ALTER INDEX "players_tournament_goalkeeper_idx" RENAME TO "players_tournament_id_is_goalkeeper_idx";
ALTER INDEX "predictions_match_idx" RENAME TO "predictions_match_id_idx";
ALTER TABLE "predictions" RENAME CONSTRAINT "predictions_user_match_unique" TO "predictions_user_id_match_id_key";
ALTER INDEX "predictions_user_submitted_idx" RENAME TO "predictions_user_id_submitted_at_idx";
ALTER INDEX "share_card_items_match_idx" RENAME TO "share_card_items_match_id_idx";
ALTER TABLE "share_cards" RENAME CONSTRAINT "share_cards_user_date_unique" TO "share_cards_user_id_share_date_key";
ALTER TABLE "teams" RENAME CONSTRAINT "teams_tournament_external_unique" TO "teams_tournament_id_external_id_key";
ALTER INDEX "teams_tournament_group_idx" RENAME TO "teams_tournament_id_group_name_idx";
ALTER TABLE "teams" RENAME CONSTRAINT "teams_tournament_name_unique" TO "teams_tournament_id_name_key";
ALTER INDEX "user_sessions_user_expires_idx" RENAME TO "user_sessions_user_id_expires_at_idx";
