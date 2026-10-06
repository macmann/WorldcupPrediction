-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'KNOCKOUT', 'HYBRID');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GameweekStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SeasonPickTarget" AS ENUM ('TEAM', 'PLAYER');

-- CreateEnum
CREATE TYPE "LeagueMode" AS ENUM ('CLASSIC', 'HEAD_TO_HEAD');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notification_settings" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "badge_url" TEXT,
ADD COLUMN     "season_id" UUID,
ALTER COLUMN "tournament_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "season_id" UUID,
ALTER COLUMN "tournament_id" DROP NOT NULL;

-- AlterTable
CREATE SEQUENCE matches_id_seq;
ALTER TABLE "matches" ADD COLUMN     "competition_id" UUID,
ADD COLUMN     "gameweek_id" UUID,
ADD COLUMN     "is_result_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prediction_lock_at" TIMESTAMPTZ(6),
ADD COLUMN     "scoring_gameweek_id" UUID,
ADD COLUMN     "season_id" UUID,
ALTER COLUMN "id" SET DEFAULT nextval('matches_id_seq');
ALTER SEQUENCE matches_id_seq OWNED BY "matches"."id";

-- AlterTable
ALTER TABLE "predictions" ADD COLUMN     "base_points" INTEGER,
ADD COLUMN     "points_multiplier" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "upset_points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "region" TEXT,
    "type" "CompetitionType" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'football-data',
    "provider_code" TEXT,
    "external_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "uses_gameweeks" BOOLEAN NOT NULL DEFAULT false,
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "legacy_tournament_id" UUID,
    "display_name" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "provider_season" INTEGER,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "scoring_rules" JSONB NOT NULL DEFAULT '{"outcome":1,"exact":3,"penalty":0,"legacyKnockout":false}',
    "picks_lock_at" TIMESTAMPTZ(6),
    "picks_lock_gameweek" INTEGER DEFAULT 3,
    "underdog_enabled" BOOLEAN NOT NULL DEFAULT false,
    "underdog_threshold" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "underdog_points" INTEGER NOT NULL DEFAULT 1,
    "underdog_min_sample" INTEGER NOT NULL DEFAULT 20,
    "ai_config" JSONB NOT NULL DEFAULT '{"enabled":false}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gameweeks" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "status" "GameweekStatus" NOT NULL DEFAULT 'UPCOMING',
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMPTZ(6),

    CONSTRAINT "gameweeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gameweek_bankers" (
    "user_id" UUID NOT NULL,
    "gameweek_id" UUID NOT NULL,
    "match_id" INTEGER NOT NULL,
    "chosen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(6),

    CONSTRAINT "gameweek_bankers_pkey" PRIMARY KEY ("user_id","gameweek_id")
);

-- CreateTable
CREATE TABLE "season_standings" (
    "season_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "exact_scores" INTEGER NOT NULL DEFAULT 0,
    "correct_outcomes" INTEGER NOT NULL DEFAULT 0,
    "gameweek_wins" INTEGER NOT NULL DEFAULT 0,
    "prediction_count" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "season_standings_pkey" PRIMARY KEY ("season_id","user_id")
);

-- CreateTable
CREATE TABLE "gameweek_standings" (
    "gameweek_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "exact_scores" INTEGER NOT NULL,
    "correct_outcomes" INTEGER NOT NULL,
    "prediction_count" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "cumulative_points" INTEGER NOT NULL,
    "cumulative_rank" INTEGER NOT NULL,
    "cumulative_exact" INTEGER NOT NULL,
    "cumulative_correct" INTEGER NOT NULL,
    "cumulative_wins" INTEGER NOT NULL,
    "last_submitted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gameweek_standings_pkey" PRIMARY KEY ("gameweek_id","user_id")
);

-- CreateTable
CREATE TABLE "season_pick_rules" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "target" "SeasonPickTarget" NOT NULL,
    "selection_count" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lock_at" TIMESTAMPTZ(6),
    "settled_selections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "settled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "season_pick_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_picks" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "selections" TEXT[],
    "points_awarded" INTEGER,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_rivals" (
    "season_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rival_id" UUID NOT NULL,

    CONSTRAINT "season_rivals_pkey" PRIMARY KEY ("season_id","user_id")
);

-- CreateTable
CREATE TABLE "achievement_definitions" (
    "id" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "definition_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "gameweek_id" UUID,
    "context_key" TEXT NOT NULL,
    "earned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_seasons" (
    "id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "mode" "LeagueMode" NOT NULL DEFAULT 'CLASSIC',
    "participants_locked_at" TIMESTAMPTZ(6),

    CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_season_participants" (
    "league_season_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "h2h_eligible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "league_season_participants_pkey" PRIMARY KEY ("league_season_id","user_id")
);

-- CreateTable
CREATE TABLE "h2h_fixtures" (
    "id" UUID NOT NULL,
    "league_season_id" UUID NOT NULL,
    "gameweek_id" UUID NOT NULL,
    "slot" INTEGER NOT NULL,
    "home_user_id" UUID NOT NULL,
    "away_user_id" UUID,
    "home_points" INTEGER,
    "away_points" INTEGER,
    "home_table_points" INTEGER,
    "away_table_points" INTEGER,
    "leader_before_id" UUID,
    "settled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "h2h_fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_questions" (
    "id" UUID NOT NULL,
    "gameweek_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "text_my" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SINGLE_CHOICE',
    "options" JSONB NOT NULL,
    "points" INTEGER NOT NULL,
    "lock_at" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settled_answer" TEXT,

    CONSTRAINT "bonus_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_answers" (
    "question_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "points_awarded" INTEGER,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_answers_pkey" PRIMARY KEY ("question_id","user_id")
);

-- CreateTable
CREATE TABLE "consensus_snapshots" (
    "match_id" INTEGER NOT NULL,
    "home_count" INTEGER NOT NULL,
    "draw_count" INTEGER NOT NULL,
    "away_count" INTEGER NOT NULL,
    "prediction_count" INTEGER NOT NULL,
    "average_home" DOUBLE PRECISION NOT NULL,
    "average_away" DOUBLE PRECISION NOT NULL,
    "frozen_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consensus_snapshots_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "match_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ(6),
    "error" TEXT,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "event_key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_provider_provider_code_key" ON "competitions"("provider", "provider_code");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_legacy_tournament_id_key" ON "seasons"("legacy_tournament_id");

-- CreateIndex
CREATE INDEX "seasons_is_current_status_idx" ON "seasons"("is_current", "status");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_competition_id_display_name_key" ON "seasons"("competition_id", "display_name");

-- CreateIndex
CREATE UNIQUE INDEX "gameweeks_season_id_number_key" ON "gameweeks"("season_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "gameweek_bankers_user_id_match_id_key" ON "gameweek_bankers"("user_id", "match_id");

-- CreateIndex
CREATE UNIQUE INDEX "season_pick_rules_season_id_key_key" ON "season_pick_rules"("season_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "season_picks_rule_id_user_id_key" ON "season_picks"("rule_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_season_id_definition_id_context_k_key" ON "user_achievements"("user_id", "season_id", "definition_id", "context_key");

-- CreateIndex
CREATE UNIQUE INDEX "league_seasons_league_id_season_id_key" ON "league_seasons"("league_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "h2h_fixtures_league_season_id_gameweek_id_slot_key" ON "h2h_fixtures"("league_season_id", "gameweek_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "ai_generations_user_id_match_id_key" ON "ai_generations"("user_id", "match_id");

-- CreateIndex
CREATE INDEX "platform_notifications_user_id_created_at_idx" ON "platform_notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_notifications_user_id_event_key_key" ON "platform_notifications"("user_id", "event_key");

-- CreateIndex
CREATE UNIQUE INDEX "teams_season_id_external_id_key" ON "teams"("season_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_season_id_name_key" ON "teams"("season_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "players_season_id_external_id_key" ON "players"("season_id", "external_id");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_scoring_gameweek_id_fkey" FOREIGN KEY ("scoring_gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_legacy_tournament_id_fkey" FOREIGN KEY ("legacy_tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweeks" ADD CONSTRAINT "gameweeks_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweek_bankers" ADD CONSTRAINT "gameweek_bankers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweek_bankers" ADD CONSTRAINT "gameweek_bankers_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweek_bankers" ADD CONSTRAINT "gameweek_bankers_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_standings" ADD CONSTRAINT "season_standings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_standings" ADD CONSTRAINT "season_standings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweek_standings" ADD CONSTRAINT "gameweek_standings_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweek_standings" ADD CONSTRAINT "gameweek_standings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_pick_rules" ADD CONSTRAINT "season_pick_rules_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_picks" ADD CONSTRAINT "season_picks_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "season_pick_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_picks" ADD CONSTRAINT "season_picks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rivals" ADD CONSTRAINT "season_rivals_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rivals" ADD CONSTRAINT "season_rivals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rivals" ADD CONSTRAINT "season_rivals_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "achievement_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_season_participants" ADD CONSTRAINT "league_season_participants_league_season_id_fkey" FOREIGN KEY ("league_season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_season_participants" ADD CONSTRAINT "league_season_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "h2h_fixtures" ADD CONSTRAINT "h2h_fixtures_league_season_id_fkey" FOREIGN KEY ("league_season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "h2h_fixtures" ADD CONSTRAINT "h2h_fixtures_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "h2h_fixtures" ADD CONSTRAINT "h2h_fixtures_home_user_id_fkey" FOREIGN KEY ("home_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "h2h_fixtures" ADD CONSTRAINT "h2h_fixtures_away_user_id_fkey" FOREIGN KEY ("away_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_questions" ADD CONSTRAINT "bonus_questions_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_answers" ADD CONSTRAINT "bonus_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "bonus_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_answers" ADD CONSTRAINT "bonus_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consensus_snapshots" ADD CONSTRAINT "consensus_snapshots_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every existing tournament as a separately reviewable competition/season.
-- Unknown legacy formats remain HYBRID until explicitly classified by an admin.
INSERT INTO "competitions" ("id", "name", "short_name", "slug", "region", "type", "provider", "provider_code", "external_id", "is_active", "display_priority")
SELECT "id", "name", "name", 'legacy-' || "slug", array_to_string("host_countries", ', '), 'HYBRID',
  CASE WHEN "external_id" LIKE 'football-data:%' THEN 'football-data' ELSE 'legacy' END,
  CASE WHEN "external_id" LIKE 'football-data:%' THEN substring("external_id" from 15) ELSE NULL END,
  "external_id", "is_active", 100
FROM "tournaments";
INSERT INTO "seasons" ("id", "competition_id", "legacy_tournament_id", "display_name", "starts_at", "ends_at", "provider_season", "is_current", "status", "scoring_rules", "picks_lock_gameweek")
SELECT "id", "id", "id", to_char("starts_at", 'YYYY'), "starts_at", "ends_at", extract(year from "starts_at")::integer, false,
  CASE WHEN "ends_at" < now() THEN 'COMPLETED'::"SeasonStatus" WHEN "starts_at" <= now() THEN 'ACTIVE'::"SeasonStatus" ELSE 'UPCOMING'::"SeasonStatus" END,
  '{"outcome":2,"exact":3,"penalty":1,"legacyKnockout":true}'::jsonb, NULL
FROM "tournaments";
UPDATE "matches" SET "competition_id" = "tournament_id", "season_id" = "tournament_id" WHERE "tournament_id" IS NOT NULL;
UPDATE "teams" SET "season_id" = "tournament_id" WHERE "tournament_id" IS NOT NULL;
UPDATE "players" SET "season_id" = "tournament_id" WHERE "tournament_id" IS NOT NULL;
-- No match IDs, predictions, legacy point awards, or outright records are changed.
-- Tournament-less matches remain unmapped for explicit administrative review.

ALTER TABLE "gameweeks" ADD CONSTRAINT "gameweeks_positive_number" CHECK ("number" > 0);
ALTER TABLE "seasons" ADD CONSTRAINT "season_date_range" CHECK ("ends_at" IS NULL OR "ends_at" >= "starts_at");
ALTER TABLE "season_rivals" ADD CONSTRAINT "rival_not_self" CHECK ("user_id" <> "rival_id");
ALTER TABLE "gameweek_bankers" ADD CONSTRAINT "banker_requires_prediction" FOREIGN KEY ("user_id", "match_id") REFERENCES "predictions"("user_id", "match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION check_match_season_mapping() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.season_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM seasons WHERE id = NEW.season_id AND competition_id = NEW.competition_id) THEN
    RAISE EXCEPTION 'Match competition must agree with season';
  END IF;
  IF NEW.gameweek_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gameweeks WHERE id = NEW.gameweek_id AND season_id = NEW.season_id) THEN
    RAISE EXCEPTION 'Match gameweek must agree with season';
  END IF;
  IF NEW.scoring_gameweek_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gameweeks WHERE id = NEW.scoring_gameweek_id AND season_id = NEW.season_id) THEN
    RAISE EXCEPTION 'Scoring gameweek must agree with season';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER match_season_mapping BEFORE INSERT OR UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION check_match_season_mapping();

CREATE FUNCTION check_banker_mapping() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = NEW.match_id AND scoring_gameweek_id = NEW.gameweek_id) THEN
    RAISE EXCEPTION 'Banker must belong to the scoring gameweek';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER banker_mapping BEFORE INSERT OR UPDATE ON gameweek_bankers FOR EACH ROW EXECUTE FUNCTION check_banker_mapping();
-- Existing Match IDs can exceed the newly generated autoincrement sequence.
SELECT setval(pg_get_serial_sequence('matches', 'id'), COALESCE((SELECT MAX(id) FROM matches), 0) + 1, false);
CREATE UNIQUE INDEX "one_current_season_per_competition" ON "seasons"("competition_id") WHERE "is_current" = true;
